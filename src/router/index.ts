import { createRouter, createWebHashHistory } from 'vue-router'
import FamilyEditor from '@/components/FamilyEditor.vue'
import HelpPage from '@/pages/HelpPage.vue'

const router = createRouter({
  // Hash-история: SPA работает на GitHub Pages без настройки сервера (нет 404 на deep links)
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: FamilyEditor,
    },
    {
      path: '/help',
      name: 'help',
      component: HelpPage,
    },
  ],
})

export default router
