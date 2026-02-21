import { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import os from 'os'

export default function fileSystemStorage(): Plugin {
    return {
        name: 'vite-plugin-filesystem-storage',
        configureServer(server) {
            server.middlewares.use('/api/bilingual-data', (req, res, next) => {
                const filePath = path.join(os.homedir(), '.vuepress-bilingual-data.json')

                // 处理 CORS (虽然是同源，但如果是 HMR 或者不同端口可能需要)
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

                if (req.method === 'OPTIONS') {
                    res.end()
                    return
                }

                if (req.method === 'GET') {
                    try {
                        if (fs.existsSync(filePath)) {
                            const data = fs.readFileSync(filePath, 'utf-8')
                            res.setHeader('Content-Type', 'application/json')
                            res.end(data || JSON.stringify({ vocabulary: [], sentences: [], translations: {} }))
                        } else {
                            res.setHeader('Content-Type', 'application/json')
                            res.end(JSON.stringify({ vocabulary: [], sentences: [], translations: {} }))
                        }
                    } catch (e) {
                        console.error('Error reading data file:', e)
                        res.statusCode = 500
                        res.end(JSON.stringify({ error: 'Failed to read data' }))
                    }
                    return
                }

                if (req.method === 'POST') {
                    let body = ''
                    req.on('data', chunk => body += chunk)
                    req.on('end', () => {
                        try {
                            let currentData: any = { vocabulary: [], sentences: [], translations: {} }

                            if (fs.existsSync(filePath)) {
                                try {
                                    const fileContent = fs.readFileSync(filePath, 'utf-8')
                                    if (fileContent.trim()) {
                                        currentData = JSON.parse(fileContent)
                                    }
                                } catch (readError) {
                                    console.error('Error parsing existing data file, starting fresh:', readError)
                                }
                            }

                            const update = JSON.parse(body)

                            // 合并逻辑
                            // 对于数组类型 (vocabulary, sentences)，直接替换 (客户端负责维护完整列表)
                            if (Array.isArray(update.vocabulary)) {
                                currentData.vocabulary = update.vocabulary
                            }

                            if (Array.isArray(update.sentences)) {
                                currentData.sentences = update.sentences
                            }

                            // 对于翻译对象，执行浅合并，允许差量更新
                            if (update.translations && typeof update.translations === 'object') {
                                currentData.translations = {
                                    ...(currentData.translations || {}),
                                    ...update.translations
                                }
                            }

                            fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2))

                            res.setHeader('Content-Type', 'application/json')
                            res.end(JSON.stringify({ success: true }))
                        } catch (e: any) {
                            console.error('Error writing data file:', e)
                            res.statusCode = 500
                            res.end(JSON.stringify({ error: String(e.message || e) }))
                        }
                    })
                    return
                }

                next()
            })
        }
    }
}
