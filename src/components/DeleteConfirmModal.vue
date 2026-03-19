<script setup lang="ts">
defineProps<{
  visible: boolean
  message?: string
  type?: 'single' | 'batch'
  count?: number
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div v-if="visible" class="delete-overlay" @click.self="emit('cancel')">
    <div class="confirm-modal">
      <div class="confirm-header">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" class="warning-icon">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3>确认删除</h3>
      </div>
      <div class="confirm-body">
        <p v-if="message">{{ message }}</p>
        <p v-else-if="type === 'single'">确定要删除这篇文章吗？此操作无法撤销。</p>
        <p v-else-if="type === 'batch'">确定要删除选中的 {{ count }} 篇文章吗？此操作无法撤销。</p>
      </div>
      <div class="confirm-footer">
        <button class="confirm-btn cancel" @click="emit('cancel')">取消</button>
        <button class="confirm-btn delete" @click="emit('confirm')">确认删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.delete-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
  animation: overlay-blur-in 0.25s ease;
}

@keyframes overlay-blur-in {
  from {
    backdrop-filter: blur(0);
    -webkit-backdrop-filter: blur(0);
    background: rgba(15, 23, 42, 0);
  }
}

.confirm-modal {
  width: 100%;
  max-width: 420px;
  background: var(--c-bg-light);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform, opacity;
}
@keyframes card-pop {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1.5rem;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
}

.warning-icon {
  color: #dc2626;
  flex-shrink: 0;
}

.confirm-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #991b1b;
}

.confirm-body {
  padding: 1.5rem;
}

.confirm-body p {
  margin: 0;
  color: var(--c-text-lighter);
  line-height: 1.6;
}

.confirm-footer {
  display: flex;
  gap: 12px;
  padding: 1rem 1.5rem;
  background: var(--c-bg-lighter);
  border-top: 1px solid var(--c-border);
}

.confirm-btn {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn.cancel {
  background: var(--c-bg-light);
  color: var(--c-text-lighter);
  border: 1px solid var(--c-border);
}

.confirm-btn.cancel:hover {
  background: var(--c-border-light, #f1f5f9);
  border-color: var(--c-text-lighter);
}

.confirm-btn.delete {
  background: #dc2626;
  color: white;
}

.confirm-btn.delete:hover {
  background: #b91c1c;
}
</style>
