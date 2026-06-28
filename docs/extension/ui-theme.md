# JudolLens UI Theme

This document defines the visual theme for JudolLens. Use it with `docs/extension/ui-screen-plan.md` when implementing React UI in WXT.

## Theme Direction

JudolLens uses a hybrid visual direction:

```text
Calm security tool + research evidence interface
```

The popup should feel protective and compact. Options, logs, manual analysis, and simulation pages should feel analytical, readable, and thesis-demo friendly.

Avoid cyberpunk styling, heavy purple gradients, decorative blobs, mascots, and noisy dashboard chrome.

## UI Stack

Use this frontend UI stack for extension-owned React screens:

```text
Tailwind CSS
shadcn/ui
lucide-react
```

Use shadcn/ui selectively for reusable controls such as Button, Badge, Switch, Input, Textarea, Select, Slider, Table, Tabs, Tooltip, and Separator. Do not install or commit unused shadcn components.

Do not use shadcn/ui for third-party page DOM overlays in content scripts. On-page overlays should remain lightweight scoped CSS using `judollens-*` classes so Tailwind preflight or component styles do not leak into target websites.

## Screen Theme Split

Use a split theme:

- popup: dark graphite security console
- options: light neutral settings workspace
- logs: light analytical table workspace
- manual analysis: light evidence inspection workspace
- simulation: clean social-feed test page
- on-page overlay: lightweight, local, non-disruptive

This makes the popup feel like a protection tool while keeping evidence-heavy screens easy to read.

## Palette

Core neutrals:

```text
graphite-950  #0b1117
graphite-900  #111923
graphite-800  #1b2733
graphite-700  #2b3a48
slate-100     #eef3f7
slate-050     #f7fafc
white         #ffffff
```

Functional colors:

```text
active-cyan   #16c7d8
active-blue   #2f80ed
safe-green    #22c55e
unicode-amber #f59e0b
risk-red      #ef4444
medium-orange #f97316
muted-gray    #64748b
```

Usage:

- cyan/blue: active protection, selected navigation, primary action
- green: clean or active state
- amber: Unicode evidence and caution
- red: high risk
- orange: medium risk
- gray: disabled, unsupported, inactive metadata

## Typography

Use a clean UI sans font with strong numeric readability.

Recommended stack:

```css
font-family: "Instrument Sans", "Segoe UI", system-ui, sans-serif;
```

Fallback if no custom font is bundled:

```css
font-family: "Segoe UI", system-ui, sans-serif;
```

Use tabular numbers for counters, confidence scores, and timings:

```css
font-variant-numeric: tabular-nums;
```

Do not use oversized marketing-style headings inside extension UI. Popup and dashboard headings should be compact.

## Shape and Spacing

Use restrained product UI geometry:

```text
card radius: 8px
small control radius: 6px
badge radius: 999px
popup width: 360-400px
base spacing: 4px grid
common gaps: 8px, 12px, 16px, 24px
```

Avoid cards inside cards. Use panels, rows, and sections instead of nested card stacks.

## Popup Style

The popup is a compact dark security surface.

Recommended structure:

```text
dark graphite background
thin border using graphite-700
cyan active ring or indicator
compact status badge
three evidence counters
recent detection row
primary links for Logs and Options
```

Popup visual rules:

- keep it dense but readable
- show `JudolLens` clearly in the header
- use cyan for active state
- use amber only for Unicode evidence
- use red only for high-risk detection
- avoid long paragraphs
- keep recent detection snippets short

## Options and Logs Style

Options and logs should use light neutral surfaces.

Recommended layout:

```text
left sidebar navigation
main content area
subtle white panels
thin slate borders
blue selected states
clear risk badges
compact table rows
```

Use full-page layouts for options and logs, not popup-sized panels.

## Manual Analysis Style

Manual analysis should feel like an evidence inspection workspace.

Use:

- large textarea for selected or pasted text
- result summary panel
- Unicode evidence table
- reasons list
- save/copy actions
- amber callout for research/educational context

Keep the evidence table readable. Unicode character, normalized value, reason, and Unicode name should be visible without opening a modal.

## Risk Badges

Use consistent labels:

```text
LOW
MEDIUM
HIGH
CLEAN
```

Recommended mapping:

```text
CLEAN  -> green border/text on pale green
LOW    -> gray or green
MEDIUM -> amber/orange
HIGH   -> red
```

Confidence scores should appear near risk labels using tabular numbers, for example `HIGH 0.94`.

## Unicode Evidence

Unicode evidence should have a distinct amber treatment, separate from risk red.

Use amber for:

- suspicious Unicode counters
- Unicode span highlights
- Unicode evidence badges
- evidence table tags such as `homoglyph` or `invisible`

This distinction matters: Unicode manipulation is evidence, while high-risk judol is the safety outcome.

## On-Page Overlay Theme

Keep overlays lightweight and local to detected text.

Recommended classes:

```text
judollens-detected
judollens-blur
judollens-warning
judollens-unicode-span
judollens-label
```

Overlay style:

- blur detected text by default
- add compact label: `Terdeteksi JudolLens`
- highlight suspicious Unicode spans in amber
- avoid large floating cards unless explicitly building post-MVP inspection
- do not shift page layout more than necessary

## Component Guidelines

Use:

- icon buttons for navigation/action affordances when icons are available
- toggles for binary settings
- segmented controls for mode selection
- sliders or numeric inputs for thresholds
- tables for logs and Unicode evidence
- badges for risk and model state

Prefer lucide-react icons for extension-owned React UI actions when an appropriate icon exists.

Avoid:

- oversized hero sections
- decorative gradients as the main visual identity
- nested card layouts
- verbose in-app explanations
- colorful one-off badges with no semantic meaning

## Accessibility

- Maintain strong contrast in the dark popup.
- Do not encode risk using color alone; include text labels.
- Keep table text at readable sizes.
- Ensure toggles and buttons have visible focus states.
- Use short labels that fit in narrow popup width.

## Implementation Notes

When implementing in React:

- define CSS variables for all theme tokens
- keep popup CSS separate from full-page screen layout CSS
- use the same risk badge component across popup, logs, and manual analysis
- use the same Unicode evidence component in logs and manual analysis
- keep text snippets truncated with a clear max width
- verify popup width and text wrapping on small browser windows
