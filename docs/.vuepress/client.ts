import { defineClientConfig } from "vuepress/client";
import { h } from "vue";
import BilingualReader from "./plugins/bilingual-pack/client/components/BilingualReader.vue";
import BilingualToggle from "./plugins/bilingual-pack/client/components/BilingualToggle.vue";
import NavbarBilingualToggle from "./plugins/bilingual-pack/client/components/NavbarBilingualToggle.vue";
import NavbarDataManager from "./plugins/bilingual-pack/client/components/NavbarDataManager.vue";
import NavbarDailyQuote from "./plugins/bilingual-pack/client/components/NavbarDailyQuote.vue";
import VocabularyNotebook from "./plugins/bilingual-pack/client/components/VocabularyNotebook.vue";
import SentenceBank from "./plugins/bilingual-pack/client/components/SentenceBank.vue";
import ArticleManager from "./plugins/bilingual-pack/client/components/ArticleManager.vue";
import ApiSettings from "./plugins/bilingual-pack/client/components/ApiSettings.vue";
import LandingPage from "./components/LandingPage.vue";
import EbookReader from "./components/EbookReader.vue";

export default defineClientConfig({
    enhance({ app }) {
        // 注册 bilingual_pack 全局组件
        app.component("BilingualReader", BilingualReader);
        app.component("BilingualToggle", BilingualToggle);
        app.component("NavbarBilingualToggle", NavbarBilingualToggle);
        app.component("NavbarDataManager", NavbarDataManager);
        app.component("NavbarDailyQuote", NavbarDailyQuote);
        app.component("VocabularyNotebook", VocabularyNotebook);
        app.component("SentenceBank", SentenceBank);
        app.component("ArticleManager", ArticleManager);
        app.component("ApiSettings", ApiSettings);
        app.component("LandingPage", LandingPage);
        app.component("EbookReader", EbookReader);
    },
    rootComponents: [
        // 在全局添加导航栏标注开关
        () => h(NavbarBilingualToggle),
        // 在全局添加每日一言按钮
        () => h(NavbarDailyQuote),
        // 在全局添加数据管理按钮
        () => h(NavbarDataManager),
    ],
});
