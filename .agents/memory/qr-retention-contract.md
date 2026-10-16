---
name: QR retention contract
description: Backend handoff distinguishes QR access validity from meeting end, approvals, and physical movements.
---

QR access must follow backend validity, not expire solely at meeting end. Preserve the 60-minute-before-start activation distinction. Retention after meeting end requires backend retainedUntilCheckout; present “Valid until checkout or 9 PM,” not guaranteed access until 9 PM. Checkout before meeting end may allow re-entry; later checkout may expire access.

**Why:** The user supplied this revised backend handoff on 2026-10-16. Visit completion, approval deadlines, and access validity have different meanings.

**How to apply:** Use current server fields and invitation permissions; retained access never permits late acceptance. HTTP 410 overrides cached QR/acceptance snapshots. Show administrative completion separately from physical checkout, preserve backend movement labels/effects, and replace corrected events by stable ID. Logical expiry takes effect even if physical device cleanup is still pending; do not grant access while waiting for cleanup. The user explicitly confirmed this distinction on 2026-10-16. Contract examples are not proof of deployed reader behavior.

Do not treat HTTP response arrival order as the version of backend access state. A less-complete detail response must not overwrite dedicated history validity or corrected events. A failed separate history read must withhold unverified QR claims without erasing events the detail endpoint was authorized to return.

**Why:** Independently polling endpoints may settle in either order; using their client arrival times as server revisions can restore logically revoked access or falsely show no movements.

**How to apply:** Merge by stable event identity and recorded revision, retain the dedicated validity decision, and test the combined result in both response orders and on separate-endpoint permission errors.
