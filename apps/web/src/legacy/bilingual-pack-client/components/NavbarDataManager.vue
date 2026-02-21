<script setup lang="ts">
import { ref } from 'vue'
import { useDataExport } from '../composables/useDataExport'

const { exportAllData, importAllData } = useDataExport()

const showModal = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const importStatus = ref<{ success: boolean; message: string } | null>(null)
const showImportOptions = ref(false)
const importMode = ref<'replace' | 'merge'>('replace')
const pendingImportFile = ref<File | null>(null)

function toggleModal() {
  showModal.value = !showModal.value
  if (!showModal.value) {
    resetState()
  }
}

function closeModal() {
  showModal.value = false
  resetState()
}

function resetState() {
  importStatus.value = null
  showImportOptions.value = false
  pendingImportFile.value = null
  importMode.value = 'replace'
}

function handleExportData() {
  exportAllData()
  importStatus.value = { success: true, message: '数据已导出' }
  setTimeout(() => { importStatus.value = null }, 3000)
}

function triggerImport() {
  importFileInput.value?.click()
}

function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    pendingImportFile.value = target.files[0]
    showImportOptions.value = true
    importStatus.value = null
  }
  target.value = ''
}

async function confirmImport() {
  if (!pendingImportFile.value) return
  
  const result = await importAllData(pendingImportFile.value, { mode: importMode.value })
  importStatus.value = result
  showImportOptions.value = false
  pendingImportFile.value = null
  
  if (result.success) {
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }
}

function cancelImport() {
  showImportOptions.value = false
  pendingImportFile.value = null
  importStatus.value = null
}
</script>

<template>
  <div class="navbar-data-manager">
    <button
      class="data-manager-toggle vp-color-mode-switch"
      title="数据管理"
      @click="toggleModal"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <!-- 数据库图标 -->
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
      </svg>
    </button>

    <!-- 弹出对话框 -->
    <Teleport to="body">
      <div v-if="showModal" class="data-manager-overlay" @click.self="closeModal">
        <div class="data-manager-modal">
          <div class="modal-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              数据管理
            </h3>
            <button class="close-btn" @click="closeModal">&times;</button>
          </div>
          
          <div class="modal-body">
            <p class="modal-desc">导出或导入所有数据（生词本、长难句库、API设置）</p>
            
            <div class="data-actions">
              <button class="btn export-btn" @click="handleExportData">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                导出所有数据
              </button>
              <button class="btn import-btn" @click="triggerImport">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                导入数据
              </button>
              <input
                type="file"
                ref="importFileInput"
                accept=".json"
                style="display: none"
                @change="handleImportFile"
              >
            </div>

            <div v-if="importStatus" class="import-status" :class="importStatus.success ? 'success' : 'error'">
              <svg v-if="importStatus.success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ importStatus.message }}
            </div>

            <div v-if="showImportOptions" class="import-options">
              <div class="import-mode-select">
                <label>
                  <input type="radio" v-model="importMode" value="replace">
                  <span>覆盖模式</span>
                  <small>替换所有现有数据</small>
                </label>
                <label>
                  <input type="radio" v-model="importMode" value="merge">
                  <span>合并模式</span>
                  <small>保留现有数据，添加新数据</small>
                </label>
              </div>
              <div class="import-confirm-actions">
                <button class="btn confirm-btn" @click="confirmImport">确认导入</button>
                <button class="btn cancel-btn" @click="cancelImport">取消</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.navbar-data-manager {
  position: fixed;
  top: 14px;
  right: 110px;
  z-index: 200;
}

.data-manager-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2, #666);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.data-manager-toggle:hover {
  background: var(--vp-c-bg-soft, rgba(0, 0, 0, 0.05));
  color: var(--vp-c-text-1, #333);
}

/* Modal overlay */
.data-manager-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.data-manager-modal {
  background: var(--vp-c-bg, #fff);
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: modal-in 0.2s ease-out;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider, #eee);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1, #333);
}

.modal-header h3 svg {
  width: 22px;
  height: 22px;
  color: #4a90e2;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  color: var(--vp-c-text-2, #666);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--vp-c-bg-soft, #f5f5f5);
  color: var(--vp-c-text-1, #333);
}

.modal-body {
  padding: 1.5rem;
}

.modal-desc {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2, #666);
}

.data-actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn svg {
  width: 18px;
  height: 18px;
}

.export-btn {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(74, 144, 226, 0.4);
}

.import-btn {
  background: var(--vp-c-bg-soft, #f5f5f5);
  color: var(--vp-c-text-1, #333);
  border: 1px solid var(--vp-c-divider, #ddd);
}

.import-btn:hover {
  background: var(--vp-c-bg-mute, #eee);
  border-color: var(--vp-c-text-3, #ccc);
}

.import-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
}

.import-status svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.import-status.success {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.import-status.error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.import-options {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--vp-c-divider, #eee);
}

.import-mode-select {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.import-mode-select label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--vp-c-bg-soft, #f9f9f9);
  border: 1px solid var(--vp-c-divider, #eee);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.import-mode-select label:hover {
  border-color: #4a90e2;
}

.import-mode-select input[type="radio"] {
  margin-top: 2px;
  accent-color: #4a90e2;
}

.import-mode-select span {
  font-weight: 600;
  color: var(--vp-c-text-1, #333);
  font-size: 0.9rem;
}

.import-mode-select small {
  display: block;
  color: var(--vp-c-text-2, #666);
  font-size: 0.8rem;
  margin-top: 2px;
}

.import-confirm-actions {
  display: flex;
  gap: 0.75rem;
}

.confirm-btn {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
}

.cancel-btn {
  background: var(--vp-c-bg-soft, #f5f5f5);
  color: var(--vp-c-text-1, #333);
  border: 1px solid var(--vp-c-divider, #ddd);
}

.cancel-btn:hover {
  background: var(--vp-c-bg-mute, #eee);
}

@media (max-width: 719px) {
  .navbar-data-manager {
    right: 100px;
    top: 10px;
  }
  
  .data-manager-modal {
    width: 95%;
    margin: 1rem;
  }
  
  .data-actions {
    flex-direction: column;
  }
}
</style>
