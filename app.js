// ============================================================
// Recipe Vault - app logic
// Uses Supabase for auth + database (see config.js for keys)
// ============================================================

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)

// ---------- State ----------
let currentUser = null
let allRecipes = []
let isSignUpMode = false

// ---------- Elements ----------
const authScreen = document.getElementById('auth-screen')
const appScreen = document.getElementById('app-screen')
const authForm = document.getElementById('auth-form')
const authEmail = document.getElementById('auth-email')
const authPassword = document.getElementById('auth-password')
const authSubmit = document.getElementById('auth-submit')
const authMessage = document.getElementById('auth-message')
const authToggleBtn = document.getElementById('auth-toggle-btn')
const authToggleText = document.getElementById('auth-toggle-text')

const logoutBtn = document.getElementById('logout-btn')
const addRecipeBtn = document.getElementById('add-recipe-btn')
const searchInput = document.getElementById('search-input')
const recipeGrid = document.getElementById('recipe-grid')
const emptyState = document.getElementById('empty-state')

const recipeModal = document.getElementById('recipe-modal')
const closeModalBtn = document.getElementById('close-modal-btn')
const recipeForm = document.getElementById('recipe-form')
const modalTitle = document.getElementById('modal-title')
const recipeIdInput = document.getElementById('recipe-id')
const recipeTitleInput = document.getElementById('recipe-title')
const recipeSourceInput = document.getElementById('recipe-source')
const recipeImageInput = document.getElementById('recipe-image')
const recipeTagsInput = document.getElementById('recipe-tags')
const ingredientsListEl = document.getElementById('ingredients-list')
const addIngredientBtn = document.getElementById('add-ingredient-btn')
const ingredientSuggestions = document.getElementById('ingredient-suggestions')
const instructionsListEl = document.getElementById('instructions-list')
const addInstructionBtn = document.getElementById('add-instruction-btn')
const deleteRecipeBtn = document.getElementById('delete-recipe-btn')
const importUrlBtn = document.getElementById('import-url-btn')

// ---------- Ingredient units & suggestions ----------
const UNITS = [
  '',
  'tsp',
  'tbsp',
  'cup',
  'fl oz',
  'pint',
  'quart',
  'gallon',
  'ml',
  'L',
  'g',
  'kg',
  'oz',
  'lb',
  'pinch',
  'dash',
  'clove',
  'slice',
  'can',
  'package',
  'whole',
]

const COMMON_INGREDIENTS = [
  'All-purpose flour',
  'Baking powder',
  'Baking soda',
  'Salt',
  'Black pepper',
  'Sugar',
  'Brown sugar',
  'Honey',
  'Maple syrup',
  'Vanilla extract',
  'Butter',
  'Olive oil',
  'Vegetable oil',
  'Milk',
  'Heavy cream',
  'Eggs',
  'Egg yolk',
  'Egg white',
  'Sour cream',
  'Yogurt',
  'Cheddar cheese',
  'Mozzarella cheese',
  'Parmesan cheese',
  'Cream cheese',
  'Garlic',
  'Onion',
  'Green onion',
  'Ginger',
  'Shallot',
  'Tomato',
  'Tomato paste',
  'Tomato sauce',
  'Canned tomatoes',
  'Potato',
  'Sweet potato',
  'Carrot',
  'Celery',
  'Bell pepper',
  'Broccoli',
  'Spinach',
  'Lettuce',
  'Cucumber',
  'Zucchini',
  'Mushroom',
  'Lemon',
  'Lime',
  'Orange',
  'Chicken breast',
  'Chicken thigh',
  'Ground beef',
  'Ground turkey',
  'Bacon',
  'Sausage',
  'Pork chop',
  'Steak',
  'Shrimp',
  'Salmon',
  'Tuna',
  'Rice',
  'Pasta',
  'Spaghetti',
  'Bread',
  'Bread crumbs',
  'Tortilla',
  'Black beans',
  'Chickpeas',
  'Lentils',
  'Kidney beans',
  'Chicken broth',
  'Vegetable broth',
  'Beef broth',
  'Soy sauce',
  'Worcestershire sauce',
  'Hot sauce',
  'Ketchup',
  'Mustard',
  'Mayonnaise',
  'Vinegar',
  'Balsamic vinegar',
  'Red wine vinegar',
  'Basil',
  'Oregano',
  'Thyme',
  'Rosemary',
  'Parsley',
  'Cilantro',
  'Cumin',
  'Paprika',
  'Chili powder',
  'Cinnamon',
  'Nutmeg',
  'Red pepper flakes',
  'Cornstarch',
  'Yeast',
  'Cocoa powder',
  'Chocolate chips',
  'Almonds',
  'Walnuts',
  'Peanut butter',
  'Oats',
  'Coconut milk',
]

ingredientSuggestions.innerHTML = COMMON_INGREDIENTS.map(
  (name) => `<option value="${escapeAttr(name)}"></option>`,
).join('')

function createIngredientRow(data) {
  const row = document.createElement('div')
  row.className = 'ingredient-row'

  const unitOptions = UNITS.map(
    (u) => `<option value="${escapeAttr(u)}">${u ? escapeHtml(u) : '(unit)'}</option>`,
  ).join('')

  row.innerHTML = `
    <input type="text" class="ingredient-qty" placeholder="Qty" inputmode="decimal" />
    <select class="ingredient-unit">${unitOptions}</select>
    <input type="text" class="ingredient-name" list="ingredient-suggestions" placeholder="Ingredient name" />
    <button type="button" class="remove-ingredient-btn" aria-label="Remove ingredient">&times;</button>
  `

  row.querySelector('.ingredient-qty').value = data.qty || ''
  row.querySelector('.ingredient-unit').value = data.unit || ''
  row.querySelector('.ingredient-name').value = data.name || ''
  row.querySelector('.remove-ingredient-btn').addEventListener('click', () => row.remove())

  return row
}

addIngredientBtn.addEventListener('click', () => {
  ingredientsListEl.appendChild(createIngredientRow({}))
})

function setIngredientRows(rows) {
  ingredientsListEl.innerHTML = ''
  const list = rows && rows.length ? rows : [{}]
  for (const r of list) {
    ingredientsListEl.appendChild(createIngredientRow(r))
  }
}

function getIngredientRows() {
  return Array.from(ingredientsListEl.querySelectorAll('.ingredient-row'))
    .map((row) => ({
      qty: row.querySelector('.ingredient-qty').value.trim(),
      unit: row.querySelector('.ingredient-unit').value.trim(),
      name: row.querySelector('.ingredient-name').value.trim(),
    }))
    .filter((r) => r.name)
}

// Parses the ingredients column, which stores a JSON array of
// { qty, unit, name }. Falls back to treating older plain-text,
// newline-separated ingredients (name only) as legacy data.
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

function formatIngredientLine(ing) {
  return [ing.qty, ing.unit, ing.name].filter(Boolean).join(' ')
}

// ---------- Instructions: reorderable numbered steps ----------
function renumberInstructionRows() {
  const rows = Array.from(instructionsListEl.querySelectorAll('.instruction-row'))
  rows.forEach((row, idx) => {
    row.querySelector('.step-number').textContent = String(idx + 1)
    row.querySelector('.move-up-btn').disabled = idx === 0
    row.querySelector('.move-down-btn').disabled = idx === rows.length - 1
  })
}

function createInstructionRow(text) {
  const row = document.createElement('div')
  row.className = 'instruction-row'

  row.innerHTML = `
    <span class="step-number">1</span>
    <textarea class="instruction-text" rows="2" placeholder="Describe this step"></textarea>
    <div class="instruction-controls">
      <button type="button" class="move-up-btn" aria-label="Move step up">&uarr;</button>
      <button type="button" class="move-down-btn" aria-label="Move step down">&darr;</button>
      <button type="button" class="remove-instruction-btn" aria-label="Remove step">&times;</button>
    </div>
  `

  row.querySelector('.instruction-text').value = text || ''

  row.querySelector('.move-up-btn').addEventListener('click', () => {
    const prev = row.previousElementSibling
    if (prev) row.parentElement.insertBefore(row, prev)
    renumberInstructionRows()
  })
  row.querySelector('.move-down-btn').addEventListener('click', () => {
    const next = row.nextElementSibling
    if (next) row.parentElement.insertBefore(next, row)
    renumberInstructionRows()
  })
  row.querySelector('.remove-instruction-btn').addEventListener('click', () => {
    row.remove()
    renumberInstructionRows()
  })

  return row
}

addInstructionBtn.addEventListener('click', () => {
  instructionsListEl.appendChild(createInstructionRow(''))
  renumberInstructionRows()
})

function setInstructionRows(steps) {
  instructionsListEl.innerHTML = ''
  const list = steps && steps.length ? steps : ['']
  for (const step of list) {
    instructionsListEl.appendChild(createInstructionRow(step))
  }
  renumberInstructionRows()
}

function getInstructionSteps() {
  return Array.from(instructionsListEl.querySelectorAll('.instruction-text'))
    .map((el) => el.value.trim())
    .filter(Boolean)
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

const viewModal = document.getElementById('view-modal')
const closeViewBtn = document.getElementById('close-view-btn')
const viewImage = document.getElementById('view-image')
const viewTitle = document.getElementById('view-title')
const viewSource = document.getElementById('view-source')
const viewTags = document.getElementById('view-tags')
const viewIngredients = document.getElementById('view-ingredients')
const viewInstructions = document.getElementById('view-instructions')
const editRecipeBtn = document.getElementById('edit-recipe-btn')

const toast = document.getElementById('toast')

let currentlyViewingId = null

// ---------- Toast ----------
function showToast(msg) {
  toast.textContent = msg
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 2500)
}

// ---------- Auth ----------
authToggleBtn.addEventListener('click', () => {
  isSignUpMode = !isSignUpMode
  authSubmit.textContent = isSignUpMode ? 'Sign Up' : 'Log In'
  authToggleText.textContent = isSignUpMode ? 'Already have an account?' : "Don't have an account?"
  authToggleBtn.textContent = isSignUpMode ? 'Log In' : 'Sign Up'
  authMessage.textContent = ''
})

authForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  authMessage.textContent = ''
  const email = authEmail.value.trim()
  const password = authPassword.value

  authSubmit.disabled = true
  try {
    if (isSignUpMode) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password })
      if (error) throw error
      if (data.user && !data.session) {
        authMessage.style.color = '#2e7d32'
        authMessage.textContent = 'Check your email to confirm your account, then log in.'
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password })
      if (error) throw error
    }
  } catch (err) {
    authMessage.style.color = '#c0392b'
    authMessage.textContent = err.message || 'Something went wrong.'
  } finally {
    authSubmit.disabled = false
  }
})

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut()
})

supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session ? session.user : null
  if (currentUser) {
    authScreen.classList.add('hidden')
    appScreen.classList.remove('hidden')
    loadRecipes()
  } else {
    appScreen.classList.add('hidden')
    authScreen.classList.remove('hidden')
  }
})

// ---------- Recipes: load & render ----------
async function loadRecipes() {
  const { data, error } = await supabaseClient.from('recipes').select('*').order('created_at', { ascending: false })

  if (error) {
    showToast('Failed to load recipes: ' + error.message)
    return
  }
  allRecipes = data || []
  renderRecipes(allRecipes)
}

function renderRecipes(recipes) {
  recipeGrid.innerHTML = ''
  emptyState.classList.toggle('hidden', recipes.length > 0)

  for (const r of recipes) {
    const card = document.createElement('div')
    card.className = 'recipe-card'
    card.addEventListener('click', () => openViewModal(r.id))

    const tags = (r.tags || [])
      .slice(0, 3)
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join('')

    card.innerHTML = `
      ${r.image_url ? `<img class="recipe-card-img" src="${escapeAttr(r.image_url)}" onerror="this.style.display='none'" />` : `<div class="recipe-card-img"></div>`}
      <div class="recipe-card-body">
        <p class="recipe-card-title">${escapeHtml(r.title)}</p>
        <div class="recipe-card-tags">${tags}</div>
      </div>
    `
    recipeGrid.appendChild(card)
  }
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase()
  if (!q) {
    renderRecipes(allRecipes)
    return
  }
  const filtered = allRecipes.filter((r) => {
    const ingredientNames = parseIngredients(r.ingredients)
      .map((i) => i.name)
      .join(' ')
    const haystack = [r.title, ingredientNames, (r.tags || []).join(' ')].join(' ').toLowerCase()
    return haystack.includes(q)
  })
  renderRecipes(filtered)
})

// ---------- Add / Edit modal ----------
addRecipeBtn.addEventListener('click', () => openAddModal())
closeModalBtn.addEventListener('click', () => recipeModal.classList.add('hidden'))

function openAddModal() {
  modalTitle.textContent = 'Add Recipe'
  recipeForm.reset()
  recipeIdInput.value = ''
  setIngredientRows([{}])
  setInstructionRows([''])
  deleteRecipeBtn.classList.add('hidden')
  recipeModal.classList.remove('hidden')
}

function openEditModal(recipe) {
  modalTitle.textContent = 'Edit Recipe'
  recipeIdInput.value = recipe.id
  recipeTitleInput.value = recipe.title || ''
  recipeSourceInput.value = recipe.source_url || ''
  recipeImageInput.value = recipe.image_url || ''
  recipeTagsInput.value = (recipe.tags || []).join(', ')
  setIngredientRows(parseIngredients(recipe.ingredients))
  setInstructionRows(parseInstructions(recipe.instructions))
  deleteRecipeBtn.classList.remove('hidden')
  viewModal.classList.add('hidden')
  recipeModal.classList.remove('hidden')
}

importUrlBtn.addEventListener('click', () => {
  showToast('Auto-fill from a link is coming in a future version!')
})

recipeForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const ingredientRows = getIngredientRows()
  if (!ingredientRows.length) {
    showToast('Add at least one ingredient.')
    return
  }

  const instructionSteps = getInstructionSteps()
  if (!instructionSteps.length) {
    showToast('Add at least one instruction step.')
    return
  }

  const payload = {
    title: recipeTitleInput.value.trim(),
    source_url: recipeSourceInput.value.trim() || null,
    image_url: recipeImageInput.value.trim() || null,
    tags: recipeTagsInput.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    ingredients: JSON.stringify(ingredientRows),
    instructions: JSON.stringify(instructionSteps),
  }

  const id = recipeIdInput.value

  let error
  if (id) {
    ;({ error } = await supabaseClient.from('recipes').update(payload).eq('id', id))
  } else {
    payload.user_id = currentUser.id
    ;({ error } = await supabaseClient.from('recipes').insert(payload))
  }

  if (error) {
    showToast('Save failed: ' + error.message)
    return
  }

  recipeModal.classList.add('hidden')
  showToast(id ? 'Recipe updated' : 'Recipe added')
  loadRecipes()
})

deleteRecipeBtn.addEventListener('click', async () => {
  const id = recipeIdInput.value
  if (!id) return
  if (!confirm("Delete this recipe? This can't be undone.")) return

  const { error } = await supabaseClient.from('recipes').delete().eq('id', id)
  if (error) {
    showToast('Delete failed: ' + error.message)
    return
  }
  recipeModal.classList.add('hidden')
  showToast('Recipe deleted')
  loadRecipes()
})

// ---------- View modal ----------
function openViewModal(id) {
  const r = allRecipes.find((x) => x.id === id)
  if (!r) return
  currentlyViewingId = id

  viewTitle.textContent = r.title

  if (r.image_url) {
    viewImage.src = r.image_url
    viewImage.classList.remove('hidden')
  } else {
    viewImage.classList.add('hidden')
  }

  if (r.source_url) {
    viewSource.href = r.source_url
    viewSource.classList.remove('hidden')
  } else {
    viewSource.classList.add('hidden')
  }

  viewTags.innerHTML = (r.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')

  viewIngredients.innerHTML = parseIngredients(r.ingredients)
    .map((ing) => `<li>${escapeHtml(formatIngredientLine(ing))}</li>`)
    .join('')

  viewInstructions.innerHTML = parseInstructions(r.instructions)
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('')

  viewModal.classList.remove('hidden')
}

closeViewBtn.addEventListener('click', () => viewModal.classList.add('hidden'))
editRecipeBtn.addEventListener('click', () => {
  const r = allRecipes.find((x) => x.id === currentlyViewingId)
  if (r) openEditModal(r)
})

// ---------- Helpers ----------
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function escapeAttr(str) {
  return escapeHtml(str)
}

// ---------- Service worker registration ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {})
  })
}
