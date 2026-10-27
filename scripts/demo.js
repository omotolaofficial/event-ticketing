
import {
    createStore,
    createEvent,
    addTier,
    bookTickets,
    cancelBooking,
    findBookingByReference,
    joinWaitlist
} from "../src/domain/inventory.js";

const store = createStore();

// Create an event with three available tickets.
const event = createEvent(store, "Campus Night");
const tier = addTier(store, event.id, "Regular", 200000, 3);

console.log("\n=== CAMPUS NIGHT TICKET DEMO ===");

// Ada books two tickets.
const adaBooking = bookTickets(
    store, event.id, tier.id, "Ada", 2
);

console.log(`Ada booked ${adaBooking.quantity} tickets.`);
console.log(`Ada's booking reference: ${adaBooking.reference}`);

// Find Ada's booking using its reference.
const foundBooking = findBookingByReference(
    store, adaBooking.reference
);

console.log(
    "Booking reference lookup:",
    foundBooking?.customerName ?? "Not found"
);

// Bayo requests two tickets, but only one is available.
try {
    bookTickets(store, event.id, tier.id, "Bayo", 2);
} catch (error) {
    if (error.code === "SOLD_OUT") {
        console.log("Bayo's booking was rejected: SOLD_OUT.");
    } else {
        throw error;
    }
}

// Bayo books the final available ticket.
const bayoBooking = bookTickets(
    store, event.id, tier.id, "Bayo", 1
);

console.log(`Bayo booked ${bayoBooking.quantity} ticket.`);
console.log("All tickets are now sold out.");

// Chika and Dami join the waitlist.
joinWaitlist(store, event.id, tier.id, "Chika", 2);
joinWaitlist(store, event.id, tier.id, "Dami", 1);

console.log("Chika and Dami joined the waitlist.");

// Ada cancels; the system processes Chika automatically.
cancelBooking(store, adaBooking.id);

console.log("Ada cancelled her booking.");

const chikaBooking = [...store.bookings.values()].find(
    booking =>
        booking.customerName === "Chika" &&
        booking.status === "confirmed"
);

console.log(
    chikaBooking
        ? `Next person in line: ${chikaBooking.customerName}.`
        : "Chika is still waiting for tickets."
);

console.log(
    "Tickets remaining:",
    tier.capacity - tier.sold
);
