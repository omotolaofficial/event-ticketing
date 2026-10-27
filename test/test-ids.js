
import { newId, newReference } from "../src/domain/ids.js";

const firstId = newId();
const secondId = newId();

const firstReference = newReference();
const secondReference = newReference();

console.log("First ID:", firstId);
console.log("Second ID:", secondId);
console.log("IDs are different:", firstId !== secondId);

console.log("First reference:", firstReference);
console.log("Second reference:", secondReference);
console.log(
    "References are different:",
    firstReference !== secondReference
);
