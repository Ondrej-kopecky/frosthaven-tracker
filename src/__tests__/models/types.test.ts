import { describe, it, expect } from 'vitest'
import { SCENARIO_STATUSES, ITEM_SLOTS, RESOURCE_TYPES } from '@/models/types'

describe('SCENARIO_STATUSES', () => {
  it('has exactly 6 status values', () => {
    expect(Object.keys(SCENARIO_STATUSES)).toHaveLength(6)
  })

  it('has LOCKED status', () => {
    expect(SCENARIO_STATUSES.LOCKED).toBe('locked')
  })

  it('has AVAILABLE status', () => {
    expect(SCENARIO_STATUSES.AVAILABLE).toBe('available')
  })

  it('has ATTEMPTED status', () => {
    expect(SCENARIO_STATUSES.ATTEMPTED).toBe('attempted')
  })

  it('has COMPLETED status', () => {
    expect(SCENARIO_STATUSES.COMPLETED).toBe('completed')
  })

  it('has BLOCKED status', () => {
    expect(SCENARIO_STATUSES.BLOCKED).toBe('blocked')
  })

  it('has REQUIRED status', () => {
    expect(SCENARIO_STATUSES.REQUIRED).toBe('required')
  })

  it('all values are lowercase strings', () => {
    for (const value of Object.values(SCENARIO_STATUSES)) {
      expect(typeof value).toBe('string')
      expect(value).toBe(value.toLowerCase())
    }
  })
})

describe('ITEM_SLOTS', () => {
  it('has exactly 6 slot types', () => {
    expect(Object.keys(ITEM_SLOTS)).toHaveLength(6)
  })

  it('has HEAD slot', () => {
    expect(ITEM_SLOTS.HEAD).toBe('Head')
  })

  it('has BODY slot', () => {
    expect(ITEM_SLOTS.BODY).toBe('Body')
  })

  it('has LEGS slot', () => {
    expect(ITEM_SLOTS.LEGS).toBe('Legs')
  })

  it('has ONE_HAND slot', () => {
    expect(ITEM_SLOTS.ONE_HAND).toBe('One Hand')
  })

  it('has TWO_HANDS slot', () => {
    expect(ITEM_SLOTS.TWO_HANDS).toBe('Two Hands')
  })

  it('has SMALL slot', () => {
    expect(ITEM_SLOTS.SMALL).toBe('Small Item')
  })

  it('all values are non-empty strings', () => {
    for (const value of Object.values(ITEM_SLOTS)) {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    }
  })
})

describe('RESOURCE_TYPES', () => {
  it('has exactly 9 resource types', () => {
    expect(Object.keys(RESOURCE_TYPES)).toHaveLength(9)
  })

  it('has LUMBER resource', () => {
    expect(RESOURCE_TYPES.LUMBER).toBe('lumber')
  })

  it('has METAL resource', () => {
    expect(RESOURCE_TYPES.METAL).toBe('metal')
  })

  it('has HIDE resource', () => {
    expect(RESOURCE_TYPES.HIDE).toBe('hide')
  })

  it('has ARROWVINE resource', () => {
    expect(RESOURCE_TYPES.ARROWVINE).toBe('arrowvine')
  })

  it('has AXENUT resource', () => {
    expect(RESOURCE_TYPES.AXENUT).toBe('axenut')
  })

  it('has CORPSECAP resource', () => {
    expect(RESOURCE_TYPES.CORPSECAP).toBe('corpsecap')
  })

  it('has FLAMEFRUIT resource', () => {
    expect(RESOURCE_TYPES.FLAMEFRUIT).toBe('flamefruit')
  })

  it('has ROCKROOT resource', () => {
    expect(RESOURCE_TYPES.ROCKROOT).toBe('rockroot')
  })

  it('has SNOWTHISTLE resource', () => {
    expect(RESOURCE_TYPES.SNOWTHISTLE).toBe('snowthistle')
  })

  it('all values are lowercase strings', () => {
    for (const value of Object.values(RESOURCE_TYPES)) {
      expect(typeof value).toBe('string')
      expect(value).toBe(value.toLowerCase())
    }
  })

  it('has no duplicate values', () => {
    const values = Object.values(RESOURCE_TYPES)
    expect(new Set(values).size).toBe(values.length)
  })
})
