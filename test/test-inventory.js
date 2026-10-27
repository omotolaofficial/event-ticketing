import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "../src/domain/errors.js";
import {
    addTier,
    bookTickets,
    cancelBooking,
    createEvent,
    createStore,
    findBookingByReference
} from "../src/domain/inventory.js";

test("ticket tiers enforce positive whole-number capacity", () => {
    const store = createStore();
    const event = createEvent(store, "Campus Night");
    const tier = addTier(store, event.id, "Regular", 200000, 3);

    assert.equal(tier.capacity, 3);
    assert.equal(tier.sold, 0);
    assert.throws(
        () => addTier(store, event.id, "Zero capacity", 100, 0),
        error => error instanceof DomainError && error.code === "VALIDATION"
    );
    assert.throws(
        () => addTier(store, event.id, "Fractional capacity", 100, 1.5),
        error => error instanceof DomainError && error.code === "VALIDATION"
    );
});

test("rejected bookings leave inventory unchanged and references find their bookings", () => {
    const store = createStore();
    const event = createEvent(store, "Campus Night");
    const tier = addTier(store, event.id, "Regular", 200000, 3);
    const ada = bookTickets(store, event.id, tier.id, "Ada", 2);

    assert.equal(tier.sold, 2);
    assert.equal(tier.capacity - tier.sold, 1);
    assert.throws(
        () => bookTickets(store, event.id, tier.id, "Bayo", 2),
        error => error instanceof DomainError && error.code === "SOLD_OUT"
    );
    assert.equal(tier.sold, 2);
    assert.equal(tier.capacity - tier.sold, 1);

    const bayo = bookTickets(store, event.id, tier.id, "Bayo", 1);
    assert.equal(tier.sold, tier.capacity);
    assert.notEqual(ada.reference, bayo.reference);
    assert.equal(findBookingByReference(store, ada.reference), ada);
    assert.equal(findBookingByReference(store, bayo.reference), bayo);
    assert.equal(findBookingByReference(store, "UNKNOWN"), undefined);

    assert.throws(
        () => bookTickets(store, event.id, tier.id, "Chika", 1),
        error => error instanceof DomainError && error.code === "SOLD_OUT"
    );
    assert.equal(tier.sold, tier.capacity);
});

test("booking quantities must be safe integers from one through ten", () => {
    const store = createStore();
    const event = createEvent(store, "Campus Night");
    const tier = addTier(store, event.id, "Regular", 200000, 20);

    for (const quantity of [0, -1, 1.5, 11, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(
            () => bookTickets(store, event.id, tier.id, "Ada", quantity),
            error => error instanceof DomainError && error.code === "VALIDATION"
        );
        assert.equal(tier.sold, 0);
    }
});

test("cancellation restores inventory once and rejects a repeated cancellation", () => {
    const store = createStore();
    const event = createEvent(store, "Campus Night");
    const tier = addTier(store, event.id, "Regular", 200000, 3);
    const booking = bookTickets(store, event.id, tier.id, "Ada", 2);

    cancelBooking(store, booking.id);

    assert.equal(booking.status, "cancelled");
    assert.equal(tier.sold, 0);
    assert.equal(tier.capacity - tier.sold, 3);
    assert.throws(
        () => cancelBooking(store, booking.id),
        error => error instanceof DomainError && error.code === "VALIDATION"
    );
    assert.equal(tier.sold, 0);
});