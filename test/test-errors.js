import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "../src/domain/errors.js";

test("DomainError retains its message and domain code", () => {
    const error = new DomainError(
        "Not enough tickets available",
        "SOLD_OUT"
    );

    assert.ok(error instanceof Error);
    assert.equal(error.name, "DomainError");
    assert.equal(error.message, "Not enough tickets available");
    assert.equal(error.code, "SOLD_OUT");
});