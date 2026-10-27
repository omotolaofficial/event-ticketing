
import assert from "node:assert/strict";
import test from "node:test";
import { WaitlistQueue } from "../src/domain/waitlistQueue.js";

test("waitlist queue preserves FIFO order and handles an empty queue", () => {
    const queue = new WaitlistQueue();

    assert.equal(queue.size, 0);
    assert.equal(queue.peek(), undefined);
    assert.equal(queue.dequeue(), undefined);

    queue.enqueue("Ada");
    queue.enqueue("Bayo");
    queue.enqueue("Chika");

    assert.equal(queue.size, 3);
    assert.equal(queue.peek(), "Ada");
    assert.equal(queue.dequeue(), "Ada");
    assert.equal(queue.peek(), "Bayo");
    assert.equal(queue.dequeue(), "Bayo");
    assert.equal(queue.dequeue(), "Chika");
    assert.equal(queue.size, 0);
    assert.equal(queue.peek(), undefined);

    queue.enqueue("Dami");
    assert.equal(queue.peek(), "Dami");
    assert.equal(queue.size, 1);
});