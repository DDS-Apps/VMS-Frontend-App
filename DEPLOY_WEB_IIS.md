# Deploying Dallah VMS Web to IIS

**Frontend URL:** `https://vms.dallah.com`  
**API URL:** `https://vms.dallah.com/api/`

---

## Prerequisites

Make sure these are installed before you begin:

| Tool | Where to get it |
|---|---|
| Node.js 18+ | https://nodejs.org |
| IIS with URL Rewrite module | https://www.iis.net/downloads/microsoft/url-rewrite |
| IIS ARR module (if `/api/` is reverse-proxied) | https://www.iis.net/downloads/microsoft/application-request-routing |

---

## Part 1 — Build (on your local machine)

### 1. Navigate to the repo

```cmd
cd C:\path\to\your\repo
```

### 2. Install dependencies

```cmd
npm install
```

### 3. Set environment variables

> ⚠️ These values are **baked into the JS bundle at build time**. If they are wrong, you must rebuild.

**Command Prompt:**
```cmd
set EXPO_PUBLIC_API_BASE_URL=https://vms.dallah.com
set EXPO_PUBLIC_MICROSOFT_AUTH_URL=https://vms.dallah.com
set EXPO_PUBLIC_VMS_API_BASE_URL=https://vms.dallah.com
```

**PowerShell:**
```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "https://vms.dallah.com"
$env:EXPO_PUBLIC_MICROSOFT_AUTH_URL = "https://vms.dallah.com"
$env:EXPO_PUBLIC_VMS_API_BASE_URL = "https://vms.dallah.com"
```

### 4. Build the web bundle

```cmd
npx expo export --platform web
```

Output goes to the `dist/` folder in the repo root. Takes 1–3 minutes.

### 5. Create `dist\web.config`

Create a new file at `dist\web.config` with this exact content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>

    <rewrite>
      <rules>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <!-- Don't rewrite real files (JS, CSS, images) -->
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <!-- Don't rewrite real directories -->
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <!-- Don't rewrite API calls — let them pass to the backend -->
            <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <staticContent>
      <remove fileExtension=".js" />
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <remove fileExtension=".mjs" />
      <mimeMap fileExtension=".mjs" mimeType="application/javascript" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>

  </system.webServer>
</configuration>
```

> The `^/api/` exclusion is critical — without it, IIS would intercept all API calls and return `index.html` instead.

### 6. Copy `dist\` to the server

**If you are working directly on the server:**
```cmd
xcopy /E /I /Y "dist" "C:\inetpub\wwwroot\vms"
```

**If you are copying from your machine to a remote server:**
```cmd
xcopy /E /I /Y "dist" "\\SERVER-NAME\c$\inetpub\wwwroot\vms"
```

After copying, the server folder should look like:
```
C:\inetpub\wwwroot\vms\
  index.html
  web.config
  _expo\
    static\
      js\
      css\
  assets\
```

---

## Part 2 — IIS Setup (run all commands as Administrator on the server)

### 7. Create the site

```cmd
md C:\inetpub\wwwroot\vms

%systemroot%\system32\inetsrv\appcmd add site ^
  /name:"DallahVMS" ^
  /physicalPath:"C:\inetpub\wwwroot\vms" ^
  /bindings:"https/*:443:vms.dallah.com"
```

> If you don't have an SSL certificate bound yet, use `http/*:80:vms.dallah.com` first and add HTTPS later.

### 8. Set the app pool to No Managed Code

```cmd
%systemroot%\system32\inetsrv\appcmd set apppool ^
  /apppool.name:"DallahVMS" ^
  /managedRuntimeVersion:""
```

### 9. Verify URL Rewrite module is installed

```cmd
%systemroot%\system32\inetsrv\appcmd list module /name:RewriteModule
```

- If it prints a line containing `RewriteModule` → ✅ installed
- If nothing prints → download and install from https://www.iis.net/downloads/microsoft/url-rewrite, then run `iisreset`

### 10. Start the site

```cmd
%systemroot%\system32\inetsrv\appcmd start site /site.name:"DallahVMS"
```

---

## Part 3 — `/api/` Reverse Proxy (skip if already configured)

Because the frontend (`https://vms.dallah.com`) and API (`https://vms.dallah.com/api/`) share the same domain, IIS must forward `/api/` requests to wherever the backend actually runs (e.g. `localhost:3000`).

### 11. Install ARR module

Download from https://www.iis.net/downloads/microsoft/application-request-routing and install. Then run:

```cmd
iisreset
```

### 12. Enable proxy in ARR

```cmd
%systemroot%\system32\inetsrv\appcmd set config ^
  -section:system.webServer/proxy ^
  /enabled:"True"
```

### 13. Add reverse proxy rule to `web.config`

Add this `<rule>` **before** the SPA Fallback rule inside the `<rules>` block in `C:\inetpub\wwwroot\vms\web.config`:

```xml
<rule name="API Reverse Proxy" stopProcessing="true">
  <match url="^api/(.*)" />
  <action type="Rewrite" url="http://localhost:YOUR_BACKEND_PORT/api/{R:1}" />
</rule>
```

Replace `YOUR_BACKEND_PORT` with the port your backend runs on (e.g. `3000`, `5000`, `8000`).

The final `<rules>` block should look like this:

```xml
<rules>
  <!-- 1. Forward /api/* to the backend -->
  <rule name="API Reverse Proxy" stopProcessing="true">
    <match url="^api/(.*)" />
    <action type="Rewrite" url="http://localhost:YOUR_BACKEND_PORT/api/{R:1}" />
  </rule>

  <!-- 2. All other paths → index.html (SPA) -->
  <rule name="SPA Fallback" stopProcessing="true">
    <match url=".*" />
    <conditions logicalGrouping="MatchAll">
      <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
      <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
      <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
    </conditions>
    <action type="Rewrite" url="/index.html" />
  </rule>
</rules>
```

---

## Part 4 — Verification

Open a browser and run through this checklist:

| Test | Expected |
|---|---|
| `https://vms.dallah.com/` | App loads |
| `https://vms.dallah.com/login` | App loads (not a 404) |
| `https://vms.dallah.com/api/docs` | Swagger docs load |
| Browser DevTools → Network tab | API calls go to `vms.dallah.com/api/...` with status 200 |

---

## Redeploying after a code change

Every time you push a new version, repeat only these steps:

```cmd
cd C:\path\to\your\repo
git pull origin main

set EXPO_PUBLIC_API_BASE_URL=https://vms.dallah.com
set EXPO_PUBLIC_MICROSOFT_AUTH_URL=https://vms.dallah.com
set EXPO_PUBLIC_VMS_API_BASE_URL=https://vms.dallah.com

npx expo export --platform web

REM web.config already exists in dist\ from before — keep it

xcopy /E /I /Y "dist" "C:\inetpub\wwwroot\vms"
```

No IIS restart needed — IIS picks up the new files immediately.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Every route returns 404 | URL Rewrite module missing or `web.config` not in the right folder | Install URL Rewrite; confirm `web.config` is at `C:\inetpub\wwwroot\vms\web.config` |
| Blank white screen | Wrong `EXPO_PUBLIC_API_BASE_URL` baked in | Rebuild with correct env vars |
| API calls return `index.html` | SPA fallback is catching `/api/` | Confirm the `^/api/` exclusion condition is in `web.config` |
| `.js` files return 404 | Missing MIME type | The `web.config` above adds `.js` — confirm it was saved |
| `https://vms.dallah.com/api/docs` returns 404 after deploy | ARR not configured or backend not running | Check backend process is running; complete Part 3 above |
