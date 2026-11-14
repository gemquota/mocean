/**
 * Shared low- and mid-frequency seabed relief.
 * Used by both creature contact and streamed terrain extraction so the visible
 * floor and collision surface cannot drift apart.
 */
export const seabedHeight = (x, z) => -8.65
  + Math.sin(x * .16 + z * .07) * .48
  + Math.sin(z * .31 - x * .045) * .22
  + Math.cos(x * .075 + z * .19) * .16
  + Math.sin(x * .34 + z * .23) * Math.cos(z * .29 - x * .17) * .18
  + Math.sin(x * .57 - z * .41) * .07;
