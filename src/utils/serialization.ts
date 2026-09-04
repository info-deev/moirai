import { Gender, RelationshipType, type Person, type Relationship } from '@/types/types'
import { createId } from '@/utils/id'
import { getLinkKey } from '@/utils/graphGeometry'

/**
 * Валидированные данные графа — единый формат для файла и localStorage (решение D11).
 */
export interface GraphData {
  persons: Record<string, Person>
  relationships: Record<string, Relationship>
}

export type DeserializeResult =
  | { ok: true; data: GraphData }
  | { ok: false; error: string }

const GENDERS = Object.values(Gender) as string[]
const RELATIONSHIP_TYPES = Object.values(RelationshipType) as string[]

/**
 * Проверка, что значение — обычный объект (не null и не массив).
 * @param {unknown} value - проверяемое значение
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Приводит объект или массив пар `[key, value]` (legacy-формат экспорта) к record.
 * @param {unknown} input - исходное значение
 * @param {string} label - имя поля для сообщения об ошибке
 */
function toRecord(input: unknown, label: string): Record<string, unknown> {
  if (Array.isArray(input)) {
    const record: Record<string, unknown> = {}
    for (const entry of input) {
      if (!Array.isArray(entry) || entry.length !== 2) {
        throw new Error(`${label}: ожидается массив пар [key, value]`)
      }
      record[String(entry[0])] = entry[1]
    }
    return record
  }
  if (isRecord(input)) return input
  throw new Error(`${label}: ожидается объект или массив пар`)
}

/**
 * Валидация одной персоны; бросает Error с человекочитаемым описанием проблемы.
 * @param {unknown} raw - необработанный объект персоны
 * @param {number} index - порядковый номер для сообщения об ошибке
 */
function validatePerson(raw: unknown, index: number): Person {
  if (!isRecord(raw)) throw new Error(`Персона #${index + 1}: не объект`)

  const firstName = typeof raw.firstName === 'string' ? raw.firstName.trim() : ''
  if (!firstName) throw new Error(`Персона #${index + 1}: отсутствует имя (firstName)`)

  if (typeof raw.x !== 'number' || !Number.isFinite(raw.x)) {
    throw new Error(`Персона «${firstName}»: некорректная координата x`)
  }
  if (typeof raw.y !== 'number' || !Number.isFinite(raw.y)) {
    throw new Error(`Персона «${firstName}»: некорректная координата y`)
  }

  let gender: Gender
  if (raw.gender === undefined || raw.gender === null) {
    gender = Gender.UNKNOWN
  } else if (!GENDERS.includes(raw.gender as string)) {
    throw new Error(`Персона «${firstName}»: некорректный пол (gender)`)
  } else {
    gender = raw.gender as Gender
  }

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
    x: raw.x,
    y: raw.y,
    firstName,
    lastName: typeof raw.lastName === 'string' ? raw.lastName : '',
    gender,
    ...(typeof raw.birthDate === 'string' ? { birthDate: raw.birthDate } : {}),
    ...(isRecord(raw.metadata) ? { metadata: raw.metadata } : {}),
  }
}

/**
 * Валидация одной связи; проверяет существование from/to среди персон.
 * @param {unknown} raw - необработанный объект связи
 * @param {number} index - порядковый номер для сообщения об ошибке
 * @param {Record<string, Person>} persons - уже валидированные персоны
 */
function validateRelationship(
  raw: unknown,
  index: number,
  persons: Record<string, Person>,
): Relationship {
  if (!isRecord(raw)) throw new Error(`Связь #${index + 1}: не объект`)

  const from = typeof raw.from === 'string' ? raw.from : ''
  const to = typeof raw.to === 'string' ? raw.to : ''
  if (!persons[from]) {
    throw new Error(`Связь #${index + 1}: отправитель «${from}» не найден среди персон`)
  }
  if (!persons[to]) {
    throw new Error(`Связь #${index + 1}: получатель «${to}» не найден среди персон`)
  }
  if (from === to) throw new Error(`Связь #${index + 1}: связь персоны с самой собой`)

  const type = RELATIONSHIP_TYPES.includes(raw.type as string)
    ? (raw.type as RelationshipType)
    : null
  if (!type) throw new Error(`Связь #${index + 1}: некорректный тип связи`)

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
    from,
    to,
    type,
    ...(isRecord(raw.metadata) ? { metadata: raw.metadata } : {}),
  }
}

/**
 * Валидация произвольных данных (импорт из файла / localStorage).
 * Принимает форматы `{ persons, relationships }` и legacy-формат `{ nodes, links }`;
 * значения полей — объекты или массивы пар `[key, value]`.
 * @param {unknown} input - разобранный JSON
 * @returns {DeserializeResult} валидированные данные или текст ошибки
 */
export function deserializeGraph(input: unknown): DeserializeResult {
  try {
    if (!isRecord(input)) throw new Error('Данные не являются JSON-объектом')

    const personsRaw = toRecord(input.persons ?? input.nodes, 'persons')
    const relationshipsRaw = toRecord(input.relationships ?? input.links, 'relationships')

    const persons: Record<string, Person> = {}
    Object.values(personsRaw).forEach((raw, index) => {
      const person = validatePerson(raw, index)
      if (persons[person.id]) throw new Error(`Дублирующийся id персоны «${person.id}»`)
      persons[person.id] = person
    })

    const relationships: Record<string, Relationship> = {}
    Object.values(relationshipsRaw).forEach((raw, index) => {
      const relationship = validateRelationship(raw, index, persons)
      const key = getLinkKey(relationship.from, relationship.to)
      if (!relationships[key]) relationships[key] = relationship
    })

    return { ok: true, data: { persons, relationships } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Неизвестный формат данных' }
  }
}

/**
 * Сериализация графа в JSON-строку (экспорт в файл и localStorage).
 * @param {Record<string, Person>} persons - персоны
 * @param {Record<string, Relationship>} relationships - связи
 * @returns {string} JSON `{ persons, relationships }`
 */
export function serializeGraph(
  persons: Record<string, Person>,
  relationships: Record<string, Relationship>,
): string {
  return JSON.stringify({ persons, relationships }, null, 2)
}

