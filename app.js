// ============================================================
// Recipe Vault - app logic
// Uses Supabase for auth + database (see config.js for keys)
// ============================================================

const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// ---------- State ----------
let currentUser = null;
let allRecipes = [];
let isSignUpMode = false;

// ---------- Elements ----------
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const authToggleBtn = document.getElementById("auth-toggle-btn");
const authToggleText = document.getElementById("auth-toggle-text");

const logoutBtn = document.getElementById("logout-btn");
const addRecipeBtn = document.getElementById("add-recipe-btn");
const searchInput = document.getElementById("search-input");
const recipeGrid = document.getElementById("recipe-grid");
const emptyState = document.getElementById("empty-state");

const recipeModal = document.getElementById("recipe-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const recipeForm = document.getElementById("recipe-form");
const modalTitle = document.getElementById("modal-title");
const recipeIdInput = document.getElementById("recipe-id");
const recipeTitleInput = document.getElementById("recipe-title");
const recipeSourceInput = document.getElementById("recipe-source");
const recipeImageInput = document.getElementById("recipe-image");
const recipeTagsInput = document.getElementById("recipe-tags");
const recipeIngredientsInput = document.getElementById("recipe-ingredients");
const recipeInstructionsInput = document.getElementById("recipe-instructions");
const deleteRecipeBtn = document.getElementById("delete-recipe-btn");
const importUrlBtn = document.getElementById("import-url-btn");

const viewModal = document.getElementById("view-modal");
const closeViewBtn = document.getElementById("close-view-btn");
const viewImage = document.getElementById("view-image");
const viewTitle = document.getElementById("view-title");
const viewSource = document.getElementById("view-source");
const viewTags = document.getElementById("view-tags");
const viewIngredients = document.getElementById("view-ingredients");
const viewInstructions = document.getElementById("view-instructions");
const editRecipeBtn = document.getElementById("edit-recipe-btn");

const toast = document.getElementById("toast");

let currentlyViewingId = null;

// ---------- Toast ----------
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

// ---------- Auth ----------
authToggleBtn.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  authSubmit.textContent = isSignUpMode ? "Sign Up" : "Log In";
  authToggleText.textContent = isSignUpMode ? "Already have an account?" : "Don't have an account?";
  authToggleBtn.textContent = isSignUpMode ? "Log In" : "Sign Up";
  authMessage.textContent = "";
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authMessage.textContent = "";
  const email = authEmail.value.trim();
  const password = authPassword.value;

  authSubmit.disabled = true;
  try {
    if (isSignUpMode) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user && !data.session) {
        authMessage.style.color = "#2e7d32";
        authMessage.textContent = "Check your email to confirm your account, then log in.";
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    authMessage.style.color = "#c0392b";
    authMessage.textContent = err.message || "Something went wrong.";
  } finally {
    authSubmit.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session ? session.user : null;
  if (currentUser) {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    loadRecipes();
  } else {
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});

// ---------- Recipes: load & render ----------
async function loadRecipes() {
  const { data, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast("Failed to load recipes: " + error.message);
    return;
  }
  allRecipes = data || [];
  renderRecipes(allRecipes);
}

function renderRecipes(recipes) {
  recipeGrid.innerHTML = "";
  emptyState.classList.toggle("hidden", recipes.length > 0);

  for (const r of recipes) {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.addEventListener("click", () => openViewModal(r.id));

    const tags = (r.tags || []).slice(0, 3)
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    card.innerHTML = `
      ${r.image_url ? `<img class="recipe-card-img" src="${escapeAttr(r.image_url)}" onerror="this.style.display='none'" />` : `<div class="recipe-card-img"></div>`}
      <div class="recipe-card-body">
        <p class="recipe-card-title">${escapeHtml(r.title)}</p>
        <div class="recipe-card-tags">${tags}</div>
      </div>
    `;
    recipeGrid.appendChild(card);
  }
}

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { renderRecipes(allRecipes); return; }
  const filtered = allRecipes.filter((r) => {
    const haystack = [
      r.title,
      r.ingredients,
      (r.tags || []).join(" "),
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  });
  renderRecipes(filtered);
});

// ---------- Add / Edit modal ----------
addRecipeBtn.addEventListener("click", () => openAddModal());
closeModalBtn.addEventListener("click", () => recipeModal.classList.add("hidden"));

function openAddModal() {
  modalTitle.textContent = "Add Recipe";
  recipeForm.reset();
  recipeIdInput.value = "";
  deleteRecipeBtn.classList.add("hidden");
  recipeModal.classList.remove("hidden");
}

function openEditModal(recipe) {
  modalTitle.textContent = "Edit Recipe";
  recipeIdInput.value = recipe.id;
  recipeTitleInput.value = recipe.title || "";
  recipeSourceInput.value = recipe.source_url || "";
  recipeImageInput.value = recipe.image_url || "";
  recipeTagsInput.value = (recipe.tags || []).join(", ");
  recipeIngredientsInput.value = recipe.ingredients || "";
  recipeInstructionsInput.value = recipe.instructions || "";
  deleteRecipeBtn.classList.remove("hidden");
  viewModal.classList.add("hidden");
  recipeModal.classList.remove("hidden");
}

importUrlBtn.addEventListener("click", () => {
  showToast("Auto-fill from a link is coming in a future version!");
});

recipeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    title: recipeTitleInput.value.trim(),
    source_url: recipeSourceInput.value.trim() || null,
    image_url: recipeImageInput.value.trim() || null,
    tags: recipeTagsInput.value.split(",").map((t) => t.trim()).filter(Boolean),
    ingredients: recipeIngredientsInput.value.trim(),
    instructions: recipeInstructionsInput.value.trim(),
  };

  const id = recipeIdInput.value;

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("recipes").update(payload).eq("id", id));
  } else {
    payload.user_id = currentUser.id;
    ({ error } = await supabaseClient.from("recipes").insert(payload));
  }

  if (error) {
    showToast("Save failed: " + error.message);
    return;
  }

  recipeModal.classList.add("hidden");
  showToast(id ? "Recipe updated" : "Recipe added");
  loadRecipes();
});

deleteRecipeBtn.addEventListener("click", async () => {
  const id = recipeIdInput.value;
  if (!id) return;
  if (!confirm("Delete this recipe? This can't be undone.")) return;

  const { error } = await supabaseClient.from("recipes").delete().eq("id", id);
  if (error) {
    showToast("Delete failed: " + error.message);
    return;
  }
  recipeModal.classList.add("hidden");
  showToast("Recipe deleted");
  loadRecipes();
});

// ---------- View modal ----------
function openViewModal(id) {
  const r = allRecipes.find((x) => x.id === id);
  if (!r) return;
  currentlyViewingId = id;

  viewTitle.textContent = r.title;

  if (r.image_url) {
    viewImage.src = r.image_url;
    viewImage.classList.remove("hidden");
  } else {
    viewImage.classList.add("hidden");
  }

  if (r.source_url) {
    viewSource.href = r.source_url;
    viewSource.classList.remove("hidden");
  } else {
    viewSource.classList.add("hidden");
  }

  viewTags.innerHTML = (r.tags || [])
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

  viewIngredients.innerHTML = (r.ingredients || "")
    .split("\n").filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`).join("");

  viewInstructions.textContent = r.instructions || "";

  viewModal.classList.remove("hidden");
}

closeViewBtn.addEventListener("click", () => viewModal.classList.add("hidden"));
editRecipeBtn.addEventListener("click", () => {
  const r = allRecipes.find((x) => x.id === currentlyViewingId);
  if (r) openEditModal(r);
});

// ---------- Helpers ----------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(str) { return escapeHtml(str); }

// ---------- Service worker registration ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
