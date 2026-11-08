# Tap-to-swim 3D navigation experiment

**Branch:** `experiment/dots-and-faster-pursuit`  
**Base:** `experiment/tap-to-swim-3d`  
**Scope:** correct multi-touch depth mapping and increase target-pursuit performance. The public `main` branch remains unchanged.

## Interaction geometry and gesture mapping

- A one-finger tap selects a destination on the world **XY plane at Z = 0**. Screen height changes world Y; it never changes depth.
- The lower marker is the destination's floor projection on **Y = -3.1**, preserving its X/Z coordinates. A thin world-space vertical beam joins the two markers.
- With two fingers held, vertical movement changes world Z only. The upper destination and lower floor marker move together; X/Y remain invariant.
- Depth movement uses the full vertical displacement of the moving finger, even if the second finger remains stationary as an anchor. If both fingers move together, the same full displacement is used rather than averaging it down by half.
- A world-X reference line appears through the lower floor marker during the two-finger gesture. Single-finger movement does not change depth.

The pointer mapping is isolated in a tested helper so the two-finger control cannot silently halve its movement when only one finger moves.

## Faster pursuit

Pursuit now uses a dedicated high-effort travelling-wave gait rather than the ordinary EXPLORE gait:
- Tail-wave amplitude target: 0.30 (from 0.205).
- Tail-wave frequency target: 2.15 Hz (from 1.34 Hz).
- Tail-generated thrust ceiling: 1.55 (from 0.72).
- Distance-shaped desired speed rises to a **4.8 simulation-units/s target ceiling**.
- Feed-forward propulsion estimates the force needed to offset the existing quadratic drag at the desired speed. Speed-error feedback adds stronger acceleration when the fish is below that target.
- Overspeed braking begins before arrival and remains coupled to fin deployment and hydrodynamic drag.

There is no hard velocity clamp. The 4.8 value is a desired-speed ceiling; actual speed emerges from tail-generated thrust, body slip, orientation and drag. No direct position or velocity manipulation is used. Coefficients remain phenomenological and require visual tuning.

## Verification

Run `npm test` (Node 22+). Tests cover XY tap selection, floor projection, Z-only depth changes, full pointer travel with one finger anchored, distance-responsive pursuit speed, stronger pursuit gait/thrust, overspeed braking and hover settling.

## Review limits

Automated tests verify coordinate invariants and bounded control behaviour, not touch-device ergonomics or natural swimming appearance. Visual review must check that the dots track the intended axes, the fish accelerates convincingly without body-wave distortion, and the higher-speed approach still settles without overshoot. No task or phase is complete until that review is independently confirmed.
