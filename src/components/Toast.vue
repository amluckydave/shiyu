<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const timer = ref<ReturnType<typeof setTimeout> | null>(null)

function show(msg: string, duration = 2000) {
  message.value = msg
  visible.value = true
  if (timer.value) clearTimeout(timer.value)
  timer.value = setTimeout(() => {
    visible.value = false
  }, duration)
}

defineExpose({ show })
</script>

<template>
  <transition name="toast-slide">
    <div v-if="visible" class="toast">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      {{ message }}
    </div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 3000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.toast svg { color: #4ade80; flex-shrink: 0; }

.toast-slide-enter-active { animation: toastIn 0.3s ease-out; }
.toast-slide-leave-active { animation: toastOut 0.2s ease-in; }
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(20px); }
}
</style>
