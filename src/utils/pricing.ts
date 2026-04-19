import type { PriceTier, PriceTiers } from '../types/drug'

export const TIER_OPTIONS: { id: PriceTier; label: string }[] = [
  { id: 'retail',    label: 'หน้าร้าน' },
  { id: 'regular',   label: 'ประจำ'     },
  { id: 'wholesale', label: 'ขายส่ง'    },
]

/**
 * Human-readable label for a tier key. Built-ins translate to Thai;
 * custom tier names are returned as-is so admins see what they typed.
 */
export function getTierLabel(tier: PriceTier | '' | undefined): string {
  if (!tier || tier === 'retail') return 'หน้าร้าน'
  if (tier === 'regular')   return 'ประจำ'
  if (tier === 'wholesale') return 'ขายส่ง'
  return tier
}

/**
 * Pick the effective price given a tier. Missing/zero on a tier means
 * "not set" and falls back to retail, which itself falls back to `base`.
 * Mirror of resolveTierPrice() in backend/handlers/drugs.go.
 */
export function resolvePrice(
  base: number,
  tiers: PriceTiers | undefined,
  tier: PriceTier | '' | undefined,
): number {
  if (!tiers) return base
  if (tier && tier !== 'retail') {
    const v = tiers[tier]
    if (v && v > 0) return v
  }
  const retail = tiers.retail
  if (retail && retail > 0) return retail
  return base
}
