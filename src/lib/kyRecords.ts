import { addKy10, addKy11, addKy12 } from '../api/kyforms'
import { isTemporaryOutage } from '../api/client'
import type { Ky10Input, Ky11Input, Ky12Input } from '../types/kyforms'

/**
 * A KY record captured at checkout. It travels with its bill: when the bill
 * is queued offline the records are queued with it, and they are sent only
 * after the bill is confirmed, carrying the bill's sale id.
 */
export type KyRecord =
  | { form: 'ky10'; data: Ky10Input }
  | { form: 'ky11'; data: Ky11Input }
  | { form: 'ky12'; data: Ky12Input }

export const kyRecordLabel = (r: KyRecord) => `ขย.${r.form.slice(2)}: ${r.data.drug_name}`

export interface KySubmitResult {
  /** Records the server refused; they will not succeed by retrying as-is. */
  failed: KyRecord[]
  /** Records not sent because the network or identity check went down. */
  unsent: KyRecord[]
  /** The temporary outage that stopped sending, if any. */
  outage: unknown
}

/**
 * Send a confirmed bill's KY records. Stops at the first temporary outage and
 * returns the rest as `unsent`, so the caller can keep them with the bill.
 */
export async function submitKyRecords(saleId: string | undefined, records: KyRecord[]): Promise<KySubmitResult> {
  const failed: KyRecord[] = []
  for (let i = 0; i < records.length; i++) {
    try {
      await post(records[i], saleId)
    } catch (e) {
      if (isTemporaryOutage(e)) return { failed, unsent: records.slice(i), outage: e }
      failed.push(records[i])
    }
  }
  return { failed, unsent: [], outage: null }
}

function post(r: KyRecord, saleId: string | undefined) {
  switch (r.form) {
    case 'ky10': return addKy10({ ...r.data, sale_id: saleId })
    case 'ky11': return addKy11({ ...r.data, sale_id: saleId })
    case 'ky12': return addKy12({ ...r.data, sale_id: saleId })
  }
}
