import { openDB } from 'idb'
import type { SaleInput } from '../types/sale'
import { newRequestId } from './requestId'
import type { KyRecord } from './kyRecords'

export interface PendingSale {
  id: string
  data: SaleInput
  created_at: number
  /**
   * KY records to send after the bill is confirmed. A bill that the server
   * already recorded may stay queued only for these; replaying it returns the
   * same sale because of client_request_id.
   */
  ky?: KyRecord[]
  /** The server's reason for the last failed attempt. */
  error?: string
  /** Stored state; entries from before states existed are pending (lib/pendingSales). */
  state?: 'pending' | 'conflict' | 'ky_pending'
  /** The recorded bill, once the server confirmed the sale. */
  bill_no?: string
  attempts?: number
}

// Lot snapshot: when the drug list is loaded the backend attaches `next_lot`
// per drug (earliest-expiring lot with remaining > 0). Cart checkout copies
// that onto each SaleItemInput.lot_snapshot, and the backend compares against
// whichever lot FEFO actually deducts — setting `lot_mismatch: true` on the
// persisted SaleItem when they differ. Queued offline sales carry the
// snapshot intact through IDB so the comparison still works after sync.

const DB_NAME    = 'pharmacy-pos'
const DB_VERSION = 1
const STORE      = 'pending_sales'

// Singleton IDB connection
let _db: Awaited<ReturnType<typeof openDB>> | null = null

/**
 * Idempotency key for a sale, created before the first attempt so that a
 * retry after a lost response cannot record the sale twice: pharmacy-api
 * returns the existing sale for a repeated client_request_id.
 */
export function newSaleRequestId(): string {
  return newRequestId('sale')
}

function makeOfflineId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `offline-${crypto.randomUUID()}`
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function getDb() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: 'id' })
    },
  })
  return _db
}

export async function enqueueSale(data: SaleInput, ky: KyRecord[] = []): Promise<string> {
  const id = data.client_request_id || makeOfflineId()
  const db = await getDb()
  await db.put(STORE, {
    id,
    data: { ...data, client_request_id: id },
    created_at: Date.now(),
    ...(ky.length > 0 ? { ky } : {}),
  } satisfies PendingSale)
  return id
}

/** Every stored entry as it is; lib/pendingSales decides which are readable. */
export async function getPendingSales(): Promise<unknown[]> {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function putPendingSale(item: PendingSale): Promise<void> {
  const db = await getDb()
  await db.put(STORE, item)
}

export async function removePendingSale(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}
