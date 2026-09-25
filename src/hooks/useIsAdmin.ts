import { useAuth } from '../context/AuthContext'
import { hasRole, type Role } from '../lib/roles'

/** True when the signed-in user's role is `min` or higher. */
export function useHasRole(min: Role): boolean {
  const { user } = useAuth()
  return hasRole(user?.role, min)
}

export function useIsAdmin(): boolean {
  return useHasRole('ADMIN')
}

export function useIsManager(): boolean {
  return useHasRole('MANAGER')
}
