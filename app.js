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
const tagFilterBar = document.getElementById('tag-filter-bar')
const favoritesFilterBtn = document.getElementById('favorites-filter-btn')

const recipeModal = document.getElementById('recipe-modal')
const closeModalBtn = document.getElementById('close-modal-btn')
const recipeForm = document.getElementById('recipe-form')
const modalTitle = document.getElementById('modal-title')
const recipeIdInput = document.getElementById('recipe-id')
const recipeTitleInput = document.getElementById('recipe-title')
const recipeSourceInput = document.getElementById('recipe-source')
const recipeImageInput = document.getElementById('recipe-image')
const imageFileInput = document.getElementById('recipe-image-file')
const uploadImageBtn = document.getElementById('upload-image-btn')
const removeImageBtn = document.getElementById('remove-image-btn')
const imagePreview = document.getElementById('image-preview')
const tagsChipsEl = document.getElementById('tags-chips')
const tagsInput = document.getElementById('tags-input')
const addTagBtn = document.getElementById('add-tag-btn')
const ingredientsListEl = document.getElementById('ingredients-list')
const addSectionBtn = document.getElementById('add-section-btn')
const instructionsListEl = document.getElementById('instructions-list')
const addInstructionBtn = document.getElementById('add-instruction-btn')
const deleteRecipeBtn = document.getElementById('delete-recipe-btn')
const importUrlInput = document.getElementById('import-url-input')
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

// Closes every open combo dropdown except one whose trigger/input is
// inside `exceptEl` (pass null to close everything).
function closeAllCombos(exceptEl) {
  document.querySelectorAll('.combo-panel').forEach((panel) => {
    if (exceptEl && panel.parentElement.contains(exceptEl)) return
    panel.classList.add('hidden')
  })
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.combo')) return
  closeAllCombos(null)
})

// A searchable, height-limited dropdown used in place of a native
// <select>, so it can't be clipped or overflow the scrollable dialog.
function createUnitCombo(selectedUnit) {
  const combo = document.createElement('div')
  combo.className = 'combo unit-combo'
  combo.innerHTML = `
    <button type="button" class="combo-trigger unit-trigger"></button>
    <div class="combo-panel hidden">
      <input type="text" class="combo-search" placeholder="Search units..." autocomplete="off" />
      <div class="combo-options"></div>
    </div>
  `

  const trigger = combo.querySelector('.unit-trigger')
  const panel = combo.querySelector('.combo-panel')
  const search = combo.querySelector('.combo-search')
  const optionsEl = combo.querySelector('.combo-options')

  function setValue(unit) {
    trigger.dataset.value = unit
    trigger.textContent = unit ? unit : '(unit)'
  }

  function renderOptions(query) {
    const q = (query || '').trim().toLowerCase()
    const matches = UNITS.filter((u) => {
      const label = u ? u : '(unit)'
      return label.toLowerCase().includes(q)
    })
    optionsEl.innerHTML = matches.length
      ? matches
          .map((u) => `<div class="combo-option" data-value="${escapeAttr(u)}">${u ? escapeHtml(u) : '(unit)'}</div>`)
          .join('')
      : '<div class="combo-option-empty">No matches</div>'

    optionsEl.querySelectorAll('.combo-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        setValue(opt.dataset.value)
        panel.classList.add('hidden')
      })
    })
  }

  trigger.addEventListener('click', () => {
    const willOpen = panel.classList.contains('hidden')
    closeAllCombos(combo)
    if (willOpen) {
      panel.classList.remove('hidden')
      search.value = ''
      renderOptions('')
      search.focus()
    } else {
      panel.classList.add('hidden')
    }
  })

  search.addEventListener('input', () => renderOptions(search.value))

  setValue(selectedUnit || '')
  renderOptions('')

  return combo
}

// A free-text ingredient name field with a height-limited, filtered
// suggestion dropdown (replaces the native <input list> datalist,
// which can't be styled, height-limited, or searched).
function createNameCombo(selectedName) {
  const combo = document.createElement('div')
  combo.className = 'combo name-combo'
  combo.innerHTML = `
    <input type="text" class="ingredient-name" placeholder="Ingredient name" autocomplete="off" />
    <div class="combo-panel hidden">
      <div class="combo-options"></div>
    </div>
  `

  const input = combo.querySelector('.ingredient-name')
  const panel = combo.querySelector('.combo-panel')
  const optionsEl = combo.querySelector('.combo-options')

  function renderOptions(query) {
    const q = (query || '').trim().toLowerCase()
    const matches = q
      ? COMMON_INGREDIENTS.filter((name) => name.toLowerCase().includes(q))
      : COMMON_INGREDIENTS
    optionsEl.innerHTML = matches.length
      ? matches
          .slice(0, 30)
          .map((name) => `<div class="combo-option" data-value="${escapeAttr(name)}">${escapeHtml(name)}</div>`)
          .join('')
      : '<div class="combo-option-empty">No matches</div>'

    optionsEl.querySelectorAll('.combo-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        input.value = opt.dataset.value
        panel.classList.add('hidden')
      })
    })
  }

  input.addEventListener('focus', () => {
    closeAllCombos(combo)
    panel.classList.remove('hidden')
    renderOptions(input.value)
  })
  input.addEventListener('input', () => {
    panel.classList.remove('hidden')
    renderOptions(input.value)
  })

  input.value = selectedName || ''

  return combo
}

// Regenerates every ingredient row's "move to section" dropdown so its
// options match the current set of sections (in case one was renamed,
// added, or removed since the row was created), and shows/hides those
// dropdowns entirely when there's nothing to move between yet.
function refreshIngredientGroups() {
  const groups = Array.from(ingredientsListEl.children)
  ingredientsListEl.classList.toggle('has-sections', groups.length > 1)

  const options = groups.map((group) => {
    const id = group.dataset.sectionId
    if (id === 'unsectioned') return { id, label: 'No section' }
    const input = group.querySelector('.section-label-input')
    const label = (input && input.value.trim()) || 'Untitled section'
    return { id, label }
  })

  ingredientsListEl.querySelectorAll('.move-to-select').forEach((select) => {
    const parentGroup = select.closest('.ingredient-group')
    const currentId = parentGroup ? parentGroup.dataset.sectionId : 'unsectioned'
    select.innerHTML = options
      .map((o) => `<option value="${escapeAttr(o.id)}"${o.id === currentId ? ' selected' : ''}>${escapeHtml(o.label)}</option>`)
      .join('')
  })
}

function createIngredientRow(data) {
  const row = document.createElement('div')
  row.className = 'ingredient-row'

  const qty = document.createElement('input')
  qty.type = 'text'
  qty.className = 'ingredient-qty'
  qty.placeholder = 'e.g. 1 1/2'
  // Not "decimal" - that keyboard hides the "/" key on phones, making
  // it impossible to type fractions like "1/2".
  qty.inputMode = 'text'
  qty.value = data.qty || ''

  const unitCombo = createUnitCombo(data.unit)
  const nameCombo = createNameCombo(data.name)

  // Lets an ingredient be reassigned to any section (or back to "No
  // section") without retyping it - populated/kept in sync by
  // refreshIngredientGroups(). Hidden until a recipe actually has more
  // than one section.
  const moveToSelect = document.createElement('select')
  moveToSelect.className = 'move-to-select'
  moveToSelect.setAttribute('aria-label', 'Move ingredient to section')
  moveToSelect.addEventListener('change', () => {
    const targetGroup = Array.from(ingredientsListEl.children).find(
      (g) => g.dataset.sectionId === moveToSelect.value,
    )
    if (targetGroup) targetGroup.querySelector('.ingredient-group-rows').appendChild(row)
    refreshIngredientGroups()
  })

  const removeBtn = document.createElement('button')
  removeBtn.type = 'button'
  removeBtn.className = 'remove-ingredient-btn'
  removeBtn.setAttribute('aria-label', 'Remove ingredient')
  removeBtn.innerHTML = '&times;'
  removeBtn.addEventListener('click', () => row.remove())

  row.append(qty, unitCombo, nameCombo, moveToSelect, removeBtn)

  return row
}

let sectionIdCounter = 0

// A group is one section's worth of ingredients: an optional labeled
// header (the "unsectioned" group at the top has none), its own rows
// container, and its own "+ Add Ingredient" button. sectionLabel is
// null for the unsectioned group, or a string (possibly empty, while
// the user is still typing a name) for a real section.
function createIngredientGroup(sectionLabel) {
  const group = document.createElement('div')
  group.className = 'ingredient-group'
  group.dataset.sectionId = sectionLabel === null ? 'unsectioned' : `sec-${++sectionIdCounter}`

  const rowsEl = document.createElement('div')
  rowsEl.className = 'ingredient-group-rows'

  if (sectionLabel !== null) {
    const header = document.createElement('div')
    header.className = 'section-header-row'

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'section-label-input'
    input.placeholder = 'Section name, e.g. Crust'
    input.value = sectionLabel || ''
    input.addEventListener('input', refreshIngredientGroups)

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'remove-ingredient-btn'
    removeBtn.setAttribute('aria-label', 'Remove section')
    removeBtn.innerHTML = '&times;'
    removeBtn.addEventListener('click', () => {
      // Move this section's ingredients back to "No section" instead of
      // deleting them along with the header they were filed under.
      const unsectionedRows = ingredientsListEl.querySelector(
        '.ingredient-group[data-section-id="unsectioned"] .ingredient-group-rows',
      )
      Array.from(rowsEl.children).forEach((row) => {
        if (unsectionedRows) unsectionedRows.appendChild(row)
      })
      group.remove()
      refreshIngredientGroups()
    })

    header.append(input, removeBtn)
    group.appendChild(header)
  }

  group.appendChild(rowsEl)

  const addBtn = document.createElement('button')
  addBtn.type = 'button'
  addBtn.className = 'btn btn-secondary add-row-btn small-add-btn'
  addBtn.textContent = '+ Add Ingredient'
  addBtn.addEventListener('click', () => {
    rowsEl.appendChild(createIngredientRow({}))
    refreshIngredientGroups()
  })
  group.appendChild(addBtn)

  return group
}

addSectionBtn.addEventListener('click', () => {
  ingredientsListEl.appendChild(createIngredientGroup(''))
  refreshIngredientGroups()
})

// Rebuilds the grouped editor UI from a flat, possibly section-marked
// ingredients array (see parseIngredients/isIngredientSection). Items
// before the first { section } marker land in the unsectioned group.
function setIngredientRows(rows) {
  ingredientsListEl.innerHTML = ''

  const unsectionedGroup = createIngredientGroup(null)
  ingredientsListEl.appendChild(unsectionedGroup)
  let currentRowsEl = unsectionedGroup.querySelector('.ingredient-group-rows')

  const list = rows && rows.length ? rows : [{}]
  for (const item of list) {
    if (isIngredientSection(item)) {
      const group = createIngredientGroup(item.section)
      ingredientsListEl.appendChild(group)
      currentRowsEl = group.querySelector('.ingredient-group-rows')
    } else {
      currentRowsEl.appendChild(createIngredientRow(item))
    }
  }

  refreshIngredientGroups()
}

function getIngredientRows() {
  const raw = []
  Array.from(ingredientsListEl.children).forEach((group) => {
    if (group.dataset.sectionId !== 'unsectioned') {
      const input = group.querySelector('.section-label-input')
      const label = input ? input.value.trim() : ''
      if (label) raw.push({ section: label })
    }
    group.querySelectorAll('.ingredient-row').forEach((row) => {
      const qty = row.querySelector('.ingredient-qty').value.trim()
      const unit = (row.querySelector('.unit-trigger').dataset.value || '').trim()
      const name = row.querySelector('.ingredient-name').value.trim()
      if (name) raw.push({ qty, unit, name })
    })
  })

  // Drop a section header with nothing under it (before the next header
  // or the end of the list) - it would otherwise save as a heading with
  // no ingredients, which is just leftover editor state, not intent.
  return raw.filter((item, i) => {
    if (!isIngredientSection(item)) return true
    const next = raw[i + 1]
    return next && !isIngredientSection(next)
  })
}

// ---------- Recipe photo: upload from device or paste a URL ----------
const RECIPE_IMAGE_BUCKET = 'recipe-images'
const MAX_IMAGE_MB = 8

function updateImagePreview() {
  const url = recipeImageInput.value.trim()
  if (url) {
    imagePreview.src = url
    imagePreview.classList.remove('hidden')
    removeImageBtn.classList.remove('hidden')
  } else {
    imagePreview.removeAttribute('src')
    imagePreview.classList.add('hidden')
    removeImageBtn.classList.add('hidden')
  }
}

imagePreview.addEventListener('error', () => {
  if (recipeImageInput.value.trim()) imagePreview.classList.add('hidden')
})

recipeImageInput.addEventListener('input', updateImagePreview)

removeImageBtn.addEventListener('click', () => {
  recipeImageInput.value = ''
  updateImagePreview()
})

uploadImageBtn.addEventListener('click', () => imageFileInput.click())

imageFileInput.addEventListener('change', async () => {
  const file = imageFileInput.files[0]
  imageFileInput.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('Please choose an image file.')
    return
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    showToast(`Image is too large (max ${MAX_IMAGE_MB}MB).`)
    return
  }
  if (!currentUser) {
    showToast('You must be logged in to upload a photo.')
    return
  }

  const originalLabel = uploadImageBtn.textContent
  uploadImageBtn.disabled = true
  uploadImageBtn.textContent = 'Uploading...'

  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabaseClient.storage.from(RECIPE_IMAGE_BUCKET).upload(path, file)
    if (uploadError) throw uploadError

    const { data } = supabaseClient.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(path)
    recipeImageInput.value = data.publicUrl
    updateImagePreview()
    showToast('Photo uploaded')
  } catch (err) {
    showToast('Upload failed: ' + (err.message || 'unknown error'))
  } finally {
    uploadImageBtn.disabled = false
    uploadImageBtn.textContent = originalLabel
  }
})

// ---------- Tags: pick from your existing tags, or add a new one ----------
const tagsCombo = document.querySelector('.tags-combo')
const tagsPanel = tagsCombo.querySelector('.combo-panel')
const tagsOptionsEl = tagsCombo.querySelector('.combo-options')

let currentTags = []

function renderTagChips() {
  tagsChipsEl.innerHTML = currentTags
    .map(
      (t, i) =>
        `<span class="tag-chip">${escapeHtml(t)}<button type="button" class="remove-tag-btn" data-index="${i}" aria-label="Remove tag">&times;</button></span>`,
    )
    .join('')

  tagsChipsEl.querySelectorAll('.remove-tag-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTags.splice(Number(btn.dataset.index), 1)
      renderTagChips()
    })
  })
}

function addTag(rawTag) {
  const clean = rawTag.trim()
  if (!clean) return
  if (currentTags.some((t) => t.toLowerCase() === clean.toLowerCase())) return
  currentTags.push(clean)
  renderTagChips()
}

// All distinct tags the user has used across their own recipes, so
// they can be picked from instead of retyped on every new recipe.
function getAllUserTags() {
  const set = new Set()
  allRecipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)))
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

function renderTagOptions(query) {
  const q = (query || '').trim().toLowerCase()
  const available = getAllUserTags().filter((t) => !currentTags.some((ct) => ct.toLowerCase() === t.toLowerCase()))
  const matches = q ? available.filter((t) => t.toLowerCase().includes(q)) : available

  if (matches.length) {
    tagsOptionsEl.innerHTML = matches
      .slice(0, 30)
      .map((t) => `<div class="combo-option" data-value="${escapeAttr(t)}">${escapeHtml(t)}</div>`)
      .join('')
  } else if (q) {
    tagsOptionsEl.innerHTML = `<div class="combo-option-empty">Press Enter to add "${escapeHtml(query.trim())}"</div>`
  } else {
    tagsOptionsEl.innerHTML = '<div class="combo-option-empty">No tags yet - type to add one</div>'
  }

  tagsOptionsEl.querySelectorAll('.combo-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      addTag(opt.dataset.value)
      tagsInput.value = ''
      tagsPanel.classList.add('hidden')
      tagsInput.focus()
    })
  })
}

tagsInput.addEventListener('focus', () => {
  closeAllCombos(tagsCombo)
  tagsPanel.classList.remove('hidden')
  renderTagOptions(tagsInput.value)
})

function commitTagFromInput() {
  // Strip a trailing newline/comma left behind by whatever triggered this
  // (a comma key, or a mobile keyboard's Enter/Go inserting a line break).
  addTag(tagsInput.value.replace(/[\n,]+$/, ''))
  tagsInput.value = ''
  renderTagOptions('')
}

tagsInput.addEventListener('input', (e) => {
  // Many mobile keyboards (notably Android/Gboard) don't fire a normal
  // keydown for their Enter/Go key on a plain text input - they only
  // fire this 'input' event with inputType "insertLineBreak". Catching
  // it here is what makes Enter-to-add-a-tag work on phones.
  if (e.inputType === 'insertLineBreak') {
    commitTagFromInput()
    return
  }
  tagsPanel.classList.remove('hidden')
  renderTagOptions(tagsInput.value)
})

tagsInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.keyCode === 13 || e.key === ',') {
    e.preventDefault()
    commitTagFromInput()
  }
})

addTagBtn.addEventListener('click', () => {
  commitTagFromInput()
  tagsInput.focus()
})

function setTags(tags) {
  currentTags = Array.isArray(tags) ? [...tags] : []
  renderTagChips()
  tagsInput.value = ''
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

const viewModal = document.getElementById('view-modal')
const closeViewBtn = document.getElementById('close-view-btn')
const viewImage = document.getElementById('view-image')
const viewTitle = document.getElementById('view-title')
const viewSource = document.getElementById('view-source')
const viewTags = document.getElementById('view-tags')
const viewIngredients = document.getElementById('view-ingredients')
const unitToggleBtn = document.getElementById('unit-toggle-btn')
const viewInstructions = document.getElementById('view-instructions')
const viewFavoriteBtn = document.getElementById('view-favorite-btn')
const viewShareBtn = document.getElementById('view-share-btn')
const viewStopSharingBtn = document.getElementById('view-stop-sharing-btn')
const editRecipeBtn = document.getElementById('edit-recipe-btn')

const toast = document.getElementById('toast')

let currentlyViewingId = null

// ---------- Unit system toggle (metric / imperial / original) ----------
let unitSystem = localStorage.getItem('recipeVaultUnitSystem') || 'original'

function renderIngredientsList(recipe) {
  const items = parseIngredients(recipe.ingredients).map((item) =>
    isIngredientSection(item) ? item : convertIngredientForDisplay(item, unitSystem),
  )
  viewIngredients.innerHTML = renderIngredientsHtml(items)
}

function updateUnitToggleButton() {
  unitToggleBtn.textContent = unitToggleLabel(unitSystem)
}

unitToggleBtn.addEventListener('click', () => {
  unitSystem = nextUnitSystem(unitSystem)
  localStorage.setItem('recipeVaultUnitSystem', unitSystem)
  updateUnitToggleButton()
  const r = allRecipes.find((x) => x.id === currentlyViewingId)
  if (r) renderIngredientsList(r)
})

// ---------- Toast ----------
function showToast(msg) {
  toast.textContent = msg
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 2500)
}

// ---------- Confirm dialog (replaces the native confirm()) ----------
const confirmModal = document.getElementById('confirm-modal')
const confirmMessage = document.getElementById('confirm-message')
const confirmOkBtn = document.getElementById('confirm-ok-btn')
const confirmCancelBtn = document.getElementById('confirm-cancel-btn')

function confirmDialog(message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    confirmMessage.textContent = message
    confirmOkBtn.textContent = okLabel
    confirmModal.classList.remove('hidden')

    function cleanup(result) {
      confirmModal.classList.add('hidden')
      confirmOkBtn.removeEventListener('click', onOk)
      confirmCancelBtn.removeEventListener('click', onCancel)
      resolve(result)
    }
    function onOk() {
      cleanup(true)
    }
    function onCancel() {
      cleanup(false)
    }

    confirmOkBtn.addEventListener('click', onOk)
    confirmCancelBtn.addEventListener('click', onCancel)
  })
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
let selectedFilterTags = new Set()
let showFavoritesOnly = false

// Stable sort (favorites first, otherwise keeps existing created_at order)
function sortFavoritesFirst(recipes) {
  recipes.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0))
}

async function loadRecipes() {
  const { data, error } = await supabaseClient.from('recipes').select('*').order('created_at', { ascending: false })

  if (error) {
    showToast('Failed to load recipes: ' + error.message)
    return
  }
  allRecipes = data || []
  sortFavoritesFirst(allRecipes)
  // Drop any filter tags that no longer exist on any recipe.
  const stillValid = new Set(getAllUserTags())
  selectedFilterTags.forEach((t) => {
    if (!stillValid.has(t)) selectedFilterTags.delete(t)
  })
  renderTagFilterBar()
  applyFilters()
}

async function toggleFavorite(id) {
  const recipe = allRecipes.find((r) => r.id === id)
  if (!recipe) return

  const newValue = !recipe.is_favorite
  const { error } = await supabaseClient.from('recipes').update({ is_favorite: newValue }).eq('id', id)
  if (error) {
    showToast('Failed to update favorite: ' + error.message)
    return
  }

  recipe.is_favorite = newValue
  sortFavoritesFirst(allRecipes)
  applyFilters()
  if (currentlyViewingId === id) updateViewFavoriteButton(recipe)
}

favoritesFilterBtn.addEventListener('click', () => {
  showFavoritesOnly = !showFavoritesOnly
  favoritesFilterBtn.classList.toggle('active', showFavoritesOnly)
  favoritesFilterBtn.textContent = showFavoritesOnly ? '★ Favorites' : '☆ Favorites'
  applyFilters()
})

function renderTagFilterBar() {
  const tags = getAllUserTags()
  if (!tags.length) {
    tagFilterBar.innerHTML = ''
    return
  }

  const chips = tags
    .map(
      (t) =>
        `<button type="button" class="filter-tag${selectedFilterTags.has(t) ? ' active' : ''}" data-tag="${escapeAttr(t)}">${escapeHtml(t)}</button>`,
    )
    .join('')
  const clearBtn = selectedFilterTags.size ? '<button type="button" class="filter-clear-btn">Clear filters</button>' : ''

  tagFilterBar.innerHTML = chips + clearBtn

  tagFilterBar.querySelectorAll('.filter-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag
      if (selectedFilterTags.has(tag)) {
        selectedFilterTags.delete(tag)
      } else {
        selectedFilterTags.add(tag)
      }
      renderTagFilterBar()
      applyFilters()
    })
  })

  const clear = tagFilterBar.querySelector('.filter-clear-btn')
  if (clear) {
    clear.addEventListener('click', () => {
      selectedFilterTags.clear()
      renderTagFilterBar()
      applyFilters()
    })
  }
}

// Applies the current search text and selected tag filters together.
// Tag filters use OR logic (a recipe matches if it has any selected tag).
function applyFilters() {
  const q = searchInput.value.trim().toLowerCase()

  const filtered = allRecipes.filter((r) => {
    if (showFavoritesOnly && !r.is_favorite) return false

    if (selectedFilterTags.size) {
      const recipeTags = r.tags || []
      const hasSelectedTag = recipeTags.some((t) => selectedFilterTags.has(t))
      if (!hasSelectedTag) return false
    }

    if (!q) return true

    const ingredientNames = parseIngredients(r.ingredients)
      .map((i) => i.name || i.section || '')
      .join(' ')
    const haystack = [r.title, ingredientNames, (r.tags || []).join(' ')].join(' ').toLowerCase()
    return haystack.includes(q)
  })

  renderRecipes(filtered)
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
      <div class="recipe-card-media">
        ${r.image_url ? `<img class="recipe-card-img" src="${escapeAttr(r.image_url)}" onerror="this.style.display='none'" />` : `<div class="recipe-card-img"></div>`}
        <button
          type="button"
          class="card-favorite-btn${r.is_favorite ? ' active' : ''}"
          aria-label="${r.is_favorite ? 'Remove from favorites' : 'Add to favorites'}"
        >${r.is_favorite ? '★' : '☆'}</button>
      </div>
      <div class="recipe-card-body">
        <p class="recipe-card-title">${escapeHtml(r.title)}</p>
        <div class="recipe-card-tags">${tags}</div>
      </div>
    `

    card.querySelector('.card-favorite-btn').addEventListener('click', (e) => {
      e.stopPropagation()
      toggleFavorite(r.id)
    })

    recipeGrid.appendChild(card)
  }
}

searchInput.addEventListener('input', () => applyFilters())

// ---------- Add / Edit modal ----------
addRecipeBtn.addEventListener('click', () => openAddModal())
closeModalBtn.addEventListener('click', () => recipeModal.classList.add('hidden'))

function openAddModal() {
  modalTitle.textContent = 'Add Recipe'
  recipeForm.reset()
  recipeIdInput.value = ''
  importUrlInput.value = ''
  setTags([])
  setIngredientRows([{}])
  setInstructionRows([''])
  updateImagePreview()
  deleteRecipeBtn.classList.add('hidden')
  recipeModal.classList.remove('hidden')
}

function openEditModal(recipe) {
  modalTitle.textContent = 'Edit Recipe'
  recipeIdInput.value = recipe.id
  importUrlInput.value = ''
  recipeTitleInput.value = recipe.title || ''
  recipeSourceInput.value = recipe.source_url || ''
  recipeImageInput.value = recipe.image_url || ''
  setTags(recipe.tags || [])
  setIngredientRows(parseIngredients(recipe.ingredients))
  setInstructionRows(parseInstructions(recipe.instructions))
  updateImagePreview()
  deleteRecipeBtn.classList.remove('hidden')
  viewModal.classList.add('hidden')
  recipeModal.classList.remove('hidden')
}

importUrlBtn.addEventListener('click', async () => {
  const url = importUrlInput.value.trim()
  if (!url) {
    showToast('Paste a recipe link first.')
    return
  }

  const originalLabel = importUrlBtn.textContent
  importUrlBtn.disabled = true
  importUrlBtn.textContent = 'Fetching...'

  try {
    const { data, error } = await supabaseClient.functions.invoke('import-recipe', { body: { url } })

    if (error) {
      // If the Edge Function responded with a non-2xx status, supabase-js
      // discards the JSON body and gives us a generic error - try to read
      // the real message back out of the raw response if it's there.
      let detail = error.message || 'unknown error'
      if (error.context && typeof error.context.text === 'function') {
        try {
          const bodyText = await error.context.text()
          const parsed = JSON.parse(bodyText)
          if (parsed && parsed.error) detail = parsed.error
        } catch (e) {
          // raw body wasn't JSON we could parse - fall back to the generic message
        }
      }
      throw new Error(detail)
    }

    if (data && data.error) {
      showToast(data.error)
      return
    }

    const gotSomething = data && (data.title || data.image_url || data.ingredients?.length || data.instructions?.length)
    if (!gotSomething) {
      showToast('Import returned nothing usable. Check that the import-recipe Edge Function was deployed correctly.')
      return
    }

    if (data.title) recipeTitleInput.value = data.title
    recipeSourceInput.value = data.source_url || url

    if (data.image_url) {
      recipeImageInput.value = data.image_url
      updateImagePreview()
    }

    if (Array.isArray(data.ingredients) && data.ingredients.length) {
      setIngredientRows(data.ingredients)
    }

    if (Array.isArray(data.instructions) && data.instructions.length) {
      setInstructionRows(data.instructions)
    }

    showToast('Recipe imported - double-check it before saving')
  } catch (err) {
    showToast('Import failed: ' + (err.message || 'unknown error'))
  } finally {
    importUrlBtn.disabled = false
    importUrlBtn.textContent = originalLabel
  }
})

recipeForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  // Some mobile keyboards trigger the form's implicit submit when Enter
  // is pressed in the tag field instead of (or in addition to) the input
  // event our own handler listens for. e.submitter is only set when a
  // real button was clicked, so its absence here means Enter did this -
  // treat it as "add tag," not "save recipe."
  if (!e.submitter && document.activeElement === tagsInput) {
    commitTagFromInput()
    return
  }

  if (tagsInput.value.trim()) {
    addTag(tagsInput.value)
    tagsInput.value = ''
  }

  const ingredientRows = getIngredientRows()
  if (!ingredientRows.some((r) => !isIngredientSection(r))) {
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
    tags: currentTags.slice(),
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
  importUrlInput.value = ''
  showToast(id ? 'Recipe updated' : 'Recipe added')
  loadRecipes()
})

deleteRecipeBtn.addEventListener('click', async () => {
  const id = recipeIdInput.value
  if (!id) return
  const confirmed = await confirmDialog("Delete this recipe? This can't be undone.")
  if (!confirmed) return

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

  renderIngredientsList(r)
  updateUnitToggleButton()

  viewInstructions.innerHTML = parseInstructions(r.instructions)
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('')

  updateViewFavoriteButton(r)
  updateViewShareState(r)

  viewModal.classList.remove('hidden')
}

function updateViewFavoriteButton(recipe) {
  const fav = !!recipe.is_favorite
  viewFavoriteBtn.textContent = fav ? '★ Favorited' : '☆ Favorite'
  viewFavoriteBtn.classList.toggle('active', fav)
}

viewFavoriteBtn.addEventListener('click', () => {
  if (currentlyViewingId) toggleFavorite(currentlyViewingId)
})

function updateViewShareState(recipe) {
  viewStopSharingBtn.classList.toggle('hidden', !recipe.is_public)
}

function getShareUrl(id) {
  return `${window.location.origin}${window.location.pathname.replace(/index\.html$/, '')}share.html?id=${id}`
}

async function shareRecipe(id) {
  const recipe = allRecipes.find((r) => r.id === id)
  if (!recipe) return

  if (!recipe.is_public) {
    const { error } = await supabaseClient.from('recipes').update({ is_public: true }).eq('id', id)
    if (error) {
      showToast('Failed to enable sharing: ' + error.message)
      return
    }
    recipe.is_public = true
    if (currentlyViewingId === id) updateViewShareState(recipe)
  }

  const shareUrl = getShareUrl(id)

  if (navigator.share) {
    try {
      await navigator.share({ title: recipe.title, text: `Check out this recipe: ${recipe.title}`, url: shareUrl })
    } catch (e) {
      // user cancelled the share sheet - not an error
    }
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Link copied to clipboard')
    } catch (e) {
      showToast(shareUrl)
    }
  } else {
    showToast(shareUrl)
  }
}

async function stopSharing(id) {
  const recipe = allRecipes.find((r) => r.id === id)
  if (!recipe) return

  const { error } = await supabaseClient.from('recipes').update({ is_public: false }).eq('id', id)
  if (error) {
    showToast('Failed to stop sharing: ' + error.message)
    return
  }
  recipe.is_public = false
  if (currentlyViewingId === id) updateViewShareState(recipe)
  showToast('Stopped sharing this recipe')
}

viewShareBtn.addEventListener('click', () => {
  if (currentlyViewingId) shareRecipe(currentlyViewingId)
})

viewStopSharingBtn.addEventListener('click', () => {
  if (currentlyViewingId) stopSharing(currentlyViewingId)
})

closeViewBtn.addEventListener('click', () => viewModal.classList.add('hidden'))
editRecipeBtn.addEventListener('click', () => {
  const r = allRecipes.find((x) => x.id === currentlyViewingId)
  if (r) openEditModal(r)
})

// ---------- Service worker registration ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {})
  })
}
