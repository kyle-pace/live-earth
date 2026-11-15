# Design plan: Live Earth

Live Earth is a standalone lab on kylepace.dev (kp-design's `LabLayout`). The tokens live in
`src/styles/theme.css`; the viewer's own fixed colors live in `src/pages/live-earth/index.astro`.

## Subject and audience

The newest pictures from NOAA's two GOES weather satellites, shown as big as the screen allows:
the whole planet, the United States, or one region. It's for anyone who wants a window on the
planet running on a second screen, and it's the web test for a wallpaper and widget app.

## Concept

A satellite ground station's receive display. Weather offices show these images on black, with a
dry caption underneath: which satellite, when the scan started in UTC, how old it is. The page
borrows exactly that: black around the picture, a plain caption, and controls docked to one side
like a console. The one drawing on the page is the **sky strip**, the satellite picker: a strip of
the equator from 180° to 0°, with each satellite at its real parking spot (GOES West 137.2°W, GOES
East 75.2°W) and the sun at the longitude where it's noon right now, so you can see which
satellite is looking at daylight before you pick it.

Dark mode and light mode differ only around the edges: the viewer is always black, because the
pictures are, and the back bar, footer and About page follow the visitor's setting.

## The one bold element

The planet itself, as large as it fits, on black. Everything else is small, quiet and out of its way.

## Color

The viewer (always the same, on black):

| Name | Value | Use |
| --- | --- | --- |
| Space | `#030507` | Around the picture |
| Console | `#0b1016` at 92% | Docked controls |
| Starlight | `#e9eef4` | Text on the console and caption (17.5:1 on Space) |
| Haze | `#a3b3c4` | Secondary text (8.9:1 on Console) |
| Limb | `#8fd4ff` | Selected state and focus ring: the blue glow at Earth's edge (11.8:1) |
| Noon | `#ffc56b` | The sun and the daylit half of the sky strip only (12:1) |

The page tokens (back bar, footer, About page):

| Name | Light | Dark | Use |
| --- | --- | --- | --- |
| Page | `#f3f5f7` | `#05080c` | Page |
| Raised | `#ffffff` | `#0e141b` | Panels |
| Ink | `#0d141c` | `#e9eef4` | Text |
| Ink muted | `#475667` | `#a3b3c4` | Secondary text (6.9:1 / 9.4:1) |
| Accent ink | `#0b5d8f` | `#8fd4ff` | Links and focus (6.5:1 / 12.5:1) |

## Type

Atkinson Hyperlegible Next only. The caption's first line (what you're looking at) is the largest
text on the page at `--step-1`, weight 700; times use tabular figures. The page title is one line,
small, over the top-left of the picture, since the picture is the content.

## Layout

```
phone                          wide
+---------------------+        +----------------------------------------------+
| < kylepace.dev About|        | < kylepace.dev                         About |
| Live Earth          |        | Live Earth                    +------------+ |
|                     |        |                               | sky strip  | |
|   [ the picture ]   |        |        [ the picture,         | view       | |
|                     |        |          full height ]        | time       | |
| Whole Earth from    |        | Whole Earth from GOES West    | detail     | |
| GOES West, 1:00 a.m.|        | 1:00 a.m. your time, 25 min   +------------+ |
+---------------------+        +----------------------------------------------+
| sky strip           |
| view / time / detail|
+---------------------+
```

On a phone the console sits under the picture; from about 900 px wide it floats over the
picture's right side, and "Hide controls" tucks it away. Full screen hides everything but the
picture until the pointer moves.

## Checked against the generated defaults

- No headline-over-muted-sentence hero: the page is the picture, with one small title line.
- No pills and no single radius: the console has square-ish 3 px corners like instrument panels;
  segmented buttons are flat tabs with a Limb underline for the selected one.
- No grid of identical cards: regions are one native select, grouped.
- No small caps labels above headings, no decorative dots, no monospace labels, no middle dots
  joining details (the caption is two plain lines).
- The only drawing (the sky strip) is information: real longitudes and the real sun position.
