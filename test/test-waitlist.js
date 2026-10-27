
import { WaitlistQueue } from "../src/domain/waitlistQueue.js";

const queue = new WaitlistQueue();

console.log("Initial size:", queue.size);

queue.enqueue("Ada");
queue.enqueue("Bayo");
queue.enqueue("Chika");

console.log("Size after adding people:", queue.size);
console.log("First in line:", queue.peek());
console.log("Person leaving:", queue.dequeue());
console.log("Next in line:", queue.peek());
console.log("Size after one leaves:", queue.size);


console.log("Person leaving:", queue.dequeue()); // Bayo
console.log("Person leaving:", queue.dequeue()); // Chika

console.log("Size after everyone leaves:", queue.size);
console.log("Queue is empty:", queue.peek() === undefined);

queue.enqueue("Dami");

console.log("First person after adding Dami:", queue.peek());
console.log("Size after adding Dami:", queue.size);