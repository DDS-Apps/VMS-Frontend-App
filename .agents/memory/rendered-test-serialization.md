---
name: Rendered React Native test assertions
description: Avoid circular serialization when mocked native list props retain React elements.
---

Assert rendered text and specific interactive props rather than serializing the
entire mocked native render tree.

**Why:** Native component mocks can retain JSX-valued list/header props with
React owner/Fiber references. Serializing the full `toJSON()` result can fail
with a circular-reference error even though rendering and behavior are correct.

**How to apply:** For notices, inspect rendered text-node children. For disabled
controls, inspect native disabled/accessibility props and test the handler guard.
Do not strip React ownership fields or change application behavior to make a
whole-tree serialization assertion pass.
