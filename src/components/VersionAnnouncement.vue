<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { APP_VERSION, APP_CODENAME } from '../constants/app'
import { getSetting, setSetting } from '../services/api'

const SETTING_KEY = 'last_seen_version'

const props = defineProps<{ modelValue?: boolean; manual?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const visible = ref(false)

/* 外部 v-model 控制（仅 manual 模式使用） */
watch(() => props.modelValue, (v) => {
  if (v !== undefined) visible.value = v
})

/* 首次启动自动弹窗（仅在非 manual 模式） */
onMounted(async () => {
  if (props.manual) return
  try {
    const lastSeen = await getSetting(SETTING_KEY)
    if (lastSeen !== APP_VERSION) {
      // 延迟 800ms，让界面先加载完再弹窗
      setTimeout(() => { visible.value = true }, 800)
    }
  } catch (e) {
    console.error('Failed to check version announcement:', e)
  }
})

async function dismiss() {
  try {
    await setSetting(SETTING_KEY, APP_VERSION)
  } catch (e) {
    console.error('Failed to save version announcement state:', e)
  }
  visible.value = false
  emit('update:modelValue', false)
}
</script>

<template>
  <Transition name="announcement">
    <div v-if="visible" class="announcement-overlay" @click.self="dismiss">
      <div class="announcement-card">

        <!-- ① 顶部：代号 + 一句话 -->
        <div class="announcement-header">
          <h2 class="announcement-title">v{{ APP_VERSION }} 代号【{{ APP_CODENAME }}】</h2>
          <p class="announcement-tagline">"世间所有的相遇，都是久别重逢。"</p>
        </div>

        <!-- ② 中间：图片 -->
        <div class="announcement-banner">
          <img src="/announcement-banner.webp" alt="拾语" />
        </div>

        <!-- ③ 更新内容 -->
        <div class="announcement-body">
          <p class="changelog-item">✦ 版本公告系统重构（SQLite 持久化 + 自动版本检测）</p>
          <p class="changelog-item">✦ 弹窗动画统一为弹性弹出（card-pop spring bounce）</p>
          <p class="changelog-item">✦ 毛玻璃遮罩性能优化（渐进式 blur 动画）</p>
          <p class="changelog-item">✦ 新增专有软件许可协议 + 设置页版权声明入口</p>
          <p class="changelog-item">✦ 全局暗色模式与按钮样式规范化</p>
        </div>

        <!-- ④ 分隔线 + 寄语 -->
        <div class="announcement-footer">
          <div class="announcement-divider"></div>
          <p class="announcement-quote">
            谢谢能够遇见你，我们在此就好好的，<br />
            就像一开始一样，永远这样~
          </p>
        </div>

        <!-- 按钮 -->
        <div class="announcement-actions">
          <button class="dismiss-btn" @click="dismiss">知道啦</button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── 遮罩 ── */
.announcement-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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

/* ── 卡片 ── */
.announcement-card {
  width: 100%;
  max-width: 420px;
  background: var(--c-bg-light);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform, opacity;
  font-family: var(--font-sans);
}

@keyframes card-pop {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ── ① 顶部：代号 + 一句话 ── */
.announcement-header {
  padding: 24px 28px 16px;
}

.announcement-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 6px;
  letter-spacing: -0.01em;
}

.announcement-tagline {
  font-size: 13.5px;
  color: #666;
  margin: 0;
  line-height: 1.6;
}

/* ── ② 中间图片 ── */
.announcement-banner {
  width: 100%;
  padding: 0 28px;
}

.announcement-banner img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}

/* ── ③ 更新内容 ── */
.announcement-body {
  padding: 16px 28px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.changelog-item {
  font-size: 13.5px;
  color: #444;
  line-height: 1.6;
  margin: 0;
}

.changelog-item.detail {
  font-size: 12.5px;
  color: #888;
  margin-top: 2px;
}

.changelog-item.detail code {
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  font-family: var(--font-mono);
}

/* ── ④ 寄语 ── */
.announcement-footer {
  padding: 0 28px;
}

.announcement-divider {
  height: 1px;
  background: #eee;
  margin: 18px 0 14px;
}

.announcement-quote {
  font-size: 13px;
  color: #555;
  line-height: 1.8;
  margin: 0;
}

/* ── 按钮区 ── */
.announcement-actions {
  padding: 12px 28px 22px;
  display: flex;
  justify-content: flex-end;
}

.dismiss-btn {
  padding: 8px 28px;
  background: #007AFF;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
  font-family: inherit;
}

.dismiss-btn:hover {
  background: #0066D6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.35);
}

.dismiss-btn:active {
  transform: translateY(0);
}

/* ── 进出动画 ── */
.announcement-enter-active {
  transition: opacity 0.3s ease;
}
.announcement-leave-active {
  transition: opacity 0.2s ease;
}
.announcement-enter-from,
.announcement-leave-to {
  opacity: 0;
}
</style>
