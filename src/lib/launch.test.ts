import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/errors'
import { launchFailureMessage } from './launch'

describe('launchFailureMessage', () => {
  it('says an expired or used link from UM can be opened again', () => {
    expect(launchFailureMessage(new ApiError('ticket invalid or expired', 401, '{"code":"UM-401-002"}'))).toContain('หมดอายุ')
  })

  it('says the connection failed when offline', () => {
    expect(launchFailureMessage(new TypeError('Failed to fetch'))).toContain('เชื่อมต่อ')
  })

  it('falls back to signing in by hand for a ticket meant for another system', () => {
    expect(launchFailureMessage(new Error('ticket is for PORT'))).toContain('เข้าสู่ระบบด้วยตัวเอง')
  })
})
