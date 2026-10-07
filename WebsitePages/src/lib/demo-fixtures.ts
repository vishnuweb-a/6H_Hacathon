/**
 * Isolated demo fixtures for the screens whose backend phase has not landed yet:
 * matching, claims, chat, recovery, handover and ratings.
 *
 * Phase 2 moved listings onto real Supabase data. The six seeded items used to live
 * in `kept-context` and were treated as application data by Explore, the listing
 * detail and Activity; they are no longer authoritative anywhere. They stay here,
 * clearly labelled, only so the not-yet-built screens still render their approved
 * design while their own phase is pending.
 *
 * Nothing on a production listing route may import from this module. When a phase
 * lands, delete the fixtures it used.
 */

import { items, type Item } from "./kept-data";

export const DEMO_ITEMS: readonly Item[] = items;

export function getDemoItem(id: string): Item | undefined {
  return DEMO_ITEMS.find((item) => item.id === id);
}
