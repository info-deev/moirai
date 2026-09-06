import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import Konva from 'konva'
import { CARD_SIZE, Gender, RelationshipType, type Person } from '@/types/types'
import { useFamilyStore } from './familyStore'

/** Ключ localStorage (решение D10), дублируем здесь для проверок напрямую. */
const STORAGE_KEY = 'moirai:graph:v1'

/** Создаёт тестовую персону с переопределением полей. */
function makePerson(id: string, overrides: Partial<Person> = {}): Person {
  return { id, x: 0, y: 0, firstName: 'Тест', lastName: '', gender: Gender.UNKNOWN, ...overrides }
}

/** Мок vue-konva stage с заданным смещением, зумом и размерами холста. */
function mockStageRef(
  x = 0,
  y = 0,
  scale = 1,
  width = window.innerWidth,
  height = window.innerHeight,
) {
  const stage = {
    x: () => x,
    y: () => y,
    scaleX: () => scale,
    scaleY: () => scale,
    width: () => width,
    height: () => height,
  } as unknown as Konva.Stage
  return { getStage: () => stage }
}

describe('familyStore', () => {
  let store: ReturnType<typeof useFamilyStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    store = useFamilyStore()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('начальное состояние', () => {
    it('граф пуст, выделение снято', () => {
      expect(store.personList).toEqual([])
      expect(store.relationshipList).toEqual([])
      expect(store.selectedPersonId).toBeNull()
      expect(store.selectedRelationshipId).toBeNull()
    })
  })

  describe('selectPerson / selectRelationship', () => {
    it('выделение персоны сбрасывает выделение связи и наоборот', () => {
      store.selectPerson('p1')
      expect(store.selectedPersonId).toBe('p1')
      expect(store.selectedRelationshipId).toBeNull()

      store.selectRelationship('r1')
      expect(store.selectedRelationshipId).toBe('r1')
      expect(store.selectedPersonId).toBeNull()

      store.selectPerson(null)
      expect(store.selectedPersonId).toBeNull()
    })
  })

  describe('getPerson', () => {
    it('возвращает персону по id или undefined, если не найдена', () => {
      store.addPerson(mockStageRef())
      const id = store.personList[0]?.id ?? ''

      expect(store.getPerson(id)?.id).toBe(id)
      expect(store.getPerson('ghost')).toBeUndefined()
    })
  })
  describe('addPerson', () => {
    it('создаёт персону по центру видимой области (без зума и смещения)', () => {
      store.addPerson(mockStageRef())

      expect(store.personList).toHaveLength(1)
      // jsdom: window.innerWidth = 1024, window.innerHeight = 768
      expect(store.personList[0]?.x).toBe(window.innerWidth / 2 - CARD_SIZE.width / 2)
      expect(store.personList[0]?.y).toBe(window.innerHeight / 2 - CARD_SIZE.height / 2)
      expect(store.personList[0]?.firstName).toBe('UNKNOWN')
      expect(store.personList[0]?.gender).toBe(Gender.UNKNOWN)
    })

    it('учитывает зум и смещение stage при расчёте координат', () => {
      store.addPerson(mockStageRef(100, 50, 2))

      expect(store.personList[0]?.x).toBe((window.innerWidth / 2 - 100) / 2 - CARD_SIZE.width / 2)
      expect(store.personList[0]?.y).toBe((window.innerHeight / 2 - 50) / 2 - CARD_SIZE.height / 2)
    })

    it('центрирует по размерам холста, а не окна (шапка редактора сдвигает canvas)', () => {
      // Холст ниже окна на высоту шапки: центр карточки обязан считаться от stage, а не window
      const canvasWidth = 900
      const canvasHeight = 728 // window.innerHeight - 40

      store.addPerson(mockStageRef(0, 0, 1, canvasWidth, canvasHeight))

      expect(store.personList[0]?.x).toBe(canvasWidth / 2 - CARD_SIZE.width / 2)
      expect(store.personList[0]?.y).toBe(canvasHeight / 2 - CARD_SIZE.height / 2)
    })

    it('сохраняет граф в localStorage', () => {
      store.addPerson(mockStageRef())

      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).toBeTruthy()
      if (raw) {
        const parsed = JSON.parse(raw) as { persons: Record<string, unknown> }
        expect(Object.keys(parsed.persons)).toHaveLength(1)
      }
    })

    it('молча игнорирует ошибки квоты localStorage', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => store.addPerson(mockStageRef())).not.toThrow()
      expect(store.personList).toHaveLength(1)
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  describe('updatePosition / debouncedUpdatePosition', () => {
    it('обновляет координаты персоны синхронно', () => {
      store.addPerson(mockStageRef())
      const id = store.personList[0]?.id ?? ''

      store.updatePosition(id, 12.5, -3)

      expect(store.getPerson(id)?.x).toBe(12.5)
      expect(store.getPerson(id)?.y).toBe(-3)
    })

    it('игнорирует несуществующую персону', () => {
      expect(() => store.updatePosition('ghost', 1, 2)).not.toThrow()
    })

    it('debounce: применяет позицию один раз по истечении 300 мс (последний вызов)', () => {
      vi.useFakeTimers()
      store.addPerson(mockStageRef())
      const id = store.personList[0]?.id ?? ''
      const beforeX = store.getPerson(id)?.x

      store.debouncedUpdatePosition(id, 10, 20)
      store.debouncedUpdatePosition(id, 30, 40)
      expect(store.getPerson(id)?.x).toBe(beforeX) // ещё не применено
      vi.advanceTimersByTime(300)

      expect(store.getPerson(id)?.x).toBe(30)
      expect(store.getPerson(id)?.y).toBe(40)
    })

    it('debounce: игнорирует несуществующую персону', () => {
      vi.useFakeTimers()

      expect(() => store.debouncedUpdatePosition('ghost', 1, 2)).not.toThrow()
      expect(() => vi.advanceTimersByTime(300)).not.toThrow()
    })
  })

  describe('updatePerson', () => {
    it('заменяет запись персоны целиком', () => {
      store.addPerson(mockStageRef())
      const id = store.personList[0]?.id ?? ''

      store.updatePerson(makePerson(id, { firstName: 'Новое имя', x: 15, y: 25 }))

      expect(store.getPerson(id)?.firstName).toBe('Новое имя')
      expect(store.getPerson(id)?.x).toBe(15)
    })
  })
  describe('removePerson', () => {
    it('каскадно удаляет связи, где персона — отправитель или получатель', () => {
      store.setGraph({
        persons: { a: makePerson('a'), b: makePerson('b'), c: makePerson('c') },
        relationships: {},
      })
      store.addRelationship('a', 'b', RelationshipType.BLOOD)
      store.addRelationship('b', 'c', RelationshipType.ADOPTION)
      store.selectPerson('b')

      store.removePerson('b')

      expect(store.personList.map((p) => p.id)).toEqual(['a', 'c'])
      expect(store.relationshipList).toHaveLength(0)
      expect(store.selectedPersonId).toBeNull()
    })

    it('не трогает связи без участия персоны и не сбрасывает чужое выделение', () => {
      store.setGraph({
        persons: { a: makePerson('a'), b: makePerson('b'), c: makePerson('c') },
        relationships: {},
      })
      store.addRelationship('a', 'c', RelationshipType.MARRIAGE)
      store.selectPerson('a')

      store.removePerson('b')

      expect(store.personList.map((p) => p.id)).toEqual(['a', 'c'])
      expect(store.relationshipList).toHaveLength(1)
      expect(store.selectedPersonId).toBe('a')
    })
  })

  describe('addRelationship', () => {
    it('добавляет связь с уникальным id под ключом `${from}:${to}`', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })

      store.addRelationship('a', 'b', RelationshipType.BLOOD)

      expect(Object.keys(store.relationships)).toEqual(['a:b'])
      expect(store.relationshipList[0]?.from).toBe('a')
      expect(store.relationshipList[0]?.to).toBe('b')
      expect(store.relationshipList[0]?.type).toBe(RelationshipType.BLOOD)
      expect(store.relationshipList[0]?.id).toBeTruthy()
    })

    it('игнорирует дубли по ключу `${from}:${to}`', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })

      store.addRelationship('a', 'b', RelationshipType.BLOOD)
      store.addRelationship('a', 'b', RelationshipType.MARRIAGE) // тот же ключ, другой тип

      expect(store.relationshipList).toHaveLength(1)
      expect(store.relationshipList[0]?.type).toBe(RelationshipType.BLOOD)
    })
  })

  describe('removeRelationship', () => {
    it('удаляет связь по id и сбрасывает её выделение', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.addRelationship('a', 'b', RelationshipType.BLOOD)
      const id = store.relationshipList[0]?.id ?? ''
      store.selectRelationship(id)

      store.removeRelationship(id)

      expect(store.relationshipList).toHaveLength(0)
      expect(store.selectedRelationshipId).toBeNull()
    })

    it('игнорирует несуществующий id', () => {
      expect(() => store.removeRelationship('ghost')).not.toThrow()
    })
  })

  describe('changeRelationshipType', () => {
    it('меняет тип связи по id и сохраняет граф', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.addRelationship('a', 'b', RelationshipType.BLOOD)
      const id = store.relationshipList[0]?.id ?? ''

      store.changeRelationshipType(id, RelationshipType.ADOPTION)

      expect(store.relationshipList[0]?.type).toBe(RelationshipType.ADOPTION)
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
        relationships: { 'a:b': { type: RelationshipType.ADOPTION } },
      })
    })

    it('игнорирует несуществующий id', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.addRelationship('a', 'b', RelationshipType.BLOOD)

      expect(() => store.changeRelationshipType('ghost', RelationshipType.ADOPTION)).not.toThrow()
      expect(store.relationshipList[0]?.type).toBe(RelationshipType.BLOOD)
    })
  })

  describe('removeIncomingRelationships', () => {
    it('удаляет только связи, входящие в персону (to === personId)', () => {
      store.setGraph({
        persons: { a: makePerson('a'), b: makePerson('b'), c: makePerson('c') },
        relationships: {},
      })
      store.addRelationship('a', 'b', RelationshipType.BLOOD) // входящая для b
      store.addRelationship('b', 'c', RelationshipType.ADOPTION) // исходящая из b

      store.removeIncomingRelationships('b')

      expect(store.relationshipList).toHaveLength(1)
      expect(store.relationshipList[0]?.from).toBe('b')
    })
  })
  describe('setGraph', () => {
    it('заменяет граф, сбрасывает выделение и сохраняет данные', () => {
      store.addPerson(mockStageRef())
      store.selectPerson(store.personList[0]?.id ?? null)

      store.setGraph({ persons: { a: makePerson('a') }, relationships: {} })

      expect(Object.keys(store.persons)).toEqual(['a'])
      expect(store.relationshipList).toHaveLength(0)
      expect(store.selectedPersonId).toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    })
  })

  describe('loadFromStorage', () => {
    it('возвращает false, если localStorage пуст', () => {
      expect(store.loadFromStorage()).toBe(false)
      expect(store.personList).toHaveLength(0)
    })

    it('загружает сохранённый граф', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ persons: { a: makePerson('a') }, relationships: {} }),
      )

      expect(store.loadFromStorage()).toBe(true)
      expect(Object.keys(store.persons)).toEqual(['a'])
    })

    it('возвращает false для битого JSON без выброса ошибки', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorage.setItem(STORAGE_KEY, '{broken json')

      expect(store.loadFromStorage()).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
    })

    it('возвращает false для валидного JSON с невалидным графом', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ persons: { a: {} }, relationships: {} }))

      expect(store.loadFromStorage()).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('очищает граф, выделение и localStorage', () => {
      store.addPerson(mockStageRef())
      store.selectPerson(store.personList[0]?.id ?? null)
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()

      store.clearAll()

      expect(store.personList).toHaveLength(0)
      expect(store.relationshipList).toHaveLength(0)
      expect(store.selectedPersonId).toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('очищает состояние даже если removeItem падает', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      store.addPerson(mockStageRef())
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      expect(() => store.clearAll()).not.toThrow()
      expect(store.personList).toHaveLength(0)
      expect(warn).toHaveBeenCalledOnce()
    })
  })
})
