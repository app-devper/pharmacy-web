/**
 * Request identity for a Commercial command (a sale or a return). Create it
 * once per attempt and reuse it when retrying the same request, so
 * pharmacy-api returns the recorded outcome instead of recording it twice
 * (pharmacy-api ADR-0002, ADR-0005).
 */
export function newRequestId(kind: 'sale' | 'return'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${kind}-${crypto.randomUUID()}`
  }
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
