#!/usr/bin/env node

"use strict";

const {
  lookupAppleAuthServiceKey,
  PUBLIC_KEY_PATTERN,
} = require("./apple-auth-service-key");

lookupAppleAuthServiceKey()
  .then((key) => {
    if (!PUBLIC_KEY_PATTERN.test(key)) {
      throw new Error("Apple returned an unexpected public key shape.");
    }
    console.log(
      "Live Apple auth service key lookup succeeded; public key shape validated (key redacted).",
    );
  })
  .catch((error) => {
    console.error(
      `Live Apple auth service key lookup failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    process.exitCode = 1;
  });
