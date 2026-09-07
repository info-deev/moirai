<script setup lang="ts">
import { RouterLink } from 'vue-router'
import logoUrl from '@/assets/Deev-Family-Symbol-free.svg'

// Краткие подсказки, отображаемые в виде списка «действие — результат»
const shortcuts = [
  { action: 'Колесо мыши', result: 'Масштабирование сцены (от 25% до 400%)' },
  { action: 'ЛКМ по фону + перетаскивание', result: 'Перемещение камеры по холсту' },
  { action: 'ПКМ по карточке', result: 'Контекстное меню (изменить / удалить персону)' },
  { action: 'ПКМ по связи', result: 'Сменить тип или удалить связь' },
  { action: 'ПКМ по пустому холсту', result: 'Добавить персону в точке клика' },
  {
    action: 'Поле «Поиск…» в шапке',
    result: 'Подсветить совпавшие карточки и приглушить остальные',
  },
  { action: 'Esc', result: 'Отмена создания связи, закрытие меню и диалогов, очистка поиска' },
  { action: 'Ctrl+Z (Cmd+Z на macOS)', result: 'Undo — отменить последнее изменение графа' },
  {
    action: 'Ctrl+Shift+Z (Cmd+Shift+Z на macOS)',
    result: 'Redo — повторить отменённое изменение',
  },
]
</script>

<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    <!-- Шапка -->
    <header
      class="h-10 bg-white border-b border-[#E4E4E7] flex items-center px-3 gap-1 text-sm z-10"
    >
      <img :src="logoUrl" alt="" class="h-10 w-10 shrink-0 select-none p-1" />
      <div class="font-bold tracking-[.16em] text-[#18181B] mr-2 text-[13px] select-none">
        MOIRAI
      </div>
      <span class="text-[#71717A] text-xs uppercase tracking-widest">Справка</span>
      <RouterLink
        to="/"
        class="ml-auto rounded bg-white px-3 py-1 text-[#18181B] transition-colors hover:bg-[#F4F4F5] active:scale-95"
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
            Персону можно добавить и точечно: ПКМ по пустому месту холста → «Добавить персону здесь»
            — карточка появится в точке клика.
          </li>
          <li>
            Карточку можно перетаскивать мышью; её имя, фамилия, пол и дата рождения редактируются
            из контекстного меню (ПКМ по карточке → «Изменить»).
          </li>
          <li>
            Удаление персоны — ПКМ по карточке → «Удалить персону». Вместе с персоной удаляются все
            её связи. Действие требует подтверждения, но его можно отменить кнопкой «Отменить» в
            шапке или клавишей Ctrl+Z.
          </li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Поиск по имени</h2>
        <p class="mb-2 text-sm leading-relaxed text-gray-700">
          Поле «Поиск…» в шапке редактора позволяет быстро найти персону среди множества карточек:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>Поиск без учёта регистра ведётся по имени и фамилии.</li>
          <li>
            Совпавшие карточки подсвечиваются индиго-обводкой, а все остальные приглушаются — так
            проще найти нужную персону на большом холсте.
          </li>
          <li>Нажатие Esc очищает запрос и возвращает обычный вид всех карточек.</li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Пины и создание связей</h2>
        <p class="mb-2 text-sm leading-relaxed text-gray-700">
          Пины — точки подключения на карточке персоны. Они видны только при наведении курсора на
          карточку или во время перетаскивания новой связи; в остальное время карточки остаются
          чистыми, без лишних точек.
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            <span class="font-medium">Входной пин</span> (левый край) принимает кровную связь;
            <span class="font-medium">нижний фиолетовый пин</span> — брак.
          </li>
          <li>
            <span class="font-medium">Выходной пин</span> (правый край, цвет заголовка) создаёт
            кровную связь; нижний фиолетовый — брак.
          </li>
          <li>
            Чтобы создать связь: наведите курсор на карточку, зажмите нужный выходной пин и
            отпустите его над целевой карточкой (над входным пином нужного типа).
          </li>
          <li>
            Во время перетаскивания линия рисуется пунктиром; связь можно отменить клавишей Esc.
            Клик по чужому пину без перетаскивания очищает входящие связи персоны для
            переподключения.
          </li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Типы связей</h2>
        <p class="mb-3 text-sm leading-relaxed text-gray-700">
          Доступны три типа: кровное родство, усыновление и брак. Кровная и усыновительская связи
          выглядят одинаково по цвету — различаются пунктиром. Легенда с образцами доступна в
          редакторе (кнопка «Легенда» в шапке).
        </p>
        <ul class="mb-3 space-y-2 text-sm leading-relaxed text-gray-700">
          <li class="flex items-center gap-2">
            <svg width="26" height="6" viewBox="0 0 26 6" class="shrink-0">
              <line x1="1" y1="3" x2="25" y2="3" stroke="#64748B" stroke-width="1.5" />
            </svg>
            <span
              ><span class="font-medium">Кровное родство</span> — сплошная серо-синяя линия.</span
            >
          </li>
          <li class="flex items-center gap-2">
            <svg width="26" height="6" viewBox="0 0 26 6" class="shrink-0">
              <line
                x1="1"
                y1="3"
                x2="25"
                y2="3"
                stroke="#64748B"
                stroke-width="1.5"
                stroke-dasharray="5 5"
              />
            </svg>
            <span><span class="font-medium">Усыновление</span> — пунктирная серо-синяя линия.</span>
          </li>
          <li class="flex items-center gap-2">
            <svg width="26" height="6" viewBox="0 0 26 6" class="shrink-0">
              <line x1="1" y1="3" x2="25" y2="3" stroke="#8B5CF6" stroke-width="1.5" />
            </svg>
            <span><span class="font-medium">Брак</span> — сплошная фиолетовая линия.</span>
          </li>
        </ul>
        <p class="text-sm leading-relaxed text-gray-700">
          Тип связи меняется из контекстного меню (ПКМ по линии): в подменю «Тип связи» выберите
          любой из трёх вариантов — «Кровная», «Усыновление» или «Брак»; текущий тип помечен
          галочкой. Связь удаляется тем же меню: «Удалить связь».
        </p>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Дети от нескольких браков</h2>
        <p class="mb-2 text-sm leading-relaxed text-gray-700">
          Если у персоны несколько супругов, раскладывайте карточки супругов вертикально — по одной
          строке на каждого. Тогда кровная линия к ребёнку однозначно показывает, в каком браке он
          родился.
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            По умолчанию, и если у мужчины несколько жён: линия к ребёнку идёт напрямую от карточки
            матери — карточки жён разделены по вертикали, поэтому сразу однозначно указано
            материнство.
          </li>
          <li>
            Если у женщины несколько мужей (зятей в дереве): линия к ребёнку идёт напрямую от
            карточки отца — древо прерывается на дочери и род продолжается через мужчин, поэтому
            линию ведем от зятя. Карточки мужей разделены по вертикали, что однозначно указывает на
            отцовство.
          </li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Навигация по холсту</h2>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>Зум — колесом мыши или кнопками «−» / «+» на панели внизу холста.</li>
          <li>Текущий масштаб показан на панели зума; клик по процентам сбрасывает вид до 100%.</li>
          <li>Камера перемещается зажатой ЛКМ по фону холста.</li>
        </ul>
      </section>

      <section class="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-lg font-bold text-gray-900">Импорт и экспорт</h2>
        <p class="mb-2 text-sm leading-relaxed text-gray-700">
          Все операции с файлами находятся в меню «Файл» в шапке редактора:
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            «Экспорт в JSON» сохраняет граф (персоны и связи) в файл для резервной копии или
            переноса.
          </li>
          <li>
            «Импорт JSON…» загружает ранее экспортированный файл; перед заменой текущих данных
            запросит подтверждение — после импорта предыдущий граф будет потерян.
          </li>
          <li>«Экспорт в PNG» скачивает снимок текущего вида сцены.</li>
          <li>
            «Очистить всё» удаляет все персоны и связи; доступно, только если на холсте есть данные,
            и требует подтверждения.
          </li>
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
        <h2 class="mb-3 text-lg font-bold text-gray-900">Отмена и повтор (Undo/Redo)</h2>
        <p class="mb-2 text-sm leading-relaxed text-gray-700">
          Любое изменение графа можно отменить и вернуть обратно — кнопками в шапке редактора (рядом
          с «Добавить») или горячими клавишами Ctrl+Z / Ctrl+Shift+Z (Cmd на macOS):
        </p>
        <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
          <li>
            Undo откатывает граф к предыдущему состоянию: персоны, связи и позиции карточек
            восстанавливаются вместе. Redo возвращает отменённое изменение.
          </li>
          <li>
            История хранится только в памяти браузера и не переживает перезагрузку страницы;
            поддерживается до 50 шагов — более ранние состояния по мере заполнения истории
            становятся недоступны.
          </li>
          <li>
            Перетаскивание карточки считается одним шагом: все изменения во время перетаскивания
            (позиция, перестройка связей) объединяются в один пункт отмены.
          </li>
          <li>
            Если после Undo открытая форма редактирования относится к удалённой персоне, она
            закрывается автоматически.
          </li>
        </ul>
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
