<script setup lang="ts">
defineProps<{
  /** Текущий масштаб сцены в процентах (для подписи-счётчика). */
  zoomPercent: number
}>()

const emit = defineEmits<{
  'zoom-in': []
  'zoom-out': []
  reset: []
}>()
</script>

<template>
  <!-- T8.4: Панель зума (низ-центр) -->
  <div
    class="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#E4E4E7] bg-white/95 px-2 py-1 text-sm text-[#18181B] shadow-md backdrop-blur"
  >
    <button
      @click="emit('zoom-out')"
      class="rounded px-2 py-0.5 transition-colors hover:bg-[#F4F4F5]"
      title="Отдалить (−)"
    >
      −
    </button>
    <button
      @click="emit('reset')"
      class="min-w-[64px] rounded px-1 text-center text-xs tabular-nums transition-colors hover:bg-[#F4F4F5]"
      title="Сбросить вид (100%)"
    >
      {{ zoomPercent }}%
    </button>
    <button
      @click="emit('zoom-in')"
      class="rounded px-2 py-0.5 transition-colors hover:bg-[#F4F4F5]"
      title="Приблизить (+)"
    >
      +
    </button>
  </div>
</template>
