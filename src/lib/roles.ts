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

// User administration follows um-api's useradmin rules; UM still enforces them.

/** SUPER manages anyone but a SUPER; ADMIN manages MANAGER and USER; nobody manages themself. */
export function canManageUser(actor: { id: string; role: string } | null | undefined, target: { id: string; role: string }): boolean {
  if (!actor || actor.id === target.id) return false
  if (actor.role === 'SUPER') return target.role !== 'SUPER'
  if (actor.role === 'ADMIN') return target.role === 'MANAGER' || target.role === 'USER'
  return false
}

/** Roles an actor may give target. SUPER is only for users of client 000. */
export function assignableRoles(actorRole: string | undefined, target: { clientId: string }): Role[] {
  if (actorRole === 'SUPER') {
    return target.clientId === '000' ? ['SUPER', 'ADMIN', 'MANAGER', 'USER'] : ['ADMIN', 'MANAGER', 'USER']
  }
  if (actorRole === 'ADMIN') return ['MANAGER', 'USER']
  return []
}
