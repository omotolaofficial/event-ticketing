import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "../src/domain/errors.js";
import {
    createStore,
    createEvent,
    addTier,
    bookTickets,
    cancelBooking,
    findBookingByReference,
    joinWaitlist
} from "../src/domain/inventory.js";

test("cancelling a booking assigns released tickets to the first eligible waitlist request", () => {
    const store = createStore();
    const event = createEvent(store, "Campus Night");
    const tier = addTier(store, event.id, "Regular", 200000, 3);
    const adaBooking = bookTickets(store, event.id, tier.id, "Ada", 2);
    bookTickets(store, event.id, tier.id, "Bayo", 1);
    joinWaitlist(store, event.id, tier.id, "Chika", 2);
    joinWaitlist(store, event.id, tier.id, "Dami", 1);

    cancelBooking(store, adaBooking.id);

    const chikaBooking = [...store.bookings.values()].find(
        booking => booking.customerName === "Chika"
    );
    const queue = store.waitlists.get(`${event.id}:${tier.id}`);

    assert.ok(chikaBooking);
    assert.equal(chikaBooking.status, "confirmed");
    assert.equal(chikaBooking.quantity, 2);
    assert.equal(findBookingByReference(store, chikaBooking.reference), chikaBooking);
    assert.equal(adaBooking.status, "cancelled");
    assert.equal(tier.sold, 3);
    assert.equal(tier.capacity - tier.sold, 0);
    assert.equal(queue.size, 1);
    assert.equal(queue.peek().customerName, "Dami");

    assert.throws(
        () => cancelBooking(store, adaBooking.id),
        error => error instanceof DomainError && error.code === "VALIDATION"
    );
    assert.equal(tier.sold, 3);
});