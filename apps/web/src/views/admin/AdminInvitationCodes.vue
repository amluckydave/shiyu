<script setup lang="ts">
import { ref, onMounted } from "vue"
import type { InvitationCode, AdminInvitationCodeListResponse } from "@shiyu/shared"
import api, { API_ROUTES } from "../../services/api.js"

const codes = ref<InvitationCode[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)

// Generate form
const generateCount = ref(1)
const generateMaxUses = ref(1)
const generating = ref(false)

// Copy feedback
const copiedId = ref<string | null>(null)

async function loadCodes() {
  loading.value = true
  try {
    const res = await api.get<AdminInvitationCodeListResponse>(API_ROUTES.adminInvitationCodes, {
      params: { page: page.value, pageSize }
    })
    codes.value = res.data.codes
    total.value = res.data.total
  } catch (err) {
    console.error("Failed to load invitation codes:", err)
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    await api.post(API_ROUTES.adminInvitationCodes, {
      count: generateCount.value,
      maxUses: generateMaxUses.value
    })
    page.value = 1
    await loadCodes()
  } catch (err) {
    console.error("Failed to generate codes:", err)
  } finally {
    generating.value = false
  }
}

async function handleDelete(id: string) {
  if (!confirm("确定要删除这个邀请码吗？")) return
  try {
    await api.delete(`${API_ROUTES.adminInvitationCodes}/${id}`)
    await loadCodes()
  } catch (err) {
    console.error("Failed to delete code:", err)
  }
}

async function copyCode(code: string, id: string) {
  try {
    await navigator.clipboard.writeText(code)
    copiedId.value = id
    setTimeout(() => { copiedId.value = null }, 2000)
  } catch {
    // Fallback
    const el = document.createElement("textarea")
    el.value = code
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
    copiedId.value = id
    setTimeout(() => { copiedId.value = null }, 2000)
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  })
}

const totalPages = ref(0)
function updateTotalPages() {
  totalPages.value = Math.ceil(total.value / pageSize)
}

async function goPage(p: number) {
  page.value = p
  await loadCodes()
  updateTotalPages()
}

onMounted(async () => {
  await loadCodes()
  updateTotalPages()
})
</script>

<template>
  <div class="inv-codes-page">
    <h1 class="page-title">邀请码管理</h1>

    <!-- Generate Section -->
    <div class="generate-card">
      <h2 class="section-title">生成邀请码</h2>
      <form class="generate-form" @submit.prevent="handleGenerate">
        <div class="form-field">
          <label for="gen-count">数量</label>
          <input
            id="gen-count"
            v-model.number="generateCount"
            type="number"
            min="1"
            max="50"
            class="field-input"
          />
        </div>
        <div class="form-field">
          <label for="gen-uses">可用次数</label>
          <input
            id="gen-uses"
            v-model.number="generateMaxUses"
            type="number"
            min="1"
            max="9999"
            class="field-input"
          />
        </div>
        <button type="submit" class="gen-btn" :disabled="generating">
          <svg v-if="!generating" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span v-if="generating" class="spinner"></span>
          <span>{{ generating ? "生成中..." : "生成" }}</span>
        </button>
      </form>
    </div>

    <!-- Codes List -->
    <div class="codes-section">
      <div class="section-header">
        <h2 class="section-title">邀请码列表</h2>
        <span class="total-badge">共 {{ total }} 个</span>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="codes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
        </svg>
        <p>还没有邀请码，点击上方生成</p>
      </div>

      <div v-else class="codes-table-wrap">
        <table class="codes-table">
          <thead>
            <tr>
              <th>邀请码</th>
              <th>使用情况</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in codes" :key="c.id" :class="{ 'is-exhausted': c.usedCount >= c.maxUses }">
              <td>
                <code class="code-text">{{ c.code }}</code>
              </td>
              <td>
                <div class="usage-cell">
                  <div class="usage-bar">
                    <div
                      class="usage-fill"
                      :style="{ width: Math.min(100, (c.usedCount / c.maxUses) * 100) + '%' }"
                      :class="{ 'usage-full': c.usedCount >= c.maxUses }"
                    ></div>
                  </div>
                  <span class="usage-text">{{ c.usedCount }} / {{ c.maxUses }}</span>
                </div>
              </td>
              <td class="date-cell">{{ formatDate(c.createdAt) }}</td>
              <td>
                <div class="action-btns">
                  <button class="action-btn copy-btn" @click="copyCode(c.code, c.id)" :title="copiedId === c.id ? '已复制' : '复制'">
                    <svg v-if="copiedId !== c.id" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button class="action-btn delete-btn" @click="handleDelete(c.id)" title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page <= 1" @click="goPage(page - 1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="goPage(page + 1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-codes-page { max-width: 960px; }

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 28px;
}

/* ── Generate Card ── */
.generate-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 28px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 16px;
}

.generate-form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-input {
  width: 100px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
}

.gen-btn {
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #0ea5e9, #14b8a6);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
}

.gen-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
}

.gen-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.gen-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── Codes Section ── */
.codes-section {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header .section-title { margin: 0; }

.total-badge {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  padding: 4px 10px;
  background: rgba(148, 163, 184, 0.08);
  border-radius: 6px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 14px;
  padding: 40px 0;
  justify-content: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
  color: #475569;
}

.empty-state svg {
  width: 40px;
  height: 40px;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* ── Table ── */
.codes-table-wrap {
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.codes-table {
  width: 100%;
  border-collapse: collapse;
}

.codes-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(15, 23, 42, 0.3);
}

.codes-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
}

.codes-table tr:last-child td { border-bottom: none; }

.codes-table tr.is-exhausted { opacity: 0.45; }

.code-text {
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #38bdf8;
  background: rgba(14, 165, 233, 0.08);
  padding: 4px 10px;
  border-radius: 6px;
}

.is-exhausted .code-text {
  color: #64748b;
  background: rgba(148, 163, 184, 0.08);
}

/* ── Usage Bar ── */
.usage-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.usage-bar {
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.15);
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #0ea5e9, #14b8a6);
  transition: width 0.3s;
}

.usage-fill.usage-full {
  background: #ef4444;
}

.usage-text {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
}

.date-cell {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}

/* ── Actions ── */
.action-btns {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.action-btn svg {
  width: 15px;
  height: 15px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.copy-btn:hover {
  background: rgba(14, 165, 233, 0.12);
  color: #38bdf8;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
}

/* ── Pagination ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.05);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.page-info {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}
</style>
