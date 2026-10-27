
import assert from "node:assert/strict";
import test from "node:test";
import { newId, newReference } from "../src/domain/ids.js";

test("newId returns UUIDs", () => {
    assert.match(newId(), /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.notEqual(newId(), newId());
});

test("newReference preserves the uppercase eight-character hexadecimal format", () => {
    assert.match(newReference(), /^[0-9A-F]{8}$/);
});
