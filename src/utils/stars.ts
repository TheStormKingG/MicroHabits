import type { SlotDefinition, SlotCompletion, TaskItem, EveningReview } from '../types';

/** Slots where star-3 is earned by adding tasks (not writing notes) */
const TASK_STAR_SLOTS = new Set(['coffee', 'meditate']);

/** The slot where star-3 is earned by filling in both review fields */
const REVIEW_STAR_SLOT = 'water';

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface StarContext {
  /** Tasks for coffee/meditate star-3 */
  tasks?: TaskItem[];
  /** Evening review for water star-3 */
  eveningReview?: EveningReview;
}

/**
 * Returns a tuple of [star1, star2, star3]:
 *   star1 = Do checkbox completed
 *   star2 = Say checkbox completed
 *   star3 = Notes/tasks/review condition met
 */
export function getSlotStars(
  slot: SlotDefinition,
  completion: SlotCompletion | undefined,
  ctx: StarContext = {},
): [boolean, boolean, boolean] {
  const star1 = completion?.completed ?? false;
  const star2 = completion?.sayDone   ?? false;

  let star3 = false;
  if (slot.id === REVIEW_STAR_SLOT) {
    // Both Reflection and What-blocked-me > 6 words
    const r = ctx.eveningReview;
    star3 = Boolean(
      r &&
      countWords(r.notes    ?? '') > 6 &&
      countWords(r.blockers ?? '') > 6
    );
  } else if (TASK_STAR_SLOTS.has(slot.id)) {
    // At least one task added
    star3 = (ctx.tasks?.length ?? 0) > 0;
  } else {
    // Notes longer than 6 words
    star3 = countWords(completion?.notes ?? '') > 6;
  }

  return [star1, star2, star3];
}

export function starCount(stars: [boolean, boolean, boolean]): number {
  return stars.filter(Boolean).length;
}
