import { useMemo } from 'react'
import { createReturn, voidSale } from '../api/sales'
import { newRequestId } from '../lib/requestId'
import { saleCorrections, type SaleCorrections } from '../lib/saleCorrection'
import { useDrugs } from './useDrugs'

/** Void and return for a sale screen; each brings stock up to date itself. */
export function useSaleCorrections(): SaleCorrections {
  const { stockChanged } = useDrugs()
  return useMemo(
    () => saleCorrections({ voidSale, createReturn, stockChanged: () => stockChanged(), newRequestId }),
    [stockChanged],
  )
}
