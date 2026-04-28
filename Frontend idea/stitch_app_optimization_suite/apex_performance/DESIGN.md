---
name: Apex Performance
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#ffb59e'
  on-secondary: '#5e1700'
  secondary-container: '#ff571a'
  on-secondary-container: '#521300'
  tertiary: '#ffffff'
  on-tertiary: '#00363a'
  tertiary-container: '#7df4ff'
  on-tertiary-container: '#006f77'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59e'
  on-secondary-fixed: '#3a0b00'
  on-secondary-fixed-variant: '#852400'
  tertiary-fixed: '#7df4ff'
  tertiary-fixed-dim: '#00dbe9'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#004f54'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  stats-num:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max: 1200px
---

## Brand & Style

This design system is engineered for the high-octane world of automotive enthusiasts. It evokes the precision of a high-end supercar cockpit: technical, aggressive, and uncompromisingly functional. The target audience demands instant legibility and a sense of "mechanical sympathy" from their digital interfaces.

The visual style blends **High-Contrast / Bold** aesthetics with **Tactile** automotive elements. It utilizes a "Machined Minimalist" approach—where every element feels like it was milled from a solid block of performance material. Key brand attributes include:
*   **Velocity:** Visual cues that imply forward motion and rapid data processing.
*   **Precision:** Geometric perfection and zero-tolerance alignment.
*   **Technicality:** Utilizing HUD (Heads-Up Display) metaphors to present complex data simply.

## Colors

The palette is anchored in deep blacks and "Tarmac" charcoals to maximize contrast and reduce eye strain during night driving. 

*   **Primary (Acid Green):** Used for critical action states, primary buttons, and performance "peak" indicators. It represents high energy and "go" signals.
*   **Secondary (Racing Orange):** Reserved for warnings, RPM redlines, and secondary interactive elements that require high visibility against dark asphalt tones.
*   **Tertiary (Electric Blue):** Used for technical data, GPS paths, and cooling system metrics.
*   **Backgrounds:** A layered stack of `#000000` (Pure Black) for the base and `#121212` (Deep Charcoal) for elevated containers to provide depth without breaking the dark-mode immersion.

## Typography

The typography system prioritizes rapid data acquisition. **Space Grotesk** provides a futuristic, geometric edge for headlines and telemetry data, while **Inter** ensures that dense technical specifications remain legible at a glance.

Use uppercase styling with increased letter-spacing for labels to mimic car chassis stamping and VIN plates. Numeric data (speed, torque, lap times) should always use the "Stats-Num" style for maximum impact.

## Layout & Spacing

This design system employs a **Fluid Grid** based on an 8px rhythm, scaled down to 4px for tight component details. The layout should feel like a cockpit: centralized, reachable, and symmetrical.

*   **Dash Layout:** Essential telemetry components should be locked to a 12-column grid.
*   **Margins:** Generous 24px outer margins ensure content is not clipped by physical device bezels or phone mounts.
*   **Gaps:** Use tight 16px gutters between data cards to maintain a high-density, technical feel.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Subtle Glowing Effects** rather than traditional shadows.

1.  **Level 0 (Base):** Pure `#000000`. Use for the main background.
2.  **Level 1 (Surface):** `#121212` with a 1px inner border of `#FFFFFF` at 10% opacity. This creates a "milled" look.
3.  **Active States:** Apply a subtle outer glow (bloom) using the primary or secondary accent color (15-20px blur, 30% opacity).
4.  **Textures:** Use a repeatable Carbon Fiber pattern overlay (multiply mode, 5% opacity) on Level 1 surfaces to reinforce the automotive theme.

## Shapes

The shape language is "Soft-Industrial." Avoid overly round or "bubbly" corners. The focus is on precision geometry.

*   **Components:** Use a standard 4px radius (`rounded-sm`) for most cards and buttons to maintain a sharp, technical look.
*   **HUD Elements:** Use 45-degree chamfered corners for gauge containers and decorative brackets to evoke aerospace and racing hardware.

## Components

*   **HUD Gauges:** Circular or semi-circular progress rings for RPM and Speed. Use a gradient stroke from a dim neutral to the primary accent color. Include a subtle "ghost" needle for peak hold values.
*   **Buttons:** Rectangular with a 4px radius. Primary buttons use a solid Acid Green fill with black text. Secondary buttons are "Ghost" style with a 1px border and glowing text.
*   **Spec Lists:** Horizontal rows separated by 1px dim borders. Labels on the left (Uppercase), values on the right (Bold, Primary color).
*   **Control Chips:** Small, pill-shaped toggles for filtering car types. Use a heavy 2px border when active.
*   **Telemetry Cards:** Containers featuring a carbon fiber texture background and a "machined" edge highlight.
*   **Maps:** Custom dark-themed maps with neon-blue road paths and acid-green markers for "Sweetride" meetups or high-performance driving segments.