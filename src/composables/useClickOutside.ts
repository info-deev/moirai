import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'

/**
 * Композабл глобального закрытия по клику вне заданных элементов.
 *
 * Слушает событие `mousedown` на `document` (намеренно не `click`, чтобы
 * срабатывать до обработчиков самих пунктов меню и избежать гонки состояний)
 * и вызывает `onOutsideClick`, если цель события находится вне всех элементов
 * из переданных refs. Слушатели привязываются в `onMounted` и отвязываются в
 * `onBeforeUnmount`, поэтому вызывать функцию нужно внутри setup-скрипта.
 *
 * @template TElement - тип DOM-элемента, на который указывают refs
 * @param {Ref<TElement | null>[]} refs - элементы, клики внутри которых не считаются «внешними»
 * @param {() => void} onOutsideClick - вызывается при клике вне всех элементов
 */
export function useClickOutside<TElement extends HTMLElement>(
  refs: Array<Ref<TElement | null>>,
  onOutsideClick: () => void,
): void {
  const isInsideRefs = (target: EventTarget | null): boolean => {
    if (!(target instanceof Node)) return false
    return refs.some((item) => item.value?.contains(target) ?? false)
  }

  const handleMouseDown = (event: MouseEvent): void => {
    if (!isInsideRefs(event.target)) onOutsideClick()
  }

  onMounted(() => {
    document.addEventListener('mousedown', handleMouseDown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleMouseDown)
  })
}
