# Design

ConsultFlow's visual world is a **status board**: the departures board that tells you, at a glance, where every item stands. Every lead has a status; the product's job is to make that status visible and moving.

## Direction

- **Thesis:** show the mechanism, not a mood. The first viewport is a live board of enquiries whose statuses flip from New to Booked. It refuses the category default of a SaaS hero with a dashboard screenshot and a teal gradient.
- **Scene:** a practice manager at a reception desk or office in daylight, on a laptop between patients. Light theme, high legibility.
- **Signature interaction:** the split-flap status change (`.flap`), used on the landing board, the dashboard's latest-activity board and status chips when a status changes. Nowhere else.
- **Motion grammar:** state change only. 150–420 ms, exponential ease-out, content visible by default, disabled under `prefers-reduced-motion`.

## Colour

Restrained strategy: neutrals plus one signal colour, with a reserved status vocabulary.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#f3f4f1` | Page ground (cool paper) |
| `--surface` / `--surface-2` / `--surface-3` | `#ffffff` / `#eaece7` / `#e1e4de` | Panels, sidebar, pressed |
| `--line` / `--line-strong` | `#d9dcd5` / `#c3c7bf` | Rules and control borders |
| `--ink` / `--ink-2` / `--ink-3` | `#14181f` / `#454c57` / `#636a74` | Text (all ≥ 4.5:1 on white) |
| `--board` / `--board-2` / `--board-line` | `#14181f` / `#1d232c` / `#2c343f` | Dark board panels |
| `--signal` | `#f5b72a` | Live state, primary brand action, selection, active nav marker |
| `--series-1` / `--series-2` | `#2f5aa8` / `#d9901a` | Chart series (validated for CVD; series 2 always has legend and tooltip) |

Status colours (text on its wash passes AA) are reserved for lead state and always carry a label and a square key: new `#3c4a5e`, contacted `#2f5aa8`, qualified `#6146a8`, booked `#1d7348`, attended `#0d5534`, lost `#5d636b`, needs human `#b13d0b`, do not contact `#9b1b3a`.

Primary buttons are ink. Yellow buttons appear only for the single most important action on a surface (View Live Demo, Simulate new enquiry, Launch campaign).

## Type

One family, **Archivo** (variable, `wdth` axis), self-hosted through `next/font`.

- Display (landing headings): weight 600, `font-stretch: 88%`, tracking −0.025em, balanced.
- Board lettering (`.board-type`): `font-stretch: 78%`, used for board headers, KPI numerals and status chips.
- UI and body: default width, 13–18 px; tabular numerals (`.tabular`) for every time, count, phone number and currency value.
- No monospace, no serif, no eyebrow labels above headings.

## Shape and depth

- Radius: controls 6 px, panels 8 px, board and landing panels 10 px, chips 4 px, chat bubbles 10 px with a 3 px tail corner.
- Depth comes from the board's dark surface and ruled grids, not shadows. The only shadows are the landing board and overlays (toasts, drawers), tinted from ink.
- KPI groups are one ruled grid, never a row of floating cards.

## Components

- **StatusChip:** tinted wash, status-colour text, square key, condensed label.
- **ChatBubble:** author named in text (Patient / Assistant / Staff · name / System). Assistant bubbles are blue-grey on the right; staff violet-grey; patients white on the left; system messages are centred rules. Escalations and confirmations get their status wash and a heading.
- **Board rows:** time, name, interest, source, status, next step; collapse to name + status + next step on phones.
- **Demo labelling:** `DemoTag` (dashed outline, "Demo data") beside every synthetic figure; a yellow and ink hazard stripe across the top of the app; "Estimate" tags on revenue.

## Charts

Single hue for single-series bars (funnel). Two-series charts use `series-1` / `series-2` with a legend always shown, per-mark hover tooltips, one y-axis, 1 px solid recessive gridlines, 3 px rounded data ends square at the baseline, and 2 px gaps between adjacent marks.
