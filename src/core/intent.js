/** Sample a world-up heading without privileging the initial +X direction. */
export function sampleHorizontalHeading(random) {
  return (random() * 2 - 1) * Math.PI;
}

/** Vertical excursions are deliberately occasional, not a continuous gait bias. */
export function shouldMakeVerticalExcursion(random) {
  return random() < 0.2;
}
