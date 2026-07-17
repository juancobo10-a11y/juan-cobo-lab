---
name: PreguntaItem textarea restructure
description: Why PreguntaItem was restructured to separate toggle-button from expanded panel (textarea inside button = invalid HTML).
---

## Rule
In `PreguntaItem`, the expanded panel (propósito, orientación, textarea) must live **outside** the `<button>` element that toggles the accordion. The `<button>` covers only the header row.

## Why
Placing a `<textarea>` (or any interactive element) inside a `<button>` is invalid HTML. Browsers handle it inconsistently: some swallow click events from the textarea (accordion closes on every keystroke), others propagate them. The fix uses a sibling `<div role="region">` panel outside the button, which is also the WAI-ARIA accordion pattern.

## How to apply
Any future accordion item that needs user input (text, select, checkbox) inside the expanded panel must follow the same split: `<button>` for the header trigger only, `<div>` (or `<motion.div>`) for the body. The `aria-controls` attribute on the button links to the panel's `id`.
