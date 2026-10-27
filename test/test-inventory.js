import {
    createStore,
    createEvent,
    addTier,
    bookTickets,
    findBookingByReference,
    cancelBooking,
    joinWaitlist,
    processWaitlist,

} from "../src/domain/inventory.js";
const store = createStore();
const event = createEvent(store, "Campus Night");

const regular = addTier(store, event.id, "Regular", 200000, 3);

const booking = bookTickets(
    store,
    event.id,
    regular.id,
    "Ada",
    2
);

console.log("Booking:", booking);
console.log("Tickets sold:", regular.sold);
console.log("Tickets remaining:", regular.capacity - regular.sold);


try {
    bookTickets(store, event.id, regular.id, "Bayo", 2);
} catch (error) {
    console.log("Booking refused:", error.message);
}

console.log("Tickets sold after refusal:", regular.sold);
console.log("Tickets remaining after refusal:", regular.capacity - regular.sold);

const foundBooking = findBookingByReference(store, booking.reference);

console.log("Found booking:", foundBooking);
console.log("Correct booking found:", foundBooking.id === booking.id);

cancelBooking(store, booking.id);

console.log("Booking status:", booking.status);
console.log("Tickets sold after cancellation:", regular.sold);
console.log("Tickets remaining after cancellation:", regular.capacity - regular.sold);

const chika = joinWaitlist(store, event.id, regular.id, "Chika", 2);
const dami = joinWaitlist(store, event.id, regular.id, "Dami", 1);

const key = `${event.id}:${regular.id}`;
const queue = store.waitlists.get(key);

console.log("First in waitlist:", queue.peek().customerName);
console.log("Second in waitlist:", dami.customerName);
console.log("Waitlist size:", queue.size);

const nextBooking = processWaitlist(store, event.id, regular.id);

console.log(
    "Waitlist booking:",
    nextBooking ? nextBooking.customerName : "No booking created"
);