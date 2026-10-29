# KM Autos Diagnostics — implementation audit

This file records concrete changes made during the source audit and separates verified checks from work that still needs domain validation.

## Changes implemented

- Career saves now use an explicit schema version (`schemaVersion: 1`) while continuing to read the previous unversioned format.
- Career save data is normalized before use: counters are finite and non-negative, pull count is an integer, malformed run entries are discarded, run history is capped, and a pinned run must exist in the retained history.
- Unknown future save versions are not silently interpreted as legacy saves.
- The UI displays a persistent warning when only in-memory storage is available, so users know career progress will not survive closing the session.
- Electron's app-document response now includes a restrictive Content Security Policy for bundled production resources. Inline styles are permitted for the critical style block; scripts remain same-origin.
- Drag-race result typing now includes the selected finish distance, the strip declares that prop, and the drag run callback is typed to accept the selected distance. WebP asset declarations were added for the existing brand assets.
- Added storage tests for legacy-save migration, invalid counters, orphaned pins, and unknown schema versions.
- Replaced hard-coded colours in the instrument cluster and drag screen with the shared theme tokens / token-based colour mixes, satisfying the repository colour-policy checks.
- Added a visually hidden, accessible live engine-speed status value so the live readout has a text equivalent for assistive technology.
- Increased the live-engine integration test's overall timeout to 15 seconds; the test performs real-time 20 Hz simulation work and had timed out under a heavily loaded full-suite run despite its internal waits allowing 5 seconds each.

## Checks run

- `node node_modules/typescript/bin/tsc --noEmit` — passed after the changes.
- `node node_modules/eslint/bin/eslint.js . --max-warnings 0` — passed.
- Direct Node smoke checks for the storage adapter — passed.
- Manual scan of `src/ui` for hard-coded hex / numeric `rgb()` / `rgba()` literals — passed (no remaining matches outside the token files).
- Focused ESLint and TypeScript checks for the changed files / project — passed.

## Checks not completed

The Vitest suite and production build could not be rerun in this Linux environment because the provided `node_modules` is incomplete: Rollup's optional native package `@rollup/rollup-linux-x64-gnu` is missing. The user's Windows log confirms `npm ci` succeeded there, but the reported six test failures were not re-run against this patched archive in Windows. Run `npm ci`, `npm test`, and `npm run build` on Windows to verify the complete updated archive before merging or releasing.

## Still requiring dedicated work

- Physics approximations documented in `docs/accuracy.md` are intentionally not changed in this pass. Fuel consumption, turbo transient response, exhaust-temperature modelling, and other physical changes need reference-data-backed changes and regression validation; changing coefficients without those checks could make the simulator less trustworthy.
- The diagnostic report workflow (evidence, ranked causes, confidence, next test, verification) is not yet implemented as a full end-to-end feature.
- A full selector-based store subscription redesign and broad `EcuLab.jsx` decomposition remain architectural projects that should be done in isolated, regression-tested changes.
- Real OBD-II hardware support, packaged installer testing, and physical-vehicle validation are not claimed by these source-level changes.
