<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import type { User, AdminUserListResponse } from "@shiyu/shared"
import api, { API_ROUTES } from "../../services/api.js"

const users = ref<User[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(true)
const actionLoading = ref<string | null>(null)

async function fetchUsers() {
  loading.value = true
  try {
    const res = await api.get<AdminUserListResponse>(API_ROUTES.adminUsers, {
      params: { page: page.value, pageSize }
    })
    users.value = res.data.users
    total.value = res.data.total
  } catch (err) {
    console.error("Failed to load users:", err)
  } finally {
    loading.value = false
  }
}

async function toggleRole(user: User) {
  actionLoading.value = user.id
  try {
    const newRole = user.role === "admin" ? "user" : "admin"
    await api.patch(`${API_ROUTES.adminUsers}/${user.id}`, { role: newRole })
    await fetchUsers()
  } catch (err: any) {
    alert(err.response?.data?.error || "操作失败")
  } finally {
    actionLoading.value = null
  }
}

async function deleteUser(user: User) {
  if (!confirm(`确定要删除用户 "${user.nickname}" 吗？此操作不可撤销。`)) return
  actionLoading.value = user.id
  try {
    await api.delete(`${API_ROUTES.adminUsers}/${user.id}`)
    await fetchUsers()
  } catch (err: any) {
    alert(err.response?.data?.error || "删除失败")
  } finally {
    actionLoading.value = null
  }
}

const totalPages = ref(1)
watch(total, (t) => { totalPages.value = Math.max(1, Math.ceil(t / pageSize)) })
watch(page, fetchUsers)

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

onMounted(fetchUsers)
</script>

<template>
  <div class="users-page">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <span class="user-count">共 {{ total }} 位用户</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>
                <div class="user-cell">
                  <div class="mini-avatar">{{ u.nickname.charAt(0) }}</div>
                  <span>{{ u.nickname }}</span>
                </div>
              </td>
              <td class="email-col">{{ u.email }}</td>
              <td>
                <span class="role-badge" :class="'role--' + u.role">
                  {{ u.role === 'admin' ? '管理员' : '用户' }}
                </span>
              </td>
              <td class="date-col">{{ formatDate(u.createdAt) }}</td>
              <td>
                <div class="actions">
                  <button
                    class="action-btn action-btn--role"
                    :disabled="actionLoading === u.id"
                    @click="toggleRole(u)"
                    :title="u.role === 'admin' ? '降为普通用户' : '升为管理员'"
                  >
                    {{ u.role === 'admin' ? '降权' : '升权' }}
                  </button>
                  <button
                    class="action-btn action-btn--delete"
                    :disabled="actionLoading === u.id"
                    @click="deleteUser(u)"
                    title="删除用户"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page <= 1" @click="page--">上一页</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="page++">下一页</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.users-page { max-width: 960px; }

.page-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0;
}

.user-count {
  font-size: 14px;
  color: #64748b;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  padding: 40px 0;
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

.table-wrap {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 14px;
  overflow: hidden;
}

.data-table { width: 100%; border-collapse: collapse; }

.data-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.data-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
}

.data-table tr:last-child td { border-bottom: none; }

.user-cell { display: flex; align-items: center; gap: 10px; }

.mini-avatar {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.email-col { color: #94a3b8; }
.date-col { color: #64748b; font-size: 13px; }

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.role--admin { background: rgba(239, 68, 68, 0.12); color: #fca5a5; }
.role--user { background: rgba(14, 165, 233, 0.12); color: #7dd3fc; }

.actions { display: flex; gap: 8px; }

.action-btn {
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.action-btn--role {
  background: rgba(99, 102, 241, 0.12);
  color: #a5b4fc;
  border-color: rgba(99, 102, 241, 0.2);
}
.action-btn--role:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
}

.action-btn--delete {
  background: rgba(239, 68, 68, 0.08);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.15);
}
.action-btn--delete:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.18);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.page-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { background: rgba(148, 163, 184, 0.1); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-info { font-size: 13px; color: #64748b; }
</style>
