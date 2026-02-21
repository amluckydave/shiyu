<template>
  <div class="api-settings-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        API 设置
      </h1>
      <p class="page-subtitle">配置翻译服务的API密钥和模型</p>
    </div>

    <div class="settings-card">
      <div class="header">
        <div>
          <h2>连接配置</h2>
          <p class="subtitle">参考 Cherry Studio 的管理方式，先拉取可用模型，再选择或自定义添加。</p>
        </div>
        <div class="toggle-switch">
          <label class="switch">
            <input type="checkbox" v-model="enabled" @change="saveSettings">
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <div class="settings-grid">
        <div class="field-card full-width">
          <div class="label-row">
            <label>API 密钥</label>
            <div class="actions">
              <button class="icon-btn" @click="checkKey" :disabled="!canCheck || isChecking" title="检测密钥">
                <i class="fas" :class="isChecking ? 'fa-spinner fa-spin' : 'fa-check-circle'"></i> 检测
              </button>
            </div>
          </div>
          <div class="input-wrapper input-wide">
            <input
              :type="showKey ? 'text' : 'password'"
              v-model="apiKey"
              placeholder="多个密钥用逗号分隔"
              :disabled="!enabled"
              @change="saveSettings"
            >
            <button class="icon-btn eye-btn" @click="showKey = !showKey">
              <i class="fas" :class="showKey ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
          <small class="hint">按顺序轮询使用密钥，检测会使用最后一次添加的模型。</small>
          <div v-if="statusMessage" class="status-row">
            <span class="status" :class="statusState">{{ statusMessage }}</span>
            <span v-if="lastCheckedAt" class="status-time">最后检测: {{ formatTime(lastCheckedAt) }}</span>
          </div>
        </div>

        <div class="field-card full-width">
          <label>API 地址</label>
          <div class="input-wrapper input-wide">
            <input
              type="text"
              v-model="apiUrl"
              placeholder="例如 https://your-newapi-server 或 https://your-newapi-server/v1/"
              :disabled="!enabled"
              @change="saveSettings"
            >
          </div>
          <small class="hint">以 / 结尾或以 /v1 结尾: 自动补 chat/completions；以 # 结尾: 不再拼接。</small>
          <small class="hint">调用预览: {{ previewChatUrl }}</small>
          <small v-if="modelsEndpoint" class="hint">模型接口: {{ modelsEndpoint }}</small>
          <small v-else class="hint warn">当前为完整路径模式，无法自动拉取模型列表。</small>
        </div>
      </div>

      <div class="field-card">
        <div class="label-row">
          <label>自动释义模型</label>
          <span class="info-badge" :class="{ warn: !enabled || models.length === 0 }">
            可用 {{ models.length }}
          </span>
        </div>
        <div class="select-wrapper">
          <select v-model="autoMeaningModelId" @change="saveSettings" :disabled="!enabled || models.length === 0">
            <option value="">未指定（默认使用检测模型或首个模型）</option>
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.id }}
            </option>
          </select>
          <i class="fas fa-chevron-down select-icon"></i>
        </div>
        <div class="hint-row">
          <small class="hint">用于“AI 自动释义”的模型选择。</small>
          <small v-if="autoMeaningModelId" class="hint">当前：{{ autoMeaningModelId }}</small>
          <small v-else class="hint warn">当前：未指定，将使用检测模型或首个模型。</small>
        </div>
      </div>

      <div class="models-section">
        <div class="section-header">
          <div>
            <h3>模型管理</h3>
            <p class="section-desc">从远程模型中挑选，或手动添加自定义模型。</p>
          </div>
          <div class="section-actions">
            <button class="btn manage-btn" @click="openManageModal" :disabled="!canOpenManage">
              <i class="fas fa-layer-group"></i> 管理模型
            </button>
            <button class="btn add-btn" @click="showAddModal = true" :disabled="!enabled">
              <i class="fas fa-plus"></i> 自定义添加
            </button>
          </div>
        </div>

        <div class="model-toolbar">
          <div class="search-input">
            <i class="fas fa-search"></i>
            <input type="text" v-model="activeSearch" placeholder="搜索已添加模型">
          </div>
          <div class="toolbar-actions">
            <button class="btn outline-btn" @click="toggleSelectAllActive" :disabled="selectableActiveIds.length === 0">
              <i class="fas fa-layer-group"></i> 全选当前
            </button>
            <button class="btn delete-btn" @click="removeSelectedActive" :disabled="selectedActiveIds.length === 0">
              <i class="fas fa-trash"></i> 删除选中
            </button>
            <span class="models-meta">{{ filteredActiveModels.length }}/{{ models.length }}</span>
          </div>
        </div>

        <div class="model-list">
          <div v-if="filteredActiveModels.length === 0" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>暂未添加模型</p>
          </div>
          <div v-else class="model-cards">
            <div v-for="model in filteredActiveModels" :key="model.id" class="model-card">
              <div class="model-main">
                <div class="model-header">
                  <input
                    class="active-checkbox"
                    type="checkbox"
                    :value="model.id"
                    v-model="selectedActiveIds"
                  >
                  <span class="model-id">{{ model.id }}</span>
                </div>
                <span class="model-sub">{{ model.name || model.group || '未命名' }}</span>
              </div>
              <div class="model-meta">
                <span class="badge" :class="badgeClass(model)">{{ sourceLabel(model) }}</span>
                <span v-if="model.type" class="badge ghost">{{ model.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal">
        <div class="modal-header">
          <h3>添加自定义模型</h3>
          <button class="close-btn" @click="closeAddModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="required">模型 ID</label>
            <input type="text" v-model="newModel.id" placeholder="必填 例如 gpt-4o-mini">
          </div>
          <div class="form-group">
            <label>模型名称</label>
            <input type="text" v-model="newModel.name" placeholder="例如 GPT-4o Mini">
          </div>
          <div class="form-group">
            <label>分组名称</label>
            <input type="text" v-model="newModel.group" placeholder="例如 OpenAI">
          </div>
          <div class="form-group">
            <label class="required">端点类型</label>
            <select v-model="newModel.type">
              <option value="OpenAI">OpenAI</option>
              <option value="Anthropic">Anthropic</option>
              <option value="Gemini">Gemini</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn save-btn" @click="addCustomModel">添加模型</button>
        </div>
      </div>
    </div>

    <div v-if="showManageModal" class="modal-overlay" @click.self="closeManageModal">
      <div class="modal modal-wide">
        <div class="modal-header">
          <div>
            <h3>可用模型</h3>
            <p class="section-desc">从 API Base URL 拉取模型列表后，点击 + 添加。</p>
          </div>
          <button class="close-btn" @click="closeManageModal">&times;</button>
        </div>
          <div class="modal-body">
            <div class="modal-toolbar">
              <div class="search-input">
                <i class="fas fa-search"></i>
                <input type="text" v-model="remoteSearch" placeholder="搜索远程模型">
              </div>
              <div class="toolbar-actions">
                <button class="btn outline-btn" @click="fetchRemoteModels" :disabled="!canFetchModels || isFetchingModels">
                  <i class="fas" :class="isFetchingModels ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i> 拉取模型
                </button>
                <button class="btn outline-btn" @click="toggleSelectAllFiltered" :disabled="selectableRemoteIds.length === 0">
                  <i class="fas fa-layer-group"></i> 全选当前
                </button>
              </div>
            </div>
            <div v-if="remoteModels.length" class="hint">已选 {{ selectedRemoteIds.length }} / {{ selectableRemoteIds.length }}（当前可选）</div>
            <div v-if="modelsUpdatedAt" class="hint">最后同步: {{ formatTime(modelsUpdatedAt) }}</div>

          <div v-if="manualMode" class="empty-state warn">
            <i class="fas fa-link"></i>
            <p>当前 API 地址是完整路径模式，无法自动拉取模型列表。</p>
          </div>
          <div v-else-if="remoteModels.length === 0" class="empty-state">
            <i class="fas fa-cloud"></i>
            <p>暂无远程模型，请先拉取。</p>
          </div>
          <div v-else class="remote-list">
            <div
              v-for="model in filteredRemoteModels"
              :key="model.id"
              class="remote-item"
              :class="{ disabled: modelExists(model.id), selected: isRemoteSelected(model.id) }"
              @click="toggleRemoteSelection(model)"
            >
              <button
                class="remote-checkbox"
                type="button"
                role="checkbox"
                :class="{ checked: isRemoteSelected(model.id) }"
                :aria-checked="isRemoteSelected(model.id)"
                @click.stop="toggleRemoteSelection(model)"
                aria-label="选择模型"
              ></button>
              <div class="remote-main">
                <span class="model-id">{{ model.id }}</span>
                <span class="model-sub">{{ model.group || model.name || '远程模型' }}</span>
              </div>
              <button class="icon-btn" :disabled="modelExists(model.id)" @click.stop="addRemoteModel(model)">
                <i class="fas" :class="modelExists(model.id) ? 'fa-check' : 'fa-plus'"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="footer-actions">
            <button class="btn add-btn" @click="addSelectedRemote" :disabled="selectedRemoteIds.length === 0">
              <i class="fas fa-check"></i> 添加选中
            </button>
            <button class="btn save-btn" @click="closeManageModal">完成</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCheckModal" class="modal-overlay" @click.self="closeCheckModal">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h3>检测模型联通性</h3>
            <p class="section-desc">请选择一个模型进行测试。</p>
          </div>
          <button class="close-btn" @click="closeCheckModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="models.length === 0" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>当前没有可检测的模型。</p>
          </div>
          <div v-else class="check-list">
            <label v-for="model in models" :key="model.id" class="check-item">
              <input type="radio" name="check-model" :value="model.id" v-model="checkModelId">
              <div class="check-info">
                <span class="model-id">{{ model.id }}</span>
                <span class="model-sub">{{ model.name || model.group || '未命名' }}</span>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn outline-btn" @click="closeCheckModal">取消</button>
          <button class="btn add-btn" @click="runCheck" :disabled="!checkModelId">开始检测</button>
        </div>
      </div>
    </div>

    <div v-if="showCheckResultModal" class="modal-overlay" @click.self="closeCheckResultModal">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h3>{{ checkResultState === 'success' ? '连接成功' : '连接失败' }}</h3>
            <p class="section-desc">{{ checkResultMessage }}</p>
          </div>
          <button class="close-btn" @click="closeCheckResultModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="check-result" :class="checkResultState">
            <i class="fas" :class="checkResultState === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'"></i>
            <div>
              <div class="result-title">{{ checkResultState === 'success' ? '配置可用' : '检测未通过' }}</div>
              <div class="result-desc">{{ checkResultDetail }}</div>
            </div>
          </div>
          <div class="hint">如需更换模型，请重新点击“检测”。</div>
        </div>
        <div class="modal-footer">
          <button class="btn add-btn" @click="closeCheckResultModal">知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import { useDataExport } from '../composables/useDataExport';

type ModelItem = {
  id: string;
  name?: string;
  group?: string;
  type?: string;
  source?: 'remote' | 'custom';
};

const enabled = ref(true);
const apiKey = ref('');
const apiUrl = ref('');
const showKey = ref(false);
const models = ref<ModelItem[]>([]);
const remoteModels = ref<ModelItem[]>([]);
const activeSearch = ref('');
const remoteSearch = ref('');
const keyIndex = ref(0);
const selectedRemoteIds = ref<string[]>([]);
const selectedActiveIds = ref<string[]>([]);
const checkModelId = ref('');
const checkResultState = ref<'success' | 'error' | ''>('');
const checkResultMessage = ref('');
const checkResultDetail = ref('');
const autoMeaningModelId = ref('');

const showAddModal = ref(false);
const showManageModal = ref(false);
const showCheckModal = ref(false);
const showCheckResultModal = ref(false);
const isChecking = ref(false);
const isFetchingModels = ref(false);
const statusState = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const statusMessage = ref('');
const lastCheckedAt = ref<number | null>(null);
const modelsUpdatedAt = ref<number | null>(null);

const newModel = ref({
  id: '',
  name: '',
  group: '',
  type: 'OpenAI'
});

const STORAGE_KEY = 'vuepress-api-settings';

// 数据导出/导入相关
const { exportAllData, importAllData } = useDataExport();
const importFileInput = ref<HTMLInputElement | null>(null);
const importStatus = ref<{ success: boolean; message: string } | null>(null);
const showImportOptions = ref(false);
const importMode = ref<'replace' | 'merge'>('replace');
const pendingImportFile = ref<File | null>(null);

// 导出所有数据
function handleExportData() {
  exportAllData();
  importStatus.value = { success: true, message: '数据已导出' };
  setTimeout(() => { importStatus.value = null; }, 3000);
}

// 触发文件选择
function triggerImport() {
  importFileInput.value?.click();
}

// 处理文件选择
function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    pendingImportFile.value = target.files[0];
    showImportOptions.value = true;
    importStatus.value = null;
  }
  target.value = ''; // 清空以便重复选择同一文件
}

// 确认导入
async function confirmImport() {
  if (!pendingImportFile.value) return;
  
  const result = await importAllData(pendingImportFile.value, { mode: importMode.value });
  importStatus.value = result;
  showImportOptions.value = false;
  pendingImportFile.value = null;
  
  // 如果成功，刷新页面以加载新的API设置
  if (result.success) {
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }
}

// 取消导入
function cancelImport() {
  showImportOptions.value = false;
  pendingImportFile.value = null;
  importStatus.value = null;
}

const rawApiUrl = computed(() => apiUrl.value.trim());
const manualMode = computed(() => rawApiUrl.value.endsWith('#'));
const apiUrlClean = computed(() => manualMode.value ? rawApiUrl.value.slice(0, -1).trim() : rawApiUrl.value);

const previewChatUrl = computed(() => {
  if (!apiUrlClean.value) return '...';
  if (manualMode.value) return apiUrlClean.value;
  if (apiUrlClean.value.endsWith('/')) return `${apiUrlClean.value}chat/completions`;
  if (apiUrlClean.value.endsWith('/v1')) return `${apiUrlClean.value}/chat/completions`;
  return `${apiUrlClean.value}/v1/chat/completions`;
});

const modelsEndpoint = computed(() => {
  if (!apiUrlClean.value || manualMode.value) return '';
  if (apiUrlClean.value.endsWith('/')) {
    if (apiUrlClean.value.endsWith('/v1/')) return `${apiUrlClean.value}models`;
    return `${apiUrlClean.value}v1/models`;
  }
  if (apiUrlClean.value.endsWith('/v1')) return `${apiUrlClean.value}/models`;
  return `${apiUrlClean.value}/v1/models`;
});

const apiKeys = computed(() => apiKey.value.split(/[\s,]+/).map(key => key.trim()).filter(Boolean));
const canCheck = computed(() => enabled.value && apiKeys.value.length > 0 && !!apiUrlClean.value && models.value.length > 0);
const canFetchModels = computed(() => enabled.value && apiKeys.value.length > 0 && !!modelsEndpoint.value && !manualMode.value);
const canOpenManage = computed(() => enabled.value);

const filteredActiveModels = computed(() => {
  const keyword = activeSearch.value.trim().toLowerCase();
  if (!keyword) return models.value;
  return models.value.filter(item =>
    item.id.toLowerCase().includes(keyword) ||
    (item.name || '').toLowerCase().includes(keyword) ||
    (item.group || '').toLowerCase().includes(keyword)
  );
});

const selectableActiveIds = computed(() => {
  return filteredActiveModels.value.map(item => item.id);
});

const filteredRemoteModels = computed(() => {
  const keyword = remoteSearch.value.trim().toLowerCase();
  if (!keyword) return remoteModels.value;
  return remoteModels.value.filter(item =>
    item.id.toLowerCase().includes(keyword) ||
    (item.name || '').toLowerCase().includes(keyword) ||
    (item.group || '').toLowerCase().includes(keyword)
  );
});

const selectableRemoteIds = computed(() => {
  return filteredRemoteModels.value
    .filter(item => !modelExists(item.id))
    .map(item => item.id);
});

const isRemoteSelected = (id: string) => selectedRemoteIds.value.includes(id);


const formatTime = (timestamp: number | null) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
};

const sourceLabel = (model: ModelItem) => {
  if (model.source === 'remote') return '远程';
  return '自定义';
};

const badgeClass = (model: ModelItem) => {
  return model.source === 'remote' ? 'badge-remote' : 'badge-custom';
};

const modelExists = (id: string) => models.value.some(item => item.id === id);

const nextKey = () => {
  if (apiKeys.value.length === 0) return '';
  const key = apiKeys.value[keyIndex.value % apiKeys.value.length];
  keyIndex.value = (keyIndex.value + 1) % apiKeys.value.length;
  saveSettings();
  return key;
};

const saveSettings = () => {
  const data = {
    enabled: enabled.value,
    apiKey: apiKey.value,
    apiUrl: apiUrl.value,
    models: models.value,
    remoteModels: remoteModels.value,
    lastCheckedAt: lastCheckedAt.value,
    modelsUpdatedAt: modelsUpdatedAt.value,
    keyIndex: keyIndex.value,
    checkModelId: checkModelId.value,
    autoMeaningModelId: autoMeaningModelId.value
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const data = JSON.parse(stored);
    enabled.value = data.enabled ?? true;
    apiKey.value = data.apiKey || '';
    apiUrl.value = data.apiUrl || '';
    models.value = data.models || [];
    remoteModels.value = data.remoteModels || [];
    lastCheckedAt.value = data.lastCheckedAt ?? null;
    modelsUpdatedAt.value = data.modelsUpdatedAt ?? null;
    keyIndex.value = data.keyIndex ?? 0;
    selectedRemoteIds.value = [];
    selectedActiveIds.value = [];
    checkModelId.value = data.checkModelId || '';
    autoMeaningModelId.value = data.autoMeaningModelId || '';
  }
});

const requestWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('请求超时，请检查网络或稍后重试。');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const checkKey = () => {
  if (!models.value.length) {
    statusState.value = 'error';
    statusMessage.value = '请先添加模型再检测。';
    return;
  }
  if (!checkModelId.value || !models.value.some(model => model.id === checkModelId.value)) {
    checkModelId.value = models.value[models.value.length - 1]?.id || '';
  }
  showCheckModal.value = true;
};

const runCheck = async () => {
  if (!checkModelId.value) return;
  if (isChecking.value) return;
  showCheckModal.value = false;
  isChecking.value = true;
  statusState.value = 'loading';
  statusMessage.value = '正在检测密钥与模型...';

  try {
    const key = nextKey();
    if (!key) throw new Error('API 密钥为空');

    const targetModel = checkModelId.value;
    const startAt = Date.now();
    const res = await requestWithTimeout(previewChatUrl.value, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
        stream: true,
        stream_options: { include_usage: true }
      })
    });

    if (!res.ok) {
      const text = await res.text();
      let payload: any = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = {};
      }
      const errorMessage = payload?.error?.message || `HTTP ${res.status}`;
      throw new Error(errorMessage);
    }

    let gotContent = false;
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let lineBreakIndex = buffer.indexOf('\n');
        while (lineBreakIndex !== -1) {
          const line = buffer.slice(0, lineBreakIndex).trim();
          buffer = buffer.slice(lineBreakIndex + 1);
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              break;
            }
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta;
              if (delta?.content !== undefined || delta?.role) {
                gotContent = true;
                break;
              }
            } catch {
              // ignore invalid chunk
            }
          }
          lineBreakIndex = buffer.indexOf('\n');
        }
        if (gotContent) {
          await reader.cancel();
          break;
        }
      }
    } else {
      const text = await res.text();
      gotContent = !!text;
    }

    if (!gotContent) {
      throw new Error('未收到有效响应内容。');
    }

    const latency = Date.now() - startAt;
    lastCheckedAt.value = Date.now();
    statusState.value = 'success';
    statusMessage.value = `检测通过：${targetModel}`;
    checkResultState.value = 'success';
    checkResultMessage.value = '已成功建立连接。';
    checkResultDetail.value = `模型 ${targetModel} 返回流式响应（${latency}ms）。`;
    showCheckResultModal.value = true;
    saveSettings();
  } catch (error: any) {
    statusState.value = 'error';
    statusMessage.value = error?.message || '检测失败';
    checkResultState.value = 'error';
    checkResultMessage.value = '连接失败，请检查配置。';
    checkResultDetail.value = error?.message || '检测失败';
    showCheckResultModal.value = true;
  } finally {
    isChecking.value = false;
  }
};

const fetchRemoteModels = async () => {
  if (isFetchingModels.value) return;
  if (!modelsEndpoint.value) {
    statusState.value = 'error';
    statusMessage.value = '当前地址无法自动拉取模型。';
    return;
  }

  isFetchingModels.value = true;
  statusState.value = 'loading';
  statusMessage.value = '正在拉取模型列表...';

  try {
    const key = nextKey();
    if (!key) throw new Error('API 密钥为空');

    const res = await requestWithTimeout(modelsEndpoint.value, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`
      }
    });

    const text = await res.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }

    if (!res.ok) {
      const errorMessage = payload?.error?.message || `HTTP ${res.status}`;
      throw new Error(errorMessage);
    }

    const data = Array.isArray(payload?.data) ? payload.data : [];
    remoteModels.value = data
      .filter((item: any) => item?.id)
      .map((item: any) => ({
        id: item.id,
        name: item.id,
        group: item.owned_by || '',
        type: 'OpenAI',
        source: 'remote'
      }));

    modelsUpdatedAt.value = Date.now();
    selectedRemoteIds.value = selectedRemoteIds.value.filter(id =>
      remoteModels.value.some(model => model.id === id && !modelExists(id))
    );
    statusState.value = 'success';
    statusMessage.value = `已拉取 ${remoteModels.value.length} 个模型。`;
    saveSettings();
  } catch (error: any) {
    statusState.value = 'error';
    statusMessage.value = error?.message || '拉取失败';
  } finally {
    isFetchingModels.value = false;
  }
};

const addRemoteModel = (model: ModelItem) => {
  if (modelExists(model.id)) return;
  models.value.push({ ...model, source: 'remote' });
  saveSettings();
};

const addSelectedRemote = () => {
  const selectedSet = new Set(selectedRemoteIds.value);
  if (!selectedSet.size) return;
  remoteModels.value.forEach(model => {
    if (selectedSet.has(model.id) && !modelExists(model.id)) {
      models.value.push({ ...model, source: 'remote' });
    }
  });
  selectedRemoteIds.value = [];
  saveSettings();
};

const toggleRemoteSelection = (model: ModelItem) => {
  if (isRemoteSelected(model.id)) {
    selectedRemoteIds.value = selectedRemoteIds.value.filter(id => id !== model.id);
  } else {
    selectedRemoteIds.value = [...selectedRemoteIds.value, model.id];
  }
};

const toggleSelectAllFiltered = () => {
  const selectable = selectableRemoteIds.value;
  if (selectable.length === 0) return;
  const selectedSet = new Set(selectedRemoteIds.value);
  const allSelected = selectable.every(id => selectedSet.has(id));
  if (allSelected) {
    selectedRemoteIds.value = selectedRemoteIds.value.filter(id => !selectable.includes(id));
  } else {
    const merged = new Set(selectedRemoteIds.value);
    selectable.forEach(id => merged.add(id));
    selectedRemoteIds.value = Array.from(merged);
  }
};

const addCustomModel = () => {
  if (!newModel.value.id) {
    alert('请填写模型 ID');
    return;
  }
  if (modelExists(newModel.value.id)) {
    alert('模型已存在');
    return;
  }
  models.value.push({ ...newModel.value, source: 'custom' });
  newModel.value = { id: '', name: '', group: '', type: 'OpenAI' };
  showAddModal.value = false;
  saveSettings();
};

const removeModelById = (id: string) => {
  models.value = models.value.filter(item => item.id !== id);
  selectedActiveIds.value = selectedActiveIds.value.filter(selectedId => selectedId !== id);
  if (autoMeaningModelId.value === id) {
    autoMeaningModelId.value = models.value[0]?.id || '';
  }
  if (checkModelId.value === id) {
    checkModelId.value = models.value[0]?.id || '';
  }
  saveSettings();
};

const removeSelectedActive = () => {
  if (!selectedActiveIds.value.length) return;
  const selectedSet = new Set(selectedActiveIds.value);
  models.value = models.value.filter(item => !selectedSet.has(item.id));
  selectedActiveIds.value = [];
  if (autoMeaningModelId.value && !models.value.some(model => model.id === autoMeaningModelId.value)) {
    autoMeaningModelId.value = models.value[0]?.id || '';
  }
  if (checkModelId.value && !models.value.some(model => model.id === checkModelId.value)) {
    checkModelId.value = models.value[0]?.id || '';
  }
  saveSettings();
};

const toggleSelectAllActive = () => {
  const selectable = selectableActiveIds.value;
  if (selectable.length === 0) return;
  const selectedSet = new Set(selectedActiveIds.value);
  const allSelected = selectable.every(id => selectedSet.has(id));
  if (allSelected) {
    selectedActiveIds.value = selectedActiveIds.value.filter(id => !selectable.includes(id));
  } else {
    const merged = new Set(selectedActiveIds.value);
    selectable.forEach(id => merged.add(id));
    selectedActiveIds.value = Array.from(merged);
  }
};

const closeAddModal = () => {
  showAddModal.value = false;
};

const openManageModal = () => {
  showManageModal.value = true;
};

const closeManageModal = () => {
  showManageModal.value = false;
  saveSettings();
};

const closeCheckModal = () => {
  showCheckModal.value = false;
};

const closeCheckResultModal = () => {
  showCheckResultModal.value = false;
};

const updateBodyScroll = (locked: boolean) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = locked ? 'hidden' : '';
};

watch([showAddModal, showManageModal, showCheckModal, showCheckResultModal], ([addOpen, manageOpen, checkOpen, resultOpen]) => {
  updateBodyScroll(addOpen || manageOpen || checkOpen || resultOpen);
});

onBeforeUnmount(() => {
  updateBodyScroll(false);
});
</script>

<style scoped>
.api-settings-container {
  --api-accent: #2f7a5d;
  --api-accent-soft: rgba(47, 122, 93, 0.15);
  --api-warm: #f4b183;
  --api-warm-soft: rgba(244, 177, 131, 0.15);
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem 1.5rem 3rem;
  font-family: "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 4rem;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 2rem;
  font-weight: 800;
  color: var(--c-text);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.title-icon {
  width: 36px;
  height: 36px;
  color: #2f7a5d;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--c-text-lighter);
  margin: 0;
}

.settings-card {
  background: linear-gradient(135deg, var(--c-bg) 0%, var(--c-bg-light) 60%);
  border: 1px solid var(--c-border);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.settings-card::before {
  content: "";
  position: absolute;
  inset: -40% 0 auto auto;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(47, 122, 93, 0.12), transparent 70%);
  pointer-events: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1.5rem;
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 1.5rem;
}

.header h2 {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 700;
}

.subtitle {
  margin: 0.4rem 0 0;
  color: var(--c-text-quote);
  font-size: 0.95rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.field-card {
  background: var(--c-bg, #ffffff);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.05);
  text-align: left;
}

.field-card.full-width {
  grid-column: 1 / -1;
}

.label-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.info-badge {
  align-self: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #1f6f50;
  background: rgba(62, 175, 124, 0.12);
}

.info-badge.warn {
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
}

label {
  font-weight: 600;
  color: var(--c-text);
  margin-bottom: 0.5rem;
  display: block;
}

.required::before {
  content: "*";
  color: #d35400;
  margin-right: 4px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wide {
  width: 100%;
  max-width: 720px;
}

input[type="text"],
input[type="password"],
select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-bg-light);
  color: var(--c-text);
  font-size: 0.98rem;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

input[type="text"],
input[type="password"] {
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.95));
}

input[type="text"]:hover,
input[type="password"]:hover {
  border-color: rgba(47, 122, 93, 0.55);
  box-shadow: 0 0 0 3px rgba(47, 122, 93, 0.08);
}

input[type="text"]:disabled,
input[type="password"]:disabled {
  background: var(--c-bg-lighter, #f2f4f7);
  color: var(--c-text-quote);
  cursor: not-allowed;
}

select {
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.95));
}

select:hover {
  border-color: rgba(47, 122, 93, 0.6);
  box-shadow: 0 0 0 3px rgba(47, 122, 93, 0.1);
}

select:disabled {
  background: var(--c-bg-lighter, #f2f4f7);
  color: var(--c-text-quote);
  cursor: not-allowed;
}

select option {
  background: var(--c-bg, #ffffff);
  color: var(--c-text);
  padding: 8px 10px;
}

select option:checked {
  background: rgba(62, 175, 124, 0.12);
}

.select-wrapper {
  position: relative;
}

.select-wrapper select {
  appearance: none;
  padding-right: 2.2rem;
}

.select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-text-quote);
  pointer-events: none;
  font-size: 0.85rem;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--api-accent);
  box-shadow: 0 0 0 3px rgba(47, 122, 93, 0.15);
}

.eye-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--c-text-quote);
}

.hint {
  display: block;
  margin-top: 0.5rem;
  color: var(--c-text-quote);
  font-size: 0.82rem;
}

.hint-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.8rem;
}

.hint.warn {
  color: #b05d14;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--c-text-quote);
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
}

.icon-btn:hover {
  background: var(--c-bg-lighter);
  color: var(--api-accent);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-row {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.status {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.82rem;
  background: var(--api-accent-soft);
  color: var(--api-accent);
}

.status.loading {
  background: var(--c-bg-lighter);
  color: var(--c-text-quote);
}

.status.success {
  background: rgba(52, 152, 219, 0.15);
  color: #2c80b4;
}

.status.error {
  background: rgba(231, 76, 60, 0.15);
  color: #b03a2e;
}

.status-time {
  font-size: 0.78rem;
  color: var(--c-text-quote);
}

.switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #c5c5c5;
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
}

input:checked + .slider {
  background-color: var(--api-accent);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.models-section {
  margin-top: 2.5rem;
  border-top: 1px solid var(--c-border);
  padding-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.section-desc {
  margin: 0.35rem 0 0;
  color: var(--c-text-quote);
  font-size: 0.88rem;
}

.section-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.model-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.search-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-bg-light);
  min-width: 220px;
}

.search-input input {
  border: none;
  background: transparent;
  padding: 0.6rem 0;
  font-size: 0.9rem;
}

.search-input input:focus {
  box-shadow: none;
}

.models-meta {
  font-size: 0.85rem;
  color: var(--c-text-quote);
}

.model-list {
  margin-top: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--c-text-quote);
  background: var(--c-bg-light);
  border-radius: 12px;
}

.empty-state.warn {
  border: 1px dashed var(--api-warm);
  background: var(--api-warm-soft);
  color: #8a4a14;
}

.model-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.model-card {
  background: var(--c-bg, #ffffff);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}

.model-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.active-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--api-accent);
  cursor: pointer;
  margin: 0;
}

.model-id {
  font-weight: 600;
  font-size: 0.98rem;
}

.model-sub {
  font-size: 0.82rem;
  color: var(--c-text-quote);
}

.model-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: var(--api-accent-soft);
  color: var(--api-accent);
}

.badge-custom {
  background: rgba(52, 152, 219, 0.12);
  color: #2c80b4;
}

.badge-remote {
  background: rgba(39, 174, 96, 0.15);
  color: #1f7a4c;
}

.badge.ghost {
  background: var(--c-bg-lighter);
  color: var(--c-text-quote);
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-text-quote);
  font-size: 0.85rem;
  cursor: pointer;
}

.ghost-btn:hover {
  color: #b03a2e;
  border-color: rgba(231, 76, 60, 0.35);
  background: rgba(231, 76, 60, 0.08);
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.6rem 1.1rem;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.manage-btn {
  background: var(--c-bg-lighter);
  color: var(--c-text);
  border: 1px solid var(--c-border);
}

.add-btn, .save-btn {
  background: var(--api-accent);
  color: #fff;
}

.outline-btn {
  background: transparent;
  border: 1px solid var(--c-border);
  color: var(--c-text);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(10, 10, 10, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 1rem;
  overflow-y: auto;
  z-index: 1000;
}

.modal {
  background: var(--c-bg, #ffffff);
  padding: 2rem;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.18);
}

.modal-body {
  background: var(--c-bg, #ffffff);
  max-height: 60vh;
  overflow: auto;
  padding-right: 0.5rem;
}

.modal-wide {
  max-width: 860px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--c-text-quote);
}

.modal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.delete-btn {
  background: rgba(231, 76, 60, 0.12);
  color: #b03a2e;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.delete-btn:hover {
  background: rgba(231, 76, 60, 0.18);
}

.remote-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-bg-light, #f7f7f7);
  cursor: pointer;
}

.check-item input {
  margin-top: 0.2rem;
  accent-color: var(--api-accent);
}

.check-item:hover {
  border-color: var(--api-accent);
}

.check-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.check-result {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-light, #f7f7f7);
  margin-bottom: 1rem;
}

.check-result.success {
  border-color: rgba(39, 174, 96, 0.4);
  background: rgba(39, 174, 96, 0.12);
}

.check-result.error {
  border-color: rgba(231, 76, 60, 0.4);
  background: rgba(231, 76, 60, 0.12);
}

.result-title {
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.result-desc {
  font-size: 0.9rem;
  color: var(--c-text-quote);
}

.remote-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  justify-content: start;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-bg-light, #f7f7f7);
  cursor: pointer;
  text-align: left;
}

.remote-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remote-item.selected {
  border-color: var(--api-accent);
  background: var(--api-accent-soft);
}

.remote-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid var(--c-border);
  background: var(--c-bg);
  cursor: pointer;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  pointer-events: auto;
  z-index: 1;
}

.remote-checkbox.checked {
  background: var(--api-accent);
  border-color: var(--api-accent);
}

.remote-checkbox.checked::after {
  content: "✓";
  color: #fff;
  font-size: 0.75rem;
}


.remote-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
}

.remote-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.modal-footer {
  margin-top: 1.8rem;
  display: flex;
  justify-content: flex-end;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

@media (max-width: 768px) {
  .settings-card {
    padding: 2rem 1.5rem;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .model-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .modal {
    padding: 1.5rem;
  }

  .remote-list {
    grid-template-columns: 1fr;
  }
}

/* 数据管理卡片样式 */
.data-management-card {
  margin-top: 1.5rem;
}

.data-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.export-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
}

.export-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
}

.import-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
}

.import-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}

.import-status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.import-status.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.import-status.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.import-options {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 0.5rem;
  border: 1px solid var(--vp-c-border);
}

.import-mode-select {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.import-mode-select label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: background 0.2s;
}

.import-mode-select label:hover {
  background: var(--vp-c-bg-mute);
}

.import-mode-select input[type="radio"] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--vp-c-brand);
}

.import-mode-select span {
  font-weight: 500;
}

.import-mode-select small {
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  margin-left: auto;
}

.import-confirm-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
