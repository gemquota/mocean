# Tap-to-swim 3D navigation experiment

**Branch:** `experiment/tap-to-swim-3d`  
**Scope:** isolated interaction experiment; the public GitHub Pages build on `main` is unchanged.

## Interaction geometry

- A tap casts a camera ray and selects a destination on the world **XY plane at Z = 0**. Screen height therefore changes world Y while target Z remains fixed.
- A second dot is projected directly below that destination onto the habitat floor plane **Y = -3.1**, preserving its world **X/Z** coordinates.
- A fine, translucent laser segment connects the two dots and represents their vertical world-space relationship.
- A two-finger vertical drag moves the floor handle and upper destination together along world **Z** (toward/away from the fixed camera). Their X/Y coordinates remain unchanged, so depth is independent of the one-finger XY selection.
- While two fingers are held, a thin screen-spanning guide is drawn along world **X** through the lower floor handle; it follows the dot as depth changes.
- Single-finger movement does not adjust depth. The two-finger gesture is the depth control.

## Locomotion coupling

The upper dot is behavioural intent, not a kinematic constraint. The existing gait model still produces the travelling body wave, tail thrust and fin response. Existing rigid-body dynamics still integrates forces, drag, buoyancy/restoring response, momentum and attitude. Navigation supplies a spatial steering path and distance-dependent propulsion/braking demand. The fish turns its nose toward a point along the path, whose depth curve reaches destination Z by halfway along geometric path progression, then remains level for the final approach. Progress is estimated from the fish's position relative to the remaining path, not elapsed time. Propulsion demand rises smoothly with distance and fades toward zero near the target; the existing EXPLORE gait is retained while a bounded thrust multiplier scales continuously with distance, avoiding an indefinitely draining burst-energy mode. Near arrival, fin drag and active braking dissipate momentum. Inside a small arrival radius, the controller reduces thrust and makes low-speed corrective approaches to maintain a loose hover at the upper dot. This is steering and force intent, not a position or velocity override. The fish can drift and turn before its velocity aligns with its nose.

Autonomous intent is suspended while a user destination is active. No camera tracking, position snapping or direct pose assignment is used.

## Verification

Run `npm test` (Node 22+). Navigation tests cover screen-ray alignment, fixed-Z XY-plane selection (including higher-tap Y changes without Z changes), floor projection and two-finger screen-Y-to-world-Z depth mapping. Approach-path tests verify halfway depth convergence, level final travel, smooth tangents and monotonic path progress. The existing gait/dynamics regression suite remains in place.

## Review limits

The destination is a point target, not a collision-aware path planner. The floor plane is an interaction reference at Y = -3.1 within the habitat volume. Visual browser review is required to judge laser legibility, two-finger gesture feel and whether the fish approaches and settles naturally; geometry tests cannot establish swimming quality.
