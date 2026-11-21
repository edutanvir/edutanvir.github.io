# Design system: "1-bit desktop"

The look of this site is inspired by typesafe.ai: a retro desktop with dithered
clouds, black-title-bar windows, small monospace labels and very large, tightly
set headlines. This file records every decision in one place, in the spirit of
the `designlang` tool (design-extract): the tokens live in `style.css` section 1
(`:root`), and everything else reads them. Change a token there and the whole
site follows, in both themes.

Colours were sampled from pixels of the reference screenshots, not guessed.

## Palette

| Token | Value | Used for |
|---|---|---|
| `--c-ink` | `#1e1e1e` | Text, borders and hard shadows in the light theme; page background in the dark theme |
| `--c-deep` | `#0d0d0d` | Title bars, footer, call-to-action band |
| `--c-paper` | `#fefefe` | Page background in the light theme; text in the dark theme |
| `--c-grey` | `#dedede` | Window bodies (cards, slides, calendar) |
| `--c-pink` | `#e48ba1` | The flat "desktop" behind the project windows; highlight colour |
| `--c-sky` | `#81accc` | Dithered sky (hero) |
| `--c-magenta` / `--c-blush` / `--c-lilac` | `#d478cd` / `#e49cd0` / `#b3a6ee` | Dithered clouds, icon tiles |
| `--c-blue` | `#3b62a2` | Chip: Azure, ADLS |
| `--c-green` | `#437f2f` | Chip: Data Factory, Key Vault |
| `--c-brown` | `#85472d` | Chip: Synapse |
| `--c-crimson` | `#903043` | Chip: Fabric, Spark SQL |

The four chip colours come from the model labels in the reference's charts.
Every chip with white text passes 4.5:1 contrast.

### Themes

- **Dark (default):** charcoal page, off-white window borders and title bars,
  the same sky dimmed into the page colour.
- **Light:** white page, black borders, black title bars, full-colour sky.
- The pink desktop stays pink in both themes, so project windows look the same.

## Type

| Role | Family | Notes |
|---|---|---|
| Headlines, body | Inter Tight | Weight 800, tracking -0.065em, line-height 0.92 for the hero; 700 for section headings |
| Labels, window titles, nav, buttons in windows | JetBrains Mono | Sentence case, 0.8 to 0.9rem |

Both load from Google Fonts in each page's `<head>`. If they fail to load, the
stack falls back to Inter / Helvetica and the system monospace.

## Shapes

- Border radius is 0 everywhere.
- Borders are 2px solid `--edge`. Shadows are hard offsets (`4px 4px 0`), never blurred.
- A **window** is a bordered box with a title bar. The title is made from the heading
  (`pipelines_i_can_trust.txt`, `energy_data_lakehouse.app`). Add `data-title="..."`
  to any `.card` or `.slide` to write your own.
- The typed hero word is an **inverted label** (ink on paper swapped), like a selected word.
- Hero links are big underlined text, not buttons.

## Graphics

- **Dithered sky** (hero) and **halftone discs** (pink sections) are drawn by `script.js`
  (section 14) on small canvases using an 8x8 Bayer matrix, then scaled up with hard pixels.
  They read the `--cloud-*` and `--c-ink` tokens, so they redraw when the theme changes.
- **Wireframe cube** in the closing band is pure CSS 3D (`.cube`). It stops under reduced motion.
- **Vertical text** on the hero edge is the base-64 of "Md Tanvir Ahmed / Azure Data Engineer".
  It is decoration only and hidden from screen readers.

## Rules

1. One loud thing per screen: the hero sky, the pink desktop or the cube. Everything else is quiet.
2. Sentence case for every label. No all-caps.
3. Numbers (1, 2, 3) only where the content is a sequence.
4. Motion answers an action (toggle, slide, calendar), except the hero typing and the slow cube.
5. Respect `prefers-reduced-motion`: no typing, no cube spin, no drifting tiles.

## Files that carry the design

- `style.css`: section 1 (tokens), section 24 (retro skin), section 25 (polish).
- `script.js`: section 14 (window titles and dithered graphics).
- `_tools/build_blog.py`: the blog pages use the same tokens. Re-run it after editing the blog template.

## Desktop and project charts

Two set pieces built from the same tokens (`style.css` section 26, `script.js` sections 14 to 16).

- **Desktop** (`#desk`): a pink dithered frame with overlapping windows. The three layer windows reuse the
  hero's wording (raw data, lakehouse, dashboards). The big window lists the projects and links to their
  write-ups. The portrait is the profile photo, dithered to 1-bit with the same Bayer matrix as the sky. The
  clock shows the visitor's own date and time. Under 900px the windows stack instead of overlapping.
- **Project charts** (`[data-evidence]`): a tool-by-project matrix and a bar chart of how many projects use each
  tool. Both are counted from the tags on the project cards at load time, restricted to the tools listed in the
  tech strip, so they never disagree with the cards. Add a project card (and a `data-short` name on its
  `<article>`) and both charts update on their own.
- To show other facts in the charts later (rows processed, runtime), add the numbers to the project cards or
  give the chart code a data object. Do not type in numbers that are not real.
