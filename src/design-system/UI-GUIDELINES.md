# Team Expense Tracker — UI Guidelines

## Navigation and information architecture
- Top bar only, no sidebar: the product has two sections, so a sidebar would waste width that tables need.
- Main sections, in order: **Dashboard** (`data-nav-key="dashboard"`), **Manager area** (`data-nav-key="manager"`). These are the labels the app uses today; new sections are added only when a story introduces a route.
- The brand name "Team Expense Tracker" in the header links to Dashboard, because `/` redirects there.
- Log in is a standalone screen reached before the shell is useful; it has no nav items, to keep the sign-in task focused.
- Manager area is for approvers; show it to everyone for now and let the page explain access, because hiding it makes role problems hard to diagnose.
- On screens under 720px the nav collapses behind a menu button, because a two-item bar is still crowded next to the brand on phones.

## Layout and density
- Work-oriented and moderately dense: people scan lists of expenses, so favour compact rows over big hero blocks.
- Content is capped at `--shell-max-width` and centred, so line length and table width stay readable on wide monitors.
- Design mobile-first at 375px, then widen at 720px; expense entry happens on phones, review happens on desktops.
- Space with `.stack` (vertical) and `.cluster` (horizontal) on the spacing tokens, so rhythm stays consistent.

## Component usage
- **Table** (plain `<table>` in a `.card`) for expense lists and approval queues: users compare amount, date and status across rows.
- **List** (`.stack` of rows with `.badge` and `.avatar`) for the same data below 720px, because tables overflow on phones.
- **`.card`** for a single grouped unit (a summary, a form section); never nest cards, to avoid visual noise.
- **`.btn-primary`** once per screen for the main action (e.g. Submit expense); `.btn-secondary` for others, `.btn-ghost` for low-emphasis, `.btn-danger` only for irreversible actions like Delete, so the main action is unambiguous.
- Status uses `.badge` (success = approved, warning = pending, danger = rejected, neutral = draft), because colour plus a text label is scannable.
- Forms use `.field` with `.input`/`.select`/`.textarea`; validation errors go in `.field-error` with `.is-invalid`, next to the control that failed.
- `.modal` for confirmations of destructive actions only; `.drawer` for viewing or editing one expense without losing the list place; `.toast` for success confirmation; `.alert` for page-level problems that persist.
- `.empty-state` with one primary action when a list has no expenses, `.skeleton` while loading lists, `.spinner` only for button-level waits.
- `.tabs` for switching views of the same data (e.g. Pending / Approved / Rejected); `.dropdown` for filters like period or category.

## Theme
- Light only, as the default and the sole theme for now: the app is used in offices and the token set defines one palette; add dark through new tokens, never per-screen overrides.

## Voice and tone
- Plain, direct and calm; money is sensitive, so no jokes or exclamation marks.
- Buttons are verb + object ("Submit expense", "Approve"), because they state exactly what will happen.
- Errors say what happened and how to fix it ("Amount must be greater than 0"), never blame the user.
- Amounts always show currency and two decimals, and dates use one consistent format, so figures are never ambiguous.
