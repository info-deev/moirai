<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { Gender, type Person } from '@/types/types'

interface Props {
  isOpen: boolean
  person: Person | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', updatedPerson: Person): void
}>()

// Локальное реактивное состояние формы (клонируем данные, чтобы не менять оригинал до сохранения)
const form = reactive<Person>({
  id: '',
  x: 0,
  y: 0,
  firstName: '',
  lastName: '',
  gender: Gender.UNKNOWN,
  birthDate: '',
  metadata: {},
})

// Синхронизация пропсов с локальной формой при открытии
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && props.person) {
      Object.assign(form, JSON.parse(JSON.stringify(props.person))) // Глубокое копирование
    }
  },
)

const handleSave = () => {
  emit('save', { ...form })
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>

        <!-- Modal Content -->
        <div
          class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all"
        >
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-4">Редактировать профиль</h3>

            <form @submit.prevent="handleSave" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Имя</label>
                  <input
                    v-model="form.firstName"
                    type="text"
                    class="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Фамилия</label>
                  <input
                    v-model="form.lastName"
                    type="text"
                    class="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Пол</label>
                <select v-model="form.gender" class="mt-1 block w-full border rounded-md px-3 py-2">
                  <option :value="Gender.MALE">Мужской</option>
                  <option :value="Gender.FEMALE">Женский</option>
                  <option :value="Gender.UNKNOWN">Не указано</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Дата рождения</label>
                <input
                  v-model="form.birthDate"
                  type="date"
                  class="mt-1 block w-full border rounded-md px-3 py-2"
                />
              </div>

              <!-- <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Координата X</label>
                  <input
                    v-model.number="form.x"
                    type="number"
                    class="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Координата Y</label>
                  <input
                    v-model.number="form.y"
                    type="number"
                    class="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div> -->

              <!-- Пример работы с metadata -->
              <!-- <div v-if="form.metadata">
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Дополнительные данные (JSON)</label
                >
                <textarea
                  :value="JSON.stringify(form.metadata, null, 2)"
                  @input="
                    (e) => {
                      try {
                        form.metadata = JSON.parse((e.target as HTMLTextAreaElement).value)
                      } catch {}
                    }
                  "
                  rows="3"
                  class="mt-1 block w-full border rounded-md px-3 py-2 font-mono text-xs bg-gray-50"
                ></textarea>
              </div> -->

              <div class="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  @click="emit('close')"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
