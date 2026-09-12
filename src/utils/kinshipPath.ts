// utils/kinshipPath.ts
import { RelationshipType, type Person, type Relationship } from '@/types/types'

/**
 * Направление обхода шага пути относительно рёбер графа:
 * - `down` — от родителя к ребёнку (по направлению края `from` → `to`);
 * - `up` — от ребёнка к родителю (против направления края);
 * - `spouse` — брак (неориентированный союз).
 */
export type KinshipStepDirection = 'down' | 'up' | 'spouse'

/**
 * Шаг кратчайшего пути между двумя персонами.
 * Первый шаг (стартовая персона A) имеет `relation` и `direction`, равные null.
 */
export interface KinshipPathStep {
  /** Id персоны на данном шаге пути. */
  personId: string
  /** Тип связи, ведущей к этому шагу; null для стартовой персоны. */
  relation: RelationshipType | null
  /** Направление обхода связи, ведущей к этому шагу; null для стартовой персоны. */
  direction: KinshipStepDirection | null
}

/**
 * Результат BFS-поиска: упорядоченная цепочка персон от A до B (включая обе).
 */
export interface KinshipPath {
  /** Шаги пути от A к B, включая стартовую и целевую персоны. */
  steps: KinshipPathStep[]
  /** Количество рёбер в пути (`steps.length - 1`). */
  distance: number
}

/**
 * Сосед по графу вместе с тем, как к нему добраться.
 */
interface AdjacencyEntry {
  neighborId: string
  relation: RelationshipType
  direction: KinshipStepDirection
}

/**
 * Родительский узел при восстановлении пути (ближе к A).
 */
interface ParentLink extends Omit<AdjacencyEntry, 'neighborId'> {
  prev: string
}

/**
 * Строит список смежности графа.
 * Кровные/усыновительские рёбра направлены (`from` — родитель, `to` — ребёнок),
 * брак — неориентированный (spouse в обе стороны).
 */
function buildAdjacency(relationships: Record<string, Relationship>): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map<string, AdjacencyEntry[]>()

  const push = (id: string, entry: AdjacencyEntry) => {
    const list = adjacency.get(id)
    if (list) {
      list.push(entry)
      return
    }
    adjacency.set(id, [entry])
  }

  for (const relationship of Object.values(relationships)) {
    if (relationship.type === RelationshipType.MARRIAGE) {
      push(relationship.from, {
        neighborId: relationship.to,
        relation: RelationshipType.MARRIAGE,
        direction: 'spouse',
      })
      push(relationship.to, {
        neighborId: relationship.from,
        relation: RelationshipType.MARRIAGE,
        direction: 'spouse',
      })
    } else {
      // blood/adoption: from — родитель, to — ребёнок
      push(relationship.from, { neighborId: relationship.to, relation: relationship.type, direction: 'down' })
      push(relationship.to, { neighborId: relationship.from, relation: relationship.type, direction: 'up' })
    }
  }

  return adjacency
}

/**
 * Находит кратчайший путь родства между двумя персонами (BFS).
 * Все рёбра имеют единичный вес; среди путей одинаковой длины выбирается тот,
 * в котором меньше шагов через брак (предпочтение кровным цепочкам).
 * @param {Record<string, Person>} persons - персоны графа (store.persons)
 * @param {Record<string, Relationship>} relationships - связи графа (store.relationships)
 * @param {string} fromId - стартовая персона (Person A, «якорь»)
 * @param {string} toId - целевая персона (Person B)
 * @returns {KinshipPath | null} путь от A к B или null, если персоны не существуют / не связаны
 */
export function findKinshipPath(
  persons: Record<string, Person>,
  relationships: Record<string, Relationship>,
  fromId: string,
  toId: string,
): KinshipPath | null {
  if (!persons[fromId] || !persons[toId]) return null

  if (fromId === toId) {
    return {
      steps: [{ personId: fromId, relation: null, direction: null }],
      distance: 0,
    }
  }

  const adjacency = buildAdjacency(relationships)
  const parentOf = new Map<string, ParentLink>()
  const spouseCountOf = new Map<string, number>([[fromId, 0]])
  const visited = new Set<string>([fromId])
  let frontier: string[] = [fromId]

  while (frontier.length > 0 && !parentOf.has(toId)) {
    // Кандидаты следующего уровня: для каждого соседа держим родителя с минимальным числом брачных шагов
    const candidates = new Map<string, ParentLink & { spouses: number }>()

    for (const current of frontier) {
      const currentSpouses = spouseCountOf.get(current) ?? 0
      for (const entry of adjacency.get(current) ?? []) {
        if (visited.has(entry.neighborId)) continue
        const spouses = currentSpouses + (entry.direction === 'spouse' ? 1 : 0)
        const existing = candidates.get(entry.neighborId)
        if (!existing || spouses < existing.spouses) {
          candidates.set(entry.neighborId, { ...entry, prev: current, spouses })
        }
      }
    }

    for (const [id, entry] of candidates) {
      visited.add(id)
      parentOf.set(id, entry)
      spouseCountOf.set(id, entry.spouses)
    }
    frontier = [...candidates.keys()]
  }

  if (!parentOf.has(toId)) return null

  // Восстанавливаем путь от B к A и разворачиваем в порядок A → B
  const steps: KinshipPathStep[] = []
  let cursor: string | undefined = toId
  while (cursor !== undefined) {
    const link = parentOf.get(cursor)
    steps.unshift({
      personId: cursor,
      relation: link?.relation ?? null,
      direction: link?.direction ?? null,
    })
    cursor = link?.prev
  }

  return { steps, distance: steps.length - 1 }
}