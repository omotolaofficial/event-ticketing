
class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

export class WaitlistQueue {
    #head = null;
    #tail = null;
    #size = 0;

    enqueue(value) {
        const newNode = new Node(value);

        if (this.#tail === null) {
            this.#head = newNode;
            this.#tail = newNode;
        } else {
            this.#tail.next = newNode;
            this.#tail = newNode;
        }

        this.#size++;
    }

    dequeue() {
        if (this.#head === null) {
            return undefined;
        }

        const removedNode = this.#head;
        this.#head = this.#head.next;
        this.#size--;

        if (this.#head === null) {
            this.#tail = null;
        }

        return removedNode.value;
    }

    peek() {
        if (this.#head === null) {
            return undefined;
        }

        return this.#head.value;
    }

    get size() {
        return this.#size;
    }
}
