# Design Brief

## Direction

Grow Room — a botanical instrument panel for a living vertical garden, dark-first with a daylight greenhouse light mode.

## Tone

Techy-organic: deep forest-black surfaces with vivid botanical green and warm amber, like a precision greenhouse console rather than a soft wellness app.

## Differentiation

Sensor data reads as instrument output — monospace tabular numerals and a live pulse-ring on the connection badge make hardware state feel physical and immediate.

## Color Palette

| Token      | OKLCH (dark)    | Role                          |
| ---------- | --------------- | ----------------------------- |
| background | 0.15 0.02 158   | forest-black canvas           |
| foreground | 0.93 0.012 150  | primary text                  |
| card       | 0.19 0.024 158  | elevated surfaces             |
| primary    | 0.72 0.17 152   | botanical green, CTAs, active |
| accent     | 0.76 0.14 78    | warm amber, alerts/warnings   |
| muted      | 0.24 0.028 158  | inactive fills, secondary bg  |

Light mode: background 0.97 0.012 150, foreground 0.2 0.03 155, primary 0.52 0.15 152, accent 0.68 0.14 72.

## Typography

- Display: Space Grotesk — headings, hero metrics, app wordmark
- Body: Satoshi — labels, paragraphs, navigation
- Mono: JetBrains Mono — sensor readouts, timestamps, Bluetooth data (tabular-nums)
- Scale: hero `text-5xl md:text-7xl font-bold tracking-tight`, h2 `text-3xl md:text-5xl font-bold tracking-tight`, label `text-sm font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Layered surfaces (background → card → popover) with thin green-tinted borders; shadows stay subtle/elevated, never glow, so hardware state stays legible.

## Structural Zones

| Zone    | Background        | Border       | Notes                                  |
| ------- | ----------------- | ------------ | -------------------------------------- |
| Header  | bg-card/80 blur   | border-b     | connection status pill + live indicator |
| Content | bg-background     | —            | alternate bg-muted/30 section bands     |
| Nav     | bg-sidebar        | border-t     | 7-tab bottom bar, green active state    |

## Spacing & Rhythm

Generous 1rem–1.5rem card padding, 0.75rem gaps between metric cards, 2rem section gaps; dense mono clusters contrast with airy card spacing.

## Component Patterns

- Buttons: radius 14px, green gradient primary with subtle shadow, hover brightens; destructive stop is compact solid red
- Cards: radius 14px, bg-card, thin border, shadow-subtle; hero card lifts to shadow-elevated
- Badges: pill shape, tinted background + colored text (green healthy, amber warning, red error)

## Motion

- Entrance: `animate-fade-in-up` 0.4s staggered for cards
- Hover: `transition-smooth` 0.3s on buttons and cards
- Decorative: `pulse-ring` on live connection badge, `signal-sweep` on Bluetooth scan

## Constraints

- Green-dominant, 3–5 core colors, no rainbow palettes
- All colors via semantic OKLCH tokens; no hex/rgb or arbitrary Tailwind colors in components
- Responsive mobile-first for Android and iOS; no native push (in-app alerts only)

## Signature Detail

The live connection badge with a pulsing ring plus monospace sensor readouts — data feels transmitted, not decorated (category: hardware/IoT telemetry).
