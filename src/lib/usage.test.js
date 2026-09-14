import { beforeEach, describe, expect, test } from 'bun:test'
import { callsByType, callsToday, getUsage, recordCall, recordTest } from './usage.js'

// Minimal in-memory localStorage shim — bun's test runner doesn't expose browser globals.
const store = new Map()
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
}
const KEY = 'tef:usage:v1'

describe('recordCall', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY)
  })

  test('records provider + type and surfaces counts', () => {
    recordCall('groq', 'turn')
    recordCall('groq', 'turn')
    recordCall('anthropic', 'generateUnit')
    const usage = getUsage()
    expect(usage.calls.length).toBe(3)
    expect(callsToday(usage)).toBe(3)
    expect(callsByType(usage)).toEqual({ turn: 2, generateUnit: 1 })
  })

  test('caps stored calls to the most recent 500', () => {
    for (let i = 0; i < 550; i++) recordCall('groq', 'turn')
    expect(getUsage().calls.length).toBe(500)
  })

  test("yesterday's calls do not count toward today", () => {
    recordCall('groq', 'turn')
    const usage = getUsage()
    usage.calls[0].timestamp = Date.now() - 2 * 24 * 60 * 60 * 1000
    localStorage.setItem(KEY, JSON.stringify(usage))
    expect(callsToday()).toBe(0)
    expect(callsByType().turn).toBe(1)
  })

  test('a malformed stored blob falls back to empty', () => {
    localStorage.setItem(KEY, 'not json')
    expect(getUsage()).toEqual({ calls: [], lastTest: null })
  })
})

describe('recordTest', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY)
  })

  test('stores the most recent test result', () => {
    recordTest('groq', 'ok')
    expect(getUsage().lastTest).toEqual({
      provider: 'groq',
      status: 'ok',
      timestamp: expect.any(Number),
    })
    recordTest('groq', 'quota')
    expect(getUsage().lastTest.status).toBe('quota')
  })

  test('no test recorded means lastTest is null', () => {
    expect(getUsage().lastTest).toBeNull()
  })
})