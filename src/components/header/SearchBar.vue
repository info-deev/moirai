<script setup lang="ts">
defineProps<{
  /** Текущий поисковый запрос. */
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/**
 * Нативный `input` не эмитит `update:modelValue` (это событие v-model Vue-компонентов),
 * поэтому подписываемся на нативное `input` и пробрасываем значение вверх.
 */
const onInput = (event: Event): void => {
  const target = event.target as HTMLInputElement | null
  emit('update:modelValue', target?.value ?? '')
}
</script>

<template>
  <!-- Поиск по имени (case-insensitive): подсвечивает совпавшие карточки и
       приглушает остальные; Esc сбрасывает запрос (см. handleKeydown в редакторе). -->
  <input
    :value="modelValue"
    @input="onInput"
    type="text"
    spellcheck="false"
    autocomplete="off"
    placeholder="Поиск…"
    aria-label="Поиск персоны по имени"
    class="h-7 w-44 rounded border border-[#E4E4E7] bg-white px-2.5 text-xs text-[#18181B] placeholder:text-[#A1A1AA] transition-colors focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
  />
</template>
