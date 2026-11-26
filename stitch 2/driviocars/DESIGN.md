# Design System Strategy: DrivioCars

## 1. Overview & Creative North Star: "The Kinetic Gallery"
This design system moves away from the static, boxy nature of traditional automotive platforms. Our Creative North Star is **"The Kinetic Gallery."** We treat every vehicle and data point as a piece of high-end art housed within a fluid, breathable space. 

To achieve a "Velocity Prime" aesthetic, we prioritize **intentional asymmetry** and **tonal depth**. Rather than a rigid grid of identical boxes, we use varying card widths and staggered vertical spacing (using our 16 and 20 spacing tokens) to create a sense of forward motion. We replace harsh structural lines with soft transitions of light, ensuring DrivioCars feels like a premium, reliable concierge service rather than a database.

---

## 2. Colors & The Surface Philosophy
The palette is rooted in a pristine, "Hyper-Clean" neutral base, punctuated by a singular, high-performance blue.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** To define boundaries, use background color shifts. For example, a `surface-container-low` section should sit directly on a `surface` background. If you feel the need for a line, you haven't used enough whitespace or tonal contrast.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use a "Material-Inertia" approach:
- **Base Layer:** `surface` (#fbf8ff) for the primary page background.
- **Sectional Layer:** `surface-container-low` (#f3f2ff) to define large content areas.
- **Interactive Layer:** `surface-container-lowest` (#ffffff) for primary cards to make them "pop" against the lower-tier backgrounds.

### The "Glass & Gradient" Rule
To elevate CTAs beyond standard buttons, use a subtle linear gradient transitioning from `primary` (#003ec7) to `primary-container` (#0052ff) at a 135-degree angle. For floating navigation or overlays, apply **Glassmorphism**: use `surface` at 70% opacity with a `24px` backdrop blur to maintain context and premium feel.

---

## 3. Typography: Editorial Authority
We use **Plus Jakarta Sans** exclusively. Its geometric yet open counters provide the "Modern & Reliable" tone required for DrivioCars.

- **Display (lg/md):** Reserved for hero headlines. Use `tight` letter spacing (-0.02em) to create a high-fashion, editorial impact.
- **Headline & Title:** Use `on-surface` (#191b25). These should be bold and authoritative. Use `headline-sm` for card titles to ensure they feel substantial.
- **Body & Labels:** Use `on-surface-variant` (#434656) for secondary information. This slight reduction in contrast prevents the UI from feeling "noisy" and directs the eye to the primary actions.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "pop"; we use them to create "atmosphere."

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a natural "lift" without a single pixel of shadow.
- **Ambient Shadows:** For "floating" elements like modals or hover states on vehicle cards, use a shadow with a 32px-48px blur, 4% opacity, using the `on-surface` color tinted with `primary`. It should feel like a soft glow, not a dark drop-shadow.
- **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use the `outline-variant` (#c3c5d9) at **15% opacity**. Anything more is too heavy.

---

## 5. Components & Primitive Styling

### Buttons (The "Drive" Actions)
- **Primary:** Gradient fill (`primary` to `primary-container`), `xl` (1.5rem) roundedness. No border.
- **Secondary:** `surface-container-high` background with `on-primary-fixed-variant` text. 
- **Tertiary:** Pure text using `title-sm` with a `primary` color. No background until hover.

### Cards & Lists (The "Gallery" Items)
- **Rules:** Forbid divider lines. Use `spacing-8` (2rem) of vertical whitespace to separate items. 
- **Vehicle Cards:** Use `lg` (1rem) roundedness. The image should be flush to the top. The card body uses `surface-container-lowest`.

### Input Fields (The "Concierge" Inputs)
- **State:** Default state uses `surface-container-highest` with no border. On focus, transition to a `primary` "Ghost Border" (20% opacity) and a subtle inner glow.
- **Shape:** Use `md` (0.75rem) roundedness to keep them feeling modern but distinct from the "full" roundness of buttons.

### Specialized Component: The "Velocity Gauge" Progress
For DrivioCars' reliability scores or car specs, use a custom horizontal bar with `full` roundedness. The background is `surface-container-high` and the progress fill is the `primary` blue.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use `display-lg` typography for hero sections, even if it feels "too big"—it creates the premium editorial look.
- **Do** overlap elements. Let a vehicle image break the boundary of a card slightly to create depth.
- **Do** use the `20` (5rem) spacing token between major sections to let the design breathe.

### Don’t:
- **Don’t** use pure black (#000000) for text. Always use `on-surface`.
- **Don’t** use `none` roundedness. Everything in the DrivioCars universe is approachable and ergonomic.
- **Don’t** use a divider line to separate list items. If the content feels cluttered, increase the spacing scale or shift the background tone.
- **Don't** use standard "Blue" (#0000FF). Only use the specified `primary_container` (#0052FF) to maintain brand integrity.