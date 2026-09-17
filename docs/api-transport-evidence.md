# API transport evidence (task #226)

## Scope and evidence labels

This document covers the shared Axios transport only. It does not claim that a
controlled adapter reproduces every historical browser cancellation, and it
does not make any conclusion about backend scheduler or database latency.

* **Supplied observation** means the attached backend production-log report.
* **Controlled simulation** means the deterministic Axios-adapter scenarios in
  `__tests__/httpClientTransport.test.ts` and
  `__tests__/httpClientTokenRefresh.test.ts`. They exercise the real client
  interceptor chain but do not contact a live backend.

## Baseline

The shared normal request cap is `180000` ms in `api/config.ts`; uploads retain
their separate `120000` ms cap. The supplied observation reported eventual
200 responses of approximately:

| Sanitized route | Supplied duration | Transport implication |
| --- | ---: | --- |
| `GET /api/v1/visits` | 41–42 s | Exceeds the 30 s client cap |
| `GET /api/v1/approvals/awaiting-visitor` | 31–40 s | Exceeds the 30 s client cap |
| `GET /api/v1/notifications/unread-count` | 16–21.5 s | Within the cap if not otherwise cancelled |
| `GET /api/v1/approvals/pending-host` | 9.4 s | Within the cap if not otherwise cancelled |
| `GET /api/v1/visits/rooms/availability` | 10.8 s | Within the cap if not otherwise cancelled |

Therefore, the two supplied slow classes are consistent with an Axios timeout
when the platform adapter honors the configured finite cap. The supplied
report alone cannot prove the cause of an individual browser `cancelled`
entry; it could also be a navigation AbortSignal or a stale session response.

These baseline durations are **supplied observations**, not a local
reproduction. No historical browser Network export or credentials were used,
and this document does not relabel those production observations as measured
test results. The pre-change source also emitted the resolved request URL in
its HTTP console message; it was inspected from the prior revision but not
executed against a service because doing so would not reproduce the historical
backend timing safely.

## After: controlled simulations and a real local transport

The following are intentionally **simulated**, privacy-safe assertions. They
are not represented as live Network-panel captures.

| Scenario | Controlled transport evidence | Expected sanitized timing result |
| --- | --- | --- |
| Slow success below cap | Adapter delays 15 ms and verifies `timeout === 180000` | `GET /api/v1/visits`, `outcome=ok` |
| Adapter timeout | Adapter emits `ETIMEDOUT` after a controlled delay | `outcome=timeout`, `reason=transport_timeout`, API error `TIMEOUT` |
| Navigation cancellation with another consumer | Two equal reads share one adapter call; the navigation subscriber aborts while an unsignalled subscriber remains | Cancelled subscriber receives `CANCELLED`; remaining subscriber receives the response; one request timing sample |
| Final subscriber cancellation | All signal subscribers abort | Shared controller aborts with normalized `last_subscriber_cancelled` |
| Rapid remount after final cancellation | The aborted adapter promise is intentionally left unresolved, then the same GET starts again | A second transport starts; old identity-guarded cleanup cannot remove the replacement |
| Privacy-safe diagnostics | Mock Axios failure uses a credential-bearing URL, PII query, short token path, request body, and error details | Captured logs/timing retain only `POST /api/v1/invites/:id`, status, outcome, and retry metadata |
| Refresh overlap | A 401 opens one refresh gate; a new protected read is not sent until it resolves | One refresh, both reads use retry attempt `1` or the refreshed token |
| Late old-token 401 | A pre-refresh response returns 401 after a successful rotation | One refresh; late read replays once with the fresh token |

`__tests__/httpClientTransport.test.ts` additionally starts a local Node HTTP
server and explicitly selects Axios's `http` adapter. This is a real socket,
real delayed response, and real Axios timeout rather than an injected Axios
error. It changes only `httpClient.defaults.timeout` inside the test; the
application default is `180000` ms and is separately asserted by the
slow-success adapter test.

### Measured local run (after)

Command executed: `npx jest __tests__/httpClientTransport.test.ts --runInBand`

The following sanitized raw duration log lines were captured on that controlled
run. The exact milliseconds are host-scheduling dependent; the test asserts
bounded ranges instead of these literal values.

```text
[HTTP] Request GET /api/v1/visits retry=0
[HTTP] Response GET /api/v1/visits retry=0 status=200 outcome=ok durationMs=68
[HTTP] Request GET /api/v1/approvals/awaiting-visitor retry=0
[HTTP] Failure GET /api/v1/approvals/awaiting-visitor retry=0 outcome=timeout reason=axios_timeout durationMs=48
```

The controlled `/api/v1/visits` handler waited 35 ms with a 120 ms test-only
cap and the timing store recorded `outcome=ok`, `status=200`. The controlled
`/api/v1/approvals/awaiting-visitor` handler waited 150 ms with a 45 ms
test-only cap; Axios ended it after 48 ms, and the timing store recorded
`outcome=timeout`, `reason=axios_timeout`, and `status=null`. This proves the
installed Axios Node adapter honors a finite timeout and that the client
records the real transport outcome. It does not claim to reproduce every
historical browser cancellation or production latency incident.

`api/requestTiming.ts` retains only method, normalized route, status, duration,
outcome, normalized timeout/cancellation reason, and retry attempt. Routes
drop query strings and use an allowlist of known static route segments; every
other segment is redacted to `:id` after safe decoding. This deliberately
redacts short opaque tokens, percent-encoded emails and phone numbers, and
unknown future route segments. No request bodies, tokens, credential-bearing
URLs, raw error objects, email addresses, phone numbers, or query values are
logged. Transport tests capture console output from a credential-bearing URL,
PII query values, a request body, server error details, and a short invite
token to verify none reaches logs or timing samples.

## Transport changes

* GET requests now share only an in-progress request, keyed by normalized
  request inputs and session epoch. A completed response is never cached.
* `get(url, params?, { signal? })` gives each caller a subscription. Aborting
  one subscriber does not cancel an unsignalled or still-active subscriber;
  the underlying transport aborts after the final subscriber leaves.
* If final-subscriber cancellation occurs before its adapter settles, a rapid
  remount receives a new in-flight entry rather than subscribing to the
  aborted promise. Identity-guarded cleanup prevents the old settlement from
  deleting the replacement.
* New protected requests wait behind the epoch-scoped refresh operation.
  Concurrent 401s share it, and every original request can replay at most
  once. A late 401 sent under the old access token reuses the completed token
  rotation rather than starting a second refresh.
* Refresh token rotation deliberately does not bump the session epoch. Logout
  and new-login changes still do, so old requests and old refresh failures
  cannot own or sign out the new session.
* Runtime refresh failures now clear the affected session and notify the
  registered logout handler once for any failure (network, timeout, server,
  rejection, or malformed response). The exported
  `isDefinitiveRefreshFailure` remains available for the separate startup
  restore policy.