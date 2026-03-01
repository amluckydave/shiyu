<script setup lang="ts">
import { ref } from "vue"
import { useDataExport } from "../../legacy/bilingual-pack-client/composables/useDataExport"

const { exportAllData, importAllData } = useDataExport()

const showModal = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const importStatus = ref<{ success: boolean; message: string } | null>(null)
const showImportOptions = ref(false)
const importMode = ref<"replace" | "merge">("replace")
const pendingImportFile = ref<File | null>(null)

function toggleModal() {
  showModal.value = !showModal.value
  if (!showModal.value) resetState()
}

function closeModal() {
  showModal.value = false
  resetState()
}

function resetState() {
  importStatus.value = null
  showImportOptions.value = false
  pendingImportFile.value = null
  importMode.value = "replace"
}

function handleExportData() {
  exportAllData()
  importStatus.value = { success: true, message: "数据已导出" }
  setTimeout(() => {
    importStatus.value = null
  }, 2500)
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
  target.value = ""
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
    }, 1200)
  }
}

function cancelImport() {
  showImportOptions.value = false
  pendingImportFile.value = null
  importStatus.value = null
}

const props = defineProps<{
  variant?: 'toolbar' | 'dropdown'
}>()
</script>

<template>
  <div class="toolbar-data-manager">
    <button v-if="props.variant === 'dropdown'" class="dropdown-item" title="数据管理" @click="toggleModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3"></ellipse>
        <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path>
        <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"></path>
      </svg>
      <span>数据管理</span>
    </button>
    <button v-else class="tool-btn" title="数据管理" @click="toggleModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3"></ellipse>
        <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path>
        <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"></path>
      </svg>
      <span>数据管理</span>
    </button>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showModal" class="overlay" @click.self="closeModal">
          <section class="modal-card">
            <header class="modal-head">
              <h3>数据管理</h3>
              <button class="close-btn" @click="closeModal" aria-label="关闭">&times;</button>
            </header>

            <main class="modal-body">
              <p class="desc">导出或导入生词、句库和 API 设置。</p>

              <div class="actions">
                <button class="action-btn action-btn--primary" @click="handleExportData">导出</button>
                <button class="action-btn" @click="triggerImport">导入</button>
                <input
                  ref="importFileInput"
                  type="file"
                  accept=".json"
                  style="display: none"
                  @change="handleImportFile"
                />
              </div>

              <div v-if="importStatus" class="status" :class="{ 'status--error': !importStatus.success }">
                {{ importStatus.message }}
              </div>

              <div v-if="showImportOptions" class="import-options">
                <label class="mode-item">
                  <input v-model="importMode" type="radio" value="replace" />
                  <span>覆盖模式</span>
                </label>
                <label class="mode-item">
                  <input v-model="importMode" type="radio" value="merge" />
                  <span>合并模式</span>
                </label>
                <div class="import-actions">
                  <button class="action-btn action-btn--primary" @click="confirmImport">确认导入</button>
                  <button class="action-btn" @click="cancelImport">取消</button>
                </div>
              </div>
            </main>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tool-btn {
  height: 36px;
  border: 1px solid rgba(203, 213, 225, 0.6);
  border-radius: 999px;
  padding: 0 14px 0 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
  backdrop-filter: blur(8px);
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-btn:hover {
  border-color: rgba(147, 197, 253, 0.6);
  background: linear-gradient(180deg, rgba(240, 249, 255, 0.95), rgba(224, 242, 254, 0.5));
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(14, 165, 233, 0.1);
}

.tool-btn:hover svg {
  color: #0ea5e9;
  transform: scale(1.08);
}

.tool-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.tool-btn span {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.1px;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
}

.modal-card {
  width: min(92vw, 430px);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 24px 52px rgba(2, 6, 23, 0.24);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-head h3 {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
}

.desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #64748b;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-btn {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn--primary {
  border-color: #38bdf8;
  background: #e0f2fe;
  color: #0c4a6e;
}

.status {
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 9px;
  background: #ecfdf5;
  color: #065f46;
  font-size: 12px;
  font-weight: 600;
}

.status--error {
  background: #fef2f2;
  color: #991b1b;
}

.import-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.mode-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #334155;
  margin-bottom: 8px;
}

.import-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 6px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 980px) {
  .tool-btn span {
    display: none;
  }

  .tool-btn {
    width: 34px;
    padding: 0;
    justify-content: center;
    border-radius: 10px;
  }
}
</style>
