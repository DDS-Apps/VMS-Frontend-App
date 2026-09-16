const express = require("express");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 5000;
const DEFAULT_DIST_DIR = path.join(__dirname, "dist");

// Expo's web export writes content-hashed filenames under these prefixes, so
// they can be cached for a year and never revalidated. Everything else (the
// HTML shell, metadata, the service worker, copied public/ files) keeps a
// stable URL and is revalidated with ETags on every load instead.
const IMMUTABLE_PREFIXES = ["/_expo/static/", "/assets/"];
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const REVALIDATE_CACHE = "no-cache";

// Assets that scripts/precompress-dist.js may have written .br / .gz variants for.
const COMPRESSIBLE =
  /\.(js|mjs|css|html|json|map|svg|txt|xml|webmanifest|ttf|otf)$/i;

function cacheControlFor(urlPath) {
  return IMMUTABLE_PREFIXES.some((prefix) => urlPath.startsWith(prefix))
    ? IMMUTABLE_CACHE
    : REVALIDATE_CACHE;
}

// Parses an Accept-Encoding header into the encodings the client will accept,
// honouring q-values (RFC 9110 §12.5.3): "br;q=0, gzip" must not get Brotli.
// Returns the accepted encodings ordered by preference, then by our own order.
const SERVED_ENCODINGS = ["br", "gzip"];

function acceptedEncodings(headerValue) {
  const weights = new Map();
  String(headerValue || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [rawName, ...params] = part.split(";");
      const name = rawName.trim().toLowerCase();
      let q = 1;
      params.forEach((param) => {
        const [key, value] = param.split("=").map((piece) => piece.trim());
        if (key && key.toLowerCase() === "q") {
          const parsed = Number(value);
          q = Number.isFinite(parsed) ? parsed : 0;
        }
      });
      weights.set(name, q);
    });

  return SERVED_ENCODINGS.map((encoding, index) => {
    const q = weights.has(encoding)
      ? weights.get(encoding)
      : weights.has("*")
        ? weights.get("*")
        : 0;
    return { encoding, q, index };
  })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.encoding);
}

function safeDecode(urlPath) {
  try {
    return decodeURIComponent(urlPath);
  } catch (_err) {
    return null;
  }
}

function createApp(distDir) {
  const DIST_DIR = path.resolve(distDir || DEFAULT_DIST_DIR);
  const INDEX_PATH = path.join(DIST_DIR, "index.html");
  const app = express();

  app.disable("x-powered-by");

  app.use(function (req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  app.get("/health", function (req, res) {
    const ready = fs.existsSync(INDEX_PATH);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      status: ready ? "healthy" : "starting",
      timestamp: new Date().toISOString(),
    });
  });

  // Serve a pre-compressed variant when the client accepts it. Falls through to
  // express.static (uncompressed) when no variant exists, e.g. a build that
  // skipped the precompress step.
  app.use(function (req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const decodedPath = safeDecode(req.path);
    if (!decodedPath) return next();
    const urlPath = decodedPath.endsWith("/")
      ? decodedPath + "index.html"
      : decodedPath;
    if (!COMPRESSIBLE.test(urlPath)) return next();

    const filePath = path.join(DIST_DIR, urlPath);
    if (!filePath.startsWith(DIST_DIR + path.sep)) return next();

    res.setHeader("Vary", "Accept-Encoding");

    const candidates = acceptedEncodings(req.headers["accept-encoding"]).map(
      (encoding) => ({
        encoding,
        file: filePath + (encoding === "br" ? ".br" : ".gz"),
      }),
    );

    const match = candidates.find((candidate) => fs.existsSync(candidate.file));
    if (!match) return next();

    res.type(path.extname(urlPath));
    res.setHeader("Content-Encoding", match.encoding);
    res.setHeader("Cache-Control", cacheControlFor(urlPath));
    res.sendFile(
      match.file,
      { cacheControl: false, etag: true, lastModified: true },
      function (err) {
        if (err) next(err);
      },
    );
  });

  app.use(
    express.static(DIST_DIR, {
      etag: true,
      lastModified: true,
      index: "index.html",
      cacheControl: false,
      setHeaders: function (res, filePath) {
        const relative =
          "/" + path.relative(DIST_DIR, filePath).split(path.sep).join("/");
        res.setHeader("Cache-Control", cacheControlFor(relative));
      },
    }),
  );

  app.use(function (req, res) {
    if (fs.existsSync(INDEX_PATH)) {
      res.setHeader("Cache-Control", REVALIDATE_CACHE);
      res.sendFile(INDEX_PATH, { cacheControl: false });
    } else {
      res.setHeader("Cache-Control", "no-store");
      res.status(503).send("App is being built — please refresh in a moment.");
    }
  });

  app.use(function (err, req, res, _next) {
    console.error("[server] unhandled error:", err && err.message);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

function start() {
  const DIST_DIR = DEFAULT_DIST_DIR;
  const INDEX_PATH = path.join(DIST_DIR, "index.html");
  const app = createApp(DIST_DIR);

  app.listen(PORT, "0.0.0.0", function () {
    const distExists = fs.existsSync(DIST_DIR);
    const indexExists = fs.existsSync(INDEX_PATH);
    console.log("Production server running on http://0.0.0.0:" + PORT);
    console.log("Serving Expo web app from: " + DIST_DIR);
    if (!distExists) {
      console.error(
        "[server] WARNING: dist/ directory does not exist — run: npx expo export --platform web",
      );
    } else if (!indexExists) {
      console.error(
        "[server] WARNING: dist/index.html not found — build may have failed",
      );
    } else {
      console.log("[server] dist/index.html confirmed present");
    }
  });
}

if (require.main === module) {
  start();
}

module.exports = { createApp, cacheControlFor, acceptedEncodings };
