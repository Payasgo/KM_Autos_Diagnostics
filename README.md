# KM Autos Diagnostics — ECU Lab

### An engine management and tuning simulator.

> **KM Autos Diagnostics**, by **KranthiKumar Yarlagadda**.
>
> Website: https://www.kmautoecm.com/

Design an engine, edit the same three calibration tables a real tuner edits, run a dyno
pull, read a log that explains what went right or wrong, then put the engine in a car
and run a quarter mile with it.

It is a teaching tool, not a game with a horsepower slider.

## The design rule

**Nothing adds horsepower.** Every part changes airflow, pressure, temperature or fuel
delivery, and power is whatever falls out of the physics. If you contribute a feature,
add it as a physical mechanism — never as a bonus multiplier.

That rule is why the numbers mean something. A stock 3.5 L V6 on 91 octane makes about
250 whp here because the ideal gas law, an integrated pressure trace and the friction
model say so, not because someone typed 250.

## What it actually models

- **Air charge** from the ideal gas law — `ρ = MAP / (R·T)`, `airCharge = VE × V_cyl × ρ`
- **Fuel mass** from lambda and each fuel's real stoichiometric ratio, density and lower
  heating value — which is why E85 needs ~1.5× the fuel mass (about 1.43× the volume)
  for the same lambda
- **Injector pulse width** against the real time available per engine cycle, so duty
  cycle is a physical wall rather than a capacity index
- **The closed cycle**, integrated two crank degrees at a time from intake valve close
  to exhaust valve open — Wiebe heat release, slider-crank volume, and indicated work as
  `∮ p dV`. Peak cylinder pressure, the angle it occurs at, and MBT all come off that
  trace rather than from a correlation
- **Knock** as an autoignition integral over the unburned end gas, so octane,
  compression, charge temperature, residual dilution and mixture all reach it through
  the pressure history instead of through separate corrections
- **Torque** as `IMEP − friction − PMEP → BMEP → T = BMEP × Vd / 4π`. Pumping work is
  exhaust manifold pressure minus intake, with its real sign, so a turbine's
  backpressure is a cost and a well-matched one can hand work back
- **Superchargers** from their makers' figures — Roots, twin-screw and centrifugal. A
  positive-displacement blower pumps a fixed volume per turn and boost settles where the
  engine swallows it; a centrifugal's comes from impeller tip speed. The adiabatic
  efficiency sets both the charge heat and the drive power, `W = ṁ·cp·T·(PR^0.286 − 1)/η`,
  charged to the crank
- **Nitrous oxide** as chemistry: 36% oxygen by mass, heat from its own breakdown
  (−82 kJ/mol), charge cooling as it boils, bottle pressure from its vapour-pressure curve,
  wet and dry kits, and the controller's window, retard, ramp and lean cut
- **A live engine** integrating real crankshaft dynamics at 20 Hz: it idles, revs,
  stalls, hits a rev limiter with hysteresis, and cuts fuel on overrun
- **Cam and valvetrain** — duration shifts the VE peak, overlap costs idle vacuum, and
  springs set the speed at which the valves stop following the lobe
- **A quarter mile** — the measured torque curve goes into a car and runs the strip:
  `F = μN` grip, `ΔN = m·a·h/L` weight transfer, `F_aero = ½ρCdAv²` drag, gearing that
  multiplies torque and divides speed by the same factor, and rotating inertia that
  behaves as extra mass in proportion to the square of the ratio
- **OEM-inspired instrument cluster** — twin tachometer and speedometer dials, a central
  status display, coolant and trip readouts, plus an active 1–6 gear indicator on the drag
  strip. The default close-ratio race gearbox is intended to use all six gears in a typical
  quarter-mile run; change ratios for a different vehicle or race setup

Units are real throughout: kPa, K, grams, ms, J, Nm, Pa, g/s, W.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm run desktop:dev # Electron desktop app (Vite on port 3000)
npm test         # physics test suite
npm run build    # production build into dist/
```

Requires Node 20 or 22 — not newer; [CONTRIBUTING.md](CONTRIBUTING.md) explains why
(the behavioural fingerprint is float-sensitive).

## How the code is laid out

```
src/
  sim/           the physics — pure functions, zero React, fully testable in Node
    constants.js     real measured values (gas constant, LHV, ...)
    coefficients.js  every empirical/tuned number, in one place
    tables.js        the editable calibration data and its axes
    hardware.js      the parts catalogue
    math.js          clamp, interpolation, run grouping
    thermo.js        charge temperature
    friction.js      rubbing, pumping and total parasitic losses
    engine.js        short-block design -> derived properties
    manifold.js      manifold pressure, best-power mixture
    airflow.js       hardware -> VE table
    cycle.js         the closed cycle: heat release, two-zone gas, knock integral, EGT
    knock.js         charge index and autoignition helpers
    turbo.js         the turbo spool-up solve (and the induction solve for a supercharger)
    compressorMap.js efficiency, surge and choke on a compressor map (turbo and centrifugal)
    blower.js        superchargers: Roots, twin-screw and centrifugal, and what they cost the crank
    blowerPreview.js what a supercharger and pulley will do on this engine, before a pull
    nitrous.js       nitrous oxide: the bottle, the jets, and its oxygen and heat in the cylinder
    point.js         evaluatePoint — the heart of it
    sweep.js         a full dyno pull + the event log
    live.js          real-time crank dynamics + ECU control loop
    drivetrain.js    the car: gearing, grip, weight transfer, the quarter mile
    advisors.js      what the hardware wants vs. what your tables say
    scoring.js       tuning / engineer / pull scores
    presets.js       the factory engines and their generated calibrations
    acoustics.js     the engine sound, built from the same cycle
    ecu/             engine management: calibration, sensors, controllers, protections,
                     the live ECU and its pull-log events
  ui/            presentation only — no physics below this line
  storage.js     persistence adapter (artifact host / localStorage / memory)
tests/           physics intent tests + the behavioural fingerprint
```

**Where to start reading:** `src/sim/point.js`. Everything else either feeds it or
displays its output, and it is commented step by step in the order an ECU works.

**To change how the engine behaves:** adjust `src/sim/coefficients.js`, not the
formulas. Every empirical number lives there with a note on why it has the value it
has.

## Testing

Two layers, doing different jobs:

- **`tests/physics.test.js`** and **`tests/drivetrain.test.js`** assert on direction and
  relationship — "a longer cam gives away bottom end and gains top end", "a
  traction-limited launch is independent of mass". Readable failures that say what
  broke.
- **`tests/fingerprint.test.js`** hashes the entire simulation across 9,720 operating
  points, 756 full sweeps, 252 VE tables and 72 drag runs. It catches the coupled changes
  you did not think to check.
- **Accuracy** — `tests/benchmark.test.js` holds the factory engines to real-engine
  ranges, `tests/physics-invariants.test.js` checks physical laws on thousands of random
  builds, `tests/consistency-fuzz.test.js` checks that the advisor, the dyno and LIVE
  agree, and `tests/accuracy-claims.test.js` holds what the docs say about the model to
  what it does. [docs/accuracy.md](docs/accuracy.md) reports the results and what the
  model simplifies.

If the fingerprint fails, that is not automatically a bug — it means the numbers moved.
Work out whether you meant it. If you did, review the diff and run
`npm run test:fingerprint:update`, then explain the change in your PR. Never update the
fixture just to make CI green.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Physics corrections from people who tune real
cars are especially welcome — if a model here is wrong, we want to know, ideally with a
source.

## Status

Working and playable. Known gaps and planned work are tracked in
[CONTRIBUTING.md](CONTRIBUTING.md#good-places-to-start); the short version is that the
UI is still one large component pending decomposition, and accessibility needs work.

## Credits

**KM Autos Diagnostics** is presented by **KranthiKumar Yarlagadda**.

Website: https://www.kmautoecm.com/

## Licence

[MIT](LICENSE) — KM Autos Diagnostics / KranthiKumar Yarlagadda.

## A note on real engines

This is a simulator. The physics is real enough to teach the shape of the problem and
the reasoning behind it, but it is not a substitute for a wideband, a knock ear, and
someone who has done it before. Do not take a calibration from here to a real car.
