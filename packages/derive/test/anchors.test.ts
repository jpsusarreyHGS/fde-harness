import { test } from "node:test";
import assert from "node:assert/strict";
import { splitRow } from "../src/anchors.ts";

test("escaped pipe stays literal content", () => {
  // markdown source line, written with a real backslash before the pipe
  const line = "| EV-002 | pasted \\| into field | pipe test |";
  assert.deepEqual(splitRow(line), ["EV-002", "pasted | into field", "pipe test"]);
});

test("plain row splits normally", () => {
  assert.deepEqual(splitRow("| a | b | c |"), ["a", "b", "c"]);
});

test("empty cells preserved", () => {
  assert.deepEqual(splitRow("| a |  | c |"), ["a", "", "c"]);
});

test("row without leading or trailing pipe", () => {
  assert.deepEqual(splitRow("a | b"), ["a", "b"]);
});
