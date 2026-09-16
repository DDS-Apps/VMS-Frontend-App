#!/usr/bin/env node

"use strict";

const path = require("node:path");
const { spawn } = require("node:child_process");
const {
  AppleAuthServiceKeyLookupError,
  lookupAppleAuthServiceKey,
} = require("./apple-auth-service-key");

const REDACTOR_PATH = path.resolve(
  __dirname,
  "redact-apple-auth-service-key.js",
);
const EAS_CLI_PACKAGE = "eas-cli@24.3.0";
const FORWARDED_SIGNALS = ["SIGTERM"];

function parseArguments(argumentsList) {
  let profile = "production";
  const forwardedArgs = [];

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--eas-profile") {
      const next = argumentsList[index + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--eas-profile requires a profile name.");
      }
      profile = next;
      index += 1;
      continue;
    }
    forwardedArgs.push(argument);
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(profile)) {
    throw new Error(`Invalid EAS profile name "${profile}".`);
  }

  return { profile, forwardedArgs };
}

function childNodeOptions(existingOptions) {
  const redactorOption = `--require ${JSON.stringify(REDACTOR_PATH)}`;
  return existingOptions
    ? `${existingOptions} ${redactorOption}`
    : redactorOption;
}

function waitForChild(child, { signalSource = process } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const forwardSignal = (signal) => {
      try {
        child.kill(signal);
      } catch {
        // The child may have exited between the wrapper signal and kill().
      }
    };
    const signalHandlers = new Map(
      FORWARDED_SIGNALS.map((signal) => [signal, () => forwardSignal(signal)]),
    );
    const cleanupSignals = () => {
      for (const signal of FORWARDED_SIGNALS) {
        signalSource.removeListener(signal, signalHandlers.get(signal));
      }
    };
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanupSignals();
      callback(value);
    };

    for (const signal of FORWARDED_SIGNALS) {
      signalSource.once(signal, signalHandlers.get(signal));
    }
    child.once("error", (error) => settle(reject, error));
    child.once("close", (code, signal) => settle(resolve, { code, signal }));
  });
}

async function runEasBuild({
  argumentsList = process.argv.slice(2),
  environment = process.env,
  lookup = lookupAppleAuthServiceKey,
  spawnProcess = spawn,
  command = process.platform === "win32" ? "npx.cmd" : "npx",
  signalSource = process,
  log = console.log,
} = {}) {
  const { profile, forwardedArgs } = parseArguments(argumentsList);
  let publicKey;
  try {
    publicKey = await lookup();
  } catch (error) {
    const detail =
      error instanceof AppleAuthServiceKeyLookupError
        ? error.message
        : "the public Apple login configuration could not be read";
    throw new Error(
      `Apple auth service key lookup failed: ${detail} No key was saved. ` +
        "Check network access to Apple and retry.",
    );
  }

  log(
    "Apple public auth service key lookup succeeded (public config only); " +
      "handing off to the local EAS CLI for Apple authentication and signing.",
  );

  const childEnvironment = {
    ...environment,
    EXPO_APP_STORE_AUTH_SERVICE_KEY: publicKey,
    NODE_OPTIONS: childNodeOptions(environment.NODE_OPTIONS),
  };
  const easArguments = [
    "--yes",
    EAS_CLI_PACKAGE,
    "build",
    "--platform",
    "ios",
    "--profile",
    profile,
    ...forwardedArgs,
  ];
  const child = spawnProcess(command, easArguments, {
    env: childEnvironment,
    stdio: "inherit",
  });

  return waitForChild(child, { signalSource });
}

async function main() {
  try {
    const result = await runEasBuild();
    if (result.signal) {
      if (process.platform !== "win32") {
        process.kill(process.pid, result.signal);
      } else {
        process.exitCode = 1;
      }
      return;
    }
    process.exitCode = typeof result.code === "number" ? result.code : 1;
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "iOS build wrapper failed.",
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  EAS_CLI_PACKAGE,
  FORWARDED_SIGNALS,
  REDACTOR_PATH,
  childNodeOptions,
  main,
  parseArguments,
  runEasBuild,
  waitForChild,
};
