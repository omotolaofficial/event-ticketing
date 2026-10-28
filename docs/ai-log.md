# AI Work Log

## 2026-10-27 — Booking reference, waitlist, and test improvements

### Defects found and fixes made

- Booking references were generated as eight uppercase hexadecimal characters without checking whether the reference was already in `bookingsByReference`. `bookTickets` now retries generation when a reference is already present. The reference format is unchanged.
- `processWaitlist` handled only one request per call. It now promotes consecutive eligible requests from the queue head while inventory permits, stops at the first request that does not fit, and returns the first promoted booking (or `undefined` if none were promoted). This preserves strict FIFO and does not skip an oversized head request.
- The previous test files printed outcomes without assertions. They now use `node:test` and `node:assert/strict` to check domain errors, capacity, rejected-booking inventory, cancellation, repeat cancellation, booking lookup, reference uniqueness, queue order, and waitlist promotion behavior.

### Verification

- `node --test test/test-reference-uniqueness.js`: 1 passed, 0 failed. The deterministic test generates the same reference bytes twice, then a different value, and verifies both bookings remain findable.
- `node --test test/test-waitlist-processing.js`: 2 passed, 0 failed. Tests cover multiple eligible FIFO promotions and an oversized head blocking a smaller later request.
- `npm test`: 12 passed, 0 failed, 0 skipped.
- `npm run demo`: completed successfully; Bayo's 2-ticket request was rejected, his separate 1-ticket request succeeded, and after Ada cancelled, Chika received the released tickets with 0 tickets remaining.
- `npm run benchmark`: completed successfully; 100,000 bookings and 500 lookups measured `Array.find()` at 440.05 ms and `Map.get()` at 0.33 ms in this run. These timings vary and are not a correctness test.

## 2026-10-28 — Build 2 event search and booking-total validation

### Prompt and changes

- The prompt requested Build 2 event sorting, search, publishing, and acceptance tests. The implementation added a stable merge sort, pure event filters and sorting, public event summaries, publishing and unpublishing, and Node tests for the Build 2 stories.
- During final review, a booking using `Number.MAX_SAFE_INTEGER` cents and quantity 3 produced an imprecise total. `bookTickets` now checks the multiplied total with `Number.isSafeInteger` and rejects it with `VALIDATION` before generating a booking reference or mutating inventory or booking records.
- Added a regression test that verifies the unsafe booking leaves the tier, bookings, and reference lookup unchanged.

### Verification

- `npm test`: 38 passed, 0 failed.
- The Build 2 specification is `docs/build-2.md` in this workspace, and the references in that file use the correct filename.
