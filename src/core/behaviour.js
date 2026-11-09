import { clamp } from './math.js';

const profiles = {
  CRUISE:  { weight: 0.42, duration: [5.0, 9.0], vertical: 0.02, speedPeak: 1.0 },
  EXPLORE: { weight: 0.24, duration: [3.8, 6.4], vertical: 0.35, speedPeak: 1.12 },
  TURN:    { weight: 0.14, duration: [2.8, 5.0], vertical: 0.22, speedPeak: 1.08 },
  DART:    { weight: 0.07, duration: [1.3, 1.9], vertical: 0.04, speedPeak: 1.42 },
  GLIDE:   { weight: 0.08, duration: [3.0, 5.2], vertical: 0.01, speedPeak: 0.94 },
  RECOVER: { weight: 0.05, duration: [3.5, 6.0], vertical: 0.01, speedPeak: 0.82 }
};

/** Energy- and context-aware state selection. Outputs intent, never body transforms. */
export function selectBehaviour(context = {}, random = Math.random) {
  const energy = clamp(context.energy ?? 1, 0, 1);
  const speed = Math.max(0, context.speed ?? 0);
  const boundary = clamp(context.boundaryPressure ?? 0, 0, 1);
  const time = context.time ?? 0;
  const burstReady = time - (context.lastBurstAt ?? -Infinity) >= 18;
  const weights = {
    CRUISE: profiles.CRUISE.weight + (1 - energy) * 0.15,
    EXPLORE: profiles.EXPLORE.weight * (0.65 + energy * 0.35) * (1 - boundary * 0.25),
    TURN: profiles.TURN.weight * (1 + boundary * 2),
    DART: profiles.DART.weight * clamp((energy - 0.48) / 0.42, 0, 1) * (burstReady ? 1 : 0),
    GLIDE: profiles.GLIDE.weight * (1 + (1 - energy) * 1.5 + clamp(speed / 3, 0, 1) * 0.4),
    RECOVER: profiles.RECOVER.weight + (1 - energy) ** 2 * 2.2
  };
  if (profiles[context.previousMode]) weights[context.previousMode] = 0;
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  let choice = clamp(random(), 0, 0.999999999) * total;
  let mode = 'CRUISE';
  for (const [candidate, weight] of Object.entries(weights)) {
    choice -= weight;
    if (choice < 0) { mode = candidate; break; }
  }
  const profile = profiles[mode];
  return {
    mode,
    duration: profile.duration[0] + random() * (profile.duration[1] - profile.duration[0]),
    verticalProbability: profile.vertical,
    speedPeak: profile.speedPeak,
    burst: mode === 'DART'
  };
}

export const BEHAVIOUR_PROFILES = Object.freeze(Object.keys(profiles));
