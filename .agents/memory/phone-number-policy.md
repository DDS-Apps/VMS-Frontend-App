---
name: Phone number policy
description: Country-specific phone validation, separate calling codes, and unchanged form copy.
---
Use the selected country's numbering rules, not a universal nine-digit limit.
Keep the country calling code separate from the editable national number.
Saudi national numbers retain their nine-digit requirement. Pakistan mobile
numbers require ten national digits. Significant national
zeroes must remain supported in countries whose numbering plans require them.

**Why:** On 2026-10-23 the user confirmed country-specific rules across all phone
fields after the global nine-digit policy blocked a valid Pakistan number.
This supersedes their earlier all-country nine-digit instruction. Their request
to keep existing labels and validation messages unchanged remains in force.

**How to apply:** Apply it to normal/walk-in visit creation and editable mobile
and business phone fields in user/profile management. Keep optional fields
optional, extensions separate, and read-only SSO fields locked. Do not truncate
overlong numbers or silently remove a domestic trunk zero to make input valid.
Preserve country codes and existing API payload conventions. Allow partial
typing within the country's limits, but require a country-valid number to save.
Keep the original field labels, placeholders, and English/Arabic error messages;
this is a validation change, not a copy change.
