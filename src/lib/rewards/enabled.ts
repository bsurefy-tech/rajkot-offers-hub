/**
 * Whether the points, rewards and scratch-card programme is shown. The API has it per platform (`loyalty`) and
 * does not say so publicly, so the site is told: set LOYALTY_ENABLED=true once the platform has the feature on.
 * (A signed-in call that answers 404 hides the programme as well.)
 */
export function loyaltyEnabled() {
  return process.env.LOYALTY_ENABLED === "true";
}
