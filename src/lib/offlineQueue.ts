import { openDB } from 'idb'
import type { SaleInput } from '../types/sale'

export interface PendingSale {
  id: string
  data: SaleInput
  created_at: number
  /** Last replay error — set by markSaleError, surfaced via useOfflineSync.failed. */
  error?: string
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

export async function enqueueSale(data: SaleInput): Promise<string> {
  const id = data.client_request_id || makeOfflineId()
  const db = await getDb()
  await db.put(STORE, {
    id,
    data: { ...data, client_request_id: id },
    created_at: Date.now(),
  } satisfies PendingSale)
  return id
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function removePendingSale(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function clearSaleError(id: string): Promise<void> {
  const db = await getDb()
  const item = await db.get(STORE, id)
  if (item) {
    const rest = { ...item }
    delete rest.error
    await db.put(STORE, rest)
  }
}

export async function markSaleError(id: string, error: string): Promise<void> {
  const db = await getDb()
  const item = await db.get(STORE, id)
  if (item) await db.put(STORE, { ...item, error })
}

export async function pendingCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE)
}
