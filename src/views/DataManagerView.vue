<script setup lang="ts">
import { ref } from 'vue'
import { save, open } from '@tauri-apps/plugin-dialog'
import { exportAllData, importData, type ExportData } from '../services/api'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

const exporting = ref(false)
const importing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

async function handleExport() {
  exporting.value = true
  message.value = ''
  try {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)

    const filePath = await save({
      defaultPath: `shiyu-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (filePath) {
      await writeTextFile(filePath, json)
      message.value = `✅ 数据已导出到 ${filePath}`
      messageType.value = 'success'
    }
  } catch (e: any) {
    message.value = `导出失败: ${e}`
    messageType.value = 'error'
  } finally {
    exporting.value = false
  }
}

async function handleImport(mode: string) {
  importing.value = true
  message.value = ''
  try {
    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    })

    if (filePath) {
      const content = await readTextFile(filePath as string)
      const data: ExportData = JSON.parse(content)
      const result = await importData(data, mode)
      message.value = `✅ ${result}`
      messageType.value = 'success'
    }
  } catch (e: any) {
    message.value = `导入失败: ${e}`
    messageType.value = 'error'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="page-container fade-in">
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
        数据管理
      </h1>
      <p class="page-subtitle">导入导出你的学习数据</p>
    </div>

    <h3 class="group-title">导出</h3>
    <div class="settings-group">
      <div class="group-body">
        <p class="group-desc">将你的生词、句子和设置导出为 JSON 文件进行备份</p>
        <button class="btn btn-primary" @click="handleExport" :disabled="exporting">
          {{ exporting ? '导出中...' : '导出全部数据' }}
        </button>
      </div>
    </div>

    <h3 class="group-title">导入</h3>
    <div class="settings-group">
      <div class="group-body">
        <p class="group-desc">从 JSON 备份文件恢复数据</p>
        <div class="import-actions">
          <button class="btn btn-outline" @click="handleImport('merge')" :disabled="importing">
            合并导入（保留现有数据）
          </button>
          <button class="btn btn-danger" @click="handleImport('replace')" :disabled="importing">
            替换导入（覆盖现有数据）
          </button>
        </div>
      </div>
    </div>

    <Transition name="slide">
      <div v-if="message" class="msg" :class="messageType">{{ message }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-top: 1rem;
}
.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 0.95rem;
  color: var(--c-text-lighter);
  margin: 0;
}

.group-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 0 16px;
  margin: 24px 0 6px 0;
}
.group-title:first-of-type {
  margin-top: 0;
}

.settings-group {
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  overflow: hidden;
}

.group-body {
  padding: 16px;
}

.group-desc {
  font-size: var(--fs-base);
  color: var(--c-text-lighter);
  margin-bottom: 14px;
}

.import-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.msg {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: var(--fs-base);
  font-weight: 600;
}
.msg.success { background: rgba(52,199,89,0.08); color: #248A3D; border: 1px solid rgba(52,199,89,0.2); }
.msg.error { background: rgba(255,59,48,0.06); color: #D70015; border: 1px solid rgba(255,59,48,0.15); }

.slide-enter-active { animation: slide-in 0.3s ease; }
.slide-leave-active { animation: slide-in 0.2s ease reverse; }
@keyframes slide-in { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
</style>
