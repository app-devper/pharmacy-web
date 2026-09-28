import { ApiError, isTemporaryOutage } from '../api/client'
import { _createSaleRaw, abandonQueued } from '../api/sales'
import { kyRecordLabel, submitKyRecords } from './kyRecords'
import { getPendingSales, putPendingSale, removePendingSale, type PendingSale } from './offlineQueue'

/**
 * Sales kept in this browser until the server records them (KMP ADR-0006,
 * ADR-0010; pharmacy-api ADR-0009). This module owns every state a pending
 * sale can be in and every way out of it:
 *
 * - pending: not delivered yet (network, identity outage, 5xx, 401, 403);
 *   `syncAll` retries it;
 * - conflict: the server refused the sale (other 4xx), with its reason; only
 *   `retry` or `abandon` moves it on;
 * - ky_pending: the bill was recorded but its KY records were refused, until
 *   `retry` records them or `abandon` closes them;
 * - damaged: the stored entry cannot be read; `exportEntry` saves it and
 *   `discardDamaged` removes it.
 *
 * Nothing is removed unless the server recorded the sale, recorded its
 * abandonment, or a person discarded a damaged entry.
 */

export type PendingState = 'pending' | 'conflict' | 'ky_pending' | 'damaged'

export type PendingEntry =
  | (PendingSale & { state: 'pending' | 'conflict' | 'ky_pending' })
  | { id: string; state: 'damaged'; raw: unknown; created_at: number }

export interface SyncSummary {
  recorded: number
  refused: number
  /** Set when a temporary failure stopped the sync. */
  outage: 'network' | 'identity' | null
}

type Delivery = 'recorded' | 'refused' | 'still_pending'

// Every hook showing pending sales refreshes when any of them changes.
const listeners = new Set<() => void>()
export function onPendingSalesChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const changed = () => listeners.forEach(l => l())

let delivering: Promise<unknown> = Promise.resolve()
/** One delivery at a time, so auto sync and a manual retry never race. */
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = delivering.then(fn, fn)
  delivering = run.catch(() => undefined)
  return run
}

export async function listPendingSales(): Promise<PendingEntry[]> {
  const stored = await getPendingSales()
  return stored.map(readEntry).sort((a, b) => a.created_at - b.created_at)
}

function readEntry(raw: unknown): PendingEntry {
  const e = raw as Partial<PendingSale> | null
  const id = typeof e?.id === 'string' ? e.id : String((e as { id?: unknown } | null)?.id ?? '')
  const readable = !!e && typeof e.id === 'string' && typeof e.created_at === 'number' &&
    !!e.data && Array.isArray(e.data.items)
  if (!readable) return { id, state: 'damaged', raw, created_at: typeof e?.created_at === 'number' ? e.created_at : 0 }
  const s = e as PendingSale
  const state = s.state === undefined || s.state === 'pending' ? 'pending'
    : s.state === 'ky_pending' ? 'ky_pending' : 'conflict'
  return { ...s, state }
}

/** Deliver every pending entry, oldest first, stopping at the first temporary failure. */
export function syncAll(): Promise<SyncSummary> {
  return exclusive(async () => {
    const summary: SyncSummary = { recorded: 0, refused: 0, outage: null }
    for (const entry of await listPendingSales()) {
      if (entry.state !== 'pending') continue
      const [delivery, failure] = await deliver(entry)
      if (delivery === 'recorded') summary.recorded++
      if (delivery === 'refused') summary.refused++
      if (delivery === 'still_pending') {
        summary.outage = failure instanceof Error && failure.name === 'IdentityUnavailableError' ? 'identity' : 'network'
        break
      }
    }
    changed()
    return summary
  })
}

/** Deliver one entry now, whatever its state; its new state, or null once recorded. */
export function retry(id: string): Promise<PendingState | null> {
  return exclusive(async () => {
    const entry = await find(id)
    if (entry.state === 'damaged') throw new Error('อ่านข้อมูลบิลนี้ไม่ได้ ส่งใหม่ไม่ได้')
    await deliver(entry)
    changed()
    return (await listPendingSales()).find(e => e.id === id)?.state ?? null
  })
}

/**
 * Record on the server that the entry will not be recorded, with the reason
 * (ADMIN+), then remove it. A sale the server recorded meanwhile stays only
 * for KY records still to send.
 */
export function abandon(id: string, reason: string): Promise<void> {
  const why = reason.trim()
  if (!why) return Promise.reject(new Error('ต้องระบุเหตุผล'))
  return exclusive(async () => {
    const entry = await find(id)
    if (entry.state === 'damaged') throw new Error('ข้อมูลเสียหาย ให้ส่งออกไฟล์แล้วลบแทน')
    const requestId = entry.data.client_request_id || entry.id
    if (entry.state === 'ky_pending') {
      await abandonQueued(requestId, 'ky_forms', entry.ky ?? [], why)
      await removePendingSale(id)
    } else {
      const outcome = await abandonQueued(requestId, 'sale', entry.data, why)
      if (outcome.abandoned || !entry.ky?.length) {
        await removePendingSale(id)
      } else {
        await store(entry, { state: 'pending', bill_no: outcome.sale.bill_no, error: undefined })
      }
    }
    changed()
  })
}

/** Save an entry's stored data as a JSON file. */
export async function exportEntry(id: string): Promise<void> {
  const entry = await find(id)
  const data = entry.state === 'damaged' ? entry.raw : entry
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `pending-sale-${id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Remove a damaged entry, after exportEntry kept its data. */
export async function discardDamaged(id: string): Promise<void> {
  const entry = await find(id)
  if (entry.state !== 'damaged') throw new Error('ลบได้เฉพาะรายการที่ข้อมูลเสียหาย')
  await removePendingSale(id)
  changed()
}

async function find(id: string): Promise<PendingEntry> {
  const entry = (await listPendingSales()).find(e => e.id === id)
  if (!entry) throw new Error('ไม่พบรายการค้างซิงค์')
  return entry
}

type Readable = Exclude<PendingEntry, { state: 'damaged' }>

function store(entry: Readable, patch: Partial<PendingSale>): Promise<void> {
  const next: PendingSale = { ...entry, ...patch }
  if (next.error === undefined) delete next.error
  return putPendingSale(next)
}

async function deliver(entry: Readable): Promise<[Delivery, unknown]> {
  let saleId: string | undefined
  let billNo: string
  try {
    const sale = await _createSaleRaw({ ...entry.data, client_request_id: entry.data.client_request_id || entry.id })
    saleId = sale.id
    billNo = sale.bill_no
  } catch (e) {
    const temporary = isTemporaryFailure(e)
    await store(entry, {
      state: temporary ? 'pending' : 'conflict',
      error: (e as Error).message,
      attempts: (entry.attempts ?? 0) + 1,
    })
    return [temporary ? 'still_pending' : 'refused', e]
  }
  if (!entry.ky?.length) {
    await removePendingSale(entry.id)
    return ['recorded', null]
  }
  const sent = await submitKyRecords(saleId, entry.ky)
  const left = [...sent.failed, ...sent.unsent]
  if (left.length === 0) {
    await removePendingSale(entry.id)
    return ['recorded', null]
  }
  const attempts = (entry.attempts ?? 0) + 1
  if (sent.outage) {
    await store(entry, { state: 'pending', bill_no: billNo, ky: left, error: (sent.outage as Error).message, attempts })
    return ['still_pending', sent.outage]
  }
  await store(entry, {
    state: 'ky_pending', bill_no: billNo, ky: left, attempts,
    error: `บิลบันทึกแล้ว แต่ ขย. ถูกปฏิเสธ: ${sent.failed.map(kyRecordLabel).join(', ')}`,
  })
  return ['refused', null]
}

/**
 * A failure that says nothing about the sale itself: the server was not
 * reached, could not decide, or did not accept the session.
 */
export function isTemporaryFailure(e: unknown): boolean {
  if (isTemporaryOutage(e)) return true
  if (e instanceof ApiError) return e.status === 401 || e.status === 403 || e.status >= 500
  return true
}
