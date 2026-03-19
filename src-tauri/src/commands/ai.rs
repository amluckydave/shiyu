// AI 翻译 + 流式翻译 + 句子解析
use crate::db::Database;
use crate::models::{ArticleTranslateRequest, TranslateRequest, TranslateResponse};
use futures_util::StreamExt;
use serde_json::json;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn translate_text(
    db: State<'_, Database>,
    req: TranslateRequest,
) -> Result<TranslateResponse, String> {
    // Read API settings from DB
    let (api_key, api_url, model) = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        let get_val = |key: &str| -> Option<String> {
            conn.prepare("SELECT value FROM settings WHERE key = ?1")
                .ok()?
                .query_row(rusqlite::params![key], |row| row.get::<_, String>(0))
                .ok()
        };

        let key = get_val("api_key").ok_or("API Key 未配置，请先在设置中配置")?;
        let url = get_val("api_url")
            .unwrap_or_else(|| "https://api.deepseek.com/v1/chat/completions".to_string());
        let model = get_val("api_model").unwrap_or_else(|| "deepseek-chat".to_string());

        (key, url, model)
    };

    let (system_prompt, max_tokens) = match req.prompt_type.as_str() {
        "word" => (
            "你是英语词义助手。请基于句子语义推断单词在句中的含义。输出 JSON，词性必须为缩写：n., v., adj., adv., prep., conj., pron., det., interj.。释义需先中文后英文。英文释义必须是清晰完整的英英解释（不少于8个英文单词），可以使用“related to”但必须把意思解释清楚；不要加“in this context/The term ... describes”这类多余前缀，直接给定义。只输出 JSON：{\"pos\":\"词性缩写\",\"zh\":\"中文释义\",\"en\":\"英文释义(完整句子)\"}",
            200,
        ),
        "sentence" => (
            "你是一个英语学习助手。用户会给你一个英文句子，请翻译成中文，并简要解释句子结构。",
            300,
        ),
        "complex_sentence" => (
            "你是英语长难句解析助手。请分析句子结构（主干、从句、修饰成分）并给出信达雅的中文释义。结构分析中引用原文时不要全文，只保留开头和结尾，用 ... 连接，便于定位。请输出 JSON，格式为 {\"summary\":\"一句话结构总述\",\"analysis\":\"结构分解\",\"translation\":\"中文释义\"}。summary 用一句话串起主干/从句/修饰关系。analysis 用简洁的文字列出各成分，不需要换行。只输出 JSON。",
            300,
        ),
        "sentence_structure" => (
            "你是英语句子成分划分专家。请对句子进行深入、全面、细致的成分标注。\n\n\
【基本原则】\n\
1. 必须标注句中每一个谓语动词和非谓语动词，无一遗漏\n\
2. 必须用括号符号标出每一个从句和修饰成分的边界，符号直接出现在文本中\n\
3. 主语、宾语、表语、宾补等核心名词性成分必须加粗\n\
4. 分析要尽可能深入——嵌套从句、复合修饰、并列结构都要逐层标出\n\n\
【颜色标注规则】\n\
- 每个谓语动词（含助动词、情态动词、时态/语态完整形式）→ <span class=\"ps-predicate\">...</span>\n\
- 每个非谓语动词（不定式to do/动名词doing/现在分词doing/过去分词done）→ <span class=\"ps-nonfinite\">...</span>\n\
- 并列连词（and/or/but/yet/nor/not only...but also/neither...nor/either...or/both...and/as well as/rather than）→ <span class=\"ps-connector\">...</span>\n\
- 先行it（形式主语/形式宾语/强调句it）→ <span class=\"ps-connector\">...</span>（加斜体 class=\"ps-connector ps-italic\"）\n\
- 主语/宾语/表语/宾补等核心名词性成分 → <span class=\"ps-main\">...</span>\n\
- 比较结构词（than/as...as/(not) so...as）→ <span class=\"ps-structure\">...</span>\n\
- 结果结构词（so...that/such...that/too...to/enough to）→ <span class=\"ps-structure\">...</span>\n\
- 倒装触发词（hardly...when/scarcely...when/no sooner...than/not until/only when）→ <span class=\"ps-structure\">...</span>\n\n\
【符号标注规则——必须使用！】每个符号用 <span class=\"ps-symbol\">...</span> 包裹\n\
- 定语从句 / 后置定语 / 同位语从句 → 用 <span class=\"ps-symbol\">(</span> 和 <span class=\"ps-symbol\">)</span> 包裹整个从句\n\
- 状语从句 / 状语短语（介词短语/分词短语/不定式作状语）→ 用 <span class=\"ps-symbol\">[</span> 和 <span class=\"ps-symbol\">]</span> 包裹\n\
- 宾语从句（包括介词宾语从句）→ 用 <span class=\"ps-symbol\">{</span> 和 <span class=\"ps-symbol\">}</span> 包裹\n\
- 主语从句 / 表语从句 → 在从句前后用 <span class=\"ps-symbol\">|</span> 分隔\n\
- 状语从句与主句之间 / 并列分句之间 → 用 <span class=\"ps-symbol\">||</span> 分隔\n\
- 插入语 / 同位语（逗号或破折号隔开的）→ 用 <span class=\"ps-symbol\">&lt;</span> 和 <span class=\"ps-symbol\">&gt;</span> 包裹\n\n\
【深度要求】\n\
- 嵌套从句必须逐层标注（定语从句套状语从句、宾语从句套定语从句等）\n\
- 并列结构中每个并列成分都要标出\n\
- 介词短语作后置定语时用()，作状语时用[]\n\
- 分词短语/不定式短语的语法功能（定语/状语/补语）必须用对应符号标出\n\
- 省略只限于：单个形容词作前置定语、句末短副词\n\n\
输出 JSON：{\"parsed_html\":\"带HTML标记和符号的完整标注句子\",\"structure_note\":\"一句话概括主干结构和从句层次\",\"translation\":\"自然流畅的中文翻译\"}\n只输出 JSON，不要解释。",
            1500,
        ),
        "mindmap" => (
            "你是一个文章结构分析专家。请将用户提供的文章内容提炼为层级化的 Markdown 大纲，用于生成思维导图。\n\n\
你需要同时输出**英文版**和**中文版**两份大纲。\n\n\
规则：\n\
1. 用 `# 文章标题` 作为根节点\n\
2. 用 `## 主题` 作为一级分支（3-8个）\n\
3. 用 `### 子主题` 作为二级分支\n\
4. 用 `- 要点` 作为叶子节点（每个子主题下1-4个）\n\
5. 大纲应覆盖文章的核心论点、关键概念和重要细节\n\
6. 每个节点的文字简洁精炼（不超过15个词）\n\
7. 英文版所有节点必须使用英文\n\
8. 中文版所有节点必须使用中文\n\
9. 两份大纲的结构必须完全一致（一一对应）\n\n\
输出格式为 JSON（不要用 markdown 代码块包裹）：\n\
{\"en\": \"英文Markdown大纲\", \"cn\": \"中文Markdown大纲\"}\n\
只输出 JSON，不加任何解释或前缀。",
            4000,
        ),
        _ => (
            "你是一个英语学习助手。请翻译以下英文文本为中文。",
            1000,
        ),
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": req.text }
            ],
            "temperature": 0.3,
            "max_tokens": max_tokens
        }))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API 错误 ({}): {}", status, body));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    let result = body["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("无法获取翻译结果")
        .to_string();

    Ok(TranslateResponse { result })
}

#[tauri::command]
pub async fn test_api_connection(db: State<'_, Database>) -> Result<String, String> {
    let (api_key, api_url, model) = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        let get_val = |key: &str| -> Option<String> {
            conn.prepare("SELECT value FROM settings WHERE key = ?1")
                .ok()?
                .query_row(rusqlite::params![key], |row| row.get::<_, String>(0))
                .ok()
        };

        let key = get_val("api_key").ok_or("API Key 未配置")?;
        let url = get_val("api_url")
            .unwrap_or_else(|| "https://api.deepseek.com/v1/chat/completions".to_string());
        let model = get_val("api_model").unwrap_or_else(|| "deepseek-chat".to_string());

        (key, url, model)
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model,
            "messages": [
                { "role": "user", "content": "Hi" }
            ],
            "max_tokens": 10
        }))
        .send()
        .await
        .map_err(|e| format!("连接失败: {}", e))?;

    if response.status().is_success() {
        Ok("连接成功！API 配置正确。".to_string())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(format!("连接失败 ({}): {}", status, body))
    }
}

/// Helper: read API settings from DB
fn read_api_settings(db: &Database) -> Result<(String, String, String), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let get_val = |key: &str| -> Option<String> {
        conn.prepare("SELECT value FROM settings WHERE key = ?1")
            .ok()?
            .query_row(rusqlite::params![key], |row| row.get::<_, String>(0))
            .ok()
    };

    let key = get_val("api_key").ok_or("API Key 未配置，请先在设置中配置")?;
    let url = get_val("api_url")
        .unwrap_or_else(|| "https://api.deepseek.com/v1/chat/completions".to_string());
    let model = get_val("api_model").unwrap_or_else(|| "deepseek-chat".to_string());

    Ok((key, url, model))
}

#[tauri::command]
pub async fn translate_article_stream(
    app: AppHandle,
    db: State<'_, Database>,
    req: ArticleTranslateRequest,
) -> Result<(), String> {
    let (api_key, api_url, model) = read_api_settings(&db)?;

    let system_prompt = "你是一个纯粹的英译中翻译器。规则：\n1. 只输出中文译文，不加任何说明、解释、回答、标记或前缀\n2. 无论原文是陈述句、疑问句还是任何体裁，都只做翻译，绝不回答原文中的问题\n3. 翻译要做到信达雅，保持原文的语气、风格和修辞\n4. 如果原文已经是中文则原样返回\n5. 如果原文是标题/小标题，翻译后保持简洁，不要扩展";

    let client = reqwest::Client::new();

    // Translate title if provided (index = -2)
    if let Some(ref title) = req.title {
        if !title.trim().is_empty() {
            let _ = app.emit("translation-chunk", json!({ "index": -2, "text": "", "done": false, "started": true }));

            let title_response = client
                .post(&api_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&json!({
                    "model": model,
                    "messages": [
                        { "role": "system", "content": system_prompt },
                        { "role": "user", "content": title.trim() }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 200,
                    "stream": true
                }))
                .send()
                .await;

            if let Ok(resp) = title_response {
                if resp.status().is_success() {
                    let mut stream = resp.bytes_stream();
                    let mut buffer = String::new();
                    while let Some(chunk) = stream.next().await {
                        if let Ok(chunk) = chunk {
                            buffer.push_str(&String::from_utf8_lossy(&chunk));
                            while let Some(line_end) = buffer.find('\n') {
                                let line = buffer[..line_end].trim().to_string();
                                buffer = buffer[line_end + 1..].to_string();
                                if line.starts_with("data: ") {
                                    let data = &line[6..];
                                    if data == "[DONE]" { break; }
                                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                                        if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                                            if !content.is_empty() {
                                                let _ = app.emit("translation-chunk", json!({ "index": -2, "text": content, "done": false }));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            let _ = app.emit("translation-chunk", json!({ "index": -2, "text": "", "done": true }));
        }
    }

    // Translate each paragraph (using pre-split paragraphs with indices from frontend)
    for para in &req.paragraphs {
        let text = para.text.trim();
        if text.is_empty() {
            continue;
        }

        let index = para.index;

        let _ = app.emit("translation-chunk", json!({ "index": index, "text": "", "done": false, "started": true }));

        let response = client
            .post(&api_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": model,
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": text }
                ],
                "temperature": 0.3,
                "max_tokens": 2000,
                "stream": true
            }))
            .send()
            .await
            .map_err(|e| format!("请求失败: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            let _ = app.emit("translation-chunk", json!({ "index": index, "text": format!("[翻译失败: {} {}]", status, body), "done": true }));
            continue;
        }

        let mut stream = response.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("流读取失败: {}", e))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" { break; }
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                            if !content.is_empty() {
                                let _ = app.emit("translation-chunk", json!({ "index": index, "text": content, "done": false }));
                            }
                        }
                    }
                }
            }
        }

        let _ = app.emit("translation-chunk", json!({ "index": index, "text": "", "done": true }));
    }

    // Signal all done
    let _ = app.emit(
        "translation-chunk",
        json!({ "index": -1, "text": "", "done": true, "allDone": true }),
    );

    Ok(())
}
