import { DomainError } from "../src/domain/errors.js";
import {
    createStore,
    createEvent,
    addTier,
    bookTickets,
    cancelBooking,
    joinWaitlist
} from "../src/domain/inventory.js";

const store = createStore();

const event = createEvent(store, "Campus Night");
const tier = addTier(store, event.id, "Regular", 200000, 3);

// Sell all three tickets.
const adaBooking = bookTickets(
    store, event.id, tier.id, "Ada", 2
);

bookTickets(
    store, event.id, tier.id, "Bayo", 1
);

console.log("Tickets sold before cancellation:", tier.sold);

try {
    bookTickets(store, event.id, tier.id, "Bayo", 1);
} catch (error) {
    console.log("Error type:", error.name);
    console.log("Error code:", error.code);
    console.log("Error message:", error.message);
}

// Chika and Dami join the waitlist in that order.
joinWaitlist(store, event.id, tier.id, "Chika", 2);
joinWaitlist(store, event.id, tier.id, "Dami", 1);

const key = `${event.id}:${tier.id}`;
const queue = store.waitlists.get(key);

console.log("First in line:", queue.peek().customerName);

// Ada cancels. The waitlist should be processed automatically.
cancelBooking(store, adaBooking.id);

console.log("Tickets sold after cancellation:", tier.sold);
console.log("Tickets remaining:", tier.capacity - tier.sold);
console.log("Chika's booking exists:", 
    [...store.bookings.values()].some(
        booking => booking.customerName === "Chika"
    )
);
console.log("Next in line:", queue.peek().customerName);
console.log("People still waiting:", queue.size);

try {
    cancelBooking(store, adaBooking.id);
} catch (error) {
    console.log("Second cancellation error:", error.name);
    console.log("Second cancellation code:", error.code);
    console.log("Second cancellation message:", error.message);
}