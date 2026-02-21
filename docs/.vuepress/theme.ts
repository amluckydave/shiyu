import { hopeTheme } from "vuepress-theme-hope";

export default hopeTheme({
    hostname: "https://example.com",

    logo: "/logo.png",

    // 全局禁用面包屑，仅在文章页面通过 frontmatter 启用
    breadcrumb: false,

    author: {
        name: "作者",
        url: "https://example.com",
    },

    // 仅中文
    locales: {
        "/": {
            navbarLocales: {
                langName: "简体中文",
            },
        },
    },



    // 导航栏
    navbar: [
        { text: "首页", link: "/", icon: "home" },
        { text: "文章管理", link: "/articles", icon: "folder-open" },
        { text: "生词本", link: "/vocabulary", icon: "book" },
        { text: "长难句库", link: "/sentences", icon: "star" },
        { text: "API 设置", link: "/api-settings", icon: "gears" },
    ],

    // 侧边栏 - 禁用（使用文章管理页面代替）
    sidebar: false,

    // 启用右侧目录，自定义选择器以匹配 BilingualReader 内的标题
    toc: {
        selector: ".bilingual-reader h1, .bilingual-reader h2, .bilingual-reader h3, .bilingual-reader h4, .bilingual-reader h5, .bilingual-reader h6, #markdown-content > h1, #markdown-content > h2, #markdown-content > h3, #markdown-content > h4",
        levels: [2, 4],
    },

    // 页脚
    footer: "拾语 - 智能英语学习平台",
    displayFooter: true,

    // Markdown 配置
    markdown: {
        align: true,
        attrs: true,
        component: true,
        mark: true,
        tasklist: true,
    },

    // 插件配置
    plugins: {
        icon: {
            assets: "fontawesome",
        },
    },
});
