---
name: Serving .well-known and Outlook add-in files
description: express.static hides dot-directories by default, and Outlook task panes must not get X-Frame-Options.
---
**Rule:** Any static server for the web bundle must serve `/.well-known/*` as real files (express.static needs `dotfiles: "allow"`; the SPA fallback must run after the file check), serve the extension-less `apple-app-site-association` as `application/json`, and omit `X-Frame-Options` under `/outlook-addin/`.

**Why:** express.static's default `dotfiles: "ignore"` treats the `.well-known` *directory* as hidden, so Universal Links / App Links files silently fell through to `index.html` (observed on the QA deployment). Outlook renders the task pane in a frame; `SAMEORIGIN` blanks it.

**How to apply:** `server.js` (QA) and `web/web.config` (IIS) both encode this; keep them in sync and keep the `serverStaticCaching` tests green when changing either.
