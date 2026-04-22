<template>
  <div class="w-screen h-screen bg-white overflow-hidden flex flex-col font-sans select-none">
    <!-- Header UI -->
    <header
      class="h-10 bg-gray-800 border-b border-[#111] flex items-center px-4 gap-4 text-sm z-10"
    >
      <div class="font-bold text-orange-400 italic">MOIRAI MVP</div>
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
        @change="importData"
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
      <div class="text-gray-400 text-[10px] uppercase tracking-widest ml-auto">
        Масштаб: {{ Math.round(stageConfig.scaleX * 100) }}%
      </div>
    </header>

    <div class="grow relative">
      <v-stage
        ref="stageRef"
        :config="stageConfig"
        @wheel="handleWheel"
        @mousemove="handleStageMouseMove"
        @mouseup="handleStageMouseUp"
      >
        <v-layer>
          <!-- Постоянные связи -->
          <v-line v-for="link in links.values()" :key="link.id" :config="getLinkConfig(link)" />

          <!-- Временная связь (при перетаскивании из пина) -->
          <v-line v-if="pendingLink" :config="getPendingLinkConfig()" />

          <!-- Узлы -->
          <v-group
            v-for="node in nodes.values()"
            :key="node.id"
            :config="{
              x: node.x,
              y: node.y,
              draggable: true,
              ondragmove: (e: any) => handleDragMove(e, node),
              oncontextmenu: (e: any) => openContextMenu(e, node.id),
              onMouseenter: () => (hoveredNodeId = node.id),
              onMouseleave: () => (hoveredNodeId = null),
            }"
          >
            <!-- Тело -->
            <v-rect
              :config="{
                width: CARD_SIZE.width,
                height: CARD_SIZE.height,
                fill: '#ffffff',
                cornerRadius: 6,
                stroke: '#6a7282',
                strokeWidth: 0,
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
          Удалить
        </button>
        <button @click="closeContextMenu" class="w-full text-left px-3 py-1.5 hover:bg-gray-700">
          Отмена
        </button>
      </div>
    </div>
    <PersonEditModal
      :is-open="isOpenPersonEditModal"
      :person="nodes.get(menuState.nodeId || '') || null"
      @save="editNode"
      @close="isOpenPersonEditModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import Konva from 'konva'
import {
  Axis,
  CARD_SIZE,
  Gender,
  RelationshipType,
  type Person,
  type Relationship,
} from '@/types/types'
import PersonEditModal from './PersonEditModal.vue'
import logoSvgUrl from '@/assets/Deev-Family-Symbol-free.svg'

// --- Типизация ---
// interface NodeData {
//   id: string
//   name: string
//   x: number
//   y: number
//   color: string
// }

// interface LinkData {
//   id: string
//   fromId: string
//   toId: string
//   type: RelationshipType
// }

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
})

// --- Состояние ---
const stageRef = ref<any>(null)
const nodes = ref<Map<string, Person>>(new Map())
// Ключ будет строкой "fromId:toId"
const links = ref<Map<string, Relationship>>(new Map())
const pendingLink = ref<PendingLink | null>(null)

const stageConfig = reactive({
  width: window.innerWidth,
  height: window.innerHeight - 40,
  draggable: true,
  scaleX: 1,
  scaleY: 1,
  x: 0,
  y: 0,
})

const hoveredNodeId = ref<string | null>(null)
const isOpenPersonEditModal = ref(false)

const getTitleBackgroundColor = (node: Person) => {
  if (node.gender === Gender.MALE) {
    return '#0069a8'
  }
  if (node.gender === Gender.FEMALE) {
    return '#9810fa'
  }
  return '#4a5565'
}

// Вспомогательная функция для генерации ключа
const getLinkKey = (fromId: string, toId: string) => `${fromId}:${toId}`

// --- Функции ---

const addNode = () => {
  const id = self.crypto.randomUUID()
  const stage = stageRef.value.getStage()
  // Вычисляем центр экрана с учетом текущего зума и смещения
  const x = (window.innerWidth / 2 - stage.x()) / stage.scaleX()
  const y = (window.innerHeight / 2 - stage.y()) / stage.scaleY()

  nodes.value.set(id, {
    id,
    firstName: '-',
    lastName: '-',
    gender: Gender.UNKNOWN,
    x: x - 80,
    y: y - 45,
  })
}

const handleDragMove = (e: any, node: Person) => {
  node.x = e.target.x()
  node.y = e.target.y()
}

// Создание кривой Безье
const calculateBezier = (x1: number, y1: number, x2: number, y2: number, axis: Axis = Axis.X) => {
  if (axis === Axis.X) {
    const dist = Math.abs(x2 - x1) * 0.5
    return [x1, y1, x1 + dist, y1, x2 - dist, y2, x2, y2]
  }
  const dist = Math.abs(y2 - y1) * 0.5
  return [x1, y1, x1, y1 + dist, x2, y2 - dist, x2, y2]
}

const getLinkConfig = (link: Relationship) => {
  const from = nodes.value.get(link.from)
  const to = nodes.value.get(link.to)
  if (!from || !to) return { points: [] }

  const result: any = {
    points: calculateBezier(
      link.type === RelationshipType.BLOOD
        ? from.x + CARD_SIZE.width
        : from.x + CARD_SIZE.width / 2,
      link.type === RelationshipType.BLOOD
        ? from.y + CARD_SIZE.height / 2
        : from.y + CARD_SIZE.height,
      link.type === RelationshipType.BLOOD ? to.x : to.x + CARD_SIZE.width / 2,
      link.type === RelationshipType.BLOOD ? to.y + CARD_SIZE.height / 2 : to.y,
      link.type === RelationshipType.BLOOD ? Axis.X : Axis.Y,
    ),
    stroke: link.type === RelationshipType.BLOOD ? '#00a6f4' : '#ff6900',
    strokeWidth: 2,
    bezier: true,
    lineCap: 'round',
    listening: false,
  }

  if (from.gender === Gender.MALE && link.type === RelationshipType.BLOOD) {
    result.strokeLinearGradientStartPoint = {
      x: from.x + CARD_SIZE.width,
      y: from.y + CARD_SIZE.height / 2,
    }
    result.strokeLinearGradientEndPoint = {
      x: to.x,
      y: to.y,
    }
    result.strokeLinearGradientColorStops = [0, '#ff6900', 1, '#00a6f4']
  }

  return result
}

const getPendingLinkConfig = () => {
  if (!pendingLink.value) return {}
  const from = nodes.value.get(pendingLink.value!.fromId)
  if (!from) return {}

  const result: any = {
    points: calculateBezier(
      pendingLink.value.type === RelationshipType.BLOOD
        ? from.x + CARD_SIZE.width
        : from.x + CARD_SIZE.width / 2,
      pendingLink.value.type === RelationshipType.BLOOD
        ? from.y + CARD_SIZE.height / 2
        : from.y + CARD_SIZE.height,
      pendingLink.value.mouseX,
      pendingLink.value.mouseY,
      pendingLink.value.type === RelationshipType.BLOOD ? Axis.X : Axis.Y,
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
    result.strokeLinearGradientStartPoint = {
      x: from.x + CARD_SIZE.width,
      y: from.y + CARD_SIZE.height / 2,
    }
    result.strokeLinearGradientEndPoint = {
      x: pendingLink.value.mouseX,
      y: pendingLink.value.mouseY,
    }
    result.strokeLinearGradientColorStops = [0, '#ff6900', 1, '#00a6f4']
  }
  return result
}

// --- События мыши для связей ---

const startLinking = (e: any, nodeId: string, type: RelationshipType = RelationshipType.BLOOD) => {
  e.cancelBubble = true // Останавливаем всплытие, чтобы не начал двигаться фон
  const stage = stageRef.value.getStage()
  const pointer = stage.getPointerPosition()
  const transform = stage.getAbsoluteTransform().copy().invert()
  const pos = transform.point(pointer)

  pendingLink.value = { fromId: nodeId, mouseX: pos.x, mouseY: pos.y, type }
}

const handleStageMouseMove = (e: any) => {
  if (!pendingLink.value) return
  const stage = stageRef.value.getStage()
  const pointer = stage.getPointerPosition()
  const transform = stage.getAbsoluteTransform().copy().invert()
  const pos = transform.point(pointer)

  pendingLink.value.mouseX = pos.x
  pendingLink.value.mouseY = pos.y
}

const finishLinking = (toId: string, type: RelationshipType = RelationshipType.BLOOD) => {
  if (pendingLink.value && pendingLink.value.fromId !== toId) {
    const linkKey = getLinkKey(pendingLink.value!.fromId, toId)
    const exists = links.value.has(linkKey)

    if (!exists) {
      links.value.set(linkKey, {
        id: `l-${Math.random()}`,
        from: pendingLink.value.fromId,
        to: toId,
        type,
      })
    }
  }
  pendingLink.value = null
}

const handleStageMouseUp = () => {
  pendingLink.value = null
}

// --- Зум ---
const handleWheel = (e: any) => {
  e.evt.preventDefault()
  const stage = e.target.getStage()
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()

  const scaleBy = 1.1
  const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

  stage.scale({ x: newScale, y: newScale })
  stageConfig.scaleX = newScale // Для UI счетчика

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  }
  stage.position(newPos)
}

const openContextMenu = (e: any, nodeId: string) => {
  // Останавливаем стандартное меню браузера
  e.evt.preventDefault()
  e.cancelBubble = true

  // Получаем позицию мыши относительно окна браузера
  const stage = stageRef.value.getStage()
  const container = stage.container().getBoundingClientRect()
  const pointer = stage.getPointerPosition()

  menuState.x = container.left + pointer.x
  menuState.y = container.top + pointer.y
  menuState.nodeId = nodeId
  menuState.visible = true

  // Закрываем меню при клике в любом месте
  window.addEventListener('click', closeContextMenu, { once: true })
}

const closeContextMenu = () => {
  menuState.visible = false
}

const deleteNode = () => {
  if (menuState.nodeId) {
    // Удаляем ноду и все связи с ней
    nodes.value.delete(menuState.nodeId)
    links.value = new Map(
      [...links.value].filter(
        ([key, l]) => l.from !== menuState.nodeId && l.to !== menuState.nodeId,
      ),
    )
  }
  closeContextMenu()
}

const editNode = (node: Person) => {
  nodes.value.set(node.id, node)
}

const handlePinClick = (node: Person) => {
  let keyToDelete = null

  // Итерируемся по всему Map
  for (const [key, value] of links.value) {
    if (value.to === node.id) {
      keyToDelete = key // Запоминаем (каждое новое совпадение перезапишет старое)
    }
  }

  // Если нашли, удаляем
  if (keyToDelete !== null) {
    links.value.delete(keyToDelete)
  }
}

const handleExportPNG = () => {
  const stage = stageRef.value?.getNode() as Konva.Stage | undefined
  if (!stage) return

  // Создаем клон сцены
  const tempStage = stage.clone()

  // Сбрасываем его масштаб для расчетов
  tempStage.scale({ x: 1, y: 1 })
  tempStage.position({ x: 0, y: 0 })

  // Находим границы контента
  const box = tempStage.getClientRect({ skipTransform: false })

  // Создаем фоновый слой (или Rect) специально для экспорта
  const background = new Konva.Rect({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    fill: 'white',
    listening: false, // чтобы не мешал кликам
  })

  let svgNode: Konva.Image | null = null // Переменная для хранения ссылки
  const layer = tempStage.getLayers()[0]

  Konva.Image.fromURL(logoSvgUrl, (node: Konva.Image) => {
    svgNode = node
    svgNode
      .width(50)
      .height(50)
      .position({
        x: box.x + 10,
        y: box.y + box.height - 60,
      })

    layer?.add(svgNode)
    layer?.draw()
  })

  setTimeout(() => {
    // Добавляем его в начало самого нижнего слоя
    // const layer = tempStage.getLayers()[0]
    layer?.add(background)
    background.moveToBottom()
    layer?.draw()

    // 5. Экспорт
    tempStage.toBlob({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      pixelRatio: 2,
      callback: (blob: Blob | null): void => {
        tempStage.destroy()

        if (!blob) return

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = 'exported_image.png'
        link.href = url
        link.click()

        setTimeout(() => URL.revokeObjectURL(url), 100)
      },
    })
  }, 100)
}

// Экспорт в JSON
const exportData = () => {
  const data = {
    nodes: Array.from(nodes.value.entries()),
    links: Array.from(links.value.entries()),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'graph-data.json'
  link.click()

  URL.revokeObjectURL(url)
}

// Ссылка на скрытый input
const fileInput = ref<HTMLInputElement | null>(null)

// Функция, которая просто "кликает" по скрытому инпуту
const triggerFileInput = () => {
  fileInput.value?.click()
}

// Импорт из JSON
const importData = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const { nodes: importedNodes, links: importedLinks } = JSON.parse(reader.result as string)

      // Восстанавливаем Map из массивов entries
      nodes.value = new Map(importedNodes)
      links.value = new Map(importedLinks)

      console.log('Данные успешно импортированы')
    } catch (e) {
      console.error('Ошибка при чтении JSON:', e)
    }
  }
  if (input.files[0]) {
    reader.readAsText(input.files[0])
  }
}
</script>
