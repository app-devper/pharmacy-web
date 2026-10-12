import { useCallback, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useDrugs } from './useDrugs'
import { stockCatchUp } from '../lib/checkout'
import { SaleAttempt, submitSale } from '../lib/pendingSales'
import type { SaleInput, SaleResponse } from '../types/sale'

/**
 * Submits the cart's sale the one way every checkout path shares (the plain
 * sale and the KY sale): one request id per sale across retries, then the
 * drug list catches up (server stock when confirmed, an estimate when kept
 * pending) and the cart is cleared. A refusal is thrown and the cart kept.
 */
export function useCheckout() {
  const { drugs, patchStocks, reload } = useDrugs()
  const { clearCart } = useCart()
  const attempt = useRef(new SaleAttempt())

  const submit = useCallback(async (input: SaleInput): Promise<SaleResponse> => {
    const submitted = await submitSale(attempt.current.intent(input))
    attempt.current.done()
    const catchUp = stockCatchUp(submitted, input.items, drugs)
    if (catchUp.kind === 'patch') patchStocks(catchUp.updates)
    else reload()
    clearCart()
    return submitted.status === 'confirmed' ? submitted.sale : submitted.receipt
  }, [drugs, patchStocks, reload, clearCart])

  return { submit }
}
