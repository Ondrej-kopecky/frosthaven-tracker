import { describe, it, expect } from 'vitest'
import { layoutFlowchart } from '@/composables/useFlowchartLayout'
import type { ScenarioData } from '@/models/Scenario'

function createScenario(overrides: Partial<ScenarioData> = {}): ScenarioData {
  return {
    id: 0,
    name: 'Test',
    game: 'fh',
    coordinates: { name: 'N6', x: 0, y: 0 },
    chapter_id: 1,
    complexity: 1,
    root: false,
    treasures: [],
    links_to: [],
    linked_from: [],
    blocks_on: [],
    choices: [],
    rewards: [],
    loot: {},
    has_boss: false,
    ...overrides,
  }
}

describe('layoutFlowchart', () => {
  it('returns empty layout for empty scenarios', () => {
    const result = layoutFlowchart([], {}, 'all')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('creates nodes for each scenario', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true }),
      createScenario({ id: 1, name: 'Second', linked_from: [0] }),
    ]
    const statuses = { 0: 'available', 1: 'locked' }
    const result = layoutFlowchart(scenarios, statuses, 'all')
    expect(result.nodes).toHaveLength(2)
  })

  it('assigns correct status to nodes', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true }),
    ]
    const statuses = { 0: 'available' }
    const result = layoutFlowchart(scenarios, statuses, 'all')
    expect(result.nodes[0].status).toBe('available')
  })

  it('defaults to locked when no status provided', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    expect(result.nodes[0].status).toBe('locked')
  })

  it('marks root scenarios correctly', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true }),
      createScenario({ id: 1, name: 'Non-root' }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    const rootNode = result.nodes.find((n) => n.id === 0)
    const nonRootNode = result.nodes.find((n) => n.id === 1)
    expect(rootNode!.isRoot).toBe(true)
    expect(nonRootNode!.isRoot).toBe(false)
  })

  it('creates edges for links_to', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true, links_to: [1] }),
      createScenario({ id: 1, name: 'Second', linked_from: [0] }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].from).toBe(0)
    expect(result.edges[0].to).toBe(1)
  })

  it('creates multiple edges for multiple links', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true, links_to: [1, 2] }),
      createScenario({ id: 1, name: 'Branch A', linked_from: [0] }),
      createScenario({ id: 2, name: 'Branch B', linked_from: [0] }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    expect(result.edges).toHaveLength(2)
  })

  it('does not create edges to scenarios outside the group', () => {
    // Scenario 0 (main, id < 65) links to scenario 70 (side, id >= 65)
    // In 'main' filter, the side scenario is excluded
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true, links_to: [70] }),
      createScenario({ id: 70, name: 'Side', linked_from: [0] }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'main')
    // Only main scenarios (id < 65) included, so edge to 70 shouldn't appear
    expect(result.edges).toHaveLength(0)
  })

  describe('filter: main', () => {
    it('only includes scenarios with id < 65', () => {
      const scenarios = [
        createScenario({ id: 0, name: 'Main', root: true }),
        createScenario({ id: 64, name: 'Main Edge' }),
        createScenario({ id: 65, name: 'Side Start' }),
        createScenario({ id: 80, name: 'Side' }),
      ]
      const result = layoutFlowchart(scenarios, {}, 'main')
      for (const node of result.nodes) {
        expect(node.id).toBeLessThan(65)
      }
      expect(result.nodes).toHaveLength(2)
    })
  })

  describe('filter: side', () => {
    it('only includes scenarios with id >= 65', () => {
      const scenarios = [
        createScenario({ id: 0, name: 'Main', root: true }),
        createScenario({ id: 64, name: 'Main Edge' }),
        createScenario({ id: 65, name: 'Side Start' }),
        createScenario({ id: 80, name: 'Side' }),
      ]
      const result = layoutFlowchart(scenarios, {}, 'side')
      for (const node of result.nodes) {
        expect(node.id).toBeGreaterThanOrEqual(65)
      }
      expect(result.nodes).toHaveLength(2)
    })
  })

  describe('filter: all', () => {
    it('includes both main and side scenarios', () => {
      const scenarios = [
        createScenario({ id: 0, name: 'Main', root: true }),
        createScenario({ id: 65, name: 'Side' }),
      ]
      const result = layoutFlowchart(scenarios, {}, 'all')
      expect(result.nodes).toHaveLength(2)
    })

    it('marks isSide correctly', () => {
      const scenarios = [
        createScenario({ id: 0, name: 'Main', root: true }),
        createScenario({ id: 65, name: 'Side' }),
      ]
      const result = layoutFlowchart(scenarios, {}, 'all')
      const mainNode = result.nodes.find((n) => n.id === 0)
      const sideNode = result.nodes.find((n) => n.id === 65)
      expect(mainNode!.isSide).toBe(false)
      expect(sideNode!.isSide).toBe(true)
    })
  })

  it('nodes have x and y coordinates', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    expect(typeof result.nodes[0].x).toBe('number')
    expect(typeof result.nodes[0].y).toBe('number')
  })

  it('edges have coordinates', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true, links_to: [1] }),
      createScenario({ id: 1, name: 'Next', linked_from: [0] }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    expect(result.edges).toHaveLength(1)
    expect(typeof result.edges[0].x1).toBe('number')
    expect(typeof result.edges[0].y1).toBe('number')
    expect(typeof result.edges[0].x2).toBe('number')
    expect(typeof result.edges[0].y2).toBe('number')
  })

  it('width and height are positive', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })

  it('assigns chapterId from scenario', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true, chapter_id: 3 }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    expect(result.nodes[0].chapterId).toBe(3)
  })

  it('layers child nodes below parent nodes', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Root', root: true, links_to: [1] }),
      createScenario({ id: 1, name: 'Child', linked_from: [0], links_to: [2] }),
      createScenario({ id: 2, name: 'Grandchild', linked_from: [1] }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    const nodeById = new Map(result.nodes.map((n) => [n.id, n]))
    expect(nodeById.get(1)!.y).toBeGreaterThan(nodeById.get(0)!.y)
    expect(nodeById.get(2)!.y).toBeGreaterThan(nodeById.get(1)!.y)
  })

  it('side scenarios have larger y offset than main in all filter', () => {
    const scenarios = [
      createScenario({ id: 0, name: 'Main', root: true }),
      createScenario({ id: 65, name: 'Side' }),
    ]
    const result = layoutFlowchart(scenarios, {}, 'all')
    const mainNode = result.nodes.find((n) => n.id === 0)!
    const sideNode = result.nodes.find((n) => n.id === 65)!
    expect(sideNode.y).toBeGreaterThan(mainNode.y)
  })
})
