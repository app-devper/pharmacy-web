import type { PriceTier, PriceTiers } from '../types/drug'

export const TIER_OPTIONS: { id: PriceTier; label: string }[] = [
  { id: 'retail',    label: 'หน้าร้าน' },
  { id: 'regular',   label: 'ประจำ'     },
  { id: 'wholesale', label: 'ขายส่ง'    },
]

export function getTierLabel(tier: PriceTier | '' | undefined): string {
  switch (tier) {
    case 'regular':   return 'ประจำ'
    case 'wholesale': return 'ขายส่ง'
    default:          return 'หน้าร้าน'
  }
}

/**
 * Pick the effective price given a tier. Zero on regular/wholesale means
 * "not set" and falls back to retail, which itself falls back to `base`.
 * Mirror of resolveTierPrice() in backend/handlers/drugs.go.
 */
export function resolvePrice(
  base: number,
  tiers: PriceTiers | undefined,
  tier: PriceTier | '' | undefined,
): number {
  if (!tiers) return base
  if (tier === 'regular'   && tiers.regular   > 0) return tiers.regular
  if (tier === 'wholesale' && tiers.wholesale > 0) return tiers.wholesale
  if (tiers.retail > 0) return tiers.retail
  return base
}
