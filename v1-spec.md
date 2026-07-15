# v1 Spec — CX AI-Proficiency Build Round

**Written:** 2026-07-15, before any code exists. This is the first-pass framing;
if it changes during the build, that change will be recorded separately
(v2 doc or a noted pivot in the transcript), not edited back into this file.

## Task (from brief)

Simple e-commerce storefront with a wishlist feature. Product shape, item
shape, and persistence are undefined by the brief — my calls. Hard
requirement: wishlists must support **merging** two distinct lists into one.

## Decisions

### Product shape
```
Product = { id, name, price, image }
```
Minimal on purpose. No variants/categories in v1 — the interesting problem
here is the wishlist/merge logic, not the catalog.

### Wishlist item shape
```
WishlistItem = { productId, quantity, addedAt }
```
**Note on a mismatch I caught while speccing this:** I initially picked a
"minimal" product shape with no quantity field, but also picked "merge by
summing quantities" as the merge rule. Those two don't fit together —
summing requires *something* to carry a quantity. Resolution: quantity
lives on the WishlistItem (how many of this product you want), not on the
Product itself (the catalog entry stays quantity-less, since quantity is
per-list, not an inherent property of the product). This is a deliberate
distinction, not an afterthought.

### Persistence
- **localStorage**, single device, no backend/account.
- Multiple **named lists** stored client-side (e.g. "Birthday", "Home
  Office"). Merging is meaningful because a user can genuinely have two+
  distinct named lists to combine — this also sidesteps having to simulate
  multi-user/multi-device state within a 90-minute static-site constraint
  (GitHub Pages has no backend).

### List management (v1 scope)
Create, rename, delete, merge. Chose the fuller CRUD set over a bare-bones
"create + merge only" because rename/delete are cheap to build alongside
create and make the merge scenario actually testable (need to be able to
clean up test lists, rename to disambiguate before merging, etc.).

### Merge semantics
- Merging list A into list B (or both into a new list — TBD at
  implementation time which direction reads more naturally in the UI)
  produces a union of items by `productId`.
- If the same `productId` appears in both lists, the merged item's
  `quantity` is the **sum** of the two quantities.
- `addedAt` for a merged duplicate: keep the earlier of the two timestamps
  (arbitrary but defensible choice — "when did I first want this" outlasts
  which list it started in). Will revisit if this causes confusing UI
  during testing.

## Open questions / risks going into the build
- Merge UI: pick-two-lists-and-combine vs. drag-one-into-another — will
  decide based on what's fastest to build cleanly in the time budget.
- Edge cases I intend to explicitly test once built: merging a list with
  itself, merging an empty list, merging two lists with zero overlap,
  merging two lists where *all* items overlap, quantity overflow/negative
  input, renaming a list to a duplicate name, deleting a list mid-merge-flow.
- Not yet decided: whether quantity is user-editable from the wishlist view
  itself or fixed at "1" per add-to-wishlist click. Leaning toward editable
  since the merge-sum rule only matters if quantities can meaningfully
  differ.
