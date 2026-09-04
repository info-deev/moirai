import { describe, expect, it } from 'vitest'
import { Gender, RelationshipType, type Person, type Relationship } from '@/types/types'
import { deserializeGraph, serializeGraph } from './serialization'

/** Паттерн UUID v4 (crypto.randomUUID). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Создаёт тестовую персону с переопределением полей. */
function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    x: 0,
    y: 0,
    firstName: 'Анна',
    lastName: '',
    gender: Gender.FEMALE,
    ...overrides,
  }
}

/** Создаёт тестовую связь с переопределением полей. */
function makeRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return { id: 'r1', from: 'p1', to: 'p2', type: RelationshipType.BLOOD, ...overrides }
}

describe('serializeGraph', () => {
  it('сериализует граф в JSON со структурой { persons, relationships }', () => {
    const json = serializeGraph({ p1: makePerson() }, { 'p1:p2': makeRelationship() })
    const parsed = JSON.parse(json) as {
      persons: Record<string, unknown>
      relationships: Record<string, unknown>
    }

    expect(Object.keys(parsed.persons)).toEqual(['p1'])
    expect(Object.keys(parsed.relationships)).toEqual(['p1:p2'])
  })
})

describe('deserializeGraph', () => {
  it('round-trip: сериализация и десериализация возвращают исходный граф', () => {
    const persons = { p1: makePerson(), p2: makePerson({ id: 'p2', firstName: 'Пётр' }) }
    const relationships = { 'p1:p2': makeRelationship({ metadata: { since: '1980' } }) }

    const result = deserializeGraph(JSON.parse(serializeGraph(persons, relationships)))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.persons).toEqual(persons)
      expect(result.data.relationships).toEqual(relationships)
    }
  })

  it('сохраняет опциональные поля birthDate и metadata', () => {
    const result = deserializeGraph({
      persons: { p1: makePerson({ birthDate: '1990-01-01', metadata: { note: 'прабабушка' } }) },
      relationships: {},
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.persons['p1']?.birthDate).toBe('1990-01-01')
      expect(result.data.persons['p1']?.metadata).toEqual({ note: 'прабабушка' })
    }
  })

  it('игнорирует некорректные опциональные поля (birthDate/metadata)', () => {
    const result = deserializeGraph({
      persons: { p1: { ...makePerson(), birthDate: 1990, metadata: 'oops' } },
      relationships: {},
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.persons['p1']?.birthDate).toBeUndefined()
      expect(result.data.persons['p1']?.metadata).toBeUndefined()
    }
  })

  it('поддерживает legacy-формат { nodes, links }', () => {
    const result = deserializeGraph({
      nodes: { p1: makePerson(), p2: makePerson({ id: 'p2' }) },
      links: { 'p1:p2': makeRelationship() },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.data.persons)).toEqual(['p1', 'p2'])
      expect(Object.keys(result.data.relationships)).toEqual(['p1:p2'])
    }
  })

  it('принимает значения как массивы пар [key, value] (legacy-экспорт)', () => {
    const result = deserializeGraph({
      persons: [['p1', makePerson()], ['p2', makePerson({ id: 'p2' })]],
      relationships: [['r1', makeRelationship()]],
    })

    expect(result.ok).toBe(true)
  })
  it('генерирует UUID для персоны без id и подставляет UNKNOWN-пол по умолчанию', () => {
    const result = deserializeGraph({
      persons: {
        p1: { x: 0, y: 0, firstName: 'Анна' }, // gender отсутствует → unknown
        p2: { id: 'p2', x: 0, y: 0, firstName: 'Пётр', gender: null }, // null → unknown
      },
      relationships: {},
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      // Запись хранится под сгенерированным UUID, поэтому ищем персону по имени.
      const p1 = Object.values(result.data.persons).find((p) => p.firstName === 'Анна')
      expect(p1?.id).toMatch(UUID_RE)
      expect(p1?.gender).toBe(Gender.UNKNOWN)
      expect(result.data.persons['p2']?.gender).toBe(Gender.UNKNOWN)
    }
  })

  it('генерирует UUID для связи без id', () => {
    const result = deserializeGraph({
      persons: { p1: makePerson(), p2: makePerson({ id: 'p2' }) },
      relationships: { r1: { from: 'p1', to: 'p2', type: RelationshipType.BLOOD } },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      const [relationship] = Object.values(result.data.relationships)
      expect(relationship?.id).toMatch(UUID_RE)
    }
  })

  it('отклоняет вход, который не является JSON-объектом', () => {
    for (const input of [null, 'text', 42, [1, 2]]) {
      const result = deserializeGraph(input)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toContain('JSON-объектом')
    }
  })

  it('отклоняет граф без persons/nodes', () => {
    const result = deserializeGraph({})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('persons')
  })

  it('отклоняет некорректный массив пар [key, value]', () => {
    const badPair = deserializeGraph({ persons: [['only-one']] })
    expect(badPair.ok).toBe(false)
    if (!badPair.ok) expect(badPair.error).toContain('массив пар')

    const notArray = deserializeGraph({ persons: [42] })
    expect(notArray.ok).toBe(false)
    if (!notArray.ok) expect(notArray.error).toContain('массив пар')
  })

  it('отклоняет персону, которая не является объектом', () => {
    const result = deserializeGraph({ persons: { p1: 'Анна' }, relationships: {} })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('не объект')
  })

  it('отклоняет персону без firstName (включая пустое имя)', () => {
    const missing = deserializeGraph({ persons: { p1: { x: 0, y: 0 } }, relationships: {} })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error).toContain('firstName')

    const blank = deserializeGraph({
      persons: { p1: { x: 0, y: 0, firstName: '   ' } },
      relationships: {},
    })
    expect(blank.ok).toBe(false)
    if (!blank.ok) expect(blank.error).toContain('firstName')
  })

  it('отклоняет персону с некорректными координатами', () => {
    const badX = deserializeGraph({
      persons: { p1: { x: 'left', y: 0, firstName: 'Анна' } },
      relationships: {},
    })
    expect(badX.ok).toBe(false)
    if (!badX.ok) expect(badX.error).toContain('координата x')

    const badY = deserializeGraph({
      persons: { p1: { x: 0, y: NaN, firstName: 'Анна' } },
      relationships: {},
    })
    expect(badY.ok).toBe(false)
    if (!badY.ok) expect(badY.error).toContain('координата y')
  })

  it('отклоняет персону с некорректным полом', () => {
    const result = deserializeGraph({
      persons: { p1: { x: 0, y: 0, firstName: 'Анна', gender: 'other' } },
      relationships: {},
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('gender')
  })

  it('отклоняет дублирующиеся id персон', () => {
    const result = deserializeGraph({
      persons: { a: makePerson(), b: makePerson() }, // обе персоны имеют id «p1»
      relationships: {},
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Дублирующийся id')
  })
  it('отклоняет связь, которая не является объектом', () => {
    const result = deserializeGraph({
      persons: { p1: makePerson(), p2: makePerson({ id: 'p2' }) },
      relationships: { r1: 42 },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('не объект')
  })

  it('отклоняет связь с несуществующим отправителем', () => {
    const result = deserializeGraph({
      persons: { p1: makePerson() },
      relationships: { r1: makeRelationship({ from: 'ghost' }) },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('отправитель')

    const missing = deserializeGraph({
      persons: { p1: makePerson() },
      relationships: { r1: { id: 'r1', to: 'p1', type: RelationshipType.BLOOD } }, // from отсутствует
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error).toContain('отправитель')
  })

  it('отклоняет связь с несуществующим получателем', () => {
    const result = deserializeGraph({
      persons: { p1: makePerson() },
      relationships: { r1: makeRelationship() }, // to «p2» не существует
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('получатель')

    const notString = deserializeGraph({
      persons: { p1: makePerson(), p2: makePerson({ id: 'p2' }) },
      relationships: { r1: { id: 'r1', from: 'p1', to: 42, type: RelationshipType.BLOOD } },
    })
    expect(notString.ok).toBe(false)
    if (!notString.ok) expect(notString.error).toContain('получатель')
  })

  it('отклоняет связь персоны с самой собой', () => {
    const result = deserializeGraph({
      persons: { p1: makePerson() },
      relationships: { r1: makeRelationship({ to: 'p1' }) },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('самой собой')
  })

  it('отклоняет связь с некорректным типом', () => {
    const result = deserializeGraph({
      persons: { p1: makePerson(), p2: makePerson({ id: 'p2' }) },
      relationships: { r1: { id: 'r1', from: 'p1', to: 'p2', type: 'friendship' } },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('тип связи')
  })
})