---
name: Framer Motion Variants typecheck
description: How to type Framer Motion variant objects with cubic bezier ease arrays to avoid TS2322.
---

## Rule
When defining Framer Motion variants with a cubic-bezier `ease` array (e.g. `[0.22, 1, 0.36, 1]`), always:
1. Import `type Variants` from `"framer-motion"`.
2. Annotate the variant object with `: Variants`.
3. Mark the array `as const`.

```ts
import { type Variants } from "framer-motion";

const fadeUp: Variants = {
  visible: { opacity: 1, transition: { ease: [0.22, 1, 0.36, 1] as const } },
};
```

## Why
TypeScript infers `number[]` for plain arrays, which is not assignable to Framer Motion's `Easing` type. `as const` narrows to `readonly [number, number, number, number]`, which satisfies the `[number, number, number, number]` bezier tuple type. Without `: Variants`, the annotation is not present and the error still surfaces at the usage site.
