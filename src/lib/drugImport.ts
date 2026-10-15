import type { BulkImportResult, BulkImportRowError } from '../api/drugs'
import type { DrugInput } from '../types/drug'
import { draftProblems, newDrugInput, DRUG_DEFAULTS, type DraftDefaults, type DrugDraft } from './drugDraft'

/**
 * Bulk drug import: one pipeline for every file format. A format only turns
 * a file into rows (an Excel sheet, an aigx JSON export); this module checks
 * every row the same way, sends them in batches the server accepts, and
 * reports each refused row by the number the person sees in their file.
 */

/** How many drugs pharmacy-api takes in one request (catalog.MaxImportRows). */
export const IMPORT_BATCH = 1000

/** A row as read from a file; `row` is where it is in that file. */
export interface ImportRow {
  row: number
  draft: DrugDraft
}

/** A row ready to send. */
export interface ImportLine {
  row: number
  input: DrugInput
}

export type Prepared =
  | { ok: true; lines: ImportLine[] }
  | { ok: false; row: number; problem: string }

/** Checks every row before anything is sent; the first problem stops the import. */
export function prepareImport(rows: ImportRow[], defaults: DraftDefaults = DRUG_DEFAULTS): Prepared {
  for (const r of rows) {
    const problem = draftProblems(r.draft)[0]
    if (problem) return { ok: false, row: r.row, problem }
  }
  return { ok: true, lines: rows.map(r => ({ row: r.row, input: newDrugInput(r.draft, { defaults }) })) }
}

/** What an import did, including when a batch failed partway. */
export interface ImportOutcome {
  imported: number
  errors: BulkImportRowError[]
  /** Why sending stopped early; batches before it are recorded. */
  failure: unknown | null
  /** Rows never sent because sending stopped. */
  notSent: number
}

/**
 * Sends the lines in batches. pharmacy-api numbers a batch's rows from 2
 * (row 1 being a spreadsheet header); each refused row is reported by its
 * own row in the file instead.
 */
export async function runImport(
  lines: ImportLine[],
  send: (batch: DrugInput[]) => Promise<BulkImportResult>,
  onProgress: (done: number, total: number) => void = () => {},
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { imported: 0, errors: [], failure: null, notSent: 0 }
  for (let start = 0; start < lines.length; start += IMPORT_BATCH) {
    const batch = lines.slice(start, start + IMPORT_BATCH)
    let res: BulkImportResult
    try {
      res = await send(batch.map(l => l.input))
    } catch (failure) {
      return { ...outcome, failure, notSent: lines.length - start }
    }
    outcome.imported += res.imported
    for (const e of res.errors) {
      outcome.errors.push({ ...e, row: batch[e.row - 2]?.row ?? e.row })
    }
    onProgress(Math.min(start + batch.length, lines.length), lines.length)
  }
  return outcome
}
