<script setup lang="ts">
import { ref, onMounted } from "vue"
import type { AdminStatsResponse, User } from "@shiyu/shared"
import api, { API_ROUTES } from "../../services/api.js"

const stats = ref<AdminStatsResponse | null>(null)
const recentUsers = ref<User[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [statsRes, usersRes] = await Promise.all([
      api.get<AdminStatsResponse>(API_ROUTES.adminStats),
      api.get<{ users: User[] }>(API_ROUTES.adminUsers, { params: { page: 1, pageSize: 5 } })
    ])
    stats.value = statsRes.data
    recentUsers.value = usersRes.data.users
  } catch (err) {
    console.error("Failed to load admin data:", err)
  } finally {
    loading.value = false
  }
})

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
}
</script>

<template>
  <div class="dashboard">
    <h1 class="page-title">控制面板</h1>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon stat-icon--total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.totalUsers ?? 0 }}</span>
            <span class="stat-label">注册用户</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon--active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.activeUsers ?? 0 }}</span>
            <span class="stat-label">活跃用户</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon--new">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats?.newUsersToday ?? 0 }}</span>
            <span class="stat-label">今日新增</span>
          </div>
        </div>
      </div>

      <div class="recent-section">
        <h2 class="section-title">最近注册</h2>
        <div class="user-table-wrap">
          <table class="user-table" v-if="recentUsers.length">
            <thead>
              <tr><th>昵称</th><th>邮箱</th><th>角色</th><th>注册时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in recentUsers" :key="u.id">
                <td>
                  <div class="user-cell">
                    <div class="mini-avatar">{{ u.nickname.charAt(0) }}</div>
                    <span>{{ u.nickname }}</span>
                  </div>
                </td>
                <td>{{ u.email }}</td>
                <td><span class="role-badge" :class="'role--' + u.role">{{ u.role === 'admin' ? '管理员' : '用户' }}</span></td>
                <td>{{ formatDate(u.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="empty-hint">暂无用户</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard { max-width: 960px; }

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 28px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 14px;
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

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color 0.2s;
}

.stat-card:hover {
  border-color: rgba(148, 163, 184, 0.2);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stat-icon--total { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
.stat-icon--active { background: rgba(20, 184, 166, 0.15); color: #5eead4; }
.stat-icon--new { background: rgba(14, 165, 233, 0.15); color: #38bdf8; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 28px; font-weight: 800; color: #f1f5f9; line-height: 1.1; }
.stat-label { font-size: 13px; color: #64748b; margin-top: 2px; }

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 16px;
}

.user-table-wrap {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 14px;
  overflow: hidden;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.user-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
}

.user-table tr:last-child td { border-bottom: none; }

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

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

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.role--admin {
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
}

.role--user {
  background: rgba(14, 165, 233, 0.12);
  color: #7dd3fc;
}

.empty-hint {
  padding: 32px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
  margin: 0;
}
</style>
