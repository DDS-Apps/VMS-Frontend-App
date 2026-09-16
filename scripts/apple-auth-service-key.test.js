"use strict";

const { EventEmitter } = require("node:events");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  AppleAuthServiceKeyLookupError,
  lookupAppleAuthServiceKey,
  PUBLIC_KEY_PATTERN,
} = require("./apple-auth-service-key");
const {
  EAS_CLI_PACKAGE,
  REDACTOR_PATH,
  runEasBuild,
} = require("./build-ios-with-apple-key");

const PUBLIC_KEY = "a".repeat(64);
const OTHER_PUBLIC_KEY = "b".repeat(64);

function routeTransport(routes) {
  return async (url) => {
    const route = routes[url];
    if (!route) throw new Error(`unexpected test URL: ${url}`);
    return {
      statusCode: 200,
      headers: {},
      body: route,
      url,
    };
  };
}

test("looks up the current public key through Apple login modules", async () => {
  const loginUrl = "https://appstoreconnect.apple.com/login";
  const entryUrl =
    "https://unpkg.apple.com/@maison/preauthorization-container@1/umd/index.js";
  const configUrl =
    "https://unpkg.apple.com/@maison/preauthorization-container@1/umd/chunks/ASC.js";
  const transport = routeTransport({
    [loginUrl]: `<script type="module" src="${entryUrl}"></script>`,
    [entryUrl]: `import("${configUrl}");`,
    [configUrl]: `const config={getIDMSAppIdKey:e=>e?"${PUBLIC_KEY}":"${OTHER_PUBLIC_KEY}"}`,
  });

  const key = await lookupAppleAuthServiceKey({ request: transport });
  assert.equal(key, PUBLIC_KEY);
  assert.match(key, PUBLIC_KEY_PATTERN);
});

test("rejects redirects outside the explicit Apple allowlist", async () => {
  const transport = async (url) => {
    if (url === "https://appstoreconnect.apple.com/login") {
      return {
        statusCode: 302,
        headers: { location: "https://example.invalid/login.js" },
        body: "",
        url,
      };
    }
    throw new Error("redirect should have been rejected");
  };

  await assert.rejects(
    lookupAppleAuthServiceKey({ request: transport }),
    (error) =>
      error instanceof AppleAuthServiceKeyLookupError &&
      /trusted HTTPS origin/.test(error.message),
  );
});

test("bounds redirects even when Apple assets stay on trusted origins", async () => {
  const transport = async (url) => ({
    statusCode: 302,
    headers: { location: url },
    body: "",
    url,
  });

  await assert.rejects(
    lookupAppleAuthServiceKey({ request: transport }),
    /redirect safety limit/,
  );
});

test("enforces response-size limits before parsing scripts", async () => {
  const transport = routeTransport({
    "https://appstoreconnect.apple.com/login": "x".repeat(100),
  });

  await assert.rejects(
    lookupAppleAuthServiceKey({
      request: transport,
      maxResponseBytes: 32,
    }),
    /response-size safety limit/,
  );
});

test("passes the key only to an inherited-stdio EAS child and preserves args", async () => {
  let invocation;
  const messages = [];
  const parentEnvironment = {
    PATH: "/usr/bin",
    NODE_OPTIONS: "--trace-warnings",
  };
  const child = new EventEmitter();
  const resultPromise = runEasBuild({
    argumentsList: [
      "--eas-profile",
      "preview",
      "--non-interactive",
      "--message",
      "nightly",
    ],
    environment: parentEnvironment,
    lookup: async () => PUBLIC_KEY,
    log: (message) => messages.push(message),
    spawnProcess: (command, args, options) => {
      invocation = { command, args, options };
      process.nextTick(() => child.emit("close", 17, null));
      return child;
    },
  });
  const result = await resultPromise;

  assert.equal(result.code, 17);
  assert.equal(result.signal, null);
  assert.equal(
    invocation.command,
    process.platform === "win32" ? "npx.cmd" : "npx",
  );
  assert.deepEqual(invocation.args, [
    "--yes",
    EAS_CLI_PACKAGE,
    "build",
    "--platform",
    "ios",
    "--profile",
    "preview",
    "--non-interactive",
    "--message",
    "nightly",
  ]);
  assert.equal(invocation.options.stdio, "inherit");
  assert.equal(
    invocation.options.env.EXPO_APP_STORE_AUTH_SERVICE_KEY,
    PUBLIC_KEY,
  );
  assert.match(
    invocation.options.env.NODE_OPTIONS,
    /redact-apple-auth-service-key\.js/,
  );
  assert.equal(parentEnvironment.EXPO_APP_STORE_AUTH_SERVICE_KEY, undefined);
  assert.equal(parentEnvironment.NODE_OPTIONS, "--trace-warnings");
  assert.doesNotMatch(messages.join("\n"), new RegExp(PUBLIC_KEY));
});

test("does not spawn EAS when public lookup fails and gives an actionable error", async () => {
  let spawned = false;
  await assert.rejects(
    runEasBuild({
      lookup: async () => {
        throw new AppleAuthServiceKeyLookupError("Apple returned HTTP 404.");
      },
      spawnProcess: () => {
        spawned = true;
        return new EventEmitter();
      },
    }),
    (error) =>
      /lookup failed/.test(error.message) &&
      /HTTP 404/.test(error.message) &&
      /No key was saved/.test(error.message) &&
      !error.message.includes("API-key") &&
      !error.message.includes(PUBLIC_KEY),
  );
  assert.equal(spawned, false);
});

test("returns a child signal for the wrapper to preserve", async () => {
  const child = new EventEmitter();
  const resultPromise = runEasBuild({
    environment: { PATH: "/usr/bin" },
    lookup: async () => PUBLIC_KEY,
    log: () => {},
    spawnProcess: () => {
      process.nextTick(() => child.emit("close", null, "SIGTERM"));
      return child;
    },
  });

  assert.deepEqual(await resultPromise, {
    code: null,
    signal: "SIGTERM",
  });
});

test("forwards wrapper SIGTERM to the EAS child", async () => {
  const signalSource = new EventEmitter();
  const child = new EventEmitter();
  let forwardedSignal;
  const resultPromise = runEasBuild({
    environment: { PATH: "/usr/bin" },
    lookup: async () => PUBLIC_KEY,
    log: () => {},
    signalSource,
    spawnProcess: () => {
      child.kill = (signal) => {
        forwardedSignal = signal;
        process.nextTick(() => child.emit("close", null, signal));
        return true;
      };
      process.nextTick(() => signalSource.emit("SIGTERM"));
      return child;
    },
  });

  assert.deepEqual(await resultPromise, {
    code: null,
    signal: "SIGTERM",
  });
  assert.equal(forwardedSignal, "SIGTERM");
});

test("redacts the key from child console and stream output", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      REDACTOR_PATH,
      "-e",
      "console.log(process.env.EXPO_APP_STORE_AUTH_SERVICE_KEY); process.stdout.write(process.env.EXPO_APP_STORE_AUTH_SERVICE_KEY);",
    ],
    {
      env: {
        PATH: process.env.PATH,
        EXPO_APP_STORE_AUTH_SERVICE_KEY: PUBLIC_KEY,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, new RegExp(PUBLIC_KEY));
  assert.match(result.stdout, /redacted Apple auth service key/);
});

test(
  "live Apple lookup validates shape without printing the key",
  {
    skip: process.env.APPLE_AUTH_LIVE_CHECK !== "1",
    timeout: 30_000,
  },
  async () => {
    const key = await lookupAppleAuthServiceKey();
    assert.match(key, PUBLIC_KEY_PATTERN);
    console.log(
      "Live Apple auth service key lookup succeeded; 64-character public key shape validated (key redacted).",
    );
  },
);
