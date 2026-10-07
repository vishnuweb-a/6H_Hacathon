/**
 * Profile domain types.
 *
 * Mirrors the DTOs in docs/apiAndDataContracts.md §13–§16. The generated row types
 * use snake_case; these are the camelCase domain shapes the UI consumes, produced by
 * the mappers below (§121, §122).
 */

import type { Database } from "../database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** docs/apiAndDataContracts.md §13 — never includes email or auth metadata. */
export interface PublicProfile {
  id: string;
  displayName: string;
  username: string | null;
  /** Storage object path inside the `avatars` bucket, not a signed URL. */
  avatarPath: string | null;
  trustScore: number;
  averageRating: number | null;
  ratingCount: number;
  successfulReturns: number;
  createdAt: string;
}

/** docs/apiAndDataContracts.md §15 */
export interface MyProfile extends PublicProfile {
  updatedAt: string;
}

/**
 * docs/apiAndDataContracts.md §16 — safe fields only. Reputation values are
 * deliberately absent: they are backend-owned and rejected by the database.
 */
export interface UpdateProfileInput {
  displayName?: string;
  username?: string | null;
  avatarPath?: string | null;
}

export function mapMyProfile(row: ProfileRow): MyProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    avatarPath: row.avatar_url,
    trustScore: Number(row.trust_score),
    // A member with no ratings yet has no average to show, not a real 0.
    averageRating: row.rating_count > 0 ? Number(row.average_rating) : null,
    ratingCount: row.rating_count,
    successfulReturns: row.successful_returns,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPublicProfile(row: ProfileRow): PublicProfile {
  const { updatedAt: _updatedAt, ...publicFields } = mapMyProfile(row);
  return publicFields;
}
