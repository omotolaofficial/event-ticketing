import assert from "node:assert/strict";
import test from "node:test";
import {
    addTier,
    bookTickets,
    cancelBooking,
    createEvent,
    createStore,
    findBookingByReference,
    joinWaitlist,
    processWaitlist
} from "../src/domain/inventory.js";

test("waitlist processing promotes all consecutive eligible customers in FIFO order", () => {
    const store = createStore();
    const event = createEvent(store, "Multiple promotions");
    const tier = addTier(store, event.id, "General", 100, 5);
    const firstRequest = joinWaitlist(store, event.id, tier.id, "Chika", 1);
    const secondRequest = joinWaitlist(store, event.id, tier.id, "Dami", 1);

    const firstBooking = processWaitlist(store, event.id, tier.id);

    assert.equal(firstBooking.customerName, "Chika");
    assert.equal(firstBooking.quantity, firstRequest.quantity);
    assert.equal(firstBooking.status, "confirmed");

    const secondBooking = [...store.bookings.values()].find(
        booking => booking.customerName === secondRequest.customerName
    );
    assert.ok(secondBooking);
    assert.equal(secondBooking.quantity, secondRequest.quantity);
    assert.equal(secondBooking.status, "confirmed");
    assert.equal(findBookingByReference(store, firstBooking.reference), firstBooking);
    assert.equal(findBookingByReference(store, secondBooking.reference), secondBooking);
    assert.equal(tier.sold, 2);
    assert.equal(tier.capacity - tier.sold, 3);
    assert.equal(store.waitlists.get(`${event.id}:${tier.id}`).size, 0);
});

test("waitlist processing does not skip an oversized FIFO head", () => {
    const store = createStore();
    const event = createEvent(store, "Strict FIFO");
    const tier = addTier(store, event.id, "General", 100, 5);
    const adaBooking = bookTickets(store, event.id, tier.id, "Ada", 2);
    bookTickets(store, event.id, tier.id, "Bayo", 3);
    const firstRequest = joinWaitlist(store, event.id, tier.id, "Chika", 3);
    joinWaitlist(store, event.id, tier.id, "Dami", 1);

    cancelBooking(store, adaBooking.id);

    const queue = store.waitlists.get(`${event.id}:${tier.id}`);
    assert.equal(tier.sold, 3);
    assert.equal(tier.capacity - tier.sold, 2);
    assert.equal(queue.size, 2);
    assert.equal(queue.peek(), firstRequest);
    assert.equal(
        [...store.bookings.values()].some(
            booking => booking.customerName === "Dami"
        ),
        false
    );
});
