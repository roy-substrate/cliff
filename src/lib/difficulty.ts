import type { Guide, GuideDraft } from "./schema";

/**
 * Deterministic difficulty. The model supplies facts; code computes the score
 * so it is comparable across every guide in the library.
 */
export function computeDifficulty(d: GuideDraft): Guide["difficulty"] {
  let score = 2;
  if (d.time.approval_required) score += 2;
  if (d.long_wait_days >= 14) score += 1;
  if (d.long_wait_days >= 42) score += 1;
  if (d.business_verification_required) score += 2;
  if (d.paid_plan_or_fee_required) score += 1;
  if (!d.time.unapproved_usable) score += 1;
  score = Math.min(score, 10);

  let level: Guide["difficulty"]["level"];
  if (!d.has_oauth) level = "unknown";
  else if (score <= 2) level = "instant";
  else if (score <= 4) level = "hours";
  else if (score <= 6) level = "days";
  else if (score <= 8) level = "weeks";
  else level = "weeks_plus_cost";

  return { drivers: d.difficulty_drivers, score, level };
}
