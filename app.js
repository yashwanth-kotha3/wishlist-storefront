(function () {
// ---- Data ----

const PRODUCTS = [
  { id: "p1", name: "Ceramic Pour-Over Kettle", price: 42.0, image: "https://placehold.co/300x200?text=Kettle" },
  { id: "p2", name: "Weighted Notebook", price: 18.5, image: "https://placehold.co/300x200?text=Notebook" },
  { id: "p3", name: "Cast Iron Trivet", price: 24.0, image: "https://placehold.co/300x200?text=Trivet" },
  { id: "p4", name: "Linen Throw Blanket", price: 65.0, image: "https://placehold.co/300x200?text=Blanket" },
  { id: "p5", name: "Desk Lamp, Brass", price: 89.0, image: "https://placehold.co/300x200?text=Lamp" },
  { id: "p6", name: "Enamel Mug Set (4)", price: 32.0, image: "https://placehold.co/300x200?text=Mugs" },
  { id: "p7", name: "Wool Slippers", price: 38.0, image: "https://placehold.co/300x200?text=Slippers" },
  { id: "p8", name: "Glass Watering Can", price: 27.5, image: "https://placehold.co/300x200?text=Watering+Can" },
];

const STORAGE_KEY = "cx-wishlist-data-v1";

// ---- Persistence ----
// Shape:
// { lists: { [listId]: { id, name, createdAt, items: { [productId]: { productId, quantity, addedAt } } } } }

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = { lists: {} };
    const defaultList = createList(initial, "My Wishlist");
    saveState(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.lists) {
      throw new Error("malformed state");
    }
    return parsed;
  } catch (e) {
    console.warn("Corrupt wishlist data, resetting.", e);
    const fresh = { lists: {} };
    createList(fresh, "My Wishlist");
    saveState(fresh);
    return fresh;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---- List operations ----

function createList(state, name) {
  const id = uid("list");
  state.lists[id] = { id, name, createdAt: Date.now(), items: {} };
  return state.lists[id];
}

function renameList(state, listId, newName) {
  if (!state.lists[listId]) return false;
  state.lists[listId].name = newName;
  return true;
}

function deleteList(state, listId) {
  if (!state.lists[listId]) return false;
  delete state.lists[listId];
  return true;
}

function addItemToList(state, listId, productId, quantity = 1) {
  const list = state.lists[listId];
  if (!list) return false;
  const existing = list.items[productId];
  if (existing) {
    existing.quantity += quantity;
  } else {
    list.items[productId] = { productId, quantity, addedAt: Date.now() };
  }
  return true;
}

function setItemQuantity(state, listId, productId, quantity) {
  const list = state.lists[listId];
  if (!list || !list.items[productId]) return false;
  const q = Math.max(0, Math.floor(quantity) || 0);
  if (q === 0) {
    delete list.items[productId];
  } else {
    list.items[productId].quantity = q;
  }
  return true;
}

function removeItemFromList(state, listId, productId) {
  const list = state.lists[listId];
  if (!list) return false;
  delete list.items[productId];
  return true;
}

// Merges sourceListId INTO targetListId (source items are combined into target).
// Same productId in both -> quantity summed, earlier addedAt kept.
// Source list is left untouched; caller decides whether to delete it after.
function mergeLists(state, targetListId, sourceListId) {
  const target = state.lists[targetListId];
  const source = state.lists[sourceListId];
  if (!target || !source) return false;
  if (targetListId === sourceListId) return false; // merging a list with itself is a no-op, not an error

  for (const productId of Object.keys(source.items)) {
    const sourceItem = source.items[productId];
    const targetItem = target.items[productId];
    if (targetItem) {
      targetItem.quantity += sourceItem.quantity;
      targetItem.addedAt = Math.min(targetItem.addedAt, sourceItem.addedAt);
    } else {
      target.items[productId] = { ...sourceItem };
    }
  }
  return true;
}

window.WishlistData = {
  PRODUCTS,
  loadState,
  saveState,
  createList,
  renameList,
  deleteList,
  addItemToList,
  setItemQuantity,
  removeItemFromList,
  mergeLists,
};
})();
