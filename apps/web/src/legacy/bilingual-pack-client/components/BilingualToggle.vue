<script setup lang="ts">
import { useBilingualToggle } from '../composables'

const { settings, toggleEnabled } = useBilingualToggle()
</script>

<template>
  <div class="bilingual-toggle">
    <label class="toggle-switch">
      <input
        type="checkbox"
        :checked="settings.enabled"
        @change="toggleEnabled"
      />
      <span class="toggle-slider"></span>
    </label>
    <span class="toggle-label">{{ settings.enabled ? '已开启' : '已关闭' }}</span>
  </div>
</template>

<style scoped>
.bilingual-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

input:checked + .toggle-slider {
  background: linear-gradient(135deg, #3eaf7c, #2d9d6c);
}

input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.toggle-label {
  color: var(--vp-c-text-1, #333);
  font-weight: 500;
}
</style>
