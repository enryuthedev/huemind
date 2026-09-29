---
name: HueMind
colors:
  surface: '#fdf8f8'
  surface-dim: '#ddd9d8'
  surface-bright: '#fdf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f2'
  surface-container: '#f1edec'
  surface-container-high: '#ebe7e6'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#444748'
  inverse-surface: '#313030'
  inverse-on-surface: '#f4f0ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#fdf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  stack-gap-sm: 12px
  stack-gap-md: 24px
  stack-gap-lg: 48px
  max-width-desktop: 1200px
---

## Brand & Style
The design system is centered on cognitive clarity and sensory calm. It adopts a **Soft Minimalism** aesthetic that blends the precision of Apple’s interface guidelines with the approachable warmth of modern wellness apps. The primary objective is to provide a "quiet" stage where the game's color challenges are the sole focus. 

The brand personality is sophisticated yet accessible, utilizing generous whitespace (breathing room) to reduce cognitive load. Interaction patterns are intuitive and tactile, evoking a sense of quality and focus. By avoiding visual clutter and aggressive gradients, the design system ensures that the user's attention is preserved for memory and color recognition tasks.

## Colors
This design system utilizes a "Foundation-First" palette. The environment is rendered in warm neutrals to prevent eye strain and provide a more organic feel than pure white.

- **Primary Background (#F8F7F4):** Used for the main canvas. This warm off-white provides a soft contrast for vibrant game tiles.
- **Secondary Background (#ECEBE7):** Used for inset elements, inactive states, or grouped containers to create subtle depth.
- **Ink / Primary Text (#171717):** A deep charcoal black for high-readability headers and primary actions.
- **Muted Text (#6B6B6B):** For secondary information, labels, and metadata.
- **Functional Accents:** Minimal use of blue for instructional highlights and soft red for error states. The actual "game colors" should be generated dynamically and remain the most saturated elements on screen.

## Typography
**Manrope** is the sole typeface for this design system, chosen for its modern geometric construction and excellent legibility. 

- **Headlines:** Use Bold and ExtraBold weights with tighter letter-spacing to create a strong, grounded visual anchor.
- **Body:** Medium weight is preferred for standard body text to maintain presence against the warm background.
- **Labels:** Small caps with increased tracking are used for secondary stats and categories to provide variety without introducing a second font family.
- **Hierarchy:** Maintain large vertical margins between headline levels to reinforce the minimalist ethos.

## Layout & Spacing
The layout follows a **fluid-to-fixed** model. On mobile devices, a 4-column grid with 24px side margins is standard. On larger screens, the content is centered within a maximum width container to maintain focus.

Spacing is strictly based on an 8px scale. 
- Use **48px (stack-gap-lg)** to separate major functional groups (e.g., the game board from the navigation).
- Use **24px (stack-gap-md)** for internal card padding and spacing between related components.
- The game grid itself should use dynamic gutters that scale based on the number of tiles, ensuring the grid always remains a cohesive visual unit.

## Elevation & Depth
Depth is communicated through **Ambient Shadows** and **Tonal Layering**. 

- **Level 0 (Base):** Primary Background (#F8F7F4).
- **Level 1 (Cards/Buttons):** These elements sit slightly above the base. Use a very soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.04)`. 
- **Interaction:** Upon press or hover, the shadow should slightly compress (smaller blur) and the element may scale down by 2% (98% scale) to simulate a physical "press" into the surface.
- **Overlays:** For modals or game-over states, use a backdrop blur (12px) with a 20% opacity charcoal overlay to keep the focus on the foreground content.

## Shapes
The shape language is defined by oversized, friendly radii. 

- **Large Components (Cards, Difficulty Modes):** Use a 28px radius.
- **Standard Components (Buttons, Input Fields):** Use a 20px radius.
- **Small Elements (Chips, Small Stats):** Use a 12px radius.
- **Game Tiles:** These should follow the `custom_radius_lg` (20px) to maintain a soft, touchable appearance that avoids the harshness of sharp corners.
- **Progress Indicators:** Circular elements should always be perfectly round (50% radius).

## Components

### Buttons
- **Primary:** Charcoal (#171717) background with off-white text. High-contrast, large padding (16px 32px), 20px border radius.
- **Secondary:** Soft grey (#ECEBE7) background with charcoal text. No shadow, flat appearance.

### Cards
- **Mode Selection:** 28px radius, off-white background, subtle 1px border (#ECEBE7), and the soft ambient shadow defined in the Elevation section.
- **Stats Cards:** Minimalist blocks with a `label-caps` header and a `headline-lg` value.

### Game Tiles
- The core interactive element. Must be large and easy to tap. When "hidden," they use the Secondary Background color. When "revealed," they show the game color with a subtle inner glow to make the color appear vibrant.

### Circular Progress
- A thick 8px stroke. The background track is #ECEBE7, and the active progress is #171717. No caps on the stroke (butt-end) for a cleaner, more mathematical look.

### Input & Feedback
- Checkboxes and radio buttons are replaced by large-format toggle cards where possible.
- Success/Failure feedback should be haptic-first, with subtle color changes to the UI border rather than full-screen flashes.