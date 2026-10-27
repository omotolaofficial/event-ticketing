import { DomainError } from "../src/domain/errors.js";

const error = new DomainError(
    "Not enough tickets available",
    "SOLD_OUT"
);

console.log(error.name);
console.log(error.message);
console.log(error.code);
console.log(error instanceof Error);