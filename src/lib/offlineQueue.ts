import { openDB } from 'idb'
import type { SaleInput } from '../types/sale'

export interface PendingSale {
  id: string
  data: SaleInput
  created_at: number
  error?: string
}

const DB_NAME    = 'pharmacy-pos'
const DB_VERSION = 1
const STORE      = 'pending_sales'

// Singleton IDB connection
let _db: Awaited<ReturnType<typeof openDB>> | null = null

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
  const id = `offline-${Date.now()}`
  const db = await getDb()
  await db.put(STORE, { id, data, created_at: Date.now() } satisfies PendingSale)
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

export async function markSaleError(id: string, error: string): Promise<void> {
  const db = await getDb()
  const item = await db.get(STORE, id)
  if (item) await db.put(STORE, { ...item, error })
}

export async function pendingCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE)
}
