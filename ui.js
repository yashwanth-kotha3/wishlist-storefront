const { PRODUCTS, loadState, saveState, createList, renameList, deleteList, isListNameTaken,
        addItemToList, setItemQuantity, removeItemFromList, mergeLists } = window.WishlistData;

let state = loadState();
let currentListId = Object.keys(state.lists)[0];

const productGrid = document.getElementById("productGrid");
const wishlistToggle = document.getElementById("wishlistToggle");
const wishlistPanel = document.getElementById("wishlistPanel");
const closePanel = document.getElementById("closePanel");
const wishlistCount = document.getElementById("wishlistCount");
const listSelect = document.getElementById("listSelect");
const newListBtn = document.getElementById("newListBtn");
const renameListBtn = document.getElementById("renameListBtn");
const deleteListBtn = document.getElementById("deleteListBtn");
const mergeSelect = document.getElementById("mergeSelect");
const mergeBtn = document.getElementById("mergeBtn");
const mergeHint = document.getElementById("mergeHint");
const wishlistItemsEl = document.getElementById("wishlistItems");
const emptyHint = document.getElementById("emptyHint");
const toast = document.getElementById("toast");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalInput = document.getElementById("modalInput");
const modalError = document.getElementById("modalError");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");

function persist() {
  saveState(state);
}

// Promise-based replacement for prompt()/confirm(): native dialogs are
// silently auto-dismissed in some automated/sandboxed contexts (they don't
// even block execution there), and look inconsistent with the rest of the
// UI. showModal(opts) drives the same #modalOverlay markup for both an
// input prompt and a yes/no confirm depending on whether opts.input is set.
function showModal({ title, message, input = false, defaultValue = "", validate }) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message || "";
    modalMessage.classList.toggle("hidden", !message);
    modalInput.classList.toggle("hidden", !input);
    modalInput.value = defaultValue;
    modalError.textContent = "";
    modalError.classList.add("hidden");
    modalOverlay.classList.remove("hidden");
    if (input) modalInput.focus();

    function cleanup(result) {
      modalOverlay.classList.add("hidden");
      modalConfirm.removeEventListener("click", onConfirm);
      modalCancel.removeEventListener("click", onCancel);
      modalInput.removeEventListener("keydown", onKeydown);
      resolve(result);
    }
    function onConfirm() {
      if (!input) {
        cleanup(true);
        return;
      }
      const value = modalInput.value.trim();
      if (value && validate) {
        const error = validate(value);
        if (error) {
          modalError.textContent = error;
          modalError.classList.remove("hidden");
          return; // keep the modal open so the user can correct it
        }
      }
      cleanup(value || null);
    }
    function onCancel() {
      cleanup(input ? null : false);
    }
    function onKeydown(e) {
      if (e.key === "Enter") onConfirm();
      if (e.key === "Escape") onCancel();
    }

    modalConfirm.addEventListener("click", onConfirm);
    modalCancel.addEventListener("click", onCancel);
    modalInput.addEventListener("keydown", onKeydown);
  });
}

function promptModal(title, defaultValue = "", validate) {
  return showModal({ title, input: true, defaultValue, validate });
}

function confirmModal(title, message) {
  return showModal({ title, message, input: false });
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function productById(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function totalItemCount(list) {
  return Object.values(list.items).reduce((sum, it) => sum + it.quantity, 0);
}

// ---- Rendering ----

function renderProductGrid() {
  productGrid.innerHTML = "";
  for (const product of PRODUCTS) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="product-card-body">
        <h3>${product.name}</h3>
        <p class="product-price">$${product.price.toFixed(2)}</p>
        <button class="add-btn" data-id="${product.id}">Add to Wishlist</button>
      </div>
    `;
    productGrid.appendChild(card);
  }
}

function renderListSelectors() {
  const lists = Object.values(state.lists).sort((a, b) => a.createdAt - b.createdAt);

  listSelect.innerHTML = lists
    .map((l) => `<option value="${l.id}">${escapeHtml(l.name)} (${totalItemCount(l)})</option>`)
    .join("");
  listSelect.value = currentListId;

  const otherLists = lists.filter((l) => l.id !== currentListId);
  if (otherLists.length === 0) {
    mergeSelect.innerHTML = `<option value="">No other lists</option>`;
    mergeSelect.disabled = true;
    mergeBtn.disabled = true;
    mergeHint.textContent = "Create a second list to enable merging.";
  } else {
    mergeSelect.innerHTML = otherLists
      .map((l) => `<option value="${l.id}">${escapeHtml(l.name)} (${totalItemCount(l)})</option>`)
      .join("");
    mergeSelect.disabled = false;
    mergeBtn.disabled = false;
    mergeHint.textContent = "Matching items sum their quantities; the source list is left untouched.";
  }
}

function renderWishlistItems() {
  const list = state.lists[currentListId];
  wishlistItemsEl.innerHTML = "";
  const items = Object.values(list.items).sort((a, b) => a.addedAt - b.addedAt);

  emptyHint.classList.toggle("hidden", items.length > 0);

  for (const item of items) {
    const product = productById(item.productId);
    if (!product) continue; // defensive: product removed from catalog since item was added
    const li = document.createElement("li");
    li.className = "wishlist-item";
    li.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="wishlist-item-info">
        <h4>${escapeHtml(product.name)}</h4>
        <p>$${product.price.toFixed(2)} each</p>
      </div>
      <div class="qty-controls">
        <button data-action="dec" data-id="${item.productId}" aria-label="Decrease quantity">-</button>
        <span>${item.quantity}</span>
        <button data-action="inc" data-id="${item.productId}" aria-label="Increase quantity">+</button>
      </div>
      <button class="remove-btn" data-action="remove" data-id="${item.productId}">Remove</button>
    `;
    wishlistItemsEl.appendChild(li);
  }
}

function renderWishlistCount() {
  const total = Object.values(state.lists).reduce((sum, l) => sum + totalItemCount(l), 0);
  wishlistCount.textContent = total;
}

function renderAll() {
  renderListSelectors();
  renderWishlistItems();
  renderWishlistCount();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Event wiring ----

productGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-btn");
  if (!btn) return;
  addItemToList(state, currentListId, btn.dataset.id, 1);
  persist();
  renderAll();
  showToast("Added to wishlist");
});

wishlistToggle.addEventListener("click", () => {
  wishlistPanel.classList.toggle("hidden");
});
closePanel.addEventListener("click", () => wishlistPanel.classList.add("hidden"));

listSelect.addEventListener("change", () => {
  currentListId = listSelect.value;
  renderAll();
});

function duplicateNameError(name, excludeListId) {
  return isListNameTaken(state, name, excludeListId)
    ? `A list named "${name}" already exists.`
    : null;
}

newListBtn.addEventListener("click", async () => {
  const name = await promptModal("New list name", "", (value) => duplicateNameError(value));
  if (!name) return;
  const list = createList(state, name);
  currentListId = list.id;
  persist();
  renderAll();
});

renameListBtn.addEventListener("click", async () => {
  const list = state.lists[currentListId];
  const name = await promptModal("Rename list", list.name, (value) =>
    duplicateNameError(value, currentListId)
  );
  if (!name) return;
  renameList(state, currentListId, name);
  persist();
  renderAll();
});

deleteListBtn.addEventListener("click", async () => {
  const listIds = Object.keys(state.lists);
  if (listIds.length <= 1) {
    showToast("Can't delete your only list");
    return;
  }
  const list = state.lists[currentListId];
  const ok = await confirmModal("Delete list?", `Delete "${list.name}"? This can't be undone.`);
  if (!ok) return;
  deleteList(state, currentListId);
  currentListId = Object.keys(state.lists)[0];
  persist();
  renderAll();
});

mergeBtn.addEventListener("click", async () => {
  const sourceId = mergeSelect.value;
  if (!sourceId) return;
  const sourceName = state.lists[sourceId].name;
  const targetName = state.lists[currentListId].name;
  const ok = await confirmModal(
    "Merge lists?",
    `Merge "${sourceName}" into "${targetName}"? "${sourceName}" will still exist afterward — delete it separately if you don't need it.`
  );
  if (!ok) return;
  mergeLists(state, currentListId, sourceId);
  persist();
  renderAll();
  showToast(`Merged "${sourceName}" into "${targetName}"`);
});

wishlistItemsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  const list = state.lists[currentListId];
  const item = list.items[id];
  if (!item) return;

  if (action === "inc") {
    setItemQuantity(state, currentListId, id, item.quantity + 1);
  } else if (action === "dec") {
    setItemQuantity(state, currentListId, id, item.quantity - 1);
  } else if (action === "remove") {
    removeItemFromList(state, currentListId, id);
  }
  persist();
  renderAll();
});

renderProductGrid();
renderAll();
