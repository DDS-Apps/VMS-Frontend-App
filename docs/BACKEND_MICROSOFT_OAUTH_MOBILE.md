# Backend Configuration: Microsoft OAuth Mobile Support

## Overview

The DALLAH DIGITAL VMS mobile app (Expo React Native) needs the backend to redirect OAuth callbacks to a deep link URL instead of a web URL when the request comes from a mobile device.

## Current Issue

When users login via Microsoft on mobile, the OAuth callback redirects to a web URL that Safari/Chrome cannot open. The mobile app expects a deep link redirect to `dallahvms://auth/callback`.

**Error shown on mobile:** "Safari cannot open the page because the address is invalid"

## Mobile App Details

- **App Scheme:** `dallahvms`
- **Callback Path:** `auth/callback`
- **Full Deep Link:** `dallahvms://auth/callback`
- **Bundle ID (iOS):** `com.dallah.vms`
- **Package Name (Android):** `com.dallah.vms`

---

## Required Backend Changes

### 1. Update Microsoft OAuth Login Endpoint

When the mobile app initiates login, it sends `platform=mobile` as a query parameter:

```
GET /auth/microsoft/login?platform=mobile
```

**Store this platform value** in the OAuth state so it's available in the callback.

```javascript
// Example: /auth/microsoft/login endpoint
router.get('/auth/microsoft/login', (req, res) => {
  const platform = req.query.platform || 'web';
  
  // Encode platform in state parameter
  const state = Buffer.from(JSON.stringify({ 
    platform,
    // ... any other state data you need
  })).toString('base64');
  
  const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(CALLBACK_URL)}&` +
    `scope=${encodeURIComponent('openid profile email User.Read')}&` +
    `state=${state}&` +
    `response_mode=query`;
  
  res.redirect(authUrl);
});
```

### 2. Update Microsoft OAuth Callback Handler

After exchanging the auth code for tokens, redirect based on the platform:

```javascript
// Example: /auth/microsoft/callback endpoint
router.get('/auth/microsoft/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Handle OAuth errors
    if (error) {
      return handleOAuthError(res, state, error, error_description);
    }
    
    // Decode state to get platform
    let platform = 'web';
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      platform = stateData.platform || 'web';
    } catch (e) {
      console.error('Failed to parse state:', e);
    }
    
    // Exchange code for tokens (your existing logic)
    const tokenResponse = await exchangeCodeForTokens(code);
    
    // Get user info from Microsoft Graph (your existing logic)
    const userInfo = await getUserInfo(tokenResponse.access_token);
    
    // Create your app's JWT token (your existing logic)
    const appTokens = await createAppTokens(userInfo);
    
    // Redirect based on platform
    if (platform === 'mobile') {
      // MOBILE: Redirect to deep link
      const params = new URLSearchParams({
        accessToken: appTokens.accessToken,
        refreshToken: appTokens.refreshToken || '',
        expiresIn: String(appTokens.expiresIn || 3600),
      });
      
      const mobileRedirectUrl = `dallahvms://auth/callback?${params.toString()}`;
      console.log('[OAuth] Redirecting to mobile app:', mobileRedirectUrl);
      return res.redirect(mobileRedirectUrl);
      
    } else {
      // WEB: Redirect to web app (your existing behavior)
      const webRedirectUrl = `${process.env.WEB_APP_URL}/auth/callback?accessToken=${appTokens.accessToken}`;
      return res.redirect(webRedirectUrl);
    }
    
  } catch (error) {
    console.error('[OAuth] Callback error:', error);
    return handleOAuthError(res, req.query.state, 'server_error', error.message);
  }
});

// Helper function for error handling
function handleOAuthError(res, state, error, errorDescription) {
  let platform = 'web';
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    platform = stateData.platform || 'web';
  } catch (e) {}
  
  const errorMessage = encodeURIComponent(errorDescription || error || 'Authentication failed');
  
  if (platform === 'mobile') {
    return res.redirect(`dallahvms://auth/callback?error=${error}&errorDescription=${errorMessage}`);
  } else {
    return res.redirect(`${process.env.WEB_APP_URL}/auth/error?error=${error}&message=${errorMessage}`);
  }
}
```

---

## Mobile Deep Link URL Format

### Success Response

```
dallahvms://auth/callback?accessToken=<jwt>&refreshToken=<jwt>&expiresIn=<seconds>
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `accessToken` | Yes | The JWT access token for API calls |
| `refreshToken` | No | Token for refreshing the access token |
| `expiresIn` | No | Token expiry time in seconds |

### Error Response

```
dallahvms://auth/callback?error=<error_code>&errorDescription=<message>
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `error` | Yes | Error code (e.g., `auth_failed`, `access_denied`) |
| `errorDescription` | No | Human-readable error message |

---

## Azure AD Configuration

You must add the mobile redirect URI to your Azure AD app registration:

1. Go to **Azure Portal** → **App Registrations** → Select your app
2. Go to **Authentication** in the left sidebar
3. Under **Platform configurations**, click **Add a platform**
4. Select **Mobile and desktop applications**
5. Under **Custom redirect URIs**, add:
   ```
   dallahvms://auth/callback
   ```
6. Scroll down to **Advanced settings**
7. Set **Allow public client flows** to **Yes**
8. Click **Save**

---

## Testing

### Test Web Login (should work as before)
1. Go to web app
2. Click "Sign in with Microsoft"
3. Should redirect back to web app with tokens

### Test Mobile Login
1. Build the mobile app using EAS Build
2. Install on a physical device or simulator
3. Tap "Sign in with Microsoft"
4. Complete Microsoft authentication in the browser
5. App should automatically open and user should be logged in

### Debug Logging

Add these logs to help debug:

```javascript
console.log('[OAuth] Platform detected:', platform);
console.log('[OAuth] Redirect URL:', platform === 'mobile' ? 'dallahvms://...' : 'web URL');
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Safari cannot open the page" | Backend not redirecting to `dallahvms://` | Check platform detection and redirect logic |
| App doesn't receive callback | `platform=mobile` not preserved through OAuth flow | Ensure state parameter contains platform |
| Token missing in callback | URL encoding issue | URL-encode all parameter values |
| Azure error about redirect URI | URI not registered | Add `dallahvms://auth/callback` to Azure AD |

---

## Summary Checklist

- [ ] Update `/auth/microsoft/login` to capture `platform` query param
- [ ] Store `platform` in OAuth state parameter
- [ ] Update `/auth/microsoft/callback` to decode state and get platform
- [ ] Add mobile redirect logic: `dallahvms://auth/callback?accessToken=...`
- [ ] Add error handling for mobile with deep link redirect
- [ ] Add `dallahvms://auth/callback` to Azure AD redirect URIs
- [ ] Enable "Allow public client flows" in Azure AD
- [ ] Test on physical mobile device

---

## Contact

For questions about the mobile app implementation, refer to:
- Mobile app scheme: `dallahvms`
- Frontend code: `hooks/useAzureAuth.ts`
- Deep link handling: Expo Linking module
