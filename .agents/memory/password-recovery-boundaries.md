---
name: Password recovery boundaries
description: Ownership, verification and external-backend scope for non-SSO forgotten passwords.
---

Password recovery is a public frontend flow plus a handoff to the existing external backend, not authorization to add another authentication provider or local authentication server.

**Why:** The accepted scope requires emailed ownership verification for existing non-SSO accounts; configured API paths do not establish backend support. Frontend fixtures cannot prove mail delivery, SSO exclusion, single-use redemption or session revocation.

**How to apply:** Keep account eligibility authoritative on the backend. Request confirmations must not distinguish local, SSO, inactive or unknown accounts. Report live QA separately from fixture checks. Use the handoff in `docs/non-sso-password-reset-backend-prompt.md` to coordinate contract changes; no production completion claims before an authorized real-mail/password-change test.

Recovery must not inherit a restored session's dashboard routing or authenticated transport refresh behavior. Do not persist reset secrets to survive reload.

**Why:** Someone can open an emailed recovery link while a different account is already signed in. Restoring secrets from durable storage or coupling reset errors to that session expands the risk beyond the account being recovered.

**How to apply:** Keep reset intent public, use memory-only credentials and backend-authoritative affected-account revocation. After URL scrubbing, a full reload intentionally requires reopening the email or requesting a new link.

The backend handoff requires an eight-character minimum, rejects blank-only passwords, preserves spaces, compares confirmation exactly, and caps new passwords at 72 UTF-8 bytes for recovery and signed-in Change Password.

**Why:** The backend uses bcrypt, whose input limit is measured in bytes, not JavaScript character count. Older frontend six-character guidance is not the new-password contract.

**How to apply:** Align new-password validation and English/Arabic guidance without trimming submissions or changing existing-account login eligibility. Backend source existence is not deployment evidence: migration, configuration, real-mail QA and revocation/race verification remain external release gates.

Public password recovery should match the existing sign-in screen's background, typography, field labels and button sizing rather than introduce a separate auth design.

**Why:** The user explicitly requested visual consistency after reviewing recovery screenshots, including the focused email field.

**How to apply:** Use the sign-in screen as the visual reference in both languages, retain a visible single focus indicator, and keep meaningful recovery wording and backend-unavailable errors intact.
