import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import theme from "./theme.js";
import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";
import fileSystemStorage from "./vite-plugin-filesystem-storage";

const require = createRequire(import.meta.url);
const { watch } = require("chokidar");

export default defineUserConfig({
    base: "/",
    lang: "zh-CN",
    title: "拾语",
    description: "智能英语阅读标注平台，生词管理与长难句分析一站式解决",

    head: [
        ["link", { rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    ],



    bundler: viteBundler({
        viteOptions: {
            plugins: [fileSystemStorage()],
            server: {
                proxy: {
                    "/api/wordEveryDay": {
                        target: "https://api-cdn.topwidgets.com",
                        changeOrigin: true,
                        secure: true,
                        rewrite: (path) => path.replace(/^\/api\/wordEveryDay/, "/api/app/wordEveryDay"),
                    },
                    // ONE · 一个 APP API 代理
                    "/one-api": {
                        target: "http://v3.wufazhuce.com:8000",
                        changeOrigin: true,
                        secure: false,
                        rewrite: (path) => path.replace(/^\/one-api/, "/api"),
                    },
                },
            },
        },
    }),
    theme,

    // 自动检测文章列表 (启动时)
    async onInitialized(app) {
        // 计算英文词数的辅助函数
        const countWords = (content: string): number => {
            // 去除HTML标签
            const textOnly = content.replace(/<[^>]+>/g, ' ');
            // 匹配所有英文单词（连续字母）
            const words = textOnly.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g);
            return words ? words.length : 0;
        };

        const generateData = () => {
            return app.pages
                .filter(page => page.path.startsWith('/content/articles/') && !page.path.endsWith('/'))
                .map(page => {
                    const wordCount = countWords(page.contentRendered || '');
                    return {
                        id: page.key,
                        title: page.title,
                        path: page.path,
                        icon: page.frontmatter.icon || 'file-alt',
                        description: page.frontmatter.description || (page.contentRendered.replace(/<[^>]+>/g, '').slice(0, 100) + '...'),
                        wordCount,
                        vocabularyCount: 0,
                        sentenceCount: 0,
                        category: (page.frontmatter.category as string) || '文章',
                        isCustom: false
                    };
                });
        }

        await app.writeTemp('internal/article-data.js', `export const articles = ${JSON.stringify(generateData())}`)
    },

    // 监听文件变化 (HMR)
    onWatched(app, watchers) {
        const articlesDir = app.dir.source('content/articles');

        // 计算英文词数的辅助函数
        const countWordsFromMarkdown = (content: string): number => {
            // 去除 frontmatter (--- ... ---)
            const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/m, '');
            // 匹配所有英文单词（连续字母）
            const words = withoutFrontmatter.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g);
            return words ? words.length : 0;
        };

        const updateData = async () => {
            // 手动扫描 docs/content/articles 目录
            if (!fs.existsSync(articlesDir)) return;

            const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md') && f !== 'README.md');
            const articles = files.map(file => {
                const content = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
                // 简单解析 Frontmatter
                const titleMatch = content.match(/title:\s*(.*)/);
                const title = titleMatch ? titleMatch[1].trim().replace(/^['"]|['"]$/g, '') : file.replace('.md', '');
                const iconMatch = content.match(/icon:\s*(.*)/);
                const icon = iconMatch ? iconMatch[1].trim() : 'file-alt';

                // 计算词数
                const wordCount = countWordsFromMarkdown(content);

                // 生成路径 (保持 VuePress 默认行为: 空格 -> %20)
                // 注意：这里手动构建的路径可能与 VuePress 内部的不完全一致（如 slugify），但对于简单文件名通常有效
                const urlPath = '/content/articles/' + encodeURIComponent(file.replace('.md', '.html')).replace(/%2F/g, '/');

                return {
                    id: 'auto-' + file,
                    title,
                    path: urlPath,
                    icon,
                    description: 'Auto detected article',
                    wordCount,
                    vocabularyCount: 0,
                    sentenceCount: 0,
                    category: '文章',
                    isCustom: false
                };
            });

            await app.writeTemp('internal/article-data.js', `export const articles = ${JSON.stringify(articles)}`)
        };

        const watcher = watch(articlesDir, { ignoreInitial: true });
        watcher.on('add', updateData);
        watcher.on('unlink', updateData);
        watcher.on('change', updateData);
        watchers.push(watcher);
    }
});
