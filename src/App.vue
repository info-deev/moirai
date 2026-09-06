<template>
  <div>
    <router-view />
    <!-- Глобальный контейнер уведомлений (тосты) -->
    <ToastList />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ToastList from './components/ToastList.vue'
import { useFamilyStore } from './stores/familyStore'

const familyStore = useFamilyStore()

// Восстановление графа из localStorage при старте приложения (D10)
onMounted(() => {
  familyStore.loadFromStorage()
})
</script>

<style scoped></style>
