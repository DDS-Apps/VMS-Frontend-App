/**
 * Exercises server.js against a throwaway dist/ directory: pre-compressed
 * variants are served when accepted, hashed assets are cached immutably, and
 * the HTML shell / service worker are always revalidated.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const zlib = require("zlib");

const { createApp, cacheControlFor, acceptedEncodings } = require("../server.js");

const JS_PATH = "/_expo/static/js/web/index-abc123.js";
const FONT_PATH = "/assets/fonts/Some_Font.deadbeef.ttf";
const JS_SOURCE = "console.log('hello from the bundle');".repeat(50);
const FONT_SOURCE = Buffer.alloc(4096, 7);

let distDir;
let server;
let baseUrl;

function writeFile(relativePath, contents) {
  const target = path.join(distDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function request(urlPath, headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${urlPath}`, { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
      );
    });
    req.on("error", reject);
    req.end();
  });
}

beforeAll(async () => {
  distDir = fs.mkdtempSync(path.join(os.tmpdir(), "vms-dist-"));
  writeFile("index.html", "<!doctype html><html><body><div id='root'></div></body></html>");
  writeFile("firebase-messaging-sw.js", "self.addEventListener('push', () => {});");
  writeFile(".well-known/apple-app-site-association", '{"applinks":{"details":[]}}');
  writeFile(".well-known/assetlinks.json", '[{"relation":["delegate_permission/common.handle_all_urls"]}]');
  writeFile("outlook-addin/taskpane.html", "<!doctype html><html><body>task pane</body></html>");
  writeFile(JS_PATH, JS_SOURCE);
  writeFile(`${JS_PATH}.br`, zlib.brotliCompressSync(Buffer.from(JS_SOURCE)));
  writeFile(`${JS_PATH}.gz`, zlib.gzipSync(Buffer.from(JS_SOURCE)));
  writeFile(FONT_PATH, FONT_SOURCE);
  writeFile(`${FONT_PATH}.gz`, zlib.gzipSync(FONT_SOURCE));

  server = createApp(distDir).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(distDir, { recursive: true, force: true });
});

describe("cacheControlFor", () => {
  it("marks hashed build output immutable and everything else revalidated", () => {
    expect(cacheControlFor("/_expo/static/js/web/index-abc.js")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(cacheControlFor("/assets/fonts/x.abc.ttf")).toBe("public, max-age=31536000, immutable");
    expect(cacheControlFor("/index.html")).toBe("no-cache");
    expect(cacheControlFor("/firebase-messaging-sw.js")).toBe("no-cache");
    expect(cacheControlFor("/outlook-addin/taskpane.html")).toBe("no-cache");
  });
});

describe("acceptedEncodings", () => {
  it("orders accepted encodings by q-value and drops refused ones", () => {
    expect(acceptedEncodings("gzip, deflate, br")).toEqual(["br", "gzip"]);
    expect(acceptedEncodings("gzip;q=1.0, br;q=0.5")).toEqual(["gzip", "br"]);
    expect(acceptedEncodings("br;q=0, gzip")).toEqual(["gzip"]);
    expect(acceptedEncodings("*")).toEqual(["br", "gzip"]);
    expect(acceptedEncodings("*;q=0, gzip")).toEqual(["gzip"]);
    expect(acceptedEncodings("identity")).toEqual([]);
    expect(acceptedEncodings(undefined)).toEqual([]);
  });
});

describe("static serving", () => {
  it("serves the brotli variant of the bundle when the client accepts it", async () => {
    const res = await request(JS_PATH, { "accept-encoding": "gzip, deflate, br" });

    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("br");
    expect(res.headers["content-type"]).toMatch(/javascript/);
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(res.headers["vary"]).toBe("Accept-Encoding");
    expect(zlib.brotliDecompressSync(res.body).toString()).toBe(JS_SOURCE);
  });

  it("falls back to gzip, then to the raw file, based on Accept-Encoding", async () => {
    const gz = await request(JS_PATH, { "accept-encoding": "gzip" });
    expect(gz.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(gz.body).toString()).toBe(JS_SOURCE);

    const raw = await request(JS_PATH, { "accept-encoding": "identity" });
    expect(raw.headers["content-encoding"]).toBeUndefined();
    expect(raw.headers["vary"]).toBe("Accept-Encoding");
    expect(raw.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(raw.body.toString()).toBe(JS_SOURCE);
  });

  it("honours q-values, so a client that refuses brotli gets gzip", async () => {
    const refusedBr = await request(JS_PATH, { "accept-encoding": "br;q=0, gzip" });
    expect(refusedBr.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(refusedBr.body).toString()).toBe(JS_SOURCE);

    const refusedAll = await request(JS_PATH, { "accept-encoding": "br;q=0, gzip;q=0" });
    expect(refusedAll.headers["content-encoding"]).toBeUndefined();
    expect(refusedAll.body.toString()).toBe(JS_SOURCE);
  });

  it("serves fonts compressed with the right content type", async () => {
    const res = await request(FONT_PATH, { "accept-encoding": "br, gzip" });

    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.headers["content-type"]).toBe("font/ttf");
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(zlib.gunzipSync(res.body).equals(FONT_SOURCE)).toBe(true);
  });

  it("answers conditional requests with 304 for compressed assets", async () => {
    const first = await request(JS_PATH, { "accept-encoding": "br" });
    const second = await request(JS_PATH, {
      "accept-encoding": "br",
      "if-none-match": first.headers.etag,
    });

    expect(second.status).toBe(304);
  });

  it("never lets the HTML shell or the service worker be cached without revalidation", async () => {
    const root = await request("/", { "accept-encoding": "br" });
    expect(root.status).toBe(200);
    expect(root.headers["content-type"]).toMatch(/text\/html/);
    expect(root.headers["cache-control"]).toBe("no-cache");

    const deepLink = await request("/dashboard/visitors/123", { "accept-encoding": "br" });
    expect(deepLink.status).toBe(200);
    expect(deepLink.headers["content-type"]).toMatch(/text\/html/);
    expect(deepLink.headers["cache-control"]).toBe("no-cache");

    const sw = await request("/firebase-messaging-sw.js", { "accept-encoding": "br" });
    expect(sw.status).toBe(200);
    expect(sw.headers["cache-control"]).toBe("no-cache");
  });

  it("does not serve files outside dist/", async () => {
    const res = await request("/..%2f..%2fpackage.json", { "accept-encoding": "br" });

    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.body.toString()).not.toContain('"dependencies"');
  });

  it("serves the Universal Links / App Links files instead of the SPA shell", async () => {
    const aasa = await request("/.well-known/apple-app-site-association");
    expect(aasa.status).toBe(200);
    expect(aasa.headers["content-type"]).toMatch(/^application\/json/);
    expect(aasa.headers["cache-control"]).toBe("no-cache");
    expect(JSON.parse(aasa.body.toString())).toEqual({ applinks: { details: [] } });

    const assetlinks = await request("/.well-known/assetlinks.json");
    expect(assetlinks.status).toBe(200);
    expect(assetlinks.headers["content-type"]).toMatch(/^application\/json/);
    expect(JSON.parse(assetlinks.body.toString())[0].relation[0]).toBe(
      "delegate_permission/common.handle_all_urls",
    );
  });

  it("lets Outlook frame the add-in task pane but nothing else", async () => {
    const taskpane = await request("/outlook-addin/taskpane.html");
    expect(taskpane.status).toBe(200);
    expect(taskpane.body.toString()).toContain("task pane");
    expect(taskpane.headers["x-frame-options"]).toBeUndefined();
    expect(taskpane.headers["x-content-type-options"]).toBe("nosniff");

    const shell = await request("/");
    expect(shell.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("keeps the health endpoint uncached", async () => {
    const res = await request("/health");

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(JSON.parse(res.body.toString()).status).toBe("healthy");
  });
});
