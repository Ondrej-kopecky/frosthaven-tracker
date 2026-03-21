import { describe, it, expect } from 'vitest'
import items from '@/data/items.json'

describe('items.json', () => {
  it('is an array', () => {
    expect(Array.isArray(items)).toBe(true)
  })

  it('contains 264 items', () => {
    expect(items.length).toBe(264)
  })

  it('each item has required fields (id, name, source)', () => {
    for (const item of items) {
      expect(typeof item.id).toBe('number')
      expect(typeof item.name).toBe('string')
      expect(item.name.length).toBeGreaterThan(0)
      expect(typeof item.source).toBe('string')
    }
  })

  it('most items have slot and desc', () => {
    const withSlot = items.filter((i) => typeof i.slot === 'string')
    const withDesc = items.filter((i) => typeof i.desc === 'string' && i.desc.length > 0)
    // At least 260 out of 264 have these fields
    expect(withSlot.length).toBeGreaterThanOrEqual(260)
    expect(withDesc.length).toBeGreaterThanOrEqual(260)
  })

  it('each item id is a positive integer', () => {
    for (const item of items) {
      expect(Number.isInteger(item.id)).toBe(true)
      expect(item.id).toBeGreaterThan(0)
    }
  })

  it('has no duplicate IDs', () => {
    const ids = items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('IDs are sorted in ascending order', () => {
    for (let i = 1; i < items.length; i++) {
      expect(items[i].id).toBeGreaterThanOrEqual(items[i - 1].id)
    }
  })

  it('all items with a slot have valid slot types', () => {
    const validSlots = ['Head', 'Body', 'Legs', 'One Hand', 'Two Hands', 'Small Item']
    for (const item of items) {
      if (item.slot !== undefined) {
        expect(validSlots).toContain(item.slot)
      }
    }
  })

  it('each item has a non-empty source', () => {
    for (const item of items) {
      expect(item.source.length).toBeGreaterThan(0)
    }
  })

  it('each item has a desc field', () => {
    for (const item of items) {
      expect(typeof item.desc).toBe('string')
    }
  })

  it('first item has id 1', () => {
    expect(items[0].id).toBe(1)
  })
})
