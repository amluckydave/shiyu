<script setup lang="ts">
import { useBilingualToggle } from '../composables'

const { settings, toggleEnabled } = useBilingualToggle()
</script>

<template>
  <button
    class="bilingual-nav-toggle vp-color-mode-switch"
    :class="{ active: settings.enabled }"
    :title="settings.enabled ? '关闭标注功能' : '开启标注功能'"
    @click="toggleEnabled"
  >
    <svg
      v-if="settings.enabled"
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
      <!-- 高亮/标注图标 -->
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="disabled-icon"
    >
      <!-- 关闭状态图标 -->
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      <line x1="2" y1="2" x2="22" y2="22"></line>
    </svg>
  </button>
</template>

<style scoped>
.bilingual-nav-toggle {
  position: fixed;
  top: 14px;
  right: 70px;
  z-index: 200;
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

.bilingual-nav-toggle:hover {
  background: var(--vp-c-bg-soft, rgba(0, 0, 0, 0.05));
  color: var(--vp-c-text-1, #333);
}

.bilingual-nav-toggle.active {
  color: var(--vp-c-brand, #3eaf7c);
}

.bilingual-nav-toggle.active:hover {
  background: rgba(62, 175, 124, 0.1);
}

.disabled-icon {
  opacity: 0.5;
}

@media (max-width: 719px) {
  .bilingual-nav-toggle {
    right: 60px;
    top: 10px;
  }
}
</style>
