<script setup lang="ts">
import { RouterLink } from 'vue-router'

// Краткие подсказки, отображаемые в виде списка «действие — результат»
const shortcuts = [
  { action: 'Колесо мыши', result: 'Масштабирование сцены (от 25% до 400%)' },
  { action: 'ЛКМ по фону + перетаскивание', result: 'Перемещение камеры по холсту' },
  { action: 'ПКМ по карточке или связи', result: 'Контекстное меню (изменить / удалить)' },
  { action: 'Esc', result: 'Отмена создания связи, закрытие меню и диалогов' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    <!-- Шапка -->
    <header
      class="h-10 bg-gray-800 border-b border-[#111] flex items-center px-4 gap-4 text-sm z-10"
    >
      <div class="font-bold text-orange-400 italic">MOIRAI</div>
      <span class="text-gray-400 text-xs uppercase tracking-widest">Справка</span>
      <RouterLink
        to="/"
        class="ml-auto rounded border border-gray-600 bg-gray-700 px-3 py-1 text-gray-200 transition-all hover:bg-gray-600 active:scale-95"
      >
        ← Вернуться к редактору
      </RouterLink>
    </header>

    <main class="mx-auto max-w-3xl px-6 py-8">
      <!-- Разделы справки -->
      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Обзор</h2>
        <p class="text-sm leading-relaxed text-gray-700">
          Moirai — интерактивный редактор родословного графа. Стройте схему семьи: добавляйте людей,
          перетаскивайте карточки по холсту и создавайте между ними связи (кровное родство,
          усыновление, брак). Данные автоматически сохраняются в браузере и могут быть выгружены в
          JSON или PNG.
        </p>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Работа с персонами</h2>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>Кнопка «Добавить» в шапке создаёт новую карточку в центре видимой области холста.</li>
          <li>
            Карточку можно перетаскивать мышью; её имя, фамилия, пол и дата рождения редактируются
            из контекстного меню (ПКМ по карточке → «Изменить»).
          </li>
          <li>
            Удаление персоны — ПКМ по карточке → «Удалить персону». Вместе с персоной удаляются все
            её связи. Действие необратимо, поэтому требуется подтверждение.
          </li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Связи между персонами</h2>
        <p class="mb-2 text-sm leading-relaxed text-gray-700">
          Пины появляются на карточке при наведении курсора. Чтобы создать связь, зажмите пин и
          отпустите его над другой карточкой:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            <span class="font-medium">Кровное родство</span> — правый пин (⊙) отправителя на левый
            пин получателя; линия рисуется горизонтально.
          </li>
          <li>
            <span class="font-medium">Брак</span> — нижний оранжевый пин (♂) отправителя на верхний
            пин получателя; линия рисуется вертикально.
          </li>
          <li>
            Во время перетаскивания связь можно отменить клавишей Esc. Связь удаляется из
            контекстного меню (ПКМ по линии → «Удалить связь»).
          </li>
        </ul>
      </section>
      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Навигация по холсту</h2>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>Зум — колесом мыши или кнопками «−» / «+» на панели внизу.</li>
          <li>
            Текущий масштаб виден в шапке и на панели; клик по процентам сбрасывает вид до 100%.
          </li>
          <li>Камера перемещается зажатой ЛКМ по фону холста.</li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Импорт и экспорт</h2>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            «Экспорт в JSON» сохраняет граф (персоны и связи) в файл для резервной копии или
            переноса.
          </li>
          <li>
            «Импорт из JSON» загружает ранее экспортированный файл; перед заменой текущих данных
            запросит подтверждение — после импорта предыдущий граф будет потерян.
          </li>
          <li>«Экспорт в PNG» скачивает снимок текущего вида сцены.</li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Хранение данных</h2>
        <p class="text-sm leading-relaxed text-gray-700">
          Граф автоматически сохраняется в localStorage браузера после каждого изменения и
          восстанавливается при следующем запуске. Данные хранятся только локально на вашем
          устройстве и никуда не отправляются. Для резервной копии используйте «Экспорт в JSON».
        </p>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Горячие клавиши</h2>
        <table class="w-full text-sm">
          <thead>
            <tr
              class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
            >
              <th class="py-2 pr-4 font-medium">Действие</th>
              <th class="py-2 font-medium">Результат</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in shortcuts"
              :key="row.action"
              class="border-b border-gray-100 last:border-0"
            >
              <td class="py-2 pr-4 text-gray-900">{{ row.action }}</td>
              <td class="py-2 text-gray-700">{{ row.result }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</template>
