// ============================================================
// Recipe Vault - Supabase Edge Function: import-recipe
//
// Fetches a recipe webpage server-side (browsers can't fetch
// arbitrary external sites due to CORS) and extracts structured
// recipe data from the schema.org JSON-LD block that most recipe
// sites embed for SEO. Returns { title, image_url, ingredients,
// instructions, source_url } or { error }.
//
// Deploy via Supabase Dashboard -> Edge Functions -> Deploy a new
// function -> Via Editor -> name it "import-recipe" -> paste this
// file's contents.
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Recursively searches parsed JSON-LD for a node whose @type is (or
// includes) "Recipe" - handles plain objects, arrays of objects, and
// the { "@graph": [...] } wrapper some sites use.
// deno-lint-ignore no-explicit-any
function findRecipeNode(data: any): any {
  if (!data) return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item)
      if (found) return found
    }
    return null
  }
  if (typeof data !== 'object') return null
  const type = data['@type']
  const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
  if (isRecipe) return data
  if (data['@graph']) return findRecipeNode(data['@graph'])
  return null
}

// schema.org "image" can be a string, an array, or an ImageObject.
// deno-lint-ignore no-explicit-any
function normalizeImage(image: any): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return normalizeImage(image[0])
  if (typeof image === 'object') return image.url || image.contentUrl || null
  return null
}

// schema.org "recipeInstructions" can be a single text blob, an array
// of strings, an array of HowToStep objects, or HowToSection objects
// that nest their own list of steps.
// deno-lint-ignore no-explicit-any
function flattenInstructions(instr: any): string[] {
  if (!instr) return []

  if (typeof instr === 'string') {
    const byLines = instr
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (byLines.length > 1) return byLines
    // Single blob of text - split into sentence-like chunks as a fallback.
    return instr
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (Array.isArray(instr)) {
    const steps: string[] = []
    for (const item of instr) {
      if (typeof item === 'string') {
        steps.push(item.trim())
      } else if (item && typeof item === 'object') {
        if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
          steps.push(...flattenInstructions(item.itemListElement))
        } else if (item.text || item.name) {
          steps.push(String(item.text || item.name).trim())
        }
      }
    }
    return steps.filter(Boolean)
  }

  return []
}

const UNIT_ALIASES: Record<string, string> = {
  cup: 'cup',
  cups: 'cup',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  tbs: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  lbs: 'lb',
  gram: 'g',
  grams: 'g',
  g: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  liter: 'L',
  liters: 'L',
  l: 'L',
  pinch: 'pinch',
  pinches: 'pinch',
  dash: 'dash',
  dashes: 'dash',
  clove: 'clove',
  cloves: 'clove',
  slice: 'slice',
  slices: 'slice',
  can: 'can',
  cans: 'can',
  package: 'package',
  packages: 'package',
  pkg: 'package',
  pint: 'pint',
  pints: 'pint',
  quart: 'quart',
  quarts: 'quart',
  gallon: 'gallon',
  gallons: 'gallon',
  whole: 'whole',
}

// Best-effort split of a raw ingredient line like "2 1/2 cups flour"
// into { qty, unit, name }. Falls back to putting the whole line in
// "name" when it can't confidently identify a quantity/unit - the
// user can always fix it up in the ingredient rows afterward.
function parseIngredientLine(line: string) {
  const trimmed = line.trim()

  const qtyMatch = trimmed.match(/^(\d+\s+\d\/\d|\d+\/\d|\d+(\.\d+)?)\s*/)
  let rest = trimmed
  let qty = ''
  if (qtyMatch) {
    qty = qtyMatch[1].trim()
    rest = trimmed.slice(qtyMatch[0].length).trim()
  }

  let unit = ''
  const unitMatch = rest.match(/^([a-zA-Z.]+)\.?\s+/)
  if (unitMatch) {
    const candidate = unitMatch[1].toLowerCase().replace(/\.$/, '')
    if (UNIT_ALIASES[candidate]) {
      unit = UNIT_ALIASES[candidate]
      rest = rest.slice(unitMatch[0].length).trim()
    }
  }

  rest = rest.replace(/^of\s+/i, '').trim()

  return { qty, unit, name: rest || trimmed }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      // Note: this and every other "handled" failure below responds with
      // HTTP 200 (not 4xx/5xx) on purpose. supabase-js's functions.invoke()
      // discards the response body on non-2xx statuses and replaces it with
      // a generic error, so the only reliable way to hand a useful message
      // back to the client is to keep the status 200 and signal failure via
      // the "error" field in the JSON body instead.
      return jsonResponse({ error: 'Missing "url" in request body.' })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return jsonResponse({ error: 'That does not look like a valid URL.' })
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return jsonResponse({ error: 'Only http/https URLs are supported.' })
    }

    // Identify honestly as a bot rather than impersonating a browser.
    // Pretending to be Chrome without matching everything else a real
    // Chrome connection looks like (TLS fingerprint, timing, JS
    // execution) can read as *more* suspicious to bot-detection systems
    // than a plainly-labeled crawler - this made things worse in testing.
    const pageRes = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeVaultBot/1.0; +https://recipevault.app/about)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!pageRes.ok) {
      if (pageRes.status === 403 || pageRes.status === 429) {
        return jsonResponse({
          error: 'This site blocked automated access to that page. It may only allow real browsers to view it.',
        })
      }
      return jsonResponse({ error: `Could not fetch that page (status ${pageRes.status}).` })
    }

    const html = await pageRes.text()
    const scriptMatches = html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )

    // deno-lint-ignore no-explicit-any
    let recipeNode: any = null
    for (const match of scriptMatches) {
      try {
        const data = JSON.parse(match[1].trim())
        const found = findRecipeNode(data)
        if (found) {
          recipeNode = found
          break
        }
      } catch {
        // Malformed JSON-LD block - skip and keep looking.
      }
    }

    if (!recipeNode) {
      return jsonResponse({
        error: "Couldn't find recipe data on that page. Some sites don't publish it in a readable format.",
      })
    }

    const title = typeof recipeNode.name === 'string' ? recipeNode.name : ''
    const image_url = normalizeImage(recipeNode.image)
    const ingredients = Array.isArray(recipeNode.recipeIngredient)
      ? recipeNode.recipeIngredient.filter((s: unknown) => typeof s === 'string').map(parseIngredientLine)
      : []
    const instructions = flattenInstructions(recipeNode.recipeInstructions)

    return jsonResponse({
      title,
      image_url,
      ingredients,
      instructions,
      source_url: parsedUrl.toString(),
    })
  } catch (_err) {
    return jsonResponse({ error: 'Something went wrong importing that recipe.' })
  }
})
