/** Sample a world-up heading without privileging the initial +X direction. */
export function sampleHorizontalHeading(random) {
  return (random() * 2 - 1) * Math.PI;
}

/** Vertical excursions are deliberately occasional, not a continuous gait bias. */
export function shouldMakeVerticalExcursion(random, probability = 0.2) {
  return random() < probability;
}


/** Alternate climb and dive events so both pitch directions remain observable. */
export function alternateVerticalDirection(previousDirection) {
  return previousDirection >= 0 ? -1 : 1;
}
