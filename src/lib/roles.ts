/**
 * Shared role policy (KMP ADR-0004): USER < MANAGER < ADMIN < SUPER.
 * pharmacy-api enforces the same order per route; the UI only hides what the
 * backend would refuse.
 */
export type Role = 'USER' | 'MANAGER' | 'ADMIN' | 'SUPER'

const RANK: Record<Role, number> = { USER: 1, MANAGER: 2, ADMIN: 3, SUPER: 4 }

export function hasRole(role: string | undefined, min: Role): boolean {
  const rank = RANK[role as Role]
  return rank !== undefined && rank >= RANK[min]
}
