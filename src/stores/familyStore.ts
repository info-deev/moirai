// stores/familyStore.ts
import { computed, ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import Konva from 'konva'
import { CARD_SIZE, Gender, RelationshipType, type Person, type Relationship } from '@/types/types'
import { createId } from '@/utils/id'
import { getLinkKey } from '@/utils/graphGeometry'
import { deserializeGraph, serializeGraph, type GraphData } from '@/utils/serialization'
import { useToast } from '@/composables/useToast'

/**
 * Оборачивает функцию в дебаунс с задержкой.
 * @param {(...args: A) => void} fn - функция для отложенного вызова
 * @param {number} ms - задержка в миллисекундах
 * @returns {(...args: A) => void} дебаунсированная обёртка
 */
function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: A) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), ms)
  }
}

/**
 * Глубокое копирование значения в plain-данные (без reactive-прокси Vue).
 * JSON-цикл — тот же механизм, что и персистентность графа: результат содержит
 * только сериализуемые значения и не несёт прокси, которые structuredClone
 * не умеет клонировать (DataCloneError).
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Ключ localStorage для автосохранения графа (решение D10).
 */
const STORAGE_KEY = 'moirai:graph:v1'

/**
 * Ключ localStorage для UI-предпочтений (видимость легенды).
 */
const PREFS_KEY = 'moirai:prefs:v1'

/**
 * Максимальная глубина истории Undo/Redo (только в памяти, не персистится).
 */
const HISTORY_LIMIT = 50

/**
 * Снапшот графа для истории Undo/Redo (plain-данные после structuredClone).
 */
interface GraphSnapshot {
  persons: Record<string, Person>
  relationships: Record<string, Relationship>
}

interface UiPrefs {
  showLegend?: boolean
}

/**
 * Читает UI-предпочтения из localStorage; битые данные → undefined.
 */
function loadUiPrefs(): UiPrefs | undefined {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as UiPrefs
  } catch (e) {
    console.warn('Не удалось загрузить UI-предпочтения:', e)
    return undefined
  }
}

/**
 * Сохраняет UI-предпочтения в localStorage. Ошибки не ломают работу редактора.
 */
function persistUiPrefs(prefs: UiPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.warn('Не удалось сохранить UI-предпочтения:', e)
  }
}

/**
 * Сохраняет граф в localStorage. Ошибки квоты/доступа не ломают работу редактора:
 * пользователь получает тост с предупреждением, данные продолжают жить в памяти.
 */
function persistGraph(
  persons: Record<string, Person>,
  relationships: Record<string, Relationship>,
) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeGraph(persons, relationships))
  } catch (e) {
    console.warn('Не удалось сохранить граф в localStorage:', e)
    useToast().error('Не удалось сохранить данные в localStorage')
  }
}

export const useFamilyStore = defineStore('family', () => {
  // Единый источник истины: граф хранится как Record (решение D3), ключ связи — `${from}:${to}`
  const persons = ref<Record<string, Person>>({})
  const relationships = ref<Record<string, Relationship>>({})

  // Списки для рендера
  const personList = computed(() => Object.values(persons.value))
  const relationshipList = computed(() => Object.values(relationships.value))

  // Выделение (T9.0): выбранная персона / связь — для подсветки и контекстного меню
  const selectedPersonId = ref<string | null>(null)
  const selectedRelationshipId = ref<string | null>(null)
  // Вторичное выделение для расчёта родства: якорь (A) — selectedPersonId,
  // вторичная персона (B) ставится Shift+кликом через selectSecondaryPerson
  const secondaryPersonId = ref<string | null>(null)

  // UI-предпочтения: видимость легенды (persist в localStorage)
  const savedPrefs = loadUiPrefs()
  const showLegend = ref(savedPrefs?.showLegend ?? true)

  /**
   * Переключает видимость легенды связей и сохраняет предпочтение.
   */
  const toggleLegend = () => {
    showLegend.value = !showLegend.value
    persistUiPrefs({ showLegend: showLegend.value })
  }

  /**
   * Выбирает персону и сбрасывает выделение связи.
   * Вторичное выделение (родство) тоже сбрасывается: одиночный клик — новое состояние.
   * @param {string | null} id - id персоны или null для снятия выделения
   */
  const selectPerson = (id: string | null) => {
    selectedPersonId.value = id
    selectedRelationshipId.value = null
    secondaryPersonId.value = null
  }

  /**
   * Устанавливает вторичную персону для расчёта родства (Shift+клик).
   * Повторный Shift+клик по уже выбранной B или клик по якорной A — сброс.
   * @param {string | null} id - id вторичной персоны или null для снятия
   */
  const selectSecondaryPerson = (id: string | null) => {
    if (id !== null && (id === selectedPersonId.value || id === secondaryPersonId.value)) {
      secondaryPersonId.value = null
      return
    }
    secondaryPersonId.value = id
  }

  /**
   * Выбирает связь и сбрасывает выделение персоны.
   * @param {string | null} id - id связи или null для снятия выделения
   */
  const selectRelationship = (id: string | null) => {
    selectedRelationshipId.value = id
    selectedPersonId.value = null
  }

  /**
   * Возвращает персону по ID.
   * @param {string} id - идентификатор персоны
   * @returns {Person | undefined} персона или undefined, если не найдена
   */
  const getPerson = (id: string) => persons.value[id]

  // ── История Undo/Redo ─────────────────────────────────────────────────
  // Снапшоты состояния (а не inverse-операции): каскадные удаления и bulk-действия
  // делают обратные операции хрупкими. Только в памяти, лимит HISTORY_LIMIT.

  const undoStack = ref<GraphSnapshot[]>([])
  const redoStack = ref<GraphSnapshot[]>([])
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  // Pending-снапшот активного drag: снимается в beginDrag и попадает в историю
  // только если позиция реально изменилась (1 перетаскивание = 1 шаг).
  let pendingDragSnapshot: GraphSnapshot | null = null

  /**
   * Делает deep-копию текущего графа (plain-данные, без ссылок на live-state).
   * toRaw снимает reactive-прокси Vue: structuredClone не умеет клонировать прокси.
   */
  const captureSnapshot = (): GraphSnapshot =>
    structuredClone({ persons: toRaw(persons.value), relationships: toRaw(relationships.value) })

  /**
   * Добавляет снапшот в конец стека, отбрасывая старые записи сверх лимита.
   */
  const appendWithLimit = (stack: GraphSnapshot[], snapshot: GraphSnapshot): GraphSnapshot[] => {
    const next = [...stack, snapshot]
    return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
  }

  /**
   * Записывает состояние в undo-стек и обрывает ветку redo (стандартное поведение:
   * новое действие делает отменённые шаги недоступными).
   */
  const pushHistory = (snapshot: GraphSnapshot) => {
    undoStack.value = appendWithLimit(undoStack.value, snapshot)
    redoStack.value = []
  }

  /**
   * Применяет снапшот к live-state, сбрасывает «протухшее» выделение и персистит.
   */
  const applySnapshot = (snapshot: GraphSnapshot) => {
    persons.value = snapshot.persons
    relationships.value = snapshot.relationships
    if (selectedPersonId.value && !persons.value[selectedPersonId.value]) {
      selectedPersonId.value = null
    }
    if (secondaryPersonId.value && !persons.value[secondaryPersonId.value]) {
      secondaryPersonId.value = null
    }
    if (selectedRelationshipId.value && !relationships.value[selectedRelationshipId.value]) {
      selectedRelationshipId.value = null
    }
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Отменяет последнее действие: текущее состояние уходит в redo-стек.
   */
  const undo = () => {
    if (pendingDragSnapshot !== null || undoStack.value.length === 0) return
    const previous = undoStack.value.at(-1)
    if (!previous) return
    undoStack.value = undoStack.value.slice(0, -1)
    redoStack.value = appendWithLimit(redoStack.value, captureSnapshot())
    applySnapshot(previous)
  }

  /**
   * Повторяет отменённое действие: текущее состояние уходит в undo-стек.
   */
  const redo = () => {
    if (pendingDragSnapshot !== null || redoStack.value.length === 0) return
    const next = redoStack.value.at(-1)
    if (!next) return
    redoStack.value = redoStack.value.slice(0, -1)
    undoStack.value = appendWithLimit(undoStack.value, captureSnapshot())
    applySnapshot(next)
  }

  /**
   * Начало перетаскивания: снимает pending-снапшот (в историю пока не попадает).
   * @param {string} id - идентификатор перетаскиваемой персоны
   */
  const beginDrag = (id: string) => {
    if (!persons.value[id]) return
    pendingDragSnapshot = captureSnapshot()
  }

  /**
   * Конец перетаскивания: если позиция изменилась — записывает один шаг в историю,
   * иначе (клик без движения) отбрасывает снапшот.
   * @param {string} id - идентификатор перетаскиваемой персоны
   */
  const endDrag = (id: string) => {
    const snapshot = pendingDragSnapshot
    pendingDragSnapshot = null
    if (!snapshot) return
    const before = snapshot.persons[id]
    const after = persons.value[id]
    if (!before || !after || (before.x === after.x && before.y === after.y)) return
    pushHistory(snapshot)
  }

  /**
   * Обновляет координаты персоны (синхронно, без дебаунса).
   * @param {string} id - идентификатор персоны
   * @param {number} x - новая координата X
   * @param {number} y - новая координата Y
   */
  const updatePosition = (id: string, x: number, y: number) => {
    const person = persons.value[id]
    if (person) {
      person.x = x
      person.y = y
    }
  }
  /**
   * Дебаунс-версия обновления позиции (300 мс) — гасит поток drag-событий.
   * @param {string} id - идентификатор персоны
   * @param {number} x - новая координата X
   * @param {number} y - новая координата Y
   */
  const debouncedUpdatePosition = debounce((id: string, x: number, y: number) => {
    const person = persons.value[id]
    if (person) {
      person.x = x
      person.y = y
      persistGraph(persons.value, relationships.value)
    }
  }, 300)

  /**
   * Создаёт новую персону: по умолчанию — по центру видимой области сцены
   * (размеры холста, а не окна — под шапкой редактора) с учётом зума и смещения stage;
   * при явных мировых координатах — центрирует карточку в этой точке
   * (ПКМ «Добавить персону здесь»).
   * @param {{ getStage(): Konva.Stage }} stageRef - ссылка на vue-konva stage
   * @param {{ x: number; y: number }} [worldPos] - точка мировых координат для центра карточки
   */
  const addPerson = (
    stageRef: { getStage(): Konva.Stage },
    worldPos?: { x: number; y: number },
  ) => {
    const id = createId()
    const stage = stageRef.getStage()

    let centerWorldX: number
    let centerWorldY: number
    if (worldPos) {
      centerWorldX = worldPos.x
      centerWorldY = worldPos.y
    } else {
      // Вычисляем центр холста с учетом текущего зума и смещения
      centerWorldX = (stage.width() / 2 - stage.x()) / stage.scaleX()
      centerWorldY = (stage.height() / 2 - stage.y()) / stage.scaleY()
    }

    pushHistory(captureSnapshot())
    persons.value[id] = {
      id,
      x: centerWorldX - CARD_SIZE.width / 2,
      y: centerWorldY - CARD_SIZE.height / 2,
      firstName: 'UNKNOWN',
      lastName: '',
      gender: Gender.UNKNOWN,
    }
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Удаляет персону и каскадно все связи, где она — отправитель или получатель.
   * @param {string} id - идентификатор персоны
   */
  const removePerson = (id: string) => {
    if (!persons.value[id]) return
    pushHistory(captureSnapshot())
    delete persons.value[id]
    // Каскадно удаляем все связи, где нода — отправитель или получатель
    for (const [key, relationship] of Object.entries(relationships.value)) {
      if (relationship.from === id || relationship.to === id) {
        delete relationships.value[key]
      }
    }
    if (selectedPersonId.value === id) selectedPersonId.value = null
    if (secondaryPersonId.value === id) secondaryPersonId.value = null
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Добавляет связь между персонами с защитой от дублей по ключу `${from}:${to}`.
   * @param {string} from - id отправителя
   * @param {string} to - id получателя
   * @param {RelationshipType} type - тип связи
   */
  const addRelationship = (from: string, to: string, type: RelationshipType) => {
    const key = getLinkKey(from, to)
    // Защита от дублей по ключу
    if (relationships.value[key]) return
    pushHistory(captureSnapshot())
    relationships.value[key] = { id: createId(), from, to, type }
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Удаляет связь по её id и сбрасывает выделение, если она была выбрана.
   * @param {string} id - идентификатор связи
   */
  const removeRelationship = (id: string) => {
    const entry = Object.entries(relationships.value).find(
      ([, relationship]) => relationship.id === id,
    )
    if (!entry) return
    pushHistory(captureSnapshot())
    delete relationships.value[entry[0]]
    if (selectedRelationshipId.value === id) selectedRelationshipId.value = null
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Меняет тип связи по её id (переключение «кровная» ↔ «усыновление»).
   * @param {string} id - идентификатор связи
   * @param {RelationshipType} type - новый тип связи
   */
  const changeRelationshipType = (id: string, type: RelationshipType) => {
    const relationship = Object.values(relationships.value).find((r) => r.id === id)
    if (!relationship || relationship.type === type) return
    pushHistory(captureSnapshot())
    relationship.type = type
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Заменяет весь граф валидированными данными (импорт из JSON-файла).
   * @param {GraphData} data - валидированные данные графа
   */
  const setGraph = (data: GraphData) => {
    pushHistory(captureSnapshot())
    persons.value = data.persons
    relationships.value = data.relationships
    selectedPersonId.value = null
    selectedRelationshipId.value = null
    secondaryPersonId.value = null
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Удаляет все связи, входящие в указанную персону (relationship.to === personId).
   * @param {string} personId - идентификатор персоны
   */
  const removeIncomingRelationships = (personId: string) => {
    const hasIncoming = Object.values(relationships.value).some((r) => r.to === personId)
    if (!hasIncoming) return
    pushHistory(captureSnapshot())
    for (const [key, relationship] of Object.entries(relationships.value)) {
      if (relationship.to === personId) {
        delete relationships.value[key]
      }
    }
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Заменяет запись персоны целиком (сохранение из формы редактирования).
   * @param {Person} person - обновлённая персона
   */
  const updatePerson = (person: Person) => {
    if (!persons.value[person.id]) return
    pushHistory(captureSnapshot())
    persons.value[person.id] = toPlain(person)
    persistGraph(persons.value, relationships.value)
  }

  /**
   * Загружает граф из localStorage при старте приложения.
   * Пустой/битый localStorage → остаёмся с пустым графом (показывается empty state).
   * @returns {boolean} true, если данные успешно загружены
   */
  const loadFromStorage = (): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const result = deserializeGraph(JSON.parse(raw))
      if (!result.ok) return false
      persons.value = result.data.persons
      relationships.value = result.data.relationships
      return true
    } catch (e) {
      console.warn('Не удалось загрузить граф из localStorage:', e)
      return false
    }
  }

  /**
   * Очищает все данные: персоны, связи, выделение и сохранённый граф в localStorage.
   */
  const clearAll = () => {
    persons.value = {}
    relationships.value = {}
    selectedPersonId.value = null
    selectedRelationshipId.value = null
    secondaryPersonId.value = null
    undoStack.value = []
    redoStack.value = []
    pendingDragSnapshot = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn('Не удалось очистить localStorage:', e)
    }
  }

  return {
    persons,
    relationships,
    personList,
    relationshipList,
    selectedPersonId,
    selectedRelationshipId,
    secondaryPersonId,
    showLegend,
    toggleLegend,
    selectPerson,
    selectSecondaryPerson,
    selectRelationship,
    getPerson,
    updatePosition,
    debouncedUpdatePosition,
    addPerson,
    updatePerson,
    removePerson,
    addRelationship,
    removeRelationship,
    changeRelationshipType,
    removeIncomingRelationships,
    setGraph,
    loadFromStorage,
    clearAll,
    canUndo,
    canRedo,
    undo,
    redo,
    beginDrag,
    endDrag,
  }
})
