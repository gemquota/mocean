# Tap-to-swim 3D navigation experiment

**Branch:** `experiment/tap-to-swim-3d`  
**Scope:** isolated interaction experiment; the public GitHub Pages build on `main` is unchanged.

## Interaction

- A tap casts a camera ray and intersects the world-horizontal floor at **Y = 0**. The marker is the resulting world-space point.
- A vertical hold-drag (one pointer on desktop) or two-pointer vertical pan (touch) moves a depth plane along the fixed camera's forward axis.
- The original tap ray remains fixed. Its intersection with the depth plane is the selected 3D destination, so depth adjustment cannot drift sideways.
- The horizontal guide is drawn across the viewport at the tap's camera-space vertical coordinate and at the selected camera depth.
- Dragging upward increases camera depth (farther away); dragging downward decreases it (closer). Depth is bounded to keep the selection numerically useful.

## Locomotion coupling

The destination is a behavioural intent, not a kinematic constraint. The existing gait model still produces the travelling body wave, tail thrust and fin response. Existing rigid-body dynamics still integrates forces, drag, buoyancy/restoring response, momentum and attitude. Navigation supplies desired heading/pitch and a distance-dependent propulsion/braking demand. The fish can drift and turn before its velocity aligns with its nose.

Autonomous intent resumes after the fish reaches the target and slows. No camera tracking, position snapping or direct pose assignment is used.

## Verification

Run `npm test` (Node 22+). Navigation tests cover centre-ray alignment, floor intersection, fixed-ray depth selection, bounded drag mapping and coplanar depth-guide endpoints. The existing gait/dynamics regression suite remains in place.

## Review limits

The destination is a point target, not a collision-aware path planner. The habitat's soft boundaries and restoring dynamics still apply. Visual browser review is required to judge whether the line is legible and whether the fish approaches and settles naturally; automated geometry tests cannot establish swimming quality.
