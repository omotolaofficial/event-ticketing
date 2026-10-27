
import { performance } from "node:perf_hooks";

const bookingCount = 100_000;
const lookupCount = 500;

const bookings = [];
const bookingsByReference = new Map();

// Create 100,000 bookings with unique test references.
for (let i = 0; i < bookingCount; i++) {
    const booking = {
        id: `ID${i}`,
        reference: `REF${String(i).padStart(8, "0")}`,
        customerName: `Customer ${i}`
    };


    bookings.push(booking);
    bookingsByReference.set(booking.reference, booking);
}

// Select 500 references from different positions.
const references = Array.from(
    { length: lookupCount },
    (_, i) => bookings[i * 100].reference
);

// Benchmark Array.find().
const arrayStart = performance.now();

for (const reference of references) {
    bookings.find(
        booking => booking.reference === reference
    );
}

const arrayEnd = performance.now();

// Benchmark Map.get().
const mapStart = performance.now();

for (const reference of references) {
    bookingsByReference.get(reference);
}

const mapEnd = performance.now();

console.log(`Bookings created: ${bookingCount}`);
console.log(`Lookups performed: ${lookupCount}`);
console.log(`Array.find() time: ${(arrayEnd - arrayStart).toFixed(2)} ms`);
console.log(`Map.get() time: ${(mapEnd - mapStart).toFixed(2)} ms`);
