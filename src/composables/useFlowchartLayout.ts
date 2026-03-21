import type { ScenarioData } from '@/models/Scenario'

export interface FlowNode {
  id: number
  name: string
  x: number
  y: number
  status: string
  isRoot: boolean
  isSide: boolean
  chapterId: number
}

export interface FlowEdge {
  from: number
  to: number
  x1: number
  y1: number
  x2: number
  y2: number
}

const NODE_W = 120
const NODE_H = 40
const GAP_X = 150
const GAP_Y = 65

/**
 * Layered layout for scenario flowchart.
 * Main storyline (id < 65) on top, side scenarios (id >= 65) below with a gap.
 */
export function layoutFlowchart(
  scenarios: ScenarioData[],
  statuses: Record<number, string>,
  filter: 'all' | 'main' | 'side'
): { nodes: FlowNode[]; edges: FlowEdge[]; width: number; height: number } {

  const mainScenarios = scenarios.filter((s) => s.id < 65)
  const sideScenarios = scenarios.filter((s) => s.id >= 65)

  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  let maxX = 0
  let maxY = 0

  // Layout a group of scenarios and return the max Y used
  function layoutGroup(
    group: ScenarioData[],
    offsetY: number,
    isSide: boolean
  ): number {
    if (group.length === 0) return offsetY

    const idSet = new Set(group.map((s) => s.id))
    const byId = new Map(group.map((s) => [s.id, s]))

    // Build adjacency
    const children = new Map<number, number[]>()
    for (const s of group) {
      children.set(s.id, s.links_to.filter((id) => idSet.has(id)))
    }

    // Find roots: actual root flag, or no parent within group
    const roots = group.filter(
      (s) => s.root || s.linked_from.length === 0 || s.linked_from.every((p) => !idSet.has(p))
    )

    // BFS layer assignment
    const layer = new Map<number, number>()
    const queue: number[] = []
    for (const r of roots) {
      layer.set(r.id, 0)
      queue.push(r.id)
    }

    while (queue.length > 0) {
      const id = queue.shift()!
      const curLayer = layer.get(id)!
      for (const childId of children.get(id) ?? []) {
        const existing = layer.get(childId)
        if (existing === undefined || existing < curLayer + 1) {
          layer.set(childId, curLayer + 1)
          queue.push(childId)
        }
      }
    }

    // Assign unvisited to layer 0
    for (const s of group) {
      if (!layer.has(s.id)) layer.set(s.id, 0)
    }

    // Group by layer
    const layers = new Map<number, number[]>()
    for (const [id, l] of layer) {
      if (!layers.has(l)) layers.set(l, [])
      layers.get(l)!.push(id)
    }

    const sortedKeys = [...layers.keys()].sort((a, b) => a - b)
    for (const key of sortedKeys) {
      layers.get(key)!.sort((a, b) => a - b)
    }

    // Position
    let groupMaxY = offsetY
    for (const layerIdx of sortedKeys) {
      const ids = layers.get(layerIdx)!
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const s = byId.get(id)!
        const x = i * GAP_X
        const y = offsetY + layerIdx * GAP_Y
        nodes.push({
          id,
          name: s.name,
          x,
          y,
          status: statuses[id] ?? 'locked',
          isRoot: s.root,
          isSide: isSide,
          chapterId: s.chapter_id,
        })
        maxX = Math.max(maxX, x + NODE_W)
        groupMaxY = Math.max(groupMaxY, y + NODE_H)
      }
    }

    // Build edges within group
    const nodePos = new Map(nodes.filter((n) => idSet.has(n.id)).map((n) => [n.id, { x: n.x, y: n.y }]))
    for (const s of group) {
      const from = nodePos.get(s.id)
      if (!from) continue
      for (const toId of s.links_to) {
        const to = nodePos.get(toId)
        if (!to) continue
        edges.push({
          from: s.id,
          to: toId,
          x1: from.x + NODE_W / 2,
          y1: from.y + NODE_H,
          x2: to.x + NODE_W / 2,
          y2: to.y,
        })
      }
    }

    return groupMaxY
  }

  if (filter !== 'side') {
    maxY = layoutGroup(mainScenarios, 0, false)
  }

  if (filter !== 'main') {
    // Add separator gap between main and side
    const sideOffset = filter === 'all' ? maxY + 80 : 0
    maxY = layoutGroup(sideScenarios, sideOffset, true)
  }

  return {
    nodes,
    edges,
    width: maxX + 40,
    height: maxY + 40,
  }
}
