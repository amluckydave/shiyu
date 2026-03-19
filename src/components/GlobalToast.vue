<script setup lang="ts">
import { useGlobalToast } from '../composables/useGlobalToast'

const { toasts, remove } = useGlobalToast()

function getIcon(type: string) {
  switch (type) {
    case 'success':
      return 'check'
    case 'error':
      return 'x'
    case 'warning':
      return 'alert-triangle'
    case 'info':
      return 'info'
    default:
      return 'check'
  }
}

function getIconColor(type: string) {
  switch (type) {
    case 'success':
      return '#4ade80'
    case 'error':
      return '#ef4444'
    case 'warning':
      return '#f59e0b'
    case 'info':
      return '#3b82f6'
    default:
      return '#4ade80'
  }
}
</script>

<template>
  <div class="toast-container">
    <transition-group name="toast-slide">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="{ color: getIconColor(toast.type) }"
        >
          <template v-if="getIcon(toast.type) === 'check'">
            <polyline points="20 6 9 17 4 12" />
          </template>
          <template v-else-if="getIcon(toast.type) === 'x'">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </template>
          <template v-else-if="getIcon(toast.type) === 'alert-triangle'">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </template>
          <template v-else-if="getIcon(toast.type) === 'info'">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </template>
        </svg>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="remove(toast.id)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 3000;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  min-width: 280px;
  max-width: 480px;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.toast-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

/* 类型特定样式 */
.toast-success {
  border-left: 3px solid #4ade80;
}

.toast-error {
  border-left: 3px solid #ef4444;
}

.toast-warning {
  border-left: 3px solid #f59e0b;
}

.toast-info {
  border-left: 3px solid #3b82f6;
}

/* 动画 */
.toast-slide-enter-active {
  animation: toastIn 0.3s ease-out;
}

.toast-slide-leave-active {
  animation: toastOut 0.2s ease-in;
}

.toast-slide-move {
  transition: transform 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
}
</style>
