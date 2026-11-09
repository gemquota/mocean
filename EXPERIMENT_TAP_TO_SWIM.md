# Tap-to-swim 3D navigation experiment

**Branch:** `experiment/faster-pursuit-swimming`  
**Scope:** isolated pursuit-speed tuning; the merged tap-to-swim interaction remains the baseline.

## Interaction geometry and gesture mapping

- A tap casts a camera ray and selects a destination on the world **XY plane at Z = 0**. Screen height therefore changes world Y while target Z remains fixed.
- A second dot is projected directly below that destination onto the habitat floor plane **Y = -3.1**, preserving its world **X/Z** coordinates.
- A fine, translucent laser segment connects the two dots and represents their vertical world-space relationship.
- A two-finger vertical drag moves the floor handle and upper destination together along world **Z** (toward/away from the fixed camera). Their X/Y coordinates remain unchanged.
- While two fingers are held, a thin screen-spanning guide is drawn along world **X** through the lower floor handle.

## Pursuit speed control

The previous controller scaled thrust mainly from distance but did not regulate approach speed. It could therefore feel sluggish at long range and did not relate braking to the fish's actual momentum.

The revised guidance computes a bounded desired speed from remaining target distance (square-root growth, capped at 2.65 simulation units/s). Thrust demand rises with the gap between desired and actual speed, capped at a 3.2 multiplier on the existing EXPLORE gait's tail-generated thrust. As the fish closes in, desired speed falls continuously. Braking is driven by overspeed relative to that distance-shaped target, rather than waiting for a fixed near-target radius. A small distance gate fades thrust at the destination.

This changes control intent only. Body-wave generation, tail reaction thrust, rigid-body acceleration, inertia, drag, attitude and fin braking remain in their existing pathways. The fish is not moved or velocity-clamped directly. The coefficients are phenomenological and require visual tuning against the live simulation, not claims of validated animal performance.

## Verification

Run `npm test` (Node 22+). Added pursuit tests cover increasing desired speed and thrust with distance, reduced thrust at overspeed, and anticipatory braking. Existing navigation, gait, dynamics and approach-path regression tests remain in place.

## Review limits

Tests establish bounded controller behaviour, not that the fish looks natural at the new speed. Visual review must check acceleration smoothness, tail/body coherence, turning radius, overshoot and hover settling. If the body wave cannot support the new speed without slipping or looking frantic, the next adjustment should be to the biomechanical thrust model, not another arbitrary controller multiplier.
