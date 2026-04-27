// Drizzle schema barrel. Tables live in this folder, one file per bounded context
// (e.g. `wards.ts`, `users.ts`, `reports.ts`). M1 keeps this empty by design — M2
// introduces the first migration with the canonical schema and RLS policies.
export {};
