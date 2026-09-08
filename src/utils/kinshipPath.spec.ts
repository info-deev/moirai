import { describe, expect, it } from 'vitest'
import { Gender, RelationshipType, type Person, type Relationship } from '@/types/types'
import { findKinshipPath } from './kinshipPath'

/** Тестовая персона: координаты и имена не влияют на поиск. */
const person = (id: string): Person => ({
  id,
  x: 0,
  y: 0,
  firstName: id,
  lastName: '',
  gender: Gender.UNKNOWN,
})

/** Тестовая связь. */
const rel = (id: string, from: string, to: string, type: RelationshipType): Relationship => ({
  id,
  from,
  to,
  type,
})

describe('findKinshipPath', () => {
  it('одна и та же персона → тривиальный путь с distance 0', () => {
    const persons = { a: person('a') }
    expect(findKinshipPath(persons, {}, 'a', 'a')).toEqual({
      steps: [{ personId: 'a', relation: null, direction: null }],
      distance: 0,
    })
  })

  it('несуществующая персона → null', () => {
    const persons = { a: person('a'), b: person('b') }
    expect(findKinshipPath(persons, {}, 'a', 'ghost')).toBeNull()
    expect(findKinshipPath(persons, {}, 'ghost', 'a')).toBeNull()
  })

  it('кровная связь от родителя к ребёнку: направление down', () => {
    const persons = { a: person('a'), b: person('b') }
    const relationships = { r1: rel('r1', 'a', 'b', RelationshipType.BLOOD) }
    const result = findKinshipPath(persons, relationships, 'a', 'b')

    expect(result?.distance).toBe(1)
    expect(result?.steps[0]).toEqual({ personId: 'a', relation: null, direction: null })
    expect(result?.steps[1]).toEqual({
      personId: 'b',
      relation: RelationshipType.BLOOD,
      direction: 'down',
    })
  })

  it('кровная связь от ребёнка к родителю: направление up', () => {
    const persons = { a: person('a'), b: person('b') }
    const relationships = { r1: rel('r1', 'a', 'b', RelationshipType.BLOOD) }

    expect(findKinshipPath(persons, relationships, 'b', 'a')?.steps[1]).toEqual({
      personId: 'a',
      relation: RelationshipType.BLOOD,
      direction: 'up',
    })
  })

  it('брак обходится в обе стороны как spouse', () => {
    const persons = { a: person('a'), b: person('b') }
    const relationships = { m1: rel('m1', 'a', 'b', RelationshipType.MARRIAGE) }

    expect(findKinshipPath(persons, relationships, 'a', 'b')?.steps[1]).toEqual({
      personId: 'b',
      relation: RelationshipType.MARRIAGE,
      direction: 'spouse',
    })
    expect(findKinshipPath(persons, relationships, 'b', 'a')?.steps[1]).toEqual({
      personId: 'a',
      relation: RelationshipType.MARRIAGE,
      direction: 'spouse',
    })
  })

  it('брат/сестра идут через общего родителя (up → down)', () => {
    const persons = { p: person('p'), a: person('a'), b: person('b') }
    const relationships = {
      r1: rel('r1', 'p', 'a', RelationshipType.BLOOD),
      r2: rel('r2', 'p', 'b', RelationshipType.BLOOD),
    }
    const result = findKinshipPath(persons, relationships, 'a', 'b')

    expect(result?.distance).toBe(2)
    expect(result?.steps.map((step) => step.personId)).toEqual(['a', 'p', 'b'])
    expect(result?.steps[1]!.direction).toBe('up')
    expect(result?.steps[2]!.direction).toBe('down')
  })

  it('дед/бабка: два шага up по цепочке поколений', () => {
    const persons = { g: person('g'), p: person('p'), c: person('c') }
    const relationships = {
      r1: rel('r1', 'g', 'p', RelationshipType.BLOOD),
      r2: rel('r2', 'p', 'c', RelationshipType.BLOOD),
    }
    const result = findKinshipPath(persons, relationships, 'c', 'g')

    expect(result?.distance).toBe(2)
    expect(result?.steps.map((step) => step.personId)).toEqual(['c', 'p', 'g'])
    expect(result?.steps[1]!.direction).toBe('up')
    expect(result?.steps[2]!.direction).toBe('up')
  })

  it('путь через брак (тесть/тёща): spouse → up', () => {
    const persons = { a: person('a'), s: person('s'), p: person('p') }
    const relationships = {
      m1: rel('m1', 'a', 's', RelationshipType.MARRIAGE),
      r1: rel('r1', 'p', 's', RelationshipType.BLOOD),
    }
    const result = findKinshipPath(persons, relationships, 'a', 'p')

    expect(result?.distance).toBe(2)
    expect(result?.steps.map((step) => step.personId)).toEqual(['a', 's', 'p'])
    expect(result?.steps[1]!.direction).toBe('spouse')
    expect(result?.steps[2]!.direction).toBe('up')
  })

  it('несвязанные персоны → null', () => {
    const persons = { a: person('a'), b: person('b') }
    expect(findKinshipPath(persons, {}, 'a', 'b')).toBeNull()
  })

  it('усыновление обходится как кровная связь (down/up)', () => {
    const persons = { p: person('p'), c: person('c') }
    const relationships = { r1: rel('r1', 'p', 'c', RelationshipType.ADOPTION) }

    expect(findKinshipPath(persons, relationships, 'p', 'c')?.steps[1]).toEqual({
      personId: 'c',
      relation: RelationshipType.ADOPTION,
      direction: 'down',
    })
    expect(findKinshipPath(persons, relationships, 'c', 'p')?.steps[1]).toEqual({
      personId: 'p',
      relation: RelationshipType.ADOPTION,
      direction: 'up',
    })
  })

  it('кратчайший путь побеждает более длинный', () => {
    const persons = { a: person('a'), b: person('b'), x: person('x'), y: person('y') }
    const relationships = {
      r1: rel('r1', 'a', 'b', RelationshipType.BLOOD),
      r2: rel('r2', 'a', 'x', RelationshipType.BLOOD),
      r3: rel('r3', 'x', 'y', RelationshipType.BLOOD),
      r4: rel('r4', 'y', 'b', RelationshipType.BLOOD),
    }

    const result = findKinshipPath(persons, relationships, 'a', 'b')
    expect(result?.distance).toBe(1)
    expect(result?.steps.map((step) => step.personId)).toEqual(['a', 'b'])
  })

  it('среди путей одинаковой длины выбирается путь с меньшим числом брачных шагов', () => {
    // a и b — дети m (кровь), но оба также «женаты» на s: два пути длины 2,
    // кровный (через m) должен победить брачный (через s).
    const persons = { a: person('a'), b: person('b'), m: person('m'), s: person('s') }
    const relationships = {
      r1: rel('r1', 'm', 'a', RelationshipType.BLOOD),
      r2: rel('r2', 'm', 'b', RelationshipType.BLOOD),
      m1: rel('m1', 'a', 's', RelationshipType.MARRIAGE),
      m2: rel('m2', 'b', 's', RelationshipType.MARRIAGE),
    }

    const result = findKinshipPath(persons, relationships, 'a', 'b')
    expect(result?.steps.map((step) => step.personId)).toEqual(['a', 'm', 'b'])
  })
})