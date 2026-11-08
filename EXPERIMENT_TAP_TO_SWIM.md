# Tap-to-swim 3D navigation experiment

**Branch:** `experiment/tap-to-swim-3d`  
**Scope:** isolated interaction experiment; the public GitHub Pages build on `main` is unchanged.

## Interaction geometry

- A tap casts a camera ray and selects a destination on the world-horizontal mid-water plane **Y = 0**.
- A second dot is projected directly below that destination onto the habitat floor plane **Y = -3.1**, preserving its world **X/Z** coordinates.
- A fine, translucent laser segment connects the two dots and represents their vertical world-space relationship.
- A two-finger vertical drag moves the floor handle along world **Z** (toward/away from the fixed camera). The destination moves by the same Z displacement, so the laser remains vertical and the destination retains its X/Y.
- While two fingers are held, a thin screen-spanning guide is drawn along world **X** through the upper destination dot; it follows the dot as depth changes.
- Single-finger movement does not adjust depth. The two-finger gesture is the depth control.

## Locomotion coupling

The upper dot is behavioural intent, not a kinematic constraint. The existing gait model still produces the travelling body wave, tail thrust and fin response. Existing rigid-body dynamics still integrates forces, drag, buoyancy/restoring response, momentum and attitude. Navigation supplies desired heading/pitch and distance-dependent propulsion/braking demand. Longer approaches recruit the existing high-frequency **DART** gait and a modest propulsion multiplier; close-range steering returns to controlled turn/explore gait. This is a stronger pursuit response, not a position or velocity override. The fish can drift and turn before its velocity aligns with its nose.

Autonomous intent resumes after the fish reaches the target and slows. No camera tracking, position snapping or direct pose assignment is used.

## Verification

Run `npm test` (Node 22+). Navigation tests cover screen-ray alignment, target-plane intersection, vertical floor projection and exact screen-Y-to-world-Z mapping. The existing gait/dynamics regression suite remains in place.

## Review limits

The destination is a point target, not a collision-aware path planner. The floor plane is an interaction reference at Y = -3.1 within the habitat volume. Visual browser review is required to judge laser legibility, two-finger gesture feel and whether the fish approaches and settles naturally; geometry tests cannot establish swimming quality.
