#!/usr/bin/env node

"use strict";

const {
  main: runMain,
  runEasAppleCommand,
} = require("./build-ios-with-apple-key");

// Reuse the process-local public-key lookup, log redaction and exit handling.
// EAS selects an existing artifact interactively unless --latest/--id/--path
// is explicitly supplied. This command never starts a build.
function runEasSubmit(options = {}) {
  return runEasAppleCommand({ ...options, action: "submit" });
}

function main() {
  return runMain({ action: "submit" });
}

if (require.main === module) {
  main();
}

module.exports = { main, runEasSubmit };
