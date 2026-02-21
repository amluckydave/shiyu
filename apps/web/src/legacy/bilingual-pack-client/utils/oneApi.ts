/**
 * 「ONE · 一个」APP API 工具函数
 * API文档: https://github.com/Litten1106/one-api-collect
 */

export interface OneContentItem {
    id: string
    category: string
    item_id: string
    title: string
    forward: string      // 每日一言文字
    img_url: string      // 图片URL
    volume: string       // 期数 如 "VOL.2060"
    pic_info: string     // 摄影师信息
    words_info: string   // 文字来源
    post_date: string    // 发布日期
    like_count: number
    share_url: string
    author?: {
        user_name: string
        desc: string
    }
}

export interface OneWeatherInfo {
    city_name: string
    date: string
    temperature: string
    humidity: string
    climate: string
    hurricane: string  // 风向
    icons: {
        day: string
        night: string
    }
}

export interface OneDailyResponse {
    res: number
    data: {
        id: string
        weather: OneWeatherInfo
        date: string
        content_list: OneContentItem[]
        menu: {
            vol: string
            list: Array<{
                content_type: string
                content_id: string
                title: string
            }>
        }
    }
}

export interface OneDailyEntry {
    date: string | null
    text: string | null         // forward 字段
    imageUrl: string            // img_url 字段
    volume: string | null       // 期数
    picInfo: string | null      // 摄影师信息
    wordsInfo: string | null    // 文字来源
    weather: OneWeatherInfo | null
    year: number | null
    month: number | null
    dayOfMonth: number | null
}

// ONE API 基础配置
const ONE_API_HOST = 'http://v3.wufazhuce.com:8000'
const ONE_API_PATH = '/api/channel/one'
const DEFAULT_LOCATION = '0'

// 本地存储键
const ONE_CACHE_KEY = 'one-daily-cache-v1'

/**
 * 检测是否为本地开发环境
 */
function isLocalDev(): boolean {
    if (typeof window === 'undefined') return false
    const hostname = window.location.hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
}

/**
 * 构建 ONE API URL
 * @param dateStr 日期字符串 (yyyy-MM-dd) 或 '0' (今日)
 * @param location 城市代码 (默认为 '0')
 */
export function buildOneApiUrl(dateStr: string = '0', location: string = DEFAULT_LOCATION): string {
    const CORS_PROXY = 'https://corsproxy.io/?url='
    // API 格式: /api/channel/one/{date}/{location}
    const targetUrl = `${ONE_API_HOST}${ONE_API_PATH}/${dateStr}/${encodeURIComponent(location)}`

    if (isLocalDev()) {
        // 开发环境：使用 Vite 代理
        // 假设 vite.config.ts 配置了代理 /one-api -> http://v3.wufazhuce.com:8000/api
        // 那么请求路径应该是 /one-api/channel/one/{date}/{location}
        return `/one-api/channel/one/${dateStr}/${encodeURIComponent(location)}`
    } else {
        // 生产环境：使用 CORS 代理
        return `${CORS_PROXY}${encodeURIComponent(targetUrl)}`
    }
}

/**
 * 解析日期字符串为日期组件
 * @param dateStr 日期字符串，格式如 "2018-05-28 06:00:00"
 */
function parseDateComponents(dateStr: string | null): {
    year: number | null
    month: number | null
    dayOfMonth: number | null
    dateText: string | null
} {
    if (!dateStr) {
        return { year: null, month: null, dayOfMonth: null, dateText: null }
    }

    // 尝试匹配 "YYYY-MM-DD" 或 "YYYY-MM-DD HH:mm:ss" 格式
    const match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (match) {
        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10)
        const dayOfMonth = parseInt(match[3], 10)
        const dateText = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`
        return { year, month, dayOfMonth, dateText }
    }

    return { year: null, month: null, dayOfMonth: null, dateText: dateStr }
}

/**
 * 将 ONE API 响应转换为统一的条目格式
 */
export function mapOneResponse(response: OneDailyResponse): OneDailyEntry | null {
    if (response.res !== 0 || !response.data) {
        return null
    }

    const { data } = response
    const contentList = data.content_list || []

    // 获取第一个内容条目（通常是摄影/每日图文）
    const firstContent = contentList.find(item => item.category === '0') || contentList[0]

    if (!firstContent) {
        return null
    }

    const dateInfo = parseDateComponents(data.date || firstContent.post_date)

    return {
        date: dateInfo.dateText,
        text: firstContent.forward || null,
        imageUrl: firstContent.img_url || '',
        volume: firstContent.volume || null,
        picInfo: firstContent.pic_info || null,
        wordsInfo: firstContent.words_info || null,
        weather: data.weather || null,
        year: dateInfo.year,
        month: dateInfo.month,
        dayOfMonth: dateInfo.dayOfMonth
    }
}

/**
 * 读取缓存的 ONE 数据
 */
export function readOneCache(): OneDailyEntry | null {
    try {
        const raw = localStorage.getItem(ONE_CACHE_KEY)
        if (!raw) return null

        const parsed = JSON.parse(raw) as { date?: string; entry?: OneDailyEntry }

        // 检查缓存是否过期（当天有效）
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        if (parsed.date !== todayStr || !parsed.entry) {
            return null
        }

        return parsed.entry
    } catch {
        return null
    }
}

/**
 * 写入 ONE 数据缓存
 */
export function writeOneCache(entry: OneDailyEntry): void {
    try {
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        localStorage.setItem(ONE_CACHE_KEY, JSON.stringify({
            date: todayStr,
            entry
        }))
    } catch {
        // 忽略缓存写入失败
    }
}



/**
 * 格式化显示日期
 */
export function formatOneDisplayDate(entry: OneDailyEntry | null, fallback: Date): string {
    if (!entry) {
        const day = fallback.getDate()
        const month = fallback.getMonth() + 1
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
    }

    const day = entry.dayOfMonth ?? fallback.getDate()
    const month = entry.month ?? fallback.getMonth() + 1
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
}


