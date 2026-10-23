---
name: Phone number policy
description: Country-specific phone validation, separate calling codes, and unchanged form copy.
---
Use the selected country's numbering rules, not a universal nine-digit limit.
Keep the country calling code separate from the editable national number.
Saudi national numbers retain their nine-digit requirement. Pakistan mobile
numbers require ten national digits. Significant national
zeroes must remain supported in countries whose numbering plans require them.

**Why:** A universal nine-digit rule blocks valid international numbers. The
product owner approved country-specific rules in place of the earlier global
limit, while retaining the existing labels and validation messages.

**How to apply:** Apply it to normal/walk-in visit creation and editable mobile
and business phone fields in user/profile management. Keep optional fields
optional, extensions separate, and read-only SSO fields locked. Do not truncate
overlong numbers or silently remove a domestic trunk zero to make input valid.
Preserve country codes and existing API payload conventions. Allow partial
typing within the country's limits, but require a country-valid number to save.
Keep the original field labels, placeholders, and English/Arabic error messages;
this is a validation change, not a copy change.

Preserve an explicitly selected country when a parent acknowledges the same
phone value. A canonical international number does not uniquely encode how the
user chose to split a shared calling code and national digits.

**Why:** A +1 number can also match a longer territory prefix in the country
picker. Re-inferring the country on a controlled echo can change the selected
country and shorten the displayed national portion even though the full number
has not changed.

**How to apply:** Distinguish acknowledgements from genuinely external value
changes, which still need rehydration. Accept existing digit-only international
API values and known presentation direction marks without dropping digits,
emitting edits on mount, or relaxing save-time phone validity.
