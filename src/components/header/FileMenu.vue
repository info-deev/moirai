<script lang="ts">
/**
 * Действия выпадающего меню «Файл».
 */
export type FileAction = 'import' | 'export-json' | 'export-png' | 'clear'
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useClickOutside } from '@/composables/useClickOutside'

defineProps<{
  /** Открыто ли выпадающее меню. */
  open: boolean
  /** Доступно ли действие «Очистить всё» (холст непустой). */
  canClear: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  action: [action: FileAction]
}>()

// Контейнер блока (кнопка + выпадающий список): клики внутри не закрывают меню
const rootRef = ref<HTMLElement | null>(null)

useClickOutside([rootRef], () => {
  emit('update:open', false)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      @click="emit('update:open', !open)"
      aria-haspopup="menu"
      :aria-expanded="open"
      :class="[
        'flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors border',
        open
          ? 'bg-[#F4F4F5] border-[#E4E4E7]'
          : 'bg-white hover:bg-[#F4F4F5] border-transparent',
      ]"
    >
      Файл
      <svg
        class="w-3 h-3 text-[#71717A]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <div
      v-if="open"
      role="menu"
      class="absolute left-0 top-full mt-1 w-48 rounded-lg border border-[#E4E4E7] bg-white py-1 shadow-xl z-50"
    >
      <button
        role="menuitem"
        @click="emit('action', 'import')"
        class="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F4F4F5]"
      >
        Импорт JSON…
      </button>
      <button
        role="menuitem"
        @click="emit('action', 'export-json')"
        class="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F4F4F5]"
      >
        Экспорт в JSON
      </button>
      <button
        role="menuitem"
        @click="emit('action', 'export-png')"
        class="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F4F4F5]"
      >
        Экспорт в PNG
      </button>
      <div class="my-1 border-t border-[#E4E4E7]" />
      <button
        role="menuitem"
        @click="emit('action', 'clear')"
        :disabled="!canClear"
        class="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40"
      >
        Очистить всё
      </button>
    </div>
  </div>
</template>
