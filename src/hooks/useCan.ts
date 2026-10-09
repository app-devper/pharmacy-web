import { useAuth } from '../context/AuthContext'
import { can, type Capability } from '../lib/access'

/** Whether the signed-in user may do `capability` (lib/access). */
export function useCan(capability: Capability): boolean {
  const { user } = useAuth()
  return can(user?.role, capability)
}
