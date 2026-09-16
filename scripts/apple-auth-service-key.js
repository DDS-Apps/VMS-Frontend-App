#!/usr/bin/env node

"use strict";

const https = require("node:https");
const { URL } = require("node:url");

const APPLE_LOGIN_URL = "https://appstoreconnect.apple.com/login";
const ALLOWED_ORIGINS = new Set([
  "https://appstoreconnect.apple.com",
  "https://unpkg.apple.com",
]);
const PUBLIC_KEY_PATTERN = /^[a-f0-9]{64}$/i;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 128 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 512 * 1024;
const DEFAULT_MAX_MODULES = 12;
const DEFAULT_MAX_MODULE_DEPTH = 4;
const MAX_REDIRECTS = 3;

class AppleAuthServiceKeyLookupError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "AppleAuthServiceKeyLookupError";
  }
}

function assertAllowedAppleUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AppleAuthServiceKeyLookupError("Apple returned an invalid URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !ALLOWED_ORIGINS.has(url.origin)
  ) {
    throw new AppleAuthServiceKeyLookupError(
      `Apple login assets must come from a trusted HTTPS origin (received ${url.origin}).`,
    );
  }

  return url;
}

function headerValue(headers, name) {
  if (!headers) return undefined;
  const wanted = name.toLowerCase();
  const actual = Object.keys(headers).find(
    (headerName) => headerName.toLowerCase() === wanted,
  );
  const value = actual ? headers[actual] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

function requestHttps(url, { timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    let timeout;
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const request = https.request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "text/html,application/javascript,text/javascript,*/*;q=0.1",
          "User-Agent": "dallah-vms-ios-auth-key-lookup",
        },
      },
      (response) => {
        const chunks = [];
        let receivedBytes = 0;

        const fail = (error) => {
          response.destroy();
          settle(reject, error);
        };

        response.on("data", (chunk) => {
          receivedBytes += chunk.length;
          if (receivedBytes > maxBytes) {
            fail(
              new AppleAuthServiceKeyLookupError(
                "Apple login asset exceeded the response-size safety limit.",
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.once("error", fail);
        response.once("end", () => {
          settle(resolve, {
            statusCode: response.statusCode || 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
            url: url.toString(),
          });
        });
      },
    );

    timeout = setTimeout(() => {
      request.destroy(
        new AppleAuthServiceKeyLookupError(
          "Timed out while reading Apple’s public login configuration.",
        ),
      );
    }, timeoutMs);
    request.setTimeout(timeoutMs, () => {
      request.destroy(
        new AppleAuthServiceKeyLookupError(
          "Timed out while reading Apple’s public login configuration.",
        ),
      );
    });
    request.once("error", (error) => settle(reject, error));
    request.end();
  });
}

function getScriptUrls(html, baseUrl) {
  const urls = [];
  const scriptTagPattern = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
  let tagMatch;

  while ((tagMatch = scriptTagPattern.exec(html))) {
    const tag = tagMatch[0];
    const srcMatch = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!srcMatch) continue;
    const typeMatch = tag.match(/\btype\s*=\s*(["'])(.*?)\1/i);
    if (typeMatch && typeMatch[2].toLowerCase() !== "module") continue;
    try {
      urls.push(new URL(srcMatch[2], baseUrl).toString());
    } catch {
      // Invalid script URLs are ignored and produce a bounded lookup failure.
    }
  }

  return urls;
}

function getImportedModuleUrls(source, baseUrl) {
  const urls = [];
  const candidatePattern =
    /(?:\bimport\s*(?:\(\s*)?|\bfrom\s*)(["'`])([^"'`]+)\1/g;
  let match;

  while ((match = candidatePattern.exec(source))) {
    const candidate = match[2];
    if (!/\.js(?:[?#].*)?$/i.test(candidate)) continue;
    try {
      const url = new URL(candidate, baseUrl);
      if (!urls.includes(url.toString())) urls.push(url.toString());
    } catch {
      // The URL is untrusted input; invalid candidates are ignored.
    }
  }

  return urls;
}

function publicKeyCandidates(source) {
  const candidates = [];
  const markerPattern = /(?:getIDMSAppIdKey|authServiceKey|serviceKey)/gi;
  let marker;

  while ((marker = markerPattern.exec(source))) {
    const context = source.slice(marker.index, marker.index + 2_000);
    const keyPattern = /["']([a-f0-9]{64})["']/gi;
    let keyMatch;
    while ((keyMatch = keyPattern.exec(context))) {
      if (!candidates.includes(keyMatch[1])) candidates.push(keyMatch[1]);
    }
  }

  return candidates;
}

function validatePublicKey(key) {
  if (typeof key !== "string" || !PUBLIC_KEY_PATTERN.test(key)) {
    throw new AppleAuthServiceKeyLookupError(
      "Apple’s login configuration did not contain a valid public auth service key.",
    );
  }
  return key;
}

async function lookupAppleAuthServiceKey(options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
    maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
    maxModules = DEFAULT_MAX_MODULES,
    maxModuleDepth = DEFAULT_MAX_MODULE_DEPTH,
    request = requestHttps,
  } = options;
  const startedAt = Date.now();
  let totalBytes = 0;
  let requests = 0;

  const requestBounded = async (url, depth, redirectCount = 0) => {
    const safeUrl = assertAllowedAppleUrl(url);
    if (depth > maxModuleDepth) {
      throw new AppleAuthServiceKeyLookupError(
        "Apple login configuration exceeded the module-depth safety limit.",
      );
    }
    if (redirectCount > MAX_REDIRECTS) {
      throw new AppleAuthServiceKeyLookupError(
        "Apple login configuration exceeded the redirect safety limit.",
      );
    }
    if (requests >= maxModules + 1) {
      throw new AppleAuthServiceKeyLookupError(
        "Apple login configuration exceeded the module-count safety limit.",
      );
    }

    const remainingMs = timeoutMs - (Date.now() - startedAt);
    if (remainingMs <= 0) {
      throw new AppleAuthServiceKeyLookupError(
        "Timed out while reading Apple’s public login configuration.",
      );
    }

    requests += 1;
    let response;
    try {
      response = await request(safeUrl.toString(), {
        timeoutMs: remainingMs,
        maxBytes: Math.min(maxResponseBytes, maxTotalBytes - totalBytes),
      });
    } catch (error) {
      if (error instanceof AppleAuthServiceKeyLookupError) throw error;
      throw new AppleAuthServiceKeyLookupError(
        "Unable to reach Apple’s public login configuration.",
        { cause: error },
      );
    }
    if (!response || typeof response !== "object") {
      throw new AppleAuthServiceKeyLookupError(
        "Apple returned an invalid public login configuration response.",
      );
    }

    const responseUrl = assertAllowedAppleUrl(
      response.url || safeUrl.toString(),
    );
    const body = typeof response.body === "string" ? response.body : "";
    const bodyBytes = Buffer.byteLength(body, "utf8");
    totalBytes += bodyBytes;
    if (bodyBytes > maxResponseBytes || totalBytes > maxTotalBytes) {
      throw new AppleAuthServiceKeyLookupError(
        "Apple login assets exceeded the response-size safety limit.",
      );
    }

    const statusCode = Number(response.statusCode) || 0;
    if (statusCode >= 300 && statusCode < 400) {
      const location = headerValue(response.headers, "location");
      if (!location) {
        throw new AppleAuthServiceKeyLookupError(
          "Apple returned a redirect without a destination.",
        );
      }
      let redirectUrl;
      try {
        redirectUrl = new URL(location, responseUrl);
      } catch {
        throw new AppleAuthServiceKeyLookupError(
          "Apple returned an invalid redirect destination.",
        );
      }
      return requestBounded(redirectUrl.toString(), depth, redirectCount + 1);
    }

    if (statusCode < 200 || statusCode >= 300) {
      throw new AppleAuthServiceKeyLookupError(
        `Apple’s public login configuration returned HTTP ${statusCode}.`,
      );
    }

    return { body, url: responseUrl };
  };

  const loginPage = await requestBounded(APPLE_LOGIN_URL, 0);
  const scriptUrls = getScriptUrls(loginPage.body, loginPage.url);
  if (scriptUrls.length === 0) {
    throw new AppleAuthServiceKeyLookupError(
      "Apple’s login page did not expose a module configuration script.",
    );
  }

  const queue = scriptUrls.map((url) => ({ url, depth: 1 }));
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    const safeUrl = assertAllowedAppleUrl(current.url).toString();
    if (visited.has(safeUrl)) continue;
    visited.add(safeUrl);

    const module = await requestBounded(safeUrl, current.depth);
    const candidates = publicKeyCandidates(module.body);
    if (candidates.length > 0) return validatePublicKey(candidates[0]);

    if (current.depth >= maxModuleDepth) continue;
    for (const importedUrl of getImportedModuleUrls(module.body, module.url)) {
      if (!visited.has(importedUrl)) {
        queue.push({ url: importedUrl, depth: current.depth + 1 });
      }
    }
  }

  throw new AppleAuthServiceKeyLookupError(
    "Apple’s public login scripts did not contain a valid auth service key.",
  );
}

module.exports = {
  ALLOWED_ORIGINS,
  APPLE_LOGIN_URL,
  AppleAuthServiceKeyLookupError,
  DEFAULT_MAX_RESPONSE_BYTES,
  DEFAULT_MAX_TOTAL_BYTES,
  DEFAULT_TIMEOUT_MS,
  PUBLIC_KEY_PATTERN,
  assertAllowedAppleUrl,
  getImportedModuleUrls,
  getScriptUrls,
  lookupAppleAuthServiceKey,
  publicKeyCandidates,
  requestHttps,
  validatePublicKey,
};
