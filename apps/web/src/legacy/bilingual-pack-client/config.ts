import { defineClientConfig } from "vuepress/client";
import BilingualReader from "./components/BilingualReader.vue";
import BilingualToggle from "./components/BilingualToggle.vue";
import VocabularyNotebook from "./components/VocabularyNotebook.vue";
import SentenceBank from "./components/SentenceBank.vue";
import ArticleManager from "./components/ArticleManager.vue";

export default defineClientConfig({
    enhance({ app }) {
        // 注册全局组件
        app.component("BilingualReader", BilingualReader);
        app.component("BilingualToggle", BilingualToggle);
        app.component("VocabularyNotebook", VocabularyNotebook);
        app.component("SentenceBank", SentenceBank);
        app.component("ArticleManager", ArticleManager);
    },
});
