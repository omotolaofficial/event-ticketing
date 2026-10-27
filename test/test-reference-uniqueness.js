import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { syncBuiltinESMExports } from "node:module";

test("booking references retry collisions without overwriting existing lookups", async () => {
    const originalRandomBytes = crypto.randomBytes;
    let callCount = 0;
    const references = [
        Buffer.from([0x11, 0x22, 0x33, 0x44]),
        Buffer.from([0x11, 0x22, 0x33, 0x44]),
        Buffer.from([0x55, 0x66, 0x77, 0x88])
    ];

    crypto.randomBytes = size => {
        const bytes = references[callCount++];
        assert.ok(bytes, "unexpected reference generation attempt");
        assert.equal(bytes.length, size);
        return bytes;
    };
    syncBuiltinESMExports();

    try {
        const {
            createStore,
            createEvent,
            addTier,
            bookTickets,
            findBookingByReference
        } = await import("../src/domain/inventory.js");

        const store = createStore();
        const event = createEvent(store, "Reference collision");
        const tier = addTier(store, event.id, "General", 100, 2);
        const first = bookTickets(store, event.id, tier.id, "First", 1);
        const second = bookTickets(store, event.id, tier.id, "Second", 1);

        assert.equal(first.reference, "11223344");
        assert.equal(second.reference, "55667788");
        assert.notEqual(first.reference, second.reference);
        assert.equal(findBookingByReference(store, first.reference), first);
        assert.equal(findBookingByReference(store, second.reference), second);
        assert.equal(callCount, 3);
    } finally {
        crypto.randomBytes = originalRandomBytes;
        syncBuiltinESMExports();
    }
});
