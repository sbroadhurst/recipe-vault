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
