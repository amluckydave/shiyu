<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  buildOneApiUrl,
  mapOneResponse,
  readOneCache,
  writeOneCache,
  formatOneDisplayDate,
  type OneDailyEntry,
  type OneDailyResponse
} from '../utils/oneApi'

const showPanel = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const currentEntry = ref<OneDailyEntry | null>(null)

// 日期选择相关
const now = new Date()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1
const todayDay = now.getDate()

// 日历视图模式: 'day' | 'month' | 'year'
type ViewMode = 'day' | 'month' | 'year'
const viewMode = ref<ViewMode>('day')
// 过渡动画名称
const transitionName = ref('fade-slide')

// 日历当前显示的年月（用于日期视图）
const calendarYear = ref(todayYear)
const calendarMonth = ref(todayMonth)

// 年份视图中显示的十年起始
const decadeStart = ref(Math.floor(todayYear / 10) * 10)

// 选中的日期
const selectedYear = ref(todayYear)
const selectedMonth = ref(todayMonth)
const selectedDay = ref(todayDay)

// 日历折叠状态
const isCalendarExpanded = ref(false)

// 最早可选年份（3年前）
const minYear = todayYear - 2

// 星期标题
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// ===== 头部显示 =====
const calendarHeader = computed(() => {
  switch (viewMode.value) {
    case 'day':
      return `${calendarYear.value}年${calendarMonth.value}月`
    case 'month':
      return `${calendarYear.value}年`
    case 'year':
      return `${decadeStart.value} - ${decadeStart.value + 9}`
    default:
      return ''
  }
})

// ===== 翻页逻辑 =====
const canGoNext = computed(() => {
  switch (viewMode.value) {
    case 'day':
      // 日期视图：不能超过今天所在月
      if (calendarYear.value < todayYear) return true
      if (calendarYear.value === todayYear && calendarMonth.value < todayMonth) return true
      return false
    case 'month':
      // 月份视图：不能超过今年
      return calendarYear.value < todayYear
    case 'year':
      // 年份视图：不能超过当前十年
      return decadeStart.value + 10 <= todayYear
    default:
      return false
  }
})

const canGoPrev = computed(() => {
  switch (viewMode.value) {
    case 'day':
      // 日期视图：不能早于3年前的1月
      if (calendarYear.value > minYear) return true
      if (calendarYear.value === minYear && calendarMonth.value > 1) return true
      return false
    case 'month':
      // 月份视图：不能早于3年前
      return calendarYear.value > minYear
    case 'year':
      // 年份视图：不能早于3年前所在的十年
      return decadeStart.value > Math.floor(minYear / 10) * 10
    default:
      return false
  }
})

function goNext() {
  if (!canGoNext.value) return
  transitionName.value = 'slide-next'
  
  // 稍微延迟一下确保 transitionName 生效（Vue 响应式通常是同步的，但为了保险起见）
  switch (viewMode.value) {
    case 'day':
      if (calendarMonth.value === 12) {
        calendarMonth.value = 1
        calendarYear.value++
      } else {
        calendarMonth.value++
      }
      break
    case 'month':
      calendarYear.value++
      break
    case 'year':
      decadeStart.value += 10
      break
  }
}

function goPrev() {
  if (!canGoPrev.value) return
  transitionName.value = 'slide-prev'
  
  switch (viewMode.value) {
    case 'day':
      if (calendarMonth.value === 1) {
        calendarMonth.value = 12
        calendarYear.value--
      } else {
        calendarMonth.value--
      }
      break
    case 'month':
      calendarYear.value--
      break
    case 'year':
      decadeStart.value -= 10
      break
  }
}

// ===== 标题点击切换视图 =====
function onHeaderClick() {
  transitionName.value = 'fade-slide' // 视图切换使用缩放淡入淡出
  switch (viewMode.value) {
    case 'day':
      viewMode.value = 'month'
      break
    case 'month':
      viewMode.value = 'year'
      break
    // year 模式点击标题不做任何事
  }
}

// ===== 日期视图相关 =====
function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay()
  return day === 0 ? 7 : day
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function isFutureDate(year: number, month: number, day: number): boolean {
  if (year > todayYear) return true
  if (year === todayYear && month > todayMonth) return true
  if (year === todayYear && month === todayMonth && day > todayDay) return true
  return false
}

function isDaySelected(day: number): boolean {
  return calendarYear.value === selectedYear.value &&
    calendarMonth.value === selectedMonth.value &&
    day === selectedDay.value
}

function isTodayDate(day: number): boolean {
  return calendarYear.value === todayYear &&
    calendarMonth.value === todayMonth &&
    day === todayDay
}

const calendarDays = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = getFirstDayOfMonth(year, month)
  const daysCount = getDaysInMonth(year, month)
  const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1)
  
  const days: Array<{ day: number; type: 'prev' | 'current' | 'next'; disabled: boolean }> = []
  
  // 上月末尾
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  for (let i = firstDay - 1; i > 0; i--) {
    const d = prevMonthDays - i + 1
    days.push({ 
      day: d, 
      type: 'prev', 
      disabled: isFutureDate(prevYear, prevMonth, d) || prevYear < minYear 
    })
  }
  
  // 当月
  for (let i = 1; i <= daysCount; i++) {
    days.push({ day: i, type: 'current', disabled: isFutureDate(year, month, i) })
  }
  
  // 下月开头（补满6行）
  const remaining = 42 - days.length
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  for (let i = 1; i <= remaining; i++) {
    days.push({ 
      day: i, 
      type: 'next', 
      disabled: isFutureDate(nextYear, nextMonth, i) 
    })
  }
  
  return days
})

async function selectDay(day: { day: number; type: string; disabled: boolean }) {
  if (day.disabled) return
  
  // 如果点击的是非当月日期，先切换日历视图
  if (day.type === 'prev') {
    if (calendarMonth.value === 1) {
      calendarMonth.value = 12
      calendarYear.value--
    } else {
      calendarMonth.value--
    }
  } else if (day.type === 'next') {
    if (calendarMonth.value === 12) {
      calendarMonth.value = 1
      calendarYear.value++
    } else {
      calendarMonth.value++
    }
  }

  selectedYear.value = calendarYear.value
  selectedMonth.value = calendarMonth.value
  selectedDay.value = day.day
  
  await changeDate()
  isCalendarExpanded.value = false // 选择日期后自动折叠
}

// ===== 月份视图相关 =====
const monthItems = computed(() => {
  const year = calendarYear.value
  const items: Array<{ month: number; year: number; disabled: boolean; selected: boolean; outside: boolean }> = []
  
  // 补齐前 2 个（上一年 11-12 月）- 使得当前年份居中
  for (let m = 11; m <= 12; m++) {
    const prevY = year - 1
    const isFuture = prevY > todayYear || (prevY === todayYear && m > todayMonth)
    const tooEarly = prevY < minYear
    items.push({
      month: m,
      year: prevY,
      disabled: isFuture || tooEarly,
      selected: false,
      outside: true
    })
  }
  
  // 显示当前年份的 12 个月
  for (let m = 1; m <= 12; m++) {
    const isFuture = year > todayYear || (year === todayYear && m > todayMonth)
    const tooEarly = year < minYear
    items.push({
      month: m,
      year: year,
      disabled: isFuture || tooEarly,
      selected: year === selectedYear.value && m === selectedMonth.value,
      outside: false
    })
  }

  // 补齐后 2 个（下一年 1-2 月）
  for (let m = 1; m <= 2; m++) {
    const nextY = year + 1
    const isFuture = nextY > todayYear || (nextY === todayYear && m > todayMonth)
    items.push({
      month: m,
      year: nextY,
      disabled: isFuture,
      selected: false,
      outside: true
    })
  }
  return items
})

function selectMonth(item: { month: number; year: number; disabled: boolean; outside: boolean }) {
  if (item.disabled) return
  if (item.outside) {
    calendarYear.value = item.year
  }
  calendarMonth.value = item.month
  transitionName.value = 'fade-slide'
  viewMode.value = 'day'
}

// ===== 年份视图相关 =====
const yearItems = computed(() => {
  const start = decadeStart.value - 3 // 显示 16 年 (3年前 + 10年内的 + 3年后)
  const items: Array<{ year: number; disabled: boolean; selected: boolean; outside: boolean }> = []
  
  for (let i = 0; i < 16; i++) {
    const y = start + i
    const isFuture = y > todayYear
    const tooEarly = y < minYear
    const outsideDecade = y < decadeStart.value || y >= decadeStart.value + 10
    
    items.push({
      year: y,
      disabled: isFuture || tooEarly,
      selected: y === selectedYear.value,
      outside: outsideDecade
    })
  }
  return items
})

function selectYearItem(item: { year: number; disabled: boolean; outside: boolean }) {
  if (item.disabled) return
  if (item.outside) {
    // 自动跳转到新年份所在的十年
    decadeStart.value = Math.floor(item.year / 10) * 10
  }
  calendarYear.value = item.year
  transitionName.value = 'fade-slide'
  viewMode.value = 'month'
}

// ===== 通用 =====
const selectedDateStr = computed(() => {
  const y = selectedYear.value
  const m = String(selectedMonth.value).padStart(2, '0')
  const d = String(selectedDay.value).padStart(2, '0')
  return `${y}-${m}-${d}`
})

const isToday = computed(() => {
  return selectedYear.value === todayYear &&
    selectedMonth.value === todayMonth &&
    selectedDay.value === todayDay
})

const displayDate = computed(() => formatOneDisplayDate(currentEntry.value, new Date()))

const cardStyle = computed(() => {
  const imageUrl = currentEntry.value?.imageUrl
  return imageUrl ? { backgroundImage: `url("${imageUrl}")` } : {}
})

// 期数显示（如 VOL.2060）
const volumeDisplay = computed(() => currentEntry.value?.volume || '')

// 来源信息显示
const sourceDisplay = computed(() => {
  const entry = currentEntry.value
  if (!entry) return ''
  
  const parts: string[] = []
  if (entry.wordsInfo) parts.push(entry.wordsInfo)
  if (entry.picInfo) parts.push(`📷 ${entry.picInfo}`)
  
  return parts.join(' · ')
})

function togglePanel() {
  showPanel.value = !showPanel.value
  if (showPanel.value) {
    isCalendarExpanded.value = false // 每次打开面板时默认为折叠状态
    void ensureData()
  }
}

function closePanel() {
  showPanel.value = false
}

async function fetchOneData(dateStr: string = '0') {
  loading.value = true
  errorMessage.value = null
  
  try {
    const url = buildOneApiUrl(dateStr)
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`接口响应异常：${response.status}`)
    }
    
    const data = await response.json() as OneDailyResponse
    
    if (data.res !== 0) {
      throw new Error('接口返回错误状态')
    }
    
    const entry = mapOneResponse(data)
    
    if (!entry) {
      throw new Error('未获取到图文数据')
    }
    
    currentEntry.value = entry
    
    // 只有今天的数据才缓存
    if (dateStr === '0') {
      writeOneCache(entry)
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取每日图文失败'
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}

async function ensureData() {
  // 如果选择的是今天，首先尝试读取缓存
  if (isToday.value) {
    const cached = readOneCache()
    if (cached) {
      currentEntry.value = cached
      return
    }
    // 缓存无效，从API获取今日数据
    await fetchOneData('0')
  } else {
    // 选择的不是今天，直接获取指定日期数据
    await fetchOneData(selectedDateStr.value)
  }
}

// 切换日期
async function changeDate() {
  if (isToday.value) {
    await fetchOneData('0')
  } else {
    await fetchOneData(selectedDateStr.value)
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="navbar-daily-quote">
    <button
      class="daily-quote-toggle vp-color-mode-switch"
      title="ONE · 一个"
      @click="togglePanel"
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
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
        <line x1="8" y1="9" x2="16" y2="9"></line>
        <line x1="8" y1="13" x2="13" y2="13"></line>
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="panel-fade">
        <div v-if="showPanel" class="daily-quote-overlay" @click.self="closePanel">
          <div class="daily-quote-container">
          <!-- 卡片主体 -->
          <div class="daily-quote-card" :style="cardStyle">
            <div class="daily-quote-mask"></div>
            <button class="daily-quote-close" @click.stop="closePanel">&times;</button>
            
            <!-- 顶部信息区 -->
            <div class="daily-quote-top">
              <span class="daily-quote-date">{{ displayDate }}</span>
              <span v-if="volumeDisplay" class="daily-quote-volume">{{ volumeDisplay }}</span>
            </div>
            
            <!-- 中间文字区 -->
            <div class="daily-quote-center">
              <p v-if="loading" class="daily-quote-text daily-quote-state">正在加载…</p>
              <p v-else-if="errorMessage" class="daily-quote-text daily-quote-state">{{ errorMessage }}</p>
              <p v-else-if="currentEntry?.text" class="daily-quote-text">{{ currentEntry.text }}</p>
              <p v-else class="daily-quote-text daily-quote-state">暂无内容</p>
            </div>
            
            <!-- 底部来源信息 -->
            <div v-if="sourceDisplay" class="daily-quote-source">
              {{ sourceDisplay }}
            </div>
          </div>
          
            <!-- 日历选择器 -->
          <div class="daily-quote-calendar">
            <!-- 折叠开关条 -->
             <div class="calendar-toggle-bar" @click="isCalendarExpanded = !isCalendarExpanded">
               <span class="current-selected-date">{{ selectedDateStr }}</span>
               <div class="toggle-icon" :class="{ 'expanded': isCalendarExpanded }">
                 <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                 </svg>
               </div>
             </div>

            <!-- 可展开内容 -->
            <Transition name="expand">
              <div v-show="isCalendarExpanded" class="calendar-expandable-content">
                <!-- 日历头部 -->
                <div class="calendar-header">
                  <span class="calendar-title" @click="onHeaderClick">{{ calendarHeader }}</span>
                  <div class="calendar-nav-group">
                    <button 
                      class="calendar-nav" 
                      :disabled="!canGoPrev"
                      @click="goPrev"
                    >▲</button>
                    <button 
                      class="calendar-nav" 
                      :disabled="!canGoNext"
                      @click="goNext"
                    >▼</button>
                  </div>
                </div>
                
                <!-- 视图切换容器 -->
                <div class="calendar-body">
                  <Transition :name="transitionName" mode="out-in">
                    <!-- 日期视图 -->
                    <div v-if="viewMode === 'day'" :key="`day-${calendarYear}-${calendarMonth}`">
                      <!-- 星期标题 -->
                      <div class="calendar-weekdays">
                        <span v-for="w in weekDays" :key="w" class="weekday">{{ w }}</span>
                      </div>
                      
                      <!-- 日期格子 -->
                      <div class="calendar-days">
                        <button
                          v-for="(day, index) in calendarDays"
                          :key="index"
                          class="calendar-day"
                          :class="{
                            'other-month': day.type !== 'current',
                            'disabled': day.disabled,
                            'selected': day.type === 'current' && isDaySelected(day.day),
                            'today': day.type === 'current' && isTodayDate(day.day)
                          }"
                          :disabled="day.disabled"
                          @click="selectDay(day)"
                        >
                          <span class="day-num">{{ day.day }}</span>
                        </button>
                      </div>
                    </div>

                    <!-- 月份视图 -->
                    <div v-else-if="viewMode === 'month'" :key="`month-${calendarYear}`" class="view-container">
                      <div class="calendar-grid grid-4x4">
                        <button
                          v-for="item in monthItems"
                          :key="`${item.year}-${item.month}`"
                          class="grid-item"
                          :class="{
                            'selected': item.selected,
                            'disabled': item.disabled,
                            'outside': item.outside
                          }"
                          :disabled="item.disabled"
                          @click="selectMonth(item)"
                        >
                          {{ item.month }}
                        </button>
                      </div>
                    </div>

                    <!-- 年份视图 -->
                    <div v-else-if="viewMode === 'year'" :key="`year-${decadeStart}`" class="view-container">
                      <div class="calendar-grid grid-4x4">
                        <button
                          v-for="item in yearItems"
                          :key="item.year"
                          class="grid-item"
                          :class="{
                            'selected': item.selected,
                            'disabled': item.disabled,
                            'outside': item.outside
                          }"
                          :disabled="item.disabled"
                          @click="selectYearItem(item)"
                        >
                          {{ item.year }}
                        </button>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ... existing styles ... */
/* 保持原有样式，添加 view-container */

.view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 4x4 网格（月/年视图） */
.calendar-grid {
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 0.6rem;
  padding: 0.2rem 0;
  flex: 1; /* 充满剩余空间 */
  height: 100%; /* 显式高度以确保 grid-rows 生效 */
}

/* 恢复原有样式 */
.navbar-daily-quote {
  position: fixed;
  top: 14px;
  right: 150px;
  z-index: 200;
}

.daily-quote-toggle {
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

.daily-quote-toggle:hover {
  background: var(--vp-c-bg-soft, rgba(0, 0, 0, 0.05));
  color: var(--vp-c-text-1, #333);
}

.daily-quote-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.daily-quote-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  /* animation removed, handled by transition */
}

.daily-quote-card {
  position: relative;
  width: min(92vw, 780px);
  aspect-ratio: 16 / 9;
  border-radius: 26px;
  overflow: hidden;
  background: linear-gradient(135deg, #2b2b2b, #1a1a1a);
  background-size: cover;
  background-position: center;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}

.daily-quote-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(1px);
}

.daily-quote-top {
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 2;
}

.daily-quote-date {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.2rem;
  color: #fff;
  text-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}

.daily-quote-volume {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.15);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.daily-quote-close {
  position: absolute;
  right: 16px;
  top: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 1.4rem;
  border-radius: 8px;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s ease;
}

.daily-quote-close:hover {
  background: rgba(0, 0, 0, 0.5);
}

.daily-quote-center {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3rem;
  text-align: center;
}

.daily-quote-text {
  color: #fff;
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1.6;
  text-shadow: 0 10px 20px rgba(0, 0, 0, 0.45);
  margin: 0;
}

.daily-quote-state {
  font-size: 1.1rem;
  font-weight: 500;
  opacity: 0.85;
}

.daily-quote-source {
  position: absolute;
  bottom: 18px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
  z-index: 2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

@keyframes daily-quote-in {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

</style>

<style scoped>
/* 日历容器 - 玻璃拟态 */
.daily-quote-calendar {
  background: rgba(30, 30, 35, 0.7); /* 更透明的背景 */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 300px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  padding: 0; /* 移除容器内边距，使子元素贴边 */
}

/* 折叠开关条 */
.calendar-toggle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem; /* 增加舒适的内边距 */
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0);
}

.calendar-toggle-bar:hover {
  background: rgba(255, 255, 255, 0.05);
}

.current-selected-date {
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.05rem;
}

.toggle-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  transition: transform 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%; /* 圆形图标按钮 */
}

.toggle-icon.expanded {
  transform: rotate(180deg);
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* 展开的内容区域 */
.calendar-expandable-content {
  padding: 0 1.2rem 1.2rem 1.2rem;
  /* 移除边框，使用 padding 分隔 */
  background: rgba(0, 0, 0, 0.1); /*稍微加深背景区分层级 */
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  max-height: 400px; 
  opacity: 1;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-bottom: 0; /* 并在收起时移除 padding，防止跳动 */
}

/* 主面板过渡动画 */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-fade-enter-active .daily-quote-container,
.panel-fade-leave-active .daily-quote-container {
  transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
}

.panel-fade-enter-from .daily-quote-container,
.panel-fade-leave-to .daily-quote-container {
  transform: scale(0.95) translateY(-8px);
}

/* 之前的内容样式微调 */
.calendar-body {
  position: relative;
  height: 260px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  margin-top: 0.5rem; 
}

/* 切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: scale(1.05) translateY(-4px);
}

/* 滑动切换动画 */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: all 0.25s ease-out;
}

.slide-next-enter-from {
  opacity: 0;
  transform: translateY(15px);
}
.slide-next-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

.slide-prev-enter-from {
  opacity: 0;
  transform: translateY(-15px);
}
.slide-prev-leave-to {
  opacity: 0;
  transform: translateY(15px);
}

.calendar-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
  padding: 0.5rem 0.25rem 0;
}

.calendar-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.calendar-title:hover {
  background: rgba(255, 255, 255, 0.1);
}

.calendar-nav-group {
  display: flex;
  gap: 0.4rem;
}

.calendar-nav {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.calendar-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.calendar-nav:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

/* 4x4 网格（月/年视图） */
.calendar-grid {
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 0.6rem;
  padding: 0.2rem 0;
  flex: 1; /* 充满剩余空间 */
}

.grid-4x4 {
  grid-template-columns: repeat(4, 1fr);
}

.grid-item {
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 500;
  color: #fff;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.grid-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
}

.grid-item.selected {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
}

.grid-item.outside {
  opacity: 0.4;
  font-size: 0.85rem;
}

.grid-item.disabled {
  opacity: 0.15;
  cursor: not-allowed;
  background: transparent;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 0.4rem;
}

.weekday {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  padding: 0.25rem 0;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  width: 36px;
  height: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: #fff;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.15s ease;
}

.calendar-day:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.calendar-day.other-month {
  color: rgba(255, 255, 255, 0.25);
}

.calendar-day.disabled {
  color: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

.calendar-day.today {
  background: rgba(64, 158, 255, 0.2);
  color: #64b5ff;
}

.calendar-day.selected {
  background: #409eff;
  color: #fff;
}

@media (max-width: 719px) {
  .navbar-daily-quote {
    right: 140px;
    top: 10px;
  }

  .daily-quote-card {
    width: 94vw;
    border-radius: 22px;
  }

  .daily-quote-text {
    font-size: 1.1rem;
  }

  .daily-quote-date {
    font-size: 1.2rem;
  }

  .daily-quote-center {
    padding: 0 1.5rem;
  }

  .daily-quote-calendar {
    min-width: 260px;
    /* padding: 0.8rem;  removed in favor of internal padding */
  }

  .calendar-day {
    font-size: 0.8rem;
  }
}
</style>
