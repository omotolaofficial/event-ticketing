
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

export function createEvent(store, name) {
    if (typeof name !== "string" || name.trim() === "") {
        throw new DomainError("Event name is required", "VALIDATION");
    }

    const event = {
        id: newId(),
        name: name.trim(),
        tiers: new Map()
    };

    store.events.set(event.id, event);
    return event;
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

    const booking = {
        id: newId(),
        reference: newReference(),
        eventId,
        tierId,
        customerName: customerName.trim(),
        quantity,
        status: "confirmed"
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
    const nextRequest = queue.peek();

    const available = tier.capacity - tier.sold;

    if (nextRequest.quantity > available) {
        return undefined;
    }

    queue.dequeue();

    const booking = bookTickets(
        store,
        eventId,
        tierId,
        nextRequest.customerName,
        nextRequest.quantity
    );

    return booking;
}
