import type { Plugin } from "vuepress/core";
import { getDirname, path } from "vuepress/utils";

const __dirname = getDirname(import.meta.url);

export interface BilingualPackPluginOptions {
    // 插件选项（可扩展）
}

export const bilingualPackPlugin = (
    options: BilingualPackPluginOptions = {}
): Plugin => {
    return {
        name: "bilingual-pack",

        clientConfigFile: path.resolve(__dirname, "./client/config.ts"),
    };
};

export default bilingualPackPlugin;
