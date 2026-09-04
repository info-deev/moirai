<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
}

const props = defineProps<Props>()

// Подпись кнопки подтверждения (по умолчанию «Удалить»)
const confirmLabel = computed(() => props.confirmLabel ?? 'Удалить')

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>

        <!-- Modal Content -->
        <div class="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <h3 class="mb-2 text-lg font-bold text-gray-900">{{ title }}</h3>
          <p class="mb-6 text-sm text-gray-600">{{ message }}</p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="emit('close')"
              class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Отмена
            </button>
            <button
              type="button"
              @click="emit('confirm')"
              class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
