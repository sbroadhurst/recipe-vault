// ============================================================
// Recipe Vault - public shared-recipe page
// No login required. Only loads recipes the owner has marked
// shareable (is_public = true), enforced server-side by RLS.
// ============================================================

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
const shareCard = document.getElementById('share-card')

function showNotFound() {
  shareCard.innerHTML = `
    <h1 class="logo">🍲 Recipe Vault</h1>
    <p>This recipe isn't available. The link may be wrong, or the owner may have stopped sharing it.</p>
  `
}

let currentSharedRecipe = null
let unitSystem = localStorage.getItem('recipeVaultUnitSystem') || 'original'

function renderIngredientsList(r) {
  const items = parseIngredients(r.ingredients).map((item) =>
    isIngredientSection(item) ? item : convertIngredientForDisplay(item, unitSystem),
  )
  return renderIngredientsHtml(items)
}

function renderSharedRecipe(r) {
  currentSharedRecipe = r

  const tagsHtml = (r.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')

  const instructionsHtml = parseInstructions(r.instructions)
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('')

  shareCard.innerHTML = `
    <p class="share-badge">Shared from Recipe Vault</p>
    ${r.image_url ? `<img class="view-image" src="${escapeAttr(r.image_url)}" alt="" />` : ''}
    <h1>${escapeHtml(r.title)}</h1>
    ${r.source_url ? `<a class="view-source" href="${escapeAttr(r.source_url)}" target="_blank" rel="noopener">Original recipe &#8599;</a>` : ''}
    <div class="tag-row">${tagsHtml}</div>

    <div class="ingredients-header">
      <h3>Ingredients</h3>
      <button type="button" id="unit-toggle-btn" class="link-btn unit-toggle-btn">${unitToggleLabel(unitSystem)}</button>
    </div>
    <div id="share-ingredients" class="ingredients-view">${renderIngredientsList(r)}</div>

    <h3>Instructions</h3>
    <ol class="view-instructions">${instructionsHtml}</ol>

    <div class="share-footer">
      <p>Want to keep your own recipes like this?</p>
      <a href="./index.html">Open Recipe Vault</a>
    </div>
  `

  document.getElementById('unit-toggle-btn').addEventListener('click', () => {
    unitSystem = nextUnitSystem(unitSystem)
    localStorage.setItem('recipeVaultUnitSystem', unitSystem)
    document.getElementById('unit-toggle-btn').textContent = unitToggleLabel(unitSystem)
    document.getElementById('share-ingredients').innerHTML = renderIngredientsList(currentSharedRecipe)
  })
}

async function loadSharedRecipe() {
  const id = new URLSearchParams(window.location.search).get('id')
  if (!id) {
    showNotFound()
    return
  }

  const { data, error } = await supabaseClient
    .from('recipes')
    .select('title, ingredients, instructions, source_url, image_url, tags, is_public')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle()

  if (error || !data) {
    showNotFound()
    return
  }

  renderSharedRecipe(data)
}

loadSharedRecipe()
