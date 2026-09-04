# Moirai

Интерактивный редактор родословного графа (MVP). Приложение позволяет строить схему семьи: добавлять людей, перетаскивать карточки по холсту, создавать связи между ними (кровное родство, усыновление, брак) и удалять элементы. Поддерживается импорт/экспорт данных в JSON и экспорт схемы в PNG.

## Стек

- [Vue 3](https://vuejs.org/) + TypeScript (Composition API, `<script setup>`)
- [Vite](https://vite.dev/)
- [Konva](https://konvajs.org/) / [vue-konva](https://vue-konva.com/) — холст и граф
- [Pinia](https://pinia.vuejs.org/) — состояние
- [Vue Router](https://router.vuejs.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)

## Скрипты

| Скрипт               | Назначение                                |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Запуск dev-сервера Vite                   |
| `npm run build`      | Type-check + production-сборка            |
| `npm run preview`    | Локальный просмотр production-сборки      |
| `npm run type-check` | Проверка типов (`vue-tsc`)                |
| `npm run lint`       | oxlint + ESLint (с автофиксом)           |
| `npm run format`     | Форматирование Prettier                   |

## Структура проекта

```
src/
├── App.vue               # Корневой компонент, <router-view />
├── main.ts               # Точка входа (Pinia, Router, vue-konva)
├── router/index.ts       # Маршруты: «/» → FamilyEditor
├── components/
│   ├── FamilyEditor.vue    # Основной редактор графа (Konva-сцена)
│   └── PersonEditModal.vue # Модальное окно редактирования человека
├── stores/familyStore.ts # Pinia-store: люди и связи графа
├── types/types.ts        # Единые типы домена (Person, Relationship, Gender, ...)
└── assets/               # Стили и логотип
```

## Запуск

Требуется Node.js ≥ 24.

```sh
npm install
npm run dev
```

Приложение откроется по адресу, указанному в выводе Vite (по умолчанию `http://localhost:5173`).