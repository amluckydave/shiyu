import { useBilingualData } from './useBilingualData'

// API设置的localStorage key
const API_SETTINGS_KEY = 'vuepress-api-settings'

// 导出数据版本
const EXPORT_VERSION = '1.0'

interface ExportData {
    version: string
    exportedAt: string
    vocabulary: any[]
    sentences: any[]
    apiSettings: any
}

interface ImportOptions {
    mode: 'replace' | 'merge'
}

export function useDataExport() {
    const { data, isInitialized, initData } = useBilingualData()

    // 确保数据已初始化
    if (!isInitialized.value) {
        initData()
    }

    /**
     * 获取API设置
     */
    function getApiSettings(): any {
        if (typeof window === 'undefined') return null
        const stored = localStorage.getItem(API_SETTINGS_KEY)
        if (stored) {
            try {
                return JSON.parse(stored)
            } catch {
                return null
            }
        }
        return null
    }

    /**
     * 保存API设置
     */
    function saveApiSettings(settings: any): void {
        if (typeof window === 'undefined') return
        localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(settings))
    }

    /**
     * 导出所有数据为JSON文件
     */
    function exportAllData(): void {
        const exportData: ExportData = {
            version: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            vocabulary: data.vocabulary,
            sentences: data.sentences,
            apiSettings: getApiSettings()
        }

        const jsonString = JSON.stringify(exportData, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `bilingual-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    /**
     * 从文件导入数据
     */
    async function importAllData(file: File, options: ImportOptions = { mode: 'replace' }): Promise<{ success: boolean; message: string }> {
        try {
            const text = await file.text()
            const importData: ExportData = JSON.parse(text)

            // 验证数据格式
            if (!importData.version) {
                return { success: false, message: '无效的数据格式：缺少版本信息' }
            }

            if (options.mode === 'replace') {
                // 替换模式：直接覆盖
                if (importData.vocabulary) {
                    data.vocabulary = importData.vocabulary
                }
                if (importData.sentences) {
                    data.sentences = importData.sentences
                }
                if (importData.apiSettings) {
                    saveApiSettings(importData.apiSettings)
                }
            } else {
                // 合并模式：按ID去重合并
                if (importData.vocabulary) {
                    const existingIds = new Set(data.vocabulary.map(w => w.id))
                    for (const word of importData.vocabulary) {
                        if (!existingIds.has(word.id)) {
                            data.vocabulary.push(word)
                        }
                    }
                }
                if (importData.sentences) {
                    const existingIds = new Set(data.sentences.map(s => s.id))
                    for (const sentence of importData.sentences) {
                        if (!existingIds.has(sentence.id)) {
                            data.sentences.push(sentence)
                        }
                    }
                }
                // API设置始终覆盖（合并没有意义）
                if (importData.apiSettings) {
                    saveApiSettings(importData.apiSettings)
                }
            }

            // 立即保存到服务器，不等待 watch 防抖
            try {
                const token = localStorage.getItem('shiyu_token')
                const apiBase = typeof import.meta !== 'undefined'
                    ? ((import.meta as any).env?.VITE_API_URL as string || 'http://localhost:3100')
                    : 'http://localhost:3100'
                await fetch(`${apiBase}/api/v1/user/data`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        vocabulary: data.vocabulary,
                        sentences: data.sentences
                    })
                })
            } catch (saveError) {
                console.error('Failed to save imported data:', saveError)
            }

            const stats = {
                vocabulary: importData.vocabulary?.length || 0,
                sentences: importData.sentences?.length || 0,
                hasApiSettings: !!importData.apiSettings
            }

            return {
                success: true,
                message: `导入成功！生词: ${stats.vocabulary} 个, 句子: ${stats.sentences} 个${stats.hasApiSettings ? ', API设置已更新' : ''}`
            }
        } catch (error: any) {
            return { success: false, message: `导入失败: ${error.message}` }
        }
    }

    return {
        exportAllData,
        importAllData
    }
}
