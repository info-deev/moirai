import { createRouter, createWebHistory } from 'vue-router'
import FamilyEditor from '@/components/FamilyEditor.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: FamilyEditor,
    },
  ],
})

export default router
