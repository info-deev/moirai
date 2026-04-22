<template>
  <div class="w-screen h-screen bg-[#1d1d1d] overflow-hidden flex flex-col font-sans select-none">
    <!-- Blender Header UI -->
    <header
      class="h-10 bg-[#333333] border-b border-[#111] flex items-center px-4 gap-4 text-sm z-10"
    >
      <div class="font-bold text-orange-400 italic">BLENDER NODE MVP</div>
      <button
        @click="addNode"
        class="bg-[#444] hover:bg-[#555] text-gray-200 px-3 py-1 rounded border border-[#222] transition-all active:scale-95"
      >
        + Add Node
      </button>
      <div class="text-gray-500 text-[10px] uppercase tracking-widest ml-auto">
        Zoom: {{ Math.round(stageConfig.scaleX * 100) }}%
      </div>
    </header>

    <div class="flex-grow relative">
      <v-stage
        ref="stageRef"
        :config="stageConfig"
        @wheel="handleWheel"
        @mousemove="handleStageMouseMove"
        @mouseup="handleStageMouseUp"
      >
        <v-layer>
          <!-- 1. Динамическая сетка -->
          <!-- <v-rect
            v-for="n in 80"
            :key="'h' + n"
            :config="{
              x: -3000,
              y: n * 100 - 4000,
              width: 6000,
              height: 1,
              fill: '#252525',
              listening: false,
            }"
          />
          <v-rect
            v-for="n in 80"
            :key="'v' + n"
            :config="{
              x: n * 100 - 3000,
              y: -4000,
              width: 1,
              height: 6000,
              fill: '#252525',
              listening: false,
            }"
          /> -->

          <!-- 2. Постоянные связи -->
          <v-line v-for="link in links" :key="link.id" :config="getLinkConfig(link)" />

          <!-- 3. Временная связь (при перетаскивании из пина) -->
          <v-line v-if="pendingLink" :config="getPendingLinkConfig()" />

          <!-- 4. Узлы -->
          <v-group
            v-for="node in nodes"
            :key="node.id"
            :config="{
              x: node.x,
              y: node.y,
              draggable: true,
              ondragmove: (e: any) => handleDragMove(e, node),
              oncontextmenu: (e: any) => openContextMenu(e, node.id),
            }"
          >
            <!-- Тело -->
            <v-rect
              :config="{
                width: 160,
                height: 90,
                fill: '#3b3b3b',
                cornerRadius: 6,
                stroke: '#111',
                strokeWidth: 2,
                shadowBlur: 10,
                shadowOpacity: 0.4,
              }"
            />

            <!-- Заголовок -->
            <v-rect
              :config="{
                width: 160,
                height: 24,
                fill: node.color,
                cornerRadius: [6, 6, 0, 0],
              }"
            />

            <v-text
              :config="{
                text: node.name,
                fill: '#ddd',
                fontSize: 11,
                fontStyle: 'bold',
                padding: 7,
                listening: false,
              }"
            />

            <v-text
              :config="{
                text: `${node.name} Смещение вниз от заголовка`,
                x: 0,
                y: 20, // Смещение вниз от заголовка
                width: 160,
                // align: 'center',
                fill: '#888', // Серый цвет как в Blender
                fontSize: 10,
                padding: 10,
                listening: false,
              }"
            />

            <!-- Входной пин (Input) -->
            <v-circle
              :config="{
                x: 0,
                y: 55,
                radius: 6,
                fill: '#6366f1',
                stroke: '#111',
                strokeWidth: 2,
                onmouseup: () => finishLinking(node.id),
              }"
            />

            <!-- Выходной пин (Output) -->
            <v-circle
              :config="{
                x: 160,
                y: 55,
                radius: 6,
                fill: '#ef4444',
                stroke: '#111',
                strokeWidth: 2,
                onmousedown: (e: any) => startLinking(e, node.id),
              }"
            />
          </v-group>
        </v-layer>
      </v-stage>
      <!-- Context Menu -->
      <div
        v-if="menuState.visible"
        class="fixed z-50 bg-[#282828] border border-[#111] shadow-xl py-1 w-48 rounded text-sm text-gray-200"
        :style="{ left: menuState.x + 'px', top: menuState.y + 'px' }"
      >
        <div
          class="px-3 py-1.5 text-xs text-gray-500 uppercase font-bold border-b border-[#333] mb-1"
        >
          Node Options
        </div>
        <button @click="closeContextMenu" class="w-full text-left px-3 py-1.5 hover:bg-[#3d3d3d]">
          Edit Node
        </button>
        <button
          @click="deleteNode"
          class="w-full text-left px-3 py-1.5 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          Delete Node
        </button>
        <button @click="closeContextMenu" class="w-full text-left px-3 py-1.5 hover:bg-[#3d3d3d]">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

// --- Типизация ---
interface NodeData {
  id: string
  name: string
  x: number
  y: number
  color: string
}

interface LinkData {
  id: string
  fromId: string
  toId: string
}

interface PendingLink {
  fromId: string
  mouseX: number
  mouseY: number
}

const menuState = reactive({
  visible: false,
  x: 0,
  y: 0,
  nodeId: null as string | null,
})

// --- Состояние ---
const stageRef = ref<any>(null)
const nodes = ref<NodeData[]>([
  { id: '1', name: 'Texture Node', x: 100, y: 150, color: '#904343' },
  { id: '2', name: 'Output Material', x: 450, y: 150, color: '#43905e' },
])
const links = ref<LinkData[]>([])
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

// --- Функции ---

const addNode = () => {
  const id = Math.random().toString(36).substring(2, 9)
  const stage = stageRef.value.getStage()
  // Вычисляем центр экрана с учетом текущего зума и смещения
  const x = (window.innerWidth / 2 - stage.x()) / stage.scaleX()
  const y = (window.innerHeight / 2 - stage.y()) / stage.scaleY()

  nodes.value.push({
    id,
    name: `Node ${nodes.value.length + 1}`,
    x: x - 80,
    y: y - 45,
    color: '#436390',
  })
}

// const GRID_SIZE = 20 // Шаг сетки в пикселях
const handleDragMove = (e: any, node: NodeData) => {
  node.x = e.target.x()
  node.y = e.target.y()

  // const target = e.target

  // // Рассчитываем координаты с привязкой
  // const snappedX = Math.round(target.x() / GRID_SIZE) * GRID_SIZE
  // const snappedY = Math.round(target.y() / GRID_SIZE) * GRID_SIZE

  // // Обновляем визуальную позицию элемента Konva
  // target.x(snappedX)
  // target.y(snappedY)

  // // Сохраняем в реактивное состояние для обновления линий
  // node.x = snappedX
  // node.y = snappedY
}

// Создание кривой Безье
const calculateBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const dist = Math.abs(x2 - x1) * 0.5
  return [x1, y1, x1 + dist, y1, x2 - dist, y2, x2, y2]
}

const getLinkConfig = (link: LinkData) => {
  const from = nodes.value.find((n) => n.id === link.fromId)
  const to = nodes.value.find((n) => n.id === link.toId)
  if (!from || !to) return { points: [] }

  return {
    points: calculateBezier(from.x + 160, from.y + 55, to.x, to.y + 55),
    stroke: '#888',
    strokeWidth: 2,
    bezier: true,
    lineCap: 'round',
    listening: false,
  }
}

const getPendingLinkConfig = () => {
  if (!pendingLink.value) return {}
  const from = nodes.value.find((n) => n.id === pendingLink.value!.fromId)
  if (!from) return {}

  return {
    points: calculateBezier(
      from.x + 160,
      from.y + 55,
      pendingLink.value.mouseX,
      pendingLink.value.mouseY,
    ),
    stroke: '#fbbf24',
    strokeWidth: 2,
    bezier: true,
    dash: [5, 5],
    listening: false,
  }
}

// --- События мыши для связей ---

const startLinking = (e: any, nodeId: string) => {
  e.cancelBubble = true // Останавливаем всплытие, чтобы не начал двигаться фон
  const stage = stageRef.value.getStage()
  const pointer = stage.getPointerPosition()
  const transform = stage.getAbsoluteTransform().copy().invert()
  const pos = transform.point(pointer)

  pendingLink.value = { fromId: nodeId, mouseX: pos.x, mouseY: pos.y }
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

const finishLinking = (toId: string) => {
  if (pendingLink.value && pendingLink.value.fromId !== toId) {
    // Проверка на дубликаты
    const exists = links.value.some(
      (l) => l.fromId === pendingLink.value!.fromId && l.toId === toId,
    )
    if (!exists) {
      links.value.push({
        id: `l-${Math.random()}`,
        fromId: pendingLink.value.fromId,
        toId: toId,
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
    nodes.value = nodes.value.filter((n) => n.id !== menuState.nodeId)
    links.value = links.value.filter(
      (l) => l.fromId !== menuState.nodeId && l.toId !== menuState.nodeId,
    )
  }
  closeContextMenu()
}
</script>
