---
name: Apple build authentication
description: Distinguish public Apple login configuration failures from account or signing credential failures.
---

Apple login's “iTunes service key is empty” can be an upstream public configuration lookup failure, not a bad account password or signing certificate.

**Why:** On 2026-09-14, the latest EAS release still used an Apple endpoint returning 404; fetching Apple's current public login configuration succeeded instead. Upgrading alone did not resolve the user's error.

**How to apply:** Check upstream status before changing the workaround. Never copy static keys from issue comments or revoke signing credentials for this error. Keep any public-key override local to the CLI process, and distinguish successful public lookup from verified Apple authentication and signed-build success.