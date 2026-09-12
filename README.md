# Moirai

Интерактивный редактор родословного графа. Приложение позволяет строить схему семьи: добавлять людей, перетаскивать карточки по холсту, создавать связи между ними (кровное родство, усыновление, брак) и удалять элементы. Поддерживается импорт/экспорт данных в JSON и экспорт схемы в PNG.

## Возможности

- Холст на Konva: перетаскивание карточек, зум 25–400% (колесо или панель «− / % / +»), панорамирование ЛКМ по фону;
- Три типа связей — кровное родство, усыновление, брак; тип меняется из контекстного меню (ПКМ по линии);
- **Расчёт родства**: обычный клик выбирает персону A, Shift+клик — персону B; приложение находит кратчайший путь в графе (BFS) и показывает термин родства с коленом («двоюродный прадедушка (5-е колено)»);
- Поиск по имени: совпавшие карточки подсвечиваются, остальные приглушаются; Esc очищает запрос;
- Undo/Redo — кнопки в шапке или Ctrl+Z / Ctrl+Shift+Z (Cmd на macOS), история до 50 шагов;
- Автосохранение графа в localStorage браузера после каждого изменения и восстановление при следующем запуске; данные никуда не отправляются;
- Импорт/экспорт JSON, экспорт сцены в PNG, «Очистить всё» — в меню «Файл»;
- Встроенная справка: страница «Справка» (маршрут `/help`).

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
| `npm run test`       | Запуск тестов Vitest                      |
| `npm run test:coverage` | Тесты с отчётом о покрытии             |
| `npm run lint`       | oxlint + ESLint (с автофиксом)           |
| `npm run format`     | Форматирование Prettier                   |
| `npm run format:check` | Проверка форматирования (используется в CI) |

## Структура проекта

```
src/
├── App.vue                  # Корневой компонент, <router-view />
├── main.ts                  # Точка входа (Pinia, Router, vue-konva)
├── router/index.ts          # Маршруты: «/» → FamilyEditor, «/help» → HelpPage
├── components/
│   ├── FamilyEditor.vue     # Основной редактор графа (Konva-сцена, меню, хоткеи)
│   ├── PersonEditModal.vue  # Модальное окно редактирования человека
│   ├── ConfirmDialog.vue    # Диалоги подтверждения (удаление, импорт, очистка)
│   ├── ToastList.vue        # Уведомления (тосты)
│   └── header/              # Шапка редактора
│       ├── FileMenu.vue     # Меню «Файл»: импорт/экспорт, «Очистить всё»
│       ├── SearchBar.vue    # Поиск по имени
│       └── ZoomControls.vue # Панель зума (− / % / +)
├── pages/HelpPage.vue       # Страница «Справка» (маршрут /help)
├── stores/familyStore.ts    # Pinia-store: люди, связи, Undo/Redo, автосохранение
├── composables/
│   ├── useClickOutside.ts   # Закрытие выпадающих меню по клику вне
│   └── useToast.ts          # Тосты успеха/ошибки
├── utils/
│   ├── serialization.ts     # Сериализация/валидация графа для JSON и localStorage
│   ├── kinshipPath.ts       # BFS-поиск кратчайшего пути родства в графе
│   ├── kinshipTerminology.ts # Термины родства на русском (колена, степени)
│   ├── graphGeometry.ts     # Геометрия связей: якоря, кривые Безье
│   ├── fitView.ts           # Центрирование сцены на контенте
│   ├── exportPng.ts         # Экспорт сцены в PNG
│   ├── download.ts          # Скачивание Blob-файлов
│   └── id.ts                # Генерация ID (crypto.randomUUID)
├── types/types.ts           # Единые типы домена (Person, Relationship, Gender, ...)
└── assets/                  # Стили и логотип
```

## Запуск

Требуется Node.js 24 (`^24.11.0` согласно `engines` в `package.json`).

```sh
npm install
npm run dev
```

Приложение откроется по адресу, указанному в выводе Vite (по умолчанию `http://localhost:5173`).

## CI и деплой

- **CI** (`.github/workflows/ci.yml`): на pull request к `main` — lint, type-check, тесты с покрытием, сборка.
- **Деплой** (`.github/workflows/deploy.yml`): по push в `main` — те же quality gates + публикация сборки на GitHub Pages через `peaceiris/actions-gh-pages`.

Для работы SPA на GitHub Pages без настройки сервера используется hash-роутинг (`createWebHashHistory`).