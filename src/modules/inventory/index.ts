/**
 * inventory module — public entry point.
 *
 * Owns on-hand stock, reservations, and the movement ledger. One inventory
 * item per product variant. Counters change in PostgreSQL triggers, not by
 * application arithmetic. Vocabulary is defined in `docs/inventory.md`.
 *
 * Everything this module offers to the rest of the application is re-exported
 * here. Its `domain/`, `application/`, and `infrastructure/` layers are
 * internal and may not be imported from outside this folder.
 *
 * No business logic yet; see `src/modules/README.md`.
 */

export {};
