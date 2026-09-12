import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
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
      expect(store.secondaryPersonId).toBeNull()
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

  describe('selectSecondaryPerson (multi-select для родства)', () => {
    it('устанавливает вторичную персону, не трогая якорное выделение', () => {
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      expect(store.selectedPersonId).toBe('a')
      expect(store.secondaryPersonId).toBe('b')
    })

    it('Shift+клик по якорной персоне сбрасывает вторичное выделение', () => {
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      store.selectSecondaryPerson('a')

      expect(store.selectedPersonId).toBe('a')
      expect(store.secondaryPersonId).toBeNull()
    })

    it('повторный Shift+клик по той же персоне снимает вторичное выделение', () => {
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      store.selectSecondaryPerson('b')

      expect(store.secondaryPersonId).toBeNull()
    })

    it('selectPerson (обычный клик) сбрасывает вторичное выделение', () => {
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      store.selectPerson('c')

      expect(store.selectedPersonId).toBe('c')
      expect(store.secondaryPersonId).toBeNull()
    })

    it('null снимает вторичное выделение', () => {
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      store.selectSecondaryPerson(null)

      expect(store.secondaryPersonId).toBeNull()
    })

    it('removePerson сбрасывает вторичное выделение удалённой персоны', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      store.removePerson('b')

      expect(store.secondaryPersonId).toBeNull()
    })

    it('setGraph сбрасывает вторичное выделение', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      store.setGraph({ persons: { c: makePerson('c') }, relationships: {} })

      expect(store.secondaryPersonId).toBeNull()
    })

    it('clearAll сбрасывает вторичное выделение', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.selectPerson('a')
      store.selectSecondaryPerson('b')

      store.clearAll()

      expect(store.secondaryPersonId).toBeNull()
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

    it('принимает reactive-данные (metadata-прокси) и не ломает снапшоты', () => {
      store.setGraph({ persons: { a: makePerson('a') }, relationships: {} })
      // Симуляция компонента: {...form} унаследовал бы reactive-прокси в metadata.
      const form = reactive({ ...makePerson('a'), metadata: { note: 'x' } })
      store.updatePerson({ ...form })

      expect(store.getPerson('a')?.metadata).toEqual({ note: 'x' })
      // captureSnapshot на «загрязнённом» состоянии не должен бросать DataCloneError.
      expect(() => store.undo()).not.toThrow()
      expect(store.getPerson('a')).toMatchObject(makePerson('a'))
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

  describe('undo / redo', () => {
    it('начальное состояние: история пуста, undo/redo невозможны', () => {
      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(false)
    })

    it('addPerson → undo возвращает пустой граф, redo восстанавливает персону', () => {
      store.addPerson(mockStageRef())
      const id = store.personList[0]?.id ?? ''
      expect(store.canUndo).toBe(true)

      store.undo()
      expect(store.personList).toHaveLength(0)
      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(true)

      store.redo()
      expect(store.personList[0]?.id).toBe(id)
      expect(store.canRedo).toBe(false)
    })

    it('removePerson: undo восстанавливает каскадно удалённые связи', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.addRelationship('a', 'b', RelationshipType.BLOOD)

      store.removePerson('a')
      expect(store.personList).toHaveLength(1)
      expect(store.relationshipList).toHaveLength(0)

      store.undo()
      expect(Object.keys(store.persons)).toEqual(['a', 'b'])
      expect(store.relationshipList).toHaveLength(1)
    })

    it('updatePerson: undo возвращает старые поля формы', () => {
      store.setGraph({ persons: { a: makePerson('a') }, relationships: {} })
      store.updatePerson(makePerson('a', { firstName: 'Обновлено' }))

      expect(store.getPerson('a')?.firstName).toBe('Обновлено')
      store.undo()
      expect(store.getPerson('a')?.firstName).toBe('Тест')
    })

    it('changeRelationshipType: undo возвращает прежний тип, redo применяет новый', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.addRelationship('a', 'b', RelationshipType.BLOOD)

      store.changeRelationshipType(store.relationshipList[0]?.id ?? '', RelationshipType.ADOPTION)
      expect(store.relationshipList[0]?.type).toBe(RelationshipType.ADOPTION)

      store.undo()
      expect(store.relationshipList[0]?.type).toBe(RelationshipType.BLOOD)

      store.redo()
      expect(store.relationshipList[0]?.type).toBe(RelationshipType.ADOPTION)
    })

    it('removeRelationship: undo восстанавливает связь', () => {
      store.setGraph({ persons: { a: makePerson('a'), b: makePerson('b') }, relationships: {} })
      store.addRelationship('a', 'b', RelationshipType.BLOOD)

      store.removeRelationship(store.relationshipList[0]?.id ?? '')
      expect(store.relationshipList).toHaveLength(0)

      store.undo()
      expect(store.relationshipList).toHaveLength(1)
    })

    it('loadFromStorage и updatePosition не создают снапшоты', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ persons: { a: makePerson('a') }, relationships: {} }),
      )
      expect(store.loadFromStorage()).toBe(true)
      store.updatePosition('a', 10, 20)

      expect(store.canUndo).toBe(false)
    })

    it('новое действие обрывает ветку redo', () => {
      store.addPerson(mockStageRef())
      store.addPerson(mockStageRef())
      store.undo()
      expect(store.canRedo).toBe(true)

      store.addPerson(mockStageRef())
      expect(store.canRedo).toBe(false)
      expect(store.personList).toHaveLength(2)
    })

    it('undo/redo с пустыми стеками ничего не ломают', () => {
      expect(() => store.undo()).not.toThrow()
      expect(() => store.redo()).not.toThrow()
    })
  })

  describe('группировка drag в один шаг истории', () => {
    it('N промежуточных updatePosition между beginDrag/endDrag = 1 шаг', () => {
      // Сид через loadFromStorage: он не трогает историю → чистая база (canUndo false).
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ persons: { a: makePerson('a') }, relationships: {} }),
      )
      expect(store.loadFromStorage()).toBe(true)

      store.beginDrag('a')
      for (let i = 1; i <= 5; i++) {
        store.updatePosition('a', i * 10, i * 5)
      }
      store.endDrag('a')

      // Всё перетаскивание — один шаг: одно undo откатывает позицию к (0, 0).
      expect(store.canUndo).toBe(true)
      store.undo()
      expect(store.getPerson('a')?.x).toBe(0)
      expect(store.getPerson('a')?.y).toBe(0)
      expect(store.canUndo).toBe(false)
    })

    it('no-op drag (без движения) не создаёт шага истории', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ persons: { a: makePerson('a') }, relationships: {} }),
      )
      expect(store.loadFromStorage()).toBe(true)

      store.beginDrag('a')
      store.endDrag('a')

      expect(store.canUndo).toBe(false)
    })

    it('beginDrag/endDrag для несуществующей персоны безопасны', () => {
      expect(() => store.beginDrag('ghost')).not.toThrow()
      expect(() => store.endDrag('ghost')).not.toThrow()
      expect(store.canUndo).toBe(false)
    })

    it('undo во время активного drag блокируется', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ persons: { a: makePerson('a') }, relationships: {} }),
      )
      expect(store.loadFromStorage()).toBe(true)

      store.beginDrag('a')
      store.updatePosition('a', 30, 15)

      // Undo заблокирован, пока идёт drag: позиция не откатывается.
      store.undo()
      expect(store.getPerson('a')?.x).toBe(30)

      // После endDrag перетаскивание фиксируется одним шагом.
      store.endDrag('a')
      expect(store.canUndo).toBe(true)
    })
  })

  describe('лимит истории', () => {
    it('старые снапшоты отбрасываются сверх HISTORY_LIMIT (50)', () => {
      for (let i = 0; i < 52; i++) {
        store.addPerson(mockStageRef())
      }

      // 52 действия, но в стеке только 50 снапшотов: два старейших отброшены.
      for (let i = 0; i < 50; i++) {
        store.undo()
      }
      expect(store.canUndo).toBe(false)
      expect(store.personList).toHaveLength(2)
    })
  })

  describe('clearAll и история', () => {
    it('очищает стеки undo/redo вместе с графом', () => {
      store.addPerson(mockStageRef())
      store.undo()

      store.clearAll()

      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(false)
    })
  })
})
