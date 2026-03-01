<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import {
  buildOneApiUrl,
  formatOneDisplayDate,
  mapOneResponse,
  readOneCache,
  writeOneCache,
  type OneDailyEntry,
  type OneDailyResponse
} from "../../legacy/bilingual-pack-client/utils/oneApi"

type ViewMode = "day" | "month" | "year"

const showPanel = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const currentEntry = ref<OneDailyEntry | null>(null)

const now = new Date()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1
const todayDay = now.getDate()
const minYear = todayYear - 2

const viewMode = ref<ViewMode>("day")
const transitionName = ref("fade-slide")

const calendarYear = ref(todayYear)
const calendarMonth = ref(todayMonth)
const decadeStart = ref(Math.floor(todayYear / 10) * 10)

const selectedYear = ref(todayYear)
const selectedMonth = ref(todayMonth)
const selectedDay = ref(todayDay)

const isCalendarExpanded = ref(false)
const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

const selectedDateStr = computed(() => {
  const y = selectedYear.value
  const m = String(selectedMonth.value).padStart(2, "0")
  const d = String(selectedDay.value).padStart(2, "0")
  return `${y}-${m}-${d}`
})

const isToday = computed(() => {
  return (
    selectedYear.value === todayYear &&
    selectedMonth.value === todayMonth &&
    selectedDay.value === todayDay
  )
})

const displayDate = computed(() => formatOneDisplayDate(currentEntry.value, new Date()))
const cardStyle = computed(() =>
  currentEntry.value?.imageUrl ? { backgroundImage: `url("${currentEntry.value.imageUrl}")` } : {}
)

const calendarHeader = computed(() => {
  if (viewMode.value === "day") return `${calendarYear.value}年${calendarMonth.value}月`
  if (viewMode.value === "month") return `${calendarYear.value}年`
  return `${decadeStart.value} - ${decadeStart.value + 9}`
})

const canGoNext = computed(() => {
  if (viewMode.value === "day") {
    if (calendarYear.value < todayYear) return true
    if (calendarYear.value === todayYear && calendarMonth.value < todayMonth) return true
    return false
  }
  if (viewMode.value === "month") {
    return calendarYear.value < todayYear
  }
  return decadeStart.value + 10 <= todayYear
})

const canGoPrev = computed(() => {
  if (viewMode.value === "day") {
    if (calendarYear.value > minYear) return true
    if (calendarYear.value === minYear && calendarMonth.value > 1) return true
    return false
  }
  if (viewMode.value === "month") {
    return calendarYear.value > minYear
  }
  return decadeStart.value > Math.floor(minYear / 10) * 10
})

function goNext() {
  if (!canGoNext.value) return
  transitionName.value = "slide-next"
  if (viewMode.value === "day") {
    if (calendarMonth.value === 12) {
      calendarMonth.value = 1
      calendarYear.value++
    } else {
      calendarMonth.value++
    }
    return
  }
  if (viewMode.value === "month") {
    calendarYear.value++
    return
  }
  decadeStart.value += 10
}

function goPrev() {
  if (!canGoPrev.value) return
  transitionName.value = "slide-prev"
  if (viewMode.value === "day") {
    if (calendarMonth.value === 1) {
      calendarMonth.value = 12
      calendarYear.value--
    } else {
      calendarMonth.value--
    }
    return
  }
  if (viewMode.value === "month") {
    calendarYear.value--
    return
  }
  decadeStart.value -= 10
}

function onHeaderClick() {
  transitionName.value = "fade-slide"
  if (viewMode.value === "day") {
    viewMode.value = "month"
    return
  }
  if (viewMode.value === "month") {
    viewMode.value = "year"
  }
}

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
  return (
    calendarYear.value === selectedYear.value &&
    calendarMonth.value === selectedMonth.value &&
    day === selectedDay.value
  )
}

function isTodayDate(day: number): boolean {
  return (
    calendarYear.value === todayYear &&
    calendarMonth.value === todayMonth &&
    day === todayDay
  )
}

const calendarDays = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = getFirstDayOfMonth(year, month)
  const daysCount = getDaysInMonth(year, month)
  const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1)

  const days: Array<{ day: number; type: "prev" | "current" | "next"; disabled: boolean }> = []

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  for (let i = firstDay - 1; i > 0; i--) {
    const d = prevMonthDays - i + 1
    days.push({
      day: d,
      type: "prev",
      disabled: isFutureDate(prevYear, prevMonth, d) || prevYear < minYear
    })
  }

  for (let i = 1; i <= daysCount; i++) {
    days.push({ day: i, type: "current", disabled: isFutureDate(year, month, i) })
  }

  const remaining = 42 - days.length
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      type: "next",
      disabled: isFutureDate(nextYear, nextMonth, i)
    })
  }

  return days
})

const monthItems = computed(() => {
  const year = calendarYear.value
  const items: Array<{
    month: number
    year: number
    disabled: boolean
    selected: boolean
    outside: boolean
  }> = []

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

  for (let m = 1; m <= 12; m++) {
    const isFuture = year > todayYear || (year === todayYear && m > todayMonth)
    const tooEarly = year < minYear
    items.push({
      month: m,
      year,
      disabled: isFuture || tooEarly,
      selected: year === selectedYear.value && m === selectedMonth.value,
      outside: false
    })
  }

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

const yearItems = computed(() => {
  const start = decadeStart.value - 3
  const items: Array<{ year: number; disabled: boolean; selected: boolean; outside: boolean }> = []

  for (let i = 0; i < 16; i++) {
    const year = start + i
    const isFuture = year > todayYear
    const tooEarly = year < minYear
    const outsideDecade = year < decadeStart.value || year >= decadeStart.value + 10
    items.push({
      year,
      disabled: isFuture || tooEarly,
      selected: year === selectedYear.value,
      outside: outsideDecade
    })
  }

  return items
})

async function selectDay(day: { day: number; type: "prev" | "current" | "next"; disabled: boolean }) {
  if (day.disabled) return

  if (day.type === "prev") {
    if (calendarMonth.value === 1) {
      calendarMonth.value = 12
      calendarYear.value--
    } else {
      calendarMonth.value--
    }
  } else if (day.type === "next") {
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
  isCalendarExpanded.value = false
}

function selectMonth(item: { month: number; year: number; disabled: boolean; outside: boolean }) {
  if (item.disabled) return
  if (item.outside) {
    calendarYear.value = item.year
  }
  calendarMonth.value = item.month
  transitionName.value = "fade-slide"
  viewMode.value = "day"
}

function selectYearItem(item: { year: number; disabled: boolean; outside: boolean }) {
  if (item.disabled) return
  if (item.outside) {
    decadeStart.value = Math.floor(item.year / 10) * 10
  }
  calendarYear.value = item.year
  transitionName.value = "fade-slide"
  viewMode.value = "month"
}

async function fetchOneData(dateStr: string = "0") {
  loading.value = true
  errorMessage.value = null

  try {
    const response = await fetch(buildOneApiUrl(dateStr))
    if (!response.ok) {
      throw new Error(`接口请求失败：${response.status}`)
    }

    const payload = (await response.json()) as OneDailyResponse
    const mapped = mapOneResponse(payload)
    if (!mapped) {
      throw new Error("接口返回数据格式不正确")
    }

    currentEntry.value = mapped

    if (dateStr === "0") {
      writeOneCache(mapped)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "获取每日一句失败"
  } finally {
    loading.value = false
  }
}

async function ensureData() {
  if (isToday.value) {
    const cached = readOneCache()
    if (cached) {
      currentEntry.value = cached
      return
    }
    await fetchOneData("0")
    return
  }

  await fetchOneData(selectedDateStr.value)
}

async function changeDate() {
  if (isToday.value) {
    await fetchOneData("0")
    return
  }
  await fetchOneData(selectedDateStr.value)
}

async function togglePanel() {
  showPanel.value = !showPanel.value
  if (!showPanel.value) return
  isCalendarExpanded.value = false
  await ensureData()
}

function closePanel() {
  showPanel.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closePanel()
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown)
})

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <div class="toolbar-daily-quote">
    <button class="tool-btn" title="每日一句" @click="togglePanel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
        <path d="M8 9h8"></path>
        <path d="M8 13h5"></path>
      </svg>
      <span>每日一句</span>
    </button>

    <Teleport to="body">
      <Transition name="panel-fade">
        <div v-if="showPanel" class="daily-overlay" @click.self="closePanel">
          <div class="daily-container">
            <section class="daily-card" :style="cardStyle">
              <div class="daily-mask"></div>
              <button class="close-btn" @click="closePanel" aria-label="关闭">&times;</button>

              <header class="daily-head">
                <span class="daily-date">{{ displayDate }}</span>
                <span v-if="currentEntry?.volume" class="daily-vol">{{ currentEntry.volume }}</span>
              </header>

              <main class="daily-content">
                <p v-if="loading" class="daily-state">正在加载每日一句...</p>
                <p v-else-if="errorMessage" class="daily-state">{{ errorMessage }}</p>
                <p v-else-if="currentEntry?.text" class="daily-text">{{ currentEntry.text }}</p>
                <p v-else class="daily-state">暂无内容</p>
              </main>

              <footer v-if="currentEntry?.wordsInfo || currentEntry?.picInfo" class="daily-foot">
                <span v-if="currentEntry?.wordsInfo">{{ currentEntry.wordsInfo }}</span>
                <span v-if="currentEntry?.picInfo"> · {{ currentEntry.picInfo }}</span>
              </footer>
            </section>

            <section class="daily-calendar">
              <div class="calendar-toggle-bar" @click="isCalendarExpanded = !isCalendarExpanded">
                <span class="current-selected-date">{{ selectedDateStr }}</span>
                <span class="toggle-icon" :class="{ expanded: isCalendarExpanded }">▾</span>
              </div>

              <Transition name="expand">
                <div v-show="isCalendarExpanded" class="calendar-expandable-content">
                  <div class="calendar-header">
                    <span class="calendar-title" @click="onHeaderClick">{{ calendarHeader }}</span>
                    <div class="calendar-nav-group">
                      <button class="calendar-nav" :disabled="!canGoPrev" @click="goPrev">◀</button>
                      <button class="calendar-nav" :disabled="!canGoNext" @click="goNext">▶</button>
                    </div>
                  </div>

                  <div class="calendar-body">
                    <Transition :name="transitionName" mode="out-in">
                      <div
                        v-if="viewMode === 'day'"
                        :key="`day-${calendarYear}-${calendarMonth}`"
                        class="view-container"
                      >
                        <div class="calendar-weekdays">
                          <span v-for="w in weekDays" :key="w" class="weekday">{{ w }}</span>
                        </div>
                        <div class="calendar-days">
                          <button
                            v-for="(day, index) in calendarDays"
                            :key="index"
                            class="calendar-day"
                            :class="{
                              'other-month': day.type !== 'current',
                              disabled: day.disabled,
                              selected: day.type === 'current' && isDaySelected(day.day),
                              today: day.type === 'current' && isTodayDate(day.day)
                            }"
                            :disabled="day.disabled"
                            @click="selectDay(day)"
                          >
                            {{ day.day }}
                          </button>
                        </div>
                      </div>

                      <div
                        v-else-if="viewMode === 'month'"
                        :key="`month-${calendarYear}`"
                        class="view-container"
                      >
                        <div class="calendar-grid grid-4x4">
                          <button
                            v-for="item in monthItems"
                            :key="`${item.year}-${item.month}`"
                            class="grid-item"
                            :class="{
                              selected: item.selected,
                              disabled: item.disabled,
                              outside: item.outside
                            }"
                            :disabled="item.disabled"
                            @click="selectMonth(item)"
                          >
                            {{ item.month }}月
                          </button>
                        </div>
                      </div>

                      <div
                        v-else
                        :key="`year-${decadeStart}`"
                        class="view-container"
                      >
                        <div class="calendar-grid grid-4x4">
                          <button
                            v-for="item in yearItems"
                            :key="item.year"
                            class="grid-item"
                            :class="{
                              selected: item.selected,
                              disabled: item.disabled,
                              outside: item.outside
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
            </section>
          </div>
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

.daily-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
}

.daily-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.daily-card {
  position: relative;
  width: min(92vw, 820px);
  aspect-ratio: 16 / 9;
  border-radius: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #1f2937, #0f172a);
  background-size: cover;
  background-position: center;
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.42);
}

.daily-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.24), rgba(2, 6, 23, 0.7));
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 14px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.daily-head {
  position: absolute;
  top: 14px;
  left: 16px;
  right: 56px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.94);
}

.daily-date {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

.daily-vol {
  font-size: 12px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}

.daily-content {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  padding: 0 32px;
}

.daily-text {
  margin: 0;
  color: #ffffff;
  font-size: clamp(18px, 2vw, 26px);
  font-weight: 700;
  line-height: 1.6;
  text-align: center;
  text-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
}

.daily-state {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
}

.daily-foot {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 14px;
  z-index: 2;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  text-align: center;
}

.daily-calendar {
  width: 324px;
  border-radius: 16px;
  border: 1px solid #dbe2ea;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

.calendar-toggle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  background: linear-gradient(180deg, rgba(248, 250, 252, 1), rgba(241, 245, 249, 0.94));
}

.calendar-toggle-bar:hover {
  background: linear-gradient(180deg, rgba(241, 245, 249, 1), rgba(226, 232, 240, 0.95));
}

.current-selected-date {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.toggle-icon {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid #dbe2ea;
  background: #f8fafc;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
  color: #0c4a6e;
  border-color: #bae6fd;
  background: #e0f2fe;
}

.calendar-expandable-content {
  padding: 0 12px 12px;
  background: rgba(248, 250, 252, 0.96);
  border-top: 1px solid #e2e8f0;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  padding-bottom: 4px;
}

.calendar-title {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 6px;
  padding: 4px 8px;
}

.calendar-title:hover {
  background: #e2e8f0;
}

.calendar-nav-group {
  display: inline-flex;
  gap: 6px;
}

.calendar-nav {
  width: 28px;
  height: 28px;
  border: 1px solid #dbe2ea;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
}

.calendar-nav:hover:not(:disabled) {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0c4a6e;
}

.calendar-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.calendar-body {
  position: relative;
  margin-top: 8px;
  height: 258px;
}

.view-container {
  height: 100%;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}

.weekday {
  text-align: center;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.calendar-day:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.calendar-day.other-month {
  color: #94a3b8;
}

.calendar-day.disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.calendar-day.today {
  color: #0c4a6e;
  box-shadow: inset 0 0 0 1.5px #7dd3fc;
  background: #f0f9ff;
}

.calendar-day.selected {
  background: linear-gradient(135deg, #0ea5e9, #22c55e);
  color: #fff;
  box-shadow: 0 8px 16px rgba(14, 165, 233, 0.28);
}

.calendar-grid {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 8px;
}

.grid-item {
  border: 1px solid #dbe2ea;
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.grid-item:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.grid-item.selected {
  border-color: #bae6fd;
  background: linear-gradient(135deg, #0ea5e9, #22c55e);
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(14, 165, 233, 0.24);
}

.grid-item.outside {
  color: #94a3b8;
}

.grid-item.disabled {
  color: #cbd5e1;
  background: #f8fafc;
  cursor: not-allowed;
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  max-height: 360px;
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active,
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.slide-next-enter-from,
.slide-prev-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to,
.slide-next-leave-to,
.slide-prev-leave-to {
  opacity: 0;
  transform: translateY(-8px);
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

  .daily-calendar {
    width: min(92vw, 340px);
  }
}
</style>
