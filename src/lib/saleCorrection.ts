import type { DrugReturn, DrugReturnInput, ReturnItemInput, Sale } from '../types/sale'

/** What a sale correction needs from the outside world. */
export interface CorrectionDeps {
  voidSale: (saleId: string, reason: string) => Promise<unknown>
  createReturn: (saleId: string, input: DrugReturnInput) => Promise<DrugReturn>
  /** Brings every view of stock up to date (DrugsContext.stockChanged). */
  stockChanged: () => void
  newRequestId: (kind: 'return') => string
}

/** A correction refused before it reached the server. */
export class CorrectionRefused extends Error {}

/**
 * Corrections to a recorded sale: a void, or a return of some of its items.
 * Both give stock back on the server, so each one brings the app's stock up
 * to date itself; callers only redraw. A return carries a request id that a
 * retry of the same items and reason reuses, so a lost response cannot
 * record it twice (pharmacy-api ADR-0002).
 */
export function saleCorrections(deps: CorrectionDeps) {
  let lastReturn: { key: string; id: string } | null = null

  return {
    async void(sale: Pick<Sale, 'id'>, reason: string): Promise<void> {
      const why = reason.trim()
      if (!why) throw new CorrectionRefused('กรุณาระบุเหตุผล')
      await deps.voidSale(sale.id, why)
      deps.stockChanged()
    },

    async returnItems(sale: Pick<Sale, 'id'>, items: ReturnItemInput[], reason: string): Promise<DrugReturn> {
      const request = { items: items.filter((i) => i.qty > 0), reason: reason.trim() }
      if (request.items.length === 0) throw new CorrectionRefused('กรุณาเลือกรายการที่จะคืน')
      if (!request.reason) throw new CorrectionRefused('กรุณาระบุเหตุผล')
      const key = JSON.stringify([sale.id, request])
      if (lastReturn?.key !== key) lastReturn = { key, id: deps.newRequestId('return') }
      const recorded = await deps.createReturn(sale.id, { ...request, client_request_id: lastReturn.id })
      lastReturn = null
      deps.stockChanged()
      return recorded
    },
  }
}

export type SaleCorrections = ReturnType<typeof saleCorrections>
