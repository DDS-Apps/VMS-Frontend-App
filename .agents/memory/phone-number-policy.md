---
name: Phone number policy
description: Explicit nine-digit national-number rule across countries and editable phone fields.
---
Every selected country uses exactly nine national digits, with no leading zero.
The country calling code is excluded from this count.

**Why:** The user explicitly chose this application-wide rule after being warned
that some countries normally use eight or ten national digits. They explicitly
requested keeping the existing labels and validation messages unchanged.

**How to apply:** Apply it to normal/walk-in visit creation and editable mobile
and business phone fields in user/profile management. Keep optional fields
optional, extensions separate, and read-only SSO fields locked. Do not truncate
overlong numbers or silently remove a leading zero to make input valid. Preserve
country codes and existing API payload conventions.
Keep the original field labels, placeholders, and English/Arabic error messages;
this is a validation change, not a copy change.
