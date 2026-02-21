import { ref, computed, onMounted } from 'vue'

export interface EbookInfo {
    id: string
    title: string
    file: string
    format: 'mobi' | 'epub' | 'azw3'
    author?: string
    cover?: string | null
    description?: string
    addedAt: number
    lastReadAt?: number
    progress?: number
}

const ebooks = ref<EbookInfo[]>([])
const isLoaded = ref(false)

export function useEbooks() {
    // 搜索关键词
    const searchQuery = ref('')

    // 加载电子书列表
    async function loadEbooks() {
        if (isLoaded.value) return

        try {
            const response = await fetch('/content/ebooks/books.json')
            if (response.ok) {
                ebooks.value = await response.json()
            }
        } catch (error) {
            console.error('加载电子书列表失败:', error)
        }
        isLoaded.value = true
    }

    // 筛选后的电子书列表
    const filteredEbooks = computed(() => {
        let result = ebooks.value

        if (searchQuery.value) {
            const query = searchQuery.value.toLowerCase()
            result = result.filter(book =>
                book.title.toLowerCase().includes(query) ||
                (book.author?.toLowerCase().includes(query) ?? false) ||
                (book.description?.toLowerCase().includes(query) ?? false)
            )
        }

        return result
    })

    // 获取电子书文件 URL
    function getEbookUrl(book: EbookInfo): string {
        return `/content/ebooks/${book.file}`
    }

    // 统计
    const stats = computed(() => ({
        totalEbooks: ebooks.value.length
    }))

    // 组件挂载时加载
    onMounted(() => {
        loadEbooks()
    })

    return {
        ebooks,
        filteredEbooks,
        searchQuery,
        stats,
        loadEbooks,
        getEbookUrl,
        isLoaded
    }
}
