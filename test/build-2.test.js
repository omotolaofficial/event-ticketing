import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "../src/domain/errors.js";
import { filterEvents, searchEvents, sortEvents } from "../src/domain/eventSearch.js";
import {
    addTier,
    bookTickets,
    createEvent,
    createStore,
    listEventSummaries,
    publishEvent,
    unpublishEvent
} from "../src/domain/inventory.js";
import { mergeSort } from "../src/domain/sorting.js";

function makeSummary({
    id,
    title,
    city = "Lagos",
    venue = "Main Hall",
    date = "2026-12-05T12:00:00Z",
    tiers = []
}) {
    return { id, title, city, venue, date, tiers };
}

function makePublishedEvent({ title, city = "Lagos", venue = "Main Hall", date, priceCents = 500, capacity = 3 }) {
    const store = createStore();
    const event = createEvent(store, { title, city, venue, date });
    const tier = addTier(store, event.id, "General", priceCents, capacity);
    publishEvent(store, event.id);
    return { store, event, tier };
}

test("S02: new events are saved as drafts and hidden from the public list", () => {
    const store = createStore();
    const event = createEvent(store, {
        title: "Lagos Tech Meetup",
        city: "Lagos",
        venue: "Civic Hall",
        date: "2026-12-05"
    });

    assert.ok(event.id);
    assert.equal(event.title, "Lagos Tech Meetup");
    assert.equal(event.published, false);
    assert.deepEqual(listEventSummaries(store), []);
    assert.equal(listEventSummaries(store, { publishedOnly: false })[0].id, event.id);
});

test("S02: missing title or city and invalid date reject without saving", () => {
    const store = createStore();
    const invalidEvents = [
        { city: "Lagos", venue: "Hall", date: "2026-12-05" },
        { title: "Meetup", city: " ", venue: "Hall", date: "2026-12-05" },
        { title: "Meetup", city: "Lagos", venue: "Hall", date: "2026-02-30" }
    ];

    for (const details of invalidEvents) {
        assert.throws(
            () => createEvent(store, details),
            error => error instanceof DomainError ? error.code === "VALIDATION" : false
        );
        assert.equal(store.events.size, 0);
    }
});

test("S03: a tier stores its whole-cent price and available capacity", () => {
    const store = createStore();
    const event = createEvent(store, "Campus Night");
    const tier = addTier(store, event.id, "General", 500000, 100);

    assert.equal(tier.priceCents, 500000);
    assert.equal(tier.sold, 0);
    assert.equal(tier.capacity - tier.sold, 100);
});

test("S03: fractional prices and capacities below one reject with VALIDATION", () => {
    const store = createStore();
    const event = createEvent(store, "Campus Night");

    assert.throws(
        () => addTier(store, event.id, "Fractional price", 10.5, 1),
        error => error instanceof DomainError ? error.code === "VALIDATION" : false
    );
    assert.throws(
        () => addTier(store, event.id, "No capacity", 100, 0),
        error => error instanceof DomainError ? error.code === "VALIDATION" : false
    );
    assert.equal(event.tiers.size, 0);
});

test("S03: adding a tier to an unknown event rejects with NOT_FOUND", () => {
    const store = createStore();

    assert.throws(
        () => addTier(store, "missing-event", "General", 100, 1),
        error => error instanceof DomainError ? error.code === "NOT_FOUND" : false
    );
});

test("S04: publishing an event with tiers makes it public", () => {
    const store = createStore();
    const event = createEvent(store, {
        title: "Published Event",
        city: "Lagos",
        venue: "Main Hall",
        date: "2026-12-05"
    });
    addTier(store, event.id, "General", 100, 2);

    assert.equal(publishEvent(store, event.id).published, true);
    assert.equal(listEventSummaries(store)[0].id, event.id);
});

test("S04: publishing without tiers rejects with INVALID_STATE and stays hidden", () => {
    const store = createStore();
    const event = createEvent(store, {
        title: "No Tickets Yet",
        city: "Lagos",
        venue: "Main Hall",
        date: "2026-12-05"
    });

    assert.throws(
        () => publishEvent(store, event.id),
        error => error instanceof DomainError ? error.code === "INVALID_STATE" : false
    );
    assert.equal(event.published, false);
    assert.deepEqual(listEventSummaries(store), []);
});

test("S04: publishing an unknown event rejects with NOT_FOUND", () => {
    assert.throws(
        () => publishEvent(createStore(), "missing-event"),
        error => error instanceof DomainError ? error.code === "NOT_FOUND" : false
    );
});

test("S04: unpublishing hides an event without changing its tiers or bookings", () => {
    const { store, event, tier } = makePublishedEvent({
        title: "Temporarily Hidden",
        date: "2026-12-05",
        capacity: 3
    });
    const booking = bookTickets(store, event.id, tier.id, "Ada", 1);
    const originalTier = { ...tier };
    const originalBooking = { ...booking };

    assert.equal(unpublishEvent(store, event.id).published, false);
    assert.deepEqual(listEventSummaries(store), []);
    assert.equal(listEventSummaries(store, { publishedOnly: false })[0].id, event.id);
    assert.deepEqual(tier, originalTier);
    assert.deepEqual(booking, originalBooking);
});

test("S04: unpublishing an unknown event rejects with NOT_FOUND", () => {
    assert.throws(
        () => unpublishEvent(createStore(), "missing-event"),
        error => error instanceof DomainError ? error.code === "NOT_FOUND" : false
    );
});

test("S05: text search matches title or venue without case sensitivity", () => {
    const summaries = [
        makeSummary({ id: "jazz", title: "Abuja Jazz Night", city: "Abuja" }),
        makeSummary({ id: "venue", title: "Summer Show", venue: "The JAZZ Pavilion" }),
        makeSummary({ id: "tech", title: "Lagos Tech Meetup" })
    ];

    assert.deepEqual(filterEvents(summaries, { q: "JAZZ" }).map(event => event.id), ["jazz", "venue"]);
});

test("S05: city filtering ignores capitalization but matches the full city", () => {
    const summaries = [
        makeSummary({ id: "lagos", title: "Lagos Event", city: "Lagos" }),
        makeSummary({ id: "abuja", title: "Abuja Event", city: "Abuja" }),
        makeSummary({ id: "partial", title: "Other", city: "Greater Lagos" })
    ];

    assert.deepEqual(filterEvents(summaries, { city: "lagos" }).map(event => event.id), ["lagos"]);
});

test("S05: maximum price uses the cheapest tier, omits events without tiers, then sorts by price", () => {
    const summaries = [
        makeSummary({ id: "mid", title: "Mid", tiers: [{ priceCents: 500, capacity: 2, sold: 0 }] }),
        makeSummary({ id: "cheap", title: "Cheap", tiers: [{ priceCents: 250, capacity: 2, sold: 0 }, { priceCents: 400, capacity: 1, sold: 0 }] }),
        makeSummary({ id: "no-price", title: "No Price" }),
        makeSummary({ id: "high", title: "High", tiers: [{ priceCents: 900, capacity: 2, sold: 0 }] })
    ];

    assert.deepEqual(
        searchEvents(summaries, { maxPriceCents: 500 }, "price").map(event => event.id),
        ["cheap", "mid"]
    );
});

test("S05: date sorting uses title order for events on the same day", () => {
    const summaries = [
        makeSummary({ id: "later", title: "Zulu", date: "2026-12-06T09:00:00Z" }),
        makeSummary({ id: "same-b", title: "Alpha", date: "2026-12-05T19:00:00Z" }),
        makeSummary({ id: "same-a", title: "Zulu", date: "2026-12-05T08:00:00Z" })
    ];

    assert.deepEqual(sortEvents(summaries, "date").map(event => event.id), ["same-b", "same-a", "later"]);
});

test("S05: a date-only upper bound includes events throughout that day", () => {
    const summaries = [
        makeSummary({ id: "included", title: "Evening", date: "2026-12-05T17:00:00Z" }),
        makeSummary({ id: "excluded", title: "Next day", date: "2026-12-06T00:00:00Z" })
    ];

    assert.deepEqual(filterEvents(summaries, { to: "2026-12-05" }).map(event => event.id), ["included"]);
});

test("S05: invalid dates, fractional prices, and unknown sorts reject with VALIDATION", () => {
    const validationError = error => error instanceof DomainError ? error.code === "VALIDATION" : false;

    assert.throws(() => filterEvents([], { from: "not-a-date" }), validationError);
    assert.throws(() => filterEvents([], { maxPriceCents: 10.5 }), validationError);
    assert.throws(() => sortEvents([], "popular"), validationError);
});

test("S05: availability filtering keeps events with seats remaining", () => {
    const summaries = [
        makeSummary({ id: "available", title: "Available", tiers: [{ priceCents: 100, capacity: 2, sold: 1 }] }),
        makeSummary({ id: "sold-out", title: "Sold Out", tiers: [{ priceCents: 100, capacity: 2, sold: 2 }] })
    ];

    assert.deepEqual(filterEvents(summaries, { onlyAvailable: true }).map(event => event.id), ["available"]);
});

test("searching, filtering, and sorting leave the original list unchanged", () => {
    const summaries = [
        makeSummary({ id: "b", title: "Bravo", tiers: [{ priceCents: 200, capacity: 2, sold: 0 }] }),
        makeSummary({ id: "a", title: "Alpha", tiers: [{ priceCents: 100, capacity: 2, sold: 0 }] })
    ];
    const original = structuredClone(summaries);

    assert.notEqual(filterEvents(summaries, { city: "Lagos" }), summaries);
    assert.notEqual(sortEvents(summaries, "price"), summaries);
    searchEvents(summaries, { q: "a" }, "date");
    assert.deepEqual(summaries, original);
});

test("empty search and sort inputs return empty new arrays", () => {
    const empty = [];

    assert.deepEqual(filterEvents(empty, {}), []);
    assert.notEqual(filterEvents(empty, {}), empty);
    assert.deepEqual(sortEvents(empty, "date"), []);
    assert.notEqual(sortEvents(empty, "date"), empty);
    assert.deepEqual(searchEvents(empty, {}, "price"), []);
});

test("mergeSort is stable for equal values and returns a new array", () => {
    const items = [
        { key: 1, id: "first" },
        { key: 1, id: "second" },
        { key: 0, id: "third" }
    ];
    const sorted = mergeSort(items, (left, right) => left.key - right.key);

    assert.notEqual(sorted, items);
    assert.deepEqual(sorted.map(item => item.id), ["third", "first", "second"]);
    assert.deepEqual(items.map(item => item.id), ["first", "second", "third"]);
});

test("S06: booking a published event reserves seats and records a pending whole-cent total", () => {
    const { store, event, tier } = makePublishedEvent({
        title: "Lagos Tech Meetup",
        date: "2026-12-05",
        priceCents: 500000,
        capacity: 3
    });
    const booking = bookTickets(store, event.id, tier.id, "Ada", 2);

    assert.equal(booking.status, "pending");
    assert.equal(booking.quantity, 2);
    assert.equal(booking.totalPriceCents, 1000000);
    assert.equal(tier.capacity - tier.sold, 1);
});

test("S06: unsafe booking totals reject without changing inventory or booking records", () => {
    const { store, event, tier } = makePublishedEvent({
        title: "Large Price Event",
        date: "2026-12-05",
        priceCents: Number.MAX_SAFE_INTEGER,
        capacity: 3
    });
    const originalTier = { ...tier };
    const originalBookings = [...store.bookings];
    const originalReferences = [...store.bookingsByReference];

    assert.throws(
        () => bookTickets(store, event.id, tier.id, "Ada", 3),
        error => error instanceof DomainError ? error.code === "VALIDATION" : false
    );
    assert.deepEqual(tier, originalTier);
    assert.deepEqual([...store.bookings], originalBookings);
    assert.deepEqual([...store.bookingsByReference], originalReferences);
});

test("S06: an over-capacity booking rejects with SOLD_OUT without changing inventory", () => {
    const { store, event, tier } = makePublishedEvent({
        title: "Lagos Tech Meetup",
        date: "2026-12-05",
        capacity: 3
    });
    bookTickets(store, event.id, tier.id, "Ada", 2);
    const bookingCount = store.bookings.size;

    assert.throws(
        () => bookTickets(store, event.id, tier.id, "Bayo", 2),
        error => error instanceof DomainError ? error.code === "SOLD_OUT" : false
    );
    assert.equal(store.bookings.size, bookingCount);
    assert.equal(tier.sold, 2);
    assert.equal(tier.capacity - tier.sold, 1);
});

test("S06: quantities outside one through ten reject with VALIDATION", () => {
    const { store, event, tier } = makePublishedEvent({
        title: "Lagos Tech Meetup",
        date: "2026-12-05",
        capacity: 20
    });

    for (const quantity of [0, -1, 1.5, 11]) {
        assert.throws(
            () => bookTickets(store, event.id, tier.id, "Ada", quantity),
            error => error instanceof DomainError ? error.code === "VALIDATION" : false
        );
        assert.equal(tier.sold, 0);
    }
});