// ============================================================
// Recipe Vault - shared helpers
// Used by both app.js (the full app) and share.js (the public
// read-only shared-recipe page), so the two stay in sync.
// ============================================================

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function escapeAttr(str) {
  return escapeHtml(str)
}

// Parses the ingredients column, which stores a JSON array of
// { qty, unit, name } items, optionally interspersed with section
// headers ({ section: "Crust" }) to group ingredients for recipes with
// multiple components (e.g. a pie crust and a filling). Falls back to
// treating older plain-text, newline-separated ingredients (name only)
// as legacy data.
function parseIngredients(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {
    // not JSON - legacy plain text
  }
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ qty: '', unit: '', name }))
}

// True for a section-header item (as opposed to an actual ingredient).
function isIngredientSection(item) {
  return !!item && typeof item.section === 'string'
}

function formatIngredientLine(ing) {
  return [ing.qty, ing.unit, ing.name].filter(Boolean).join(' ')
}

// Renders a parsed ingredients array (ingredient items and/or section
// headers) as HTML: a heading before each section's items, with the
// items themselves grouped into their own <ul>. Ingredients that come
// before the first section header (or all of them, for recipes with no
// sections) get a single unlabeled list.
function renderIngredientsHtml(items) {
  let html = ''
  let listOpen = false
  for (const item of items) {
    if (isIngredientSection(item)) {
      if (listOpen) {
        html += '</ul>'
        listOpen = false
      }
      html += `<p class="ingredient-section-label">${escapeHtml(item.section)}</p>`
    } else {
      if (!listOpen) {
        html += '<ul>'
        listOpen = true
      }
      html += `<li>${escapeHtml(formatIngredientLine(item))}</li>`
    }
  }
  if (listOpen) html += '</ul>'
  return html
}

// ---------- Unit conversion (metric <-> imperial) ----------
// This only affects how ingredients are displayed - it never touches
// the stored recipe data, so switching back to "Original" always shows
// exactly what was typed in.

const VOLUME_TO_ML = {
  tsp: 4.92892,
  tbsp: 14.7868,
  'fl oz': 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
}

const WEIGHT_TO_G = {
  oz: 28.3495,
  lb: 453.592,
}

// Parses a quantity string that may be a plain number ("2"), a simple
// fraction ("1/2"), or a mixed number ("1 1/2"). Returns null if it
// can't confidently parse one (e.g. "a pinch of"), so that ingredient
// is left alone rather than mangled.
function parseQtyToNumber(qty) {
  if (!qty) return null
  const s = String(qty).trim()
  if (!s) return null

  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3])

  m = s.match(/^(\d+)\/(\d+)$/)
  if (m) return Number(m[1]) / Number(m[2])

  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)

  return null
}

// Rounds to the nearest 1/8 and formats as a mixed number/fraction,
// since recipes conventionally read "1 1/2 cups," not "1.5 cups."
function decimalToFraction(value) {
  const whole = Math.floor(value)
  const denominator = 8
  let numerator = Math.round((value - whole) * denominator)

  if (numerator === 0) return String(whole || 0)
  if (numerator === denominator) return String(whole + 1)

  function gcd(a, b) {
    return b ? gcd(b, a % b) : a
  }
  const g = gcd(numerator, denominator)
  numerator /= g
  const denom = denominator / g

  return whole ? `${whole} ${numerator}/${denom}` : `${numerator}/${denom}`
}

function roundMetric(value, unit) {
  if (unit === 'ml' || unit === 'g') return String(Math.round(value))
  return String(Math.round(value * 100) / 100) // L, kg
}

function mlToImperial(ml) {
  if (ml < 15) return { qty: decimalToFraction(ml / 4.92892), unit: 'tsp' }
  if (ml < 59) return { qty: decimalToFraction(ml / 14.7868), unit: 'tbsp' }
  if (ml < 946) return { qty: decimalToFraction(ml / 236.588), unit: 'cup' }
  if (ml < 3785) return { qty: decimalToFraction(ml / 946.353), unit: 'quart' }
  return { qty: decimalToFraction(ml / 3785.41), unit: 'gallon' }
}

function gToImperial(g) {
  if (g < 454) return { qty: decimalToFraction(g / 28.3495), unit: 'oz' }
  return { qty: decimalToFraction(g / 453.592), unit: 'lb' }
}

function volumeToMetric(ml) {
  if (ml >= 1000) return { qty: roundMetric(ml / 1000, 'L'), unit: 'L' }
  return { qty: roundMetric(ml, 'ml'), unit: 'ml' }
}

function weightToMetric(g) {
  if (g >= 1000) return { qty: roundMetric(g / 1000, 'kg'), unit: 'kg' }
  return { qty: roundMetric(g, 'g'), unit: 'g' }
}

// Converts one ingredient's { qty, unit, name } for display in the
// requested system. Leaves it untouched if the system is "original",
// the quantity can't be parsed as a number, or the unit isn't one of
// the recognized volume/weight units (e.g. "pinch," "whole," "clove").
function convertIngredientForDisplay(ing, system) {
  if (!system || system === 'original') return ing

  const qtyNum = parseQtyToNumber(ing.qty)
  if (qtyNum === null) return ing

  const unit = (ing.unit || '').toLowerCase()

  if (system === 'metric') {
    if (VOLUME_TO_ML[unit] != null) {
      const converted = volumeToMetric(qtyNum * VOLUME_TO_ML[unit])
      return { ...ing, qty: converted.qty, unit: converted.unit }
    }
    if (WEIGHT_TO_G[unit] != null) {
      const converted = weightToMetric(qtyNum * WEIGHT_TO_G[unit])
      return { ...ing, qty: converted.qty, unit: converted.unit }
    }
    return ing
  }

  if (system === 'imperial') {
    if (unit === 'ml' || unit === 'l') {
      const ml = unit === 'l' ? qtyNum * 1000 : qtyNum
      const converted = mlToImperial(ml)
      return { ...ing, qty: converted.qty, unit: converted.unit }
    }
    if (unit === 'g' || unit === 'kg') {
      const g = unit === 'kg' ? qtyNum * 1000 : qtyNum
      const converted = gToImperial(g)
      return { ...ing, qty: converted.qty, unit: converted.unit }
    }
    return ing
  }

  return ing
}

function nextUnitSystem(current) {
  if (current === 'metric') return 'imperial'
  if (current === 'imperial') return 'original'
  return 'metric'
}

function unitToggleLabel(current) {
  if (current === 'original') return 'Show in Metric'
  if (current === 'metric') return 'Show in Imperial'
  return 'Show Original'
}

// Parses the instructions column, which stores a JSON array of step
// strings. Falls back to treating older plain-text instructions
// (one block of text) as a set of newline-separated steps.
function parseInstructions(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {
    // not JSON - legacy plain text
  }
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
