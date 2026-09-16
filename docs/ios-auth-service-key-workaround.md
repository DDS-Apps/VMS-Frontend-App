# iOS Apple authentication workaround

The `build:ios` and `build:preview:ios` npm scripts fetch the current **public**
Apple login service key before starting the local EAS CLI. This works around the
`iTunes service key is empty` failure reported in
[eas-cli issue #4392](https://github.com/expo/eas-cli/issues/4392) while Apple’s
legacy configuration endpoint returns 404.

## Verified upstream status

As checked on September 14, 2026:

- eas-cli issue #4392 is still open and reports the failure on eas-cli 24.3.0.
- The current npm `@expo/apple-utils` release is 2.2.0. Its
  `getItunesConnectServiceKeyAsync` implementation still first checks
  `EXPO_APP_STORE_AUTH_SERVICE_KEY`, then requests
  `https://appstoreconnect.apple.com/olympus/v1/app/config?hostname=itunesconnect.apple.com`.
- That endpoint currently returns HTTP 404. The Apple login page’s public module
  configuration contains the replacement key used by the workaround.
- No EAS or apple-utils release with a verified fix was available when this
  workaround was added.
- The wrapper invokes `npx --yes eas-cli@24.3.0` explicitly, so a fresh machine
  does not resolve the ambiguous `eas` package name.

## Running an iOS build

```sh
# Production profile (the existing production command, with extra arguments forwarded)
npm run build:ios -- --non-interactive

# Preview profile (the same Apple authentication workaround)
npm run build:preview:ios -- --non-interactive
```

The wrapper prints a redacted **public-key lookup succeeded** message, then
hands control to EAS with interactive stdio unchanged. That message does **not**
mean that Apple account authentication, credential creation, provisioning,
signing, or the remote EAS build has succeeded; those steps still run in EAS and
must complete successfully.

The wrapper preserves EAS’s exit code and signal result. Additional arguments
after `--` are forwarded to EAS. The preview script selects the `preview`
profile using the wrapper-only `--eas-profile preview` option.

## Safety boundaries

- Only HTTPS `appstoreconnect.apple.com` and `unpkg.apple.com` are accepted.
  Redirects are checked against that explicit allowlist; redirects to other
  hosts, HTTP, loops, oversized responses, and slow requests fail before EAS
  starts.
- The key must be a 64-character hexadecimal public configuration value.
- The wrapper never logs or writes the key. It keeps it in memory and adds
  `EXPO_APP_STORE_AUTH_SERVICE_KEY` only to the child EAS environment. A
  child preload also redacts that value if a local EAS/apple-utils log prints
  it.
- No Apple account password, keychain entry, cookie, session, or personal
  secret is read. No `eas.json` remote environment or EAS remote build setting
  is changed.

## Checks

The standard tests use only Node’s built-in test/assert APIs and mocked network
and child-process boundaries:

```sh
npm run test:ios-auth
```

To make an explicit live public lookup (the output reports only validation and
never prints the key):

```sh
npm run check:ios-auth-live
```

This live check verifies Apple’s public configuration and key shape only. It is
not an Apple login and does not verify an authenticated or signed build.
