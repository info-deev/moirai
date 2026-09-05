<template>
  <div class="w-screen h-screen bg-white overflow-hidden flex flex-col font-sans select-none">
    <!-- Header UI -->
    <header
      class="h-10 bg-gray-800 border-b border-[#111] flex items-center px-4 gap-4 text-sm z-10"
    >
      <div class="font-bold text-orange-400 italic">MOIRAI</div>
      <button
        @click="addNode"
        class="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded border border-gray-600 transition-all active:scale-95"
      >
        Добавить
      </button>
      <button
        @click="triggerFileInput"
        class="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded border border-gray-600 transition-all active:scale-95"
      >
        Импорт из JSON
      </button>

      <!-- Скрытый input -->
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="onImportFileSelected"
      />
      <button
        @click="exportData"
        class="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded border border-gray-600 transition-all active:scale-95"
      >
        Экспорт в JSON
      </button>
      <button
        @click="handleExportPNG"
        class="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded border border-gray-600 transition-all active:scale-95"
      >
        Экспорт в PNG
      </button>
      <button
        @click="openClearAllDialog"
        :disabled="personList.length === 0"
        class="bg-transparent text-red-400 px-3 py-1 rounded border border-red-800/60 transition-all hover:bg-red-900/30 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
      >
        Очистить всё
      </button>
      <RouterLink
        :to="{ name: 'help' }"
        class="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded border border-gray-600 transition-all active:scale-95"
      >
        Справка
      </RouterLink>
      <div class="text-gray-400 text-[10px] uppercase tracking-widest ml-auto">
        Масштаб: {{ Math.round(stageConfig.scaleX * 100) }}%
      </div>
    </header>

    <div class="grow relative">
      <!-- T8.1: Empty state — оверлей поверх холста, пока нет ни одной персоны -->
      <div
        v-if="personList.length === 0"
        class="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px]"
      >
        <div class="flex flex-col items-center gap-4 text-center">
          <p class="text-lg font-medium text-gray-700">Дерево пока пустое</p>
          <p class="max-w-xs text-sm text-gray-500">
            Добавьте первую персону или загрузите ранее экспортированный JSON.
          </p>
          <div class="mt-2 flex gap-3">
            <button
              @click="addNode"
              class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:scale-95"
            >
              Добавить персону
            </button>
            <button
              @click="triggerFileInput"
              class="rounded border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600 active:scale-95"
            >
              Импорт JSON
            </button>
          </div>
        </div>
      </div>

      <!-- T8.4: Панель зума (низ-центр) -->
      <div
        class="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-gray-800/90 px-2 py-1 text-sm text-gray-200 shadow-lg"
      >
        <button
          @click="zoomBy(1 / 1.2)"
          class="px-2 py-0.5 hover:bg-gray-700 rounded transition-colors"
          title="Отдалить (−)"
        >
          −
        </button>
        <button
          @click="resetView"
          class="min-w-[64px] px-1 text-center text-xs tabular-nums hover:bg-gray-700 rounded transition-colors"
          title="Сбросить вид (100%)"
        >
          {{ Math.round(stageConfig.scaleX * 100) }}%
        </button>
        <button
          @click="zoomBy(1.2)"
          class="px-2 py-0.5 hover:bg-gray-700 rounded transition-colors"
          title="Приблизить (+)"
        >
          +
        </button>
      </div>

      <!-- T8.3: Подсказка по управлению (низ-право) -->
      <div
        class="pointer-events-none absolute bottom-4 right-4 z-30 rounded bg-gray-800/70 px-2 py-1 text-[10px] text-gray-300"
      >
        Колесо — зум · ЛКМ — перемещение · ПКМ — меню · Esc — отмена
      </div>

      <v-stage
        ref="stageRef"
        :config="stageConfig"
        @wheel="handleWheel"
        @mousemove="handleStageMouseMove"
        @mouseup="handleStageMouseUp"
        @click="handleStageClick"
      >
        <v-layer>
          <!-- Постоянные связи -->
          <v-line
            v-for="link in relationshipList"
            :key="link.id"
            :config="getLinkConfig(link)"
            @click="selectRelationship(link.id)"
            @contextmenu="
              (e: Konva.KonvaEventObject<MouseEvent>) => openLinkContextMenu(e, link.id)
            "
          />

          <!-- Временная связь (при перетаскивании из пина) -->
          <v-line v-if="pendingLink" :config="getPendingLinkConfig()" />

          <!-- Узлы -->
          <v-group
            v-for="node in personList"
            :key="node.id"
            :config="{
              x: node.x,
              y: node.y,
              draggable: true,
              ondragmove: (e: Konva.KonvaEventObject<MouseEvent>) => handleDragMove(e, node),
              ondragend: (e: Konva.KonvaEventObject<MouseEvent>) =>
                familyStore.debouncedUpdatePosition(node.id, e.target.x(), e.target.y()),
              oncontextmenu: (e: Konva.KonvaEventObject<MouseEvent>) => openContextMenu(e, node.id),
              onMouseenter: () => (hoveredNodeId = node.id),
              onMouseleave: () => (hoveredNodeId = null),
              onclick: () => selectPerson(node.id),
            }"
          >
            <!-- Тело -->
            <v-rect
              :config="{
                width: CARD_SIZE.width,
                height: CARD_SIZE.height,
                fill: '#ffffff',
                cornerRadius: 6,
                stroke: selectedPersonId === node.id ? '#2563eb' : '#6a7282',
                strokeWidth: selectedPersonId === node.id ? 2 : 0,
                shadowBlur: 10,
                shadowOpacity: 0.3,
              }"
            />

            <!-- Заголовок -->
            <v-rect
              :config="{
                width: CARD_SIZE.width,
                height: 24,
                fill: getTitleBackgroundColor(node),
                cornerRadius: [6, 6, 0, 0],
              }"
            />

            <v-text
              :config="{
                text: `${node.firstName} ${node.lastName}`,
                fill: '#f9fafb',
                fontSize: 10,
                fontStyle: 'bold',
                padding: 8,
                listening: false,
              }"
            />

            <v-text
              :config="{
                text: `${node.birthDate ?? ''}`,
                x: 0,
                y: 20, // Смещение вниз от заголовка
                width: CARD_SIZE.width,
                // align: 'center',
                fill: '#6a7282', // Серый цвет как в Blender
                fontSize: 10,
                padding: 8,
                listening: false,
              }"
            />
            <template v-if="hoveredNodeId === node.id">
              <!-- Входной пин (Input) -->
              <v-circle
                :config="{
                  x: 0,
                  y: CARD_SIZE.height / 2,
                  radius: 6,
                  fill: 'transparent',
                  stroke: '#00a6f4',
                  strokeWidth: 1.5,
                  onmouseup: () => finishLinking(node.id),
                }"
                @click="handlePinClick(node)"
              />

              <!-- Входной пин (Input) ♀ -->
              <v-circle
                :config="{
                  x: CARD_SIZE.width / 2,
                  y: 0,
                  radius: 6,
                  fill: 'transparent',
                  stroke: '#ff6900',
                  strokeWidth: 1.5,
                  onmouseup: () => finishLinking(node.id, RelationshipType.MARRIAGE),
                }"
                @click="handlePinClick(node)"
              />

              <!-- Выходной пин (Output) -->
              <v-circle
                :config="{
                  x: CARD_SIZE.width,
                  y: CARD_SIZE.height / 2,
                  radius: 6,
                  fill: node.gender === Gender.MALE ? '#6a7282' : '#00a6f4',
                  stroke: node.gender === Gender.MALE ? '#6a7282' : '#00a6f4',
                  strokeWidth: 1,
                  onmousedown: (e: any) => startLinking(e, node.id),
                }"
              />
              <!-- Выходной пин (Output) ♂ -->
              <v-circle
                :config="{
                  x: CARD_SIZE.width / 2,
                  y: CARD_SIZE.height,
                  radius: 6,
                  fill: '#ff6900',
                  stroke: '#ff6900',
                  strokeWidth: 1,
                  onmousedown: (e: any) => startLinking(e, node.id, RelationshipType.MARRIAGE),
                }"
              />
            </template>
          </v-group>
        </v-layer>
      </v-stage>
      <!-- Context Menu -->
      <div
        v-if="menuState.visible"
        class="fixed z-50 bg-gray-800 rounded-lg shadow-xl py-2 w-48 text-sm text-gray-100"
        :style="{ left: menuState.x + 'px', top: menuState.y + 'px' }"
      >
        <div
          class="px-3 py-1.5 text-xs text-gray-500 uppercase font-bold border-b border-gray-600 mb-1"
        >
          Варианты
        </div>
        <template v-if="menuState.nodeId">
          <button
            @click="isOpenPersonEditModal = true"
            class="w-full text-left px-3 py-1.5 hover:bg-gray-700"
          >
            Изменить
          </button>
          <button
            @click="deleteNode"
            class="w-full text-left px-3 py-1.5 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            Удалить персону
          </button>
        </template>
        <template v-if="menuState.linkId">
          <button
            @click="deleteLink"
            class="w-full text-left px-3 py-1.5 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            Удалить связь
          </button>
        </template>
        <button @click="closeContextMenu" class="w-full text-left px-3 py-1.5 hover:bg-gray-700">
          Отмена
        </button>
      </div>
    </div>
    <PersonEditModal
      :is-open="isOpenPersonEditModal"
      :person="familyStore.getPerson(menuState.nodeId ?? '') ?? null"
      @save="editNode"
      @close="isOpenPersonEditModal = false"
    />

    <!-- T8.2: Подтверждение удаления персоны -->
    <ConfirmDialog
      :is-open="confirmDelete.visible"
      title="Удалить персону?"
      message="Персона и все её связи будут удалены без возможности восстановления."
      @confirm="handleConfirmDelete"
      @close="confirmDelete.visible = false"
    />

    <!-- Подтверждение очистки всех данных -->
    <ConfirmDialog
      :is-open="confirmClearAll.visible"
      title="Очистить все данные?"
      message="Все персоны и связи будут удалены без возможности восстановления."
      confirm-label="Очистить"
      @confirm="handleConfirmClearAll"
      @close="confirmClearAll.visible = false"
    />

    <!-- Подтверждение импорта JSON: текущий граф будет заменён данными из файла -->
    <ConfirmDialog
      :is-open="confirmImport.visible"
      title="Импортировать данные?"
      message="Текущие персоны и связи будут заменены данными из файла без возможности восстановления."
      confirm-label="Импортировать"
      @confirm="handleConfirmImport"
      @close="cancelImport"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Konva from 'konva'
import type { VueKonvaRef } from 'vue-konva'
import { storeToRefs } from 'pinia'
import { CARD_SIZE, Gender, RelationshipType, type Person, type Relationship } from '@/types/types'
import { useFamilyStore } from '@/stores/familyStore'
import PersonEditModal from './PersonEditModal.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'
import { exportStageToPng } from '@/utils/exportPng'
import { downloadBlob } from '@/utils/download'
import { deserializeGraph, serializeGraph, type GraphData } from '@/utils/serialization'
import { calculateBezier, getEndAnchor, getLinkAxis, getStartAnchor } from '@/utils/graphGeometry'

interface PendingLink {
  fromId: string
  mouseX: number
  mouseY: number
  type: RelationshipType
}

const menuState = reactive({
  visible: false,
  x: 0,
  y: 0,
  nodeId: null as string | null,
  linkId: null as string | null,
})

// T8.2: состояние подтверждения удаления персоны
const confirmDelete = reactive({
  visible: false,
  nodeId: null as string | null,
})

// Состояние подтверждения очистки всех данных
const confirmClearAll = reactive({
  visible: false,
})

// Подтверждение импорта JSON: текущие данные будут заменены данными из файла
const confirmImport = reactive({
  visible: false,
})

// Валидированные данные из файла, ожидающие подтверждения импорта
const pendingGraph = ref<GraphData | null>(null)

const { success, error } = useToast()

// --- Состояние ---
const stageRef = ref<VueKonvaRef<Konva.Stage> | null>(null)
const pendingLink = ref<PendingLink | null>(null)

// Единый источник истины: граф живёт в store (Record-структуры, ключ связи — "fromId:toId")
const familyStore = useFamilyStore()
const {
  persons,
  relationships,
  personList,
  relationshipList,
  selectedPersonId,
  selectedRelationshipId,
} = storeToRefs(familyStore)
const { selectPerson, selectRelationship } = familyStore

// T8.4: границы зума и шаг кнопок панели
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 1.2

const stageConfig = reactive({
  width: window.innerWidth,
  height: window.innerHeight - 40,
  draggable: true,
  scaleX: 1,
  scaleY: 1,
  x: 0,
  y: 0,
})

/**
 * Безопасный доступ к Konva Stage через vue-konva ref.
 * @returns {Konva.Stage | null} сцена или null, если stage ещё не смонтирован
 */
const getStage = () => stageRef.value?.getStage() ?? null

const hoveredNodeId = ref<string | null>(null)
const isOpenPersonEditModal = ref(false)

/**
 * Цвет заголовка карточки в зависимости от пола персоны.
 * @param {Person} node - персона, для которой подбирается цвет
 * @returns {string} hex-цвет фона заголовка
 */
const getTitleBackgroundColor = (node: Person) => {
  if (node.gender === Gender.MALE) {
    return '#0069a8'
  }
  if (node.gender === Gender.FEMALE) {
    return '#9810fa'
  }
  return '#4a5565'
}

// --- Функции ---

/**
 * Создаёт новую персону в центре сцены (делегирование в store).
 */
const addNode = () => {
  if (!stageRef.value) return
  familyStore.addPerson(stageRef.value)
}

/**
 * Обработчик drag: обновляет позицию карточки в store.
 * @param {Konva.KonvaEventObject<MouseEvent>} e - событие перетаскивания
 * @param {Person} node - персона, чья карточка перетаскивается
 */
const handleDragMove = (e: Konva.KonvaEventObject<MouseEvent>, node: Person) => {
  familyStore.updatePosition(node.id, e.target.x(), e.target.y())
}

/**
 * Конфигурация Konva.Line для готовой связи: точки Безье, цвет по типу,
 * градиентная пунктирная линия для мужских blood-связей.
 * @param {Relationship} link - связь между персонами
 * @returns {Konva.LineConfig} конфигурация линии
 */
const getLinkConfig = (link: Relationship) => {
  const from = familyStore.getPerson(link.from)
  const to = familyStore.getPerson(link.to)
  if (!from || !to) return { points: [] }

  const start = getStartAnchor(link.type, from.x, from.y)
  const end = getEndAnchor(link.type, to.x, to.y)

  const result: Konva.LineConfig = {
    points: calculateBezier(start.x, start.y, end.x, end.y, getLinkAxis(link.type)),
    stroke: link.type === RelationshipType.BLOOD ? '#00a6f4' : '#ff6900',
    strokeWidth: selectedRelationshipId.value === link.id ? 4 : 2,
    bezier: true,
    lineCap: 'round',
  }

  if (from.gender === Gender.MALE && link.type === RelationshipType.BLOOD) {
    result.strokeLinearGradientStartPoint = { x: start.x, y: start.y }
    result.strokeLinearGradientEndPoint = { x: end.x, y: end.y }
    result.strokeLinearGradientColorStops = [0, '#ff6900', 1, '#00a6f4']
  }

  return result
}

/**
 * Конфигурация пунктирной линии при перетаскивании новой связи.
 * @returns {Konva.LineConfig | {}} конфигурация pending-линии или пустой объект, если связь не создаётся
 */
const getPendingLinkConfig = () => {
  if (!pendingLink.value) return {}
  const from = familyStore.getPerson(pendingLink.value!.fromId)
  if (!from) return {}

  const start = getStartAnchor(pendingLink.value.type, from.x, from.y)

  const result: Konva.LineConfig = {
    points: calculateBezier(
      start.x,
      start.y,
      pendingLink.value.mouseX,
      pendingLink.value.mouseY,
      getLinkAxis(pendingLink.value.type),
    ),
    stroke: pendingLink.value.type === RelationshipType.BLOOD ? '#00a6f4' : '#ff6900',
    strokeWidth: 2,
    bezier: true,
    dash: [5, 5],
    listening: false,
    lineCap: 'round',
    lineJoin: 'round',
  }
  if (from.gender === Gender.MALE && pendingLink.value.type === RelationshipType.BLOOD) {
    result.strokeLinearGradientStartPoint = { x: start.x, y: start.y }
    result.strokeLinearGradientEndPoint = {
      x: pendingLink.value.mouseX,
      y: pendingLink.value.mouseY,
    }
    result.strokeLinearGradientColorStops = [0, '#ff6900', 1, '#00a6f4']
  }
  return result
}

// --- События мыши для связей ---

/**
 * Начало создания связи: фиксирует исходную ноду и позицию курсора в scene-координатах.
 * @param {Konva.KonvaEventObject<MouseEvent | TouchEvent>} e - событие нажатия на пин
 * @param {string} nodeId - id персоны, от которой начинается связь
 * @param {RelationshipType} [type=RelationshipType.BLOOD] - тип создаваемой связи
 */
const startLinking = (
  e: Konva.KonvaEventObject<MouseEvent>,
  nodeId: string,
  type: RelationshipType = RelationshipType.BLOOD,
) => {
  e.cancelBubble = true // Останавливаем всплытие, чтобы не начал двигаться фон
  const stage = getStage()
  if (!stage) return
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  const transform = stage.getAbsoluteTransform().copy().invert()
  const pos = transform.point(pointer)

  pendingLink.value = { fromId: nodeId, mouseX: pos.x, mouseY: pos.y, type }
}

/**
 * Обновляет координаты курсора в pendingLink при перетаскивании новой связи.
 */
const handleStageMouseMove = () => {
  if (!pendingLink.value) return
  const stage = getStage()
  if (!stage) return
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  const transform = stage.getAbsoluteTransform().copy().invert()
  const pos = transform.point(pointer)

  pendingLink.value.mouseX = pos.x
  pendingLink.value.mouseY = pos.y
}

/**
 * Завершает создание связи: добавляет relationship в store (если from ≠ to) и сбрасывает pendingLink.
 * @param {string} toId - id персоны-получателя
 * @param {RelationshipType} [type=RelationshipType.BLOOD] - тип создаваемой связи
 */
const finishLinking = (toId: string, type: RelationshipType = RelationshipType.BLOOD) => {
  if (pendingLink.value && pendingLink.value.fromId !== toId) {
    familyStore.addRelationship(pendingLink.value.fromId, toId, type)
  }
  pendingLink.value = null
}

/**
 * Отмена создания связи при отпускании мыши вне пина.
 */
const handleStageMouseUp = () => {
  pendingLink.value = null
}

/**
 * Клик по пустому месту сцены — сброс выделения (ноды/связи обрабатывают клик сами).
 * @param {Konva.KonvaEventObject<MouseEvent>} e - событие клика
 */
const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (e.target !== e.target.getStage()) return
  familyStore.selectPerson(null)
}

// --- Зум ---
/**
 * Ограничение масштаба диапазону [MIN_ZOOM, MAX_ZOOM].
 * @param {number} scale - желаемый масштаб
 */
const clampZoom = (scale: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))

/**
 * Зум сцены колёсиком мыши вокруг курсора (коэффициент ×/÷ 1.1, границы MIN/MAX_ZOOM).
 * @param {Konva.KonvaEventObject<WheelEvent>} e - событие прокрутки колеса
 */
const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
  e.evt.preventDefault()
  const stage = e.target.getStage()
  if (!stage) return
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  const newScale = clampZoom(e.evt.deltaY < 0 ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP)
  applyZoom(newScale, pointer.x, pointer.y)
}

/**
 * Применяет масштаб вокруг заданной точки (в координатах контейнера stage).
 * @param {number} newScale - целевой масштаб
 * @param {number} px - X опорной точки
 * @param {number} py - Y опорной точки
 */
const applyZoom = (newScale: number, px: number, py: number) => {
  const stage = getStage()
  if (!stage) return
  const oldScale = stage.scaleX()
  stage.scale({ x: newScale, y: newScale })
  stageConfig.scaleX = newScale // Для UI счетчика

  const mousePointTo = {
    x: (px - stage.x()) / oldScale,
    y: (py - stage.y()) / oldScale,
  }
  stage.position({
    x: px - mousePointTo.x * newScale,
    y: py - mousePointTo.y * newScale,
  })
}

/**
 * Кнопки панели зума: масштаб вокруг центра сцены.
 * @param {number} factor - множитель (1.2 — приближение, 1/1.2 — отдаление)
 */
const zoomBy = (factor: number) => {
  const stage = getStage()
  if (!stage) return
  const newScale = clampZoom(stage.scaleX() * factor)
  applyZoom(newScale, stage.width() / 2, stage.height() / 2)
}

/**
 * Сброс вида: масштаб 100% и сдвиг в ноль.
 */
const resetView = () => {
  const stage = getStage()
  if (!stage) return
  stage.scale({ x: 1, y: 1 })
  stage.position({ x: 0, y: 0 })
  stageConfig.scaleX = 1
}

/**
 * Обработчик клавиатуры: Esc — отмена создания связи, закрытие меню и диалогов.
 */
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  pendingLink.value = null
  closeContextMenu()
  confirmDelete.visible = false
  confirmClearAll.visible = false
  cancelImport()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

/**
 * Показ контекстного меню в позиции курсора для выбранной персоны.
 * @param {Konva.KonvaEventObject<MouseEvent | TouchEvent>} e - событие клика по карточке
 * @param {string} nodeId - id персоны, для которой открывается меню
 */
const openContextMenu = (e: Konva.KonvaEventObject<MouseEvent>, nodeId: string) => {
  // Останавливаем стандартное меню браузера
  e.evt.preventDefault()
  e.cancelBubble = true

  const stage = getStage()
  if (!stage) return
  const container = stage.container().getBoundingClientRect()
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  menuState.x = container.left + pointer.x
  menuState.y = container.top + pointer.y
  menuState.nodeId = nodeId
  menuState.linkId = null
  menuState.visible = true

  // Закрываем меню при клике в любом месте
  window.addEventListener('click', closeContextMenu, { once: true })
}

/**
 * Контекстное меню связи (ПКМ по линии): предлагает удалить связь.
 * @param {Konva.KonvaEventObject<MouseEvent>} e - событие клика по линии
 * @param {string} linkId - id связи
 */
const openLinkContextMenu = (e: Konva.KonvaEventObject<MouseEvent>, linkId: string) => {
  e.evt.preventDefault()
  e.cancelBubble = true

  const stage = getStage()
  if (!stage) return
  const container = stage.container().getBoundingClientRect()
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  menuState.x = container.left + pointer.x
  menuState.y = container.top + pointer.y
  menuState.linkId = linkId
  menuState.nodeId = null
  menuState.visible = true

  window.addEventListener('click', closeContextMenu, { once: true })
}

/**
 * Скрывает контекстное меню.
 */
const closeContextMenu = () => {
  menuState.visible = false
}

/**
 * Открывает диалог подтверждения удаления персоны (T8.2).
 */
const deleteNode = () => {
  if (!menuState.nodeId) return
  confirmDelete.nodeId = menuState.nodeId
  confirmDelete.visible = true
  closeContextMenu()
}

/**
 * Подтверждённое удаление персоны: каскад через store + тост.
 */
const handleConfirmDelete = () => {
  if (confirmDelete.nodeId) {
    familyStore.removePerson(confirmDelete.nodeId)
    success('Персона удалена')
  }
  confirmDelete.visible = false
  confirmDelete.nodeId = null
}

/**
 * Открывает диалог подтверждения очистки всех данных.
 */
const openClearAllDialog = () => {
  closeContextMenu()
  confirmClearAll.visible = true
}

/**
 * Подтверждённая очистка: сброс store, закрытие висящего UI, тост.
 */
const handleConfirmClearAll = () => {
  familyStore.clearAll()
  pendingLink.value = null
  isOpenPersonEditModal.value = false
  closeContextMenu()
  confirmClearAll.visible = false
  success('Все данные очищены')
}

/**
 * Удаляет связь из контекстного меню + тост.
 */
const deleteLink = () => {
  if (menuState.linkId) {
    familyStore.removeRelationship(menuState.linkId)
    success('Связь удалена')
  }
  closeContextMenu()
}

/**
 * Сохранение изменений персоны из модалки в store.
 * @param {Person} node - обновлённая персона
 */
const editNode = (node: Person) => {
  familyStore.updatePerson(node)
}

/**
 * Клик по пину: удаляет все входящие связи персоны для переподключения.
 * @param {Person} node - персона, на пин которой кликнули
 */
const handlePinClick = (node: Person) => {
  familyStore.removeIncomingRelationships(node.id)
}

/**
 * Экспорт сцены в PNG (делегирование в utils/exportPng): клон stage, белый фон,
 * логотип, pixelRatio 2, скачивание файла. Успех/ошибка — тостом.
 */
const handleExportPNG = () => {
  const stage = getStage()
  if (!stage) return

  exportStageToPng(stage)
    .then(() => success('PNG-файл сохранён'))
    .catch((e: unknown) => {
      console.error('Ошибка экспорта PNG:', e)
      error('Не удалось экспортировать PNG')
    })
}

/**
 * Экспорт графа (персоны + связи) в JSON-файл через serializeGraph/downloadBlob.
 */
const exportData = () => {
  const blob = new Blob([serializeGraph(persons.value, relationships.value)], {
    type: 'application/json',
  })
  downloadBlob(blob, 'graph-data.json')
  success('JSON-файл сохранён')
}

// Ссылка на скрытый input
const fileInput = ref<HTMLInputElement | null>(null)

/**
 * Программный клик по скрытому input[type=file] для запуска диалога импорта.
 */
const triggerFileInput = () => {
  fileInput.value?.click()
}

/**
 * Обработчик выбора JSON-файла: читает и валидирует содержимое, после чего
 * показывает диалог подтверждения — текущие данные будут заменены.
 * @param {Event} event - событие change от file input
 */
const onImportFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed: unknown = JSON.parse(reader.result as string)
      const result = deserializeGraph(parsed)
      if (!result.ok) {
        error(`Импорт отклонён: ${result.error}`)
        return
      }
      pendingGraph.value = result.data
      confirmImport.visible = true
    } catch (e) {
      console.error('Ошибка при чтении JSON:', e)
      error('Не удалось прочитать JSON-файл')
    } finally {
      // Сбрасываем value, чтобы повторный выбор того же файла снова вызывал change
      input.value = ''
    }
  }
  if (input.files[0]) {
    reader.readAsText(input.files[0])
  }
}

/**
 * Подтверждённый импорт: заменяет граф данными из файла + тост.
 */
const handleConfirmImport = () => {
  if (pendingGraph.value) {
    familyStore.setGraph(pendingGraph.value)
    success('Данные успешно импортированы')
  }
  cancelImport()
}

/**
 * Отмена импорта: сброс состояния без изменения графа.
 */
const cancelImport = () => {
  confirmImport.visible = false
  pendingGraph.value = null
}
</script>
