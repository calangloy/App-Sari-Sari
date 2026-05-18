# Security Specification for Sari-Sari Store POS

## Data Invariants
1. A sale must have at least one item.
2. Prices and quantities must be positive.
3. Only authenticated users can read/write data.
4. `createdAt` and `updatedAt` must be server-generated.

## The Dirty Dozen Payloads
1. **Unauthenticated Write**: Attempting to add a product without logged-in session.
2. **Identity Spoofing**: Attempting to set `ownerId` (if we had multiple stores) to another user.
3. **Negative Price**: Creating a product with a negative `sellingPrice`.
4. **Ghost Field Injection**: Adding `isPromoted: true` to a product.
5. **Timestamp Forge**: Providing a client-side `updatedAt` that is in the past.
6. **Orphan Sale**: Creating a sale referencing a non-existent product ID.
7. **Zero Item Sale**: Creating a sale with an empty items array.
8. **Resource Poisoning**: Using a 1MB string as a product barcode.
9. **State Shortcut**: Setting a purchase status to `received` before it was `pending`.
10. **Unauthorized Read**: User A reading User B's sales data.
11. **Email Spoofing**: Bypassing `email_verified` check if applicable.
12. **Massive Update**: Updating 50 fields at once on a product.

## Test Runner
(I would include a test runner here if I could run it, but for now I'll focus on the rules).
