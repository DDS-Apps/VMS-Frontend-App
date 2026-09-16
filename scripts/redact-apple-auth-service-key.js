#!/usr/bin/env node

"use strict";

const util = require("node:util");

const key = process.env.EXPO_APP_STORE_AUTH_SERVICE_KEY;
if (!key) return;

const replacement = "[redacted Apple auth service key]";
const redact = (value) =>
  typeof value === "string" ? value.split(key).join(replacement) : value;

for (const method of ["debug", "error", "info", "log", "warn"]) {
  const original = console[method];
  if (typeof original !== "function") continue;
  console[method] = function redactedConsoleMethod(...args) {
    const formatted = util.format(...args);
    return original.call(this, redact(formatted));
  };
}

for (const stream of [process.stdout, process.stderr]) {
  const originalWrite = stream.write;
  stream.write = function redactedStreamWrite(chunk, ...args) {
    if (Buffer.isBuffer(chunk)) {
      chunk = Buffer.from(redact(chunk.toString("utf8")), "utf8");
    } else {
      chunk = redact(chunk);
    }
    return originalWrite.call(this, chunk, ...args);
  };
}
