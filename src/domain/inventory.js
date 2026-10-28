
import { WaitlistQueue } from "./waitlistQueue.js";
import { newId, newReference } from "./ids.js";
import { DomainError } from "./errors.js";

export function createStore() {
    return {
        events: new Map(),
        bookings: new Map(),
        bookingsByReference: new Map(),
        waitlists: new Map()
    };
}

function isValidIsoDate(value) {
    if (typeof value !== "string") {
        return false;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/.exec(value);

    if (!match || !Number.isFinite(Date.parse(value))) {
        return false;
    }

    const [, year, month, day] = match;
    const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

    return calendarDate.getUTCFullYear() === Number(year)
        && calendarDate.getUTCMonth() === Number(month) - 1
        && calendarDate.getUTCDate() === Number(day);
}

export function createEvent(store, details) {
    const isLegacyEvent = typeof details === "string";
    const title = isLegacyEvent
        ? details.trim()
        : typeof details?.title === "string"
            ? details.title.trim()
            : "";

    if (!title) {
        throw new DomainError(
            isLegacyEvent ? "Event name is required" : "Event title is required",
            "VALIDATION"
        );
    }

    if (!isLegacyEvent) {
        if (typeof details.city !== "string" || details.city.trim() === "") {
            throw new DomainError("Event city is required", "VALIDATION");
        }

        if (typeof details.venue !== "string" || details.venue.trim() === "") {
            throw new DomainError("Event venue is required", "VALIDATION");
        }

        if (!isValidIsoDate(details.date)) {
            throw new DomainError("Event date must be a valid ISO date", "VALIDATION");
        }
    }

    const event = {
        id: newId(),
        name: title,
        title,
        city: isLegacyEvent ? undefined : details.city.trim(),
        venue: isLegacyEvent ? undefined : details.venue.trim(),
        date: isLegacyEvent ? undefined : details.date,
        published: false,
        tiers: new Map()
    };

    store.events.set(event.id, event);
    return event;
}

export function publishEvent(store, eventId) {
    const event = store.events.get(eventId);

    if (!event) {
        throw new DomainError("Event not found", "NOT_FOUND");
    }

    if (event.tiers.size === 0) {
        throw new DomainError("An event needs at least one ticket tier to be published", "INVALID_STATE");
    }

    event.published = true;
    return event;
}

export function unpublishEvent(store, eventId) {
    const event = store.events.get(eventId);

    if (!event) {
        throw new DomainError("Event not found", "NOT_FOUND");
    }

    event.published = false;
    return event;
}

export function listEventSummaries(store, { publishedOnly = true } = {}) {
    return [...store.events.values()]
        .filter(event => !publishedOnly || event.published)
        .map(event => ({
            id: event.id,
            title: event.title ?? event.name,
            city: event.city,
            venue: event.venue,
            date: event.date,
            published: event.published,
            tiers: [...event.tiers.values()].map(tier => ({
                id: tier.id,
                name: tier.name,
                priceCents: tier.priceCents,
                capacity: tier.capacity,
                sold: tier.sold,
                seatsLeft: tier.capacity - tier.sold
            }))
        }));
}

export function addTier(store, eventId, name, priceCents, capacity) {
    const event = store.events.get(eventId);

    if (!event) {
    throw new DomainError("Event not found", "NOT_FOUND");
}

    if (typeof name !== "string" || name.trim() === "") {
        throw new DomainError("Ticket tier name is required", "VALIDATION");
    }

    if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
        throw new DomainError("Price must be a non-negative whole number", "VALIDATION");
    }

    if (!Number.isSafeInteger(capacity) || capacity <= 0) {
        throw new DomainError("Capacity must be a positive whole number", "VALIDATION");
    }

    const tier = {
        id: newId(),
        name: name.trim(),
        priceCents,
        capacity,
        sold: 0
    };

    event.tiers.set(tier.id, tier);
    return tier;
}

export function bookTickets(store, eventId, tierId, customerName, quantity) {
    const event = store.events.get(eventId);

    if (!event) {
        if (!event) {
    throw new DomainError("Event not found", "NOT_FOUND");
}
    }

    const tier = event.tiers.get(tierId);

    if (!tier) {
        if (!tier) {
    throw new DomainError("Ticket tier not found", "NOT_FOUND");
}
    }

    if (typeof customerName !== "string" || customerName.trim() === "") {
        throw new DomainError("Customer name is required", "VALIDATION");
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new DomainError("You can book between 1 and 10 tickets", "VALIDATION");
    }

    const available = tier.capacity - tier.sold;

    if (quantity > available) {
        throw new DomainError("Not enough tickets available", "SOLD_OUT");
    }

    const total = tier.priceCents * quantity;

    if (!Number.isSafeInteger(total)) {
        throw new DomainError("Booking total must be a safe whole number of cents", "VALIDATION");
    }

    let reference = newReference();

    while (store.bookingsByReference.has(reference)) {
        reference = newReference();
    }

    const booking = {
        id: newId(),
        reference,
        eventId,
        tierId,
        customerName: customerName.trim(),
        quantity,
        totalPriceCents: total,
        status: event.published ? "pending" : "confirmed"
    };

    tier.sold += quantity;

    store.bookings.set(booking.id, booking);
    store.bookingsByReference.set(booking.reference, booking.id);

    return booking;
}

export function findBookingByReference(store, reference) {
    const bookingId = store.bookingsByReference.get(reference);

    if (!bookingId) {
        return undefined;
    }

    return store.bookings.get(bookingId);
}


export function cancelBooking(store, bookingId) {
    const booking = store.bookings.get(bookingId);

    if (!booking) {
        throw new DomainError("Booking not found", "NOT_FOUND");
    }

    if (booking.status === "cancelled") {
        throw new DomainError("Booking has already been cancelled", "VALIDATION");
    }

    const event = store.events.get(booking.eventId);
    const tier = event.tiers.get(booking.tierId);

    // Return the cancelled tickets to inventory.
    tier.sold -= booking.quantity;
    booking.status = "cancelled";

    // Automatically check the waitlist for this ticket tier.
    processWaitlist(store, booking.eventId, booking.tierId);

    return booking;
}

export function joinWaitlist(store, eventId, tierId, customerName, quantity) {
    const event = store.events.get(eventId);

    if (!event) {
        throw new DomainError("Event not found", "NOT_FOUND");
    }

    const tier = event.tiers.get(tierId);

    if (!tier) {
        throw new DomainError("Ticket tier not found", "NOT_FOUND");
    }

    if (typeof customerName !== "string" || customerName.trim() === "") {
        throw new DomainError("Customer name is required", "VALIDATION");
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new DomainError("You can request between 1 and 10 tickets", "VALIDATION");
    }

    const key = `${eventId}:${tierId}`;

    if (!store.waitlists.has(key)) {
        store.waitlists.set(key, new WaitlistQueue());
    }

    const queue = store.waitlists.get(key);

    const request = {
        id: newId(),
        eventId,
        tierId,
        customerName: customerName.trim(),
        quantity
    };

    queue.enqueue(request);
    return request;
}



export function processWaitlist(store, eventId, tierId) {
    const key = `${eventId}:${tierId}`;
    const queue = store.waitlists.get(key);

    if (!queue || queue.size === 0) {
        return undefined;
    }

    const event = store.events.get(eventId);
    const tier = event.tiers.get(tierId);
    let firstBooking;

    while (queue.size > 0) {
        const nextRequest = queue.peek();
        const available = tier.capacity - tier.sold;

        if (nextRequest.quantity > available) {
            break;
        }

        queue.dequeue();

        const booking = bookTickets(
            store,
            eventId,
            tierId,
            nextRequest.customerName,
            nextRequest.quantity
        );

        if (!firstBooking) {
            firstBooking = booking;
        }
    }

    return firstBooking;
}
