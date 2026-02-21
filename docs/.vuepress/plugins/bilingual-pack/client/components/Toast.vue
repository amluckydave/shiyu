<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  message?: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}>(), {
  message: '',
  type: 'success',
  duration: 2000,
})

const visible = ref(false)
const currentMessage = ref('')
const currentType = ref<'success' | 'error' | 'info'>('success')
let timer: ReturnType<typeof setTimeout> | null = null

function show(message: string, type: 'success' | 'error' | 'info' = 'success') {
  currentMessage.value = message
  currentType.value = type
  visible.value = true
  
  if (timer) {
    clearTimeout(timer)
  }
  
  timer = setTimeout(() => {
    visible.value = false
  }, props.duration)
}

function hide() {
  visible.value = false
}

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer)
  }
})

defineExpose({ show, hide })
</script>

<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="toast"
      :class="[`toast-${currentType}`]"
    >
      <span class="toast-icon">
        {{ currentType === 'success' ? '✓' : currentType === 'error' ? '✕' : 'ℹ' }}
      </span>
      <span class="toast-message">{{ currentMessage }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  z-index: 3000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.toast-success {
  background: linear-gradient(135deg, #4caf50, #45a049);
  color: #fff;
}

.toast-error {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: #fff;
}

.toast-info {
  background: linear-gradient(135deg, #2196f3, #1976d2);
  color: #fff;
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
}

.toast-message {
  font-weight: 500;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
