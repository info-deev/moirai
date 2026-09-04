<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const typeClasses: Record<ToastType, string> = {
  success: 'border-green-500 bg-green-50 text-green-800',
  error: 'border-red-500 bg-red-50 text-red-800',
  info: 'border-blue-400 bg-blue-50 text-blue-800',
}
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-4 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <button
        v-for="toast in toasts"
        :key="toast.id"
        type="button"
        @click="dismiss(toast.id)"
        class="pointer-events-auto rounded-lg border-l-4 px-4 py-3 text-left text-sm shadow-lg"
        :class="typeClasses[toast.type]"
      >
        {{ toast.message }}
      </button>
    </TransitionGroup>
  </div>
</template>
