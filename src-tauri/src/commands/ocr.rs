// OCR 图片识别（PP-StructureV3 + DeepSeek 校正）
use crate::db::Database;
use base64::Engine;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};

// ── 数据结构 ──────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OcrPageResult {
    /// 页码索引 (0-based)
    pub page_index: usize,
    /// OCR 提取的 Markdown 文本（图片引用已替换为本地路径）
    pub markdown: String,
    /// 已保存的本地图片路径列表
    pub saved_images: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OcrProgress {
    pub current: usize,
    pub total: usize,
    pub status: String,
}

// ── PP-StructureV3 响应结构 ──────────────────────────

#[derive(Debug, Deserialize)]
struct PpStructureResponse {
    result: Option<PpResult>,
    #[serde(rename = "errorCode")]
    error_code: Option<i32>,
    #[serde(rename = "errorMsg")]
    error_msg: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PpResult {
    #[serde(rename = "layoutParsingResults")]
    layout_parsing_results: Vec<PpLayoutResult>,
}

#[derive(Debug, Deserialize)]
struct PpLayoutResult {
    markdown: PpMarkdown,
}

#[derive(Debug, Deserialize)]
struct PpMarkdown {
    text: String,
    #[serde(default)]
    images: HashMap<String, String>,
}

// ── 工具函数 ──────────────────────────────────────────

/// OCR 图片的本地存储目录: ~/.shiyu/images/ (与 EPUB 图片共用，前端 imageResolver 统一处理)
fn ocr_images_dir() -> PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".shiyu");
    path.push("images");
    path
}

/// 从数据库读取 OCR 相关设置
fn get_ocr_settings(db: &Database) -> Result<(String, String), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let get_val = |key: &str| -> Option<String> {
        conn.prepare("SELECT value FROM settings WHERE key = ?1")
            .ok()?
            .query_row(rusqlite::params![key], |row| row.get::<_, String>(0))
            .ok()
    };

    let api_url = get_val("ocr_api_url")
        .filter(|s| !s.is_empty())
        .ok_or("OCR API URL 未配置，请先在设置中配置")?;
    let token = get_val("ocr_api_token")
        .filter(|s| !s.is_empty())
        .ok_or("OCR Token 未配置，请先在设置中配置")?;

    Ok((api_url, token))
}

/// 从数据库读取 DeepSeek API 设置
fn get_ai_settings(db: &Database) -> Result<(String, String, String), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let get_val = |key: &str| -> Option<String> {
        conn.prepare("SELECT value FROM settings WHERE key = ?1")
            .ok()?
            .query_row(rusqlite::params![key], |row| row.get::<_, String>(0))
            .ok()
    };

    let api_key = get_val("api_key").ok_or("DeepSeek API Key 未配置")?;
    let api_url = get_val("api_url")
        .unwrap_or_else(|| "https://api.deepseek.com/v1/chat/completions".to_string());
    let model = get_val("api_model").unwrap_or_else(|| "deepseek-chat".to_string());

    Ok((api_key, api_url, model))
}

/// 下载图片并保存到本地，返回本地文件路径
async fn download_and_save_image(
    client: &reqwest::Client,
    url: &str,
    page_index: usize,
    image_index: usize,
) -> Result<String, String> {
    let images_dir = ocr_images_dir();
    std::fs::create_dir_all(&images_dir)
        .map_err(|e| format!("创建图片目录失败: {}", e))?;

    // 从 URL 推断扩展名，默认 png
    let ext = url
        .rsplit('.')
        .next()
        .and_then(|e| {
            let e = e.split('?').next().unwrap_or(e).to_lowercase();
            match e.as_str() {
                "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" => Some(e),
                _ => None,
            }
        })
        .unwrap_or_else(|| "png".to_string());

    let filename = format!("ocr_p{}_img{}_{}.{}", page_index, image_index, uuid::Uuid::new_v4().as_simple(), ext);
    let file_path = images_dir.join(&filename);

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("下载图片失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("图片下载失败 ({}): {}", response.status(), url));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取图片数据失败: {}", e))?;

    std::fs::write(&file_path, &bytes)
        .map_err(|e| format!("保存图片失败: {}", e))?;

    // 使用正斜杠，保证 Markdown 兼容性 + 前端 imageResolver 正则匹配
    Ok(file_path.to_string_lossy().to_string().replace('\\', "/"))
}

/// 将 PP-StructureV3 返回的 HTML 图片标签转换为 Markdown 格式
/// 例如: `<div style="text-align: center;"><img src="path" alt="图片" width="57%"></div>`
/// 转换为: `![图片](path)`
fn html_images_to_markdown(text: &str) -> String {
    let mut result = text.to_string();

    // 1. 匹配 <div...><img ...></div> 包裹的图片（PP-StructureV3 常见输出格式）
    let div_img_re = Regex::new(
        r#"<div[^>]*>\s*<img\s+[^>]*src=["']([^"']+)["'][^>]*>\s*</div>"#
    ).unwrap();

    result = div_img_re.replace_all(&result, |caps: &regex::Captures| {
        let src = &caps[1];
        // 尝试提取 alt 属性
        let alt = extract_img_alt(&caps[0]);
        format!("![{}]({})", alt, src)
    }).to_string();

    // 2. 匹配剩余的独立 <img> 标签
    let img_re = Regex::new(
        r#"<img\s+[^>]*src=["']([^"']+)["'][^>]*>"#
    ).unwrap();

    result = img_re.replace_all(&result, |caps: &regex::Captures| {
        let src = &caps[1];
        let alt = extract_img_alt(&caps[0]);
        format!("![{}]({})", alt, src)
    }).to_string();

    result
}

/// 从 <img> 标签中提取 alt 属性值
fn extract_img_alt(img_tag: &str) -> String {
    let alt_re = Regex::new(r#"alt=["']([^"']*)["']"#).unwrap();
    alt_re.captures(img_tag)
        .map(|c| c[1].to_string())
        .unwrap_or_default()
}

// ── Tauri 命令 ────────────────────────────────────────

/// OCR 提取：逐页发送图片到 PP-StructureV3，下载图片到本地，返回处理后的 Markdown
#[tauri::command]
pub async fn ocr_extract_pages(
    app: AppHandle,
    db: State<'_, Database>,
    image_paths: Vec<String>,
) -> Result<Vec<OcrPageResult>, String> {
    if image_paths.is_empty() {
        return Err("请至少上传一张图片".to_string());
    }

    let (api_url, token) = get_ocr_settings(&db)?;
    let client = reqwest::Client::new();
    let total = image_paths.len();
    let mut results: Vec<OcrPageResult> = Vec::with_capacity(total);

    for (i, path) in image_paths.iter().enumerate() {
        // 发送进度: OCR 识别
        let _ = app.emit(
            "ocr-progress",
            OcrProgress {
                current: i + 1,
                total,
                status: format!("正在识别第 {}/{} 页...", i + 1, total),
            },
        );

        // 读取图片并 base64 编码
        let file_bytes = std::fs::read(path)
            .map_err(|e| format!("读取图片失败 ({}): {}", path, e))?;
        let file_b64 = base64::engine::general_purpose::STANDARD.encode(&file_bytes);

        // 调用 PP-StructureV3 API
        let response = client
            .post(&api_url)
            .header("Authorization", format!("token {}", token))
            .header("Content-Type", "application/json")
            .json(&json!({
                "file": file_b64,
                "fileType": 1,
                "useDocOrientationClassify": true,
                "useDocUnwarping": true,
                "useTextlineOrientation": true
            }))
            .send()
            .await
            .map_err(|e| format!("OCR 请求失败 (第{}页): {}", i + 1, e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("OCR API 错误 (第{}页, {}): {}", i + 1, status, body));
        }

        let pp_resp: PpStructureResponse = response
            .json()
            .await
            .map_err(|e| format!("解析 OCR 响应失败 (第{}页): {}", i + 1, e))?;

        // 检查错误码
        if let Some(code) = pp_resp.error_code {
            if code != 0 {
                return Err(format!(
                    "OCR 识别失败 (第{}页): {}",
                    i + 1,
                    pp_resp.error_msg.unwrap_or_else(|| "未知错误".to_string())
                ));
            }
        }

        // 提取结果
        let result = pp_resp
            .result
            .ok_or_else(|| format!("OCR 返回空结果 (第{}页)", i + 1))?;

        // 合并该页所有 layout 结果
        let mut page_markdown = String::new();
        let mut all_images: HashMap<String, String> = HashMap::new();

        for layout in &result.layout_parsing_results {
            if !page_markdown.is_empty() {
                page_markdown.push_str("\n\n");
            }
            page_markdown.push_str(&layout.markdown.text);
            all_images.extend(layout.markdown.images.clone());
        }

        // 下载图片到本地并替换 Markdown 中的引用
        let mut saved_images: Vec<String> = Vec::new();

        if !all_images.is_empty() {
            let _ = app.emit(
                "ocr-progress",
                OcrProgress {
                    current: i + 1,
                    total,
                    status: format!("正在下载第 {}/{} 页的 {} 张图片...", i + 1, total, all_images.len()),
                },
            );

            for (img_idx, (ref_path, url)) in all_images.iter().enumerate() {
                match download_and_save_image(&client, url, i, img_idx).await {
                    Ok(local_path) => {
                        // 替换 Markdown 中的图片引用: ![xxx](ref_path) -> ![xxx](local_path)
                        page_markdown = page_markdown.replace(ref_path, &local_path);
                        saved_images.push(local_path);
                    }
                    Err(e) => {
                        // 图片下载失败不中断整个流程，保留原始 URL 引用
                        eprintln!("图片下载失败 (第{}页, 第{}张): {}", i + 1, img_idx + 1, e);
                    }
                }
            }
        }

        // 将 HTML <img> 标签转为 Markdown ![alt](src) 格式
        page_markdown = html_images_to_markdown(&page_markdown);

        results.push(OcrPageResult {
            page_index: i,
            markdown: page_markdown,
            saved_images,
        });
    }

    // 完成进度
    let _ = app.emit(
        "ocr-progress",
        OcrProgress {
            current: total,
            total,
            status: "OCR 识别完成".to_string(),
        },
    );

    Ok(results)
}

/// 使用 DeepSeek 校正 OCR 结果
#[tauri::command]
pub async fn ocr_refine_with_ai(
    db: State<'_, Database>,
    raw_markdown: String,
) -> Result<String, String> {
    if raw_markdown.trim().is_empty() {
        return Err("OCR 文本为空，无法校正".to_string());
    }

    let (api_key, api_url, model) = get_ai_settings(&db)?;

    let system_prompt = r#"你是一个专业的英文文章 OCR 校对助手。用户会给你通过 OCR 识别出的英文文章文本（Markdown 格式）。请你严格按照以下规则校正：

## 文字校正
1. 修复明显的 OCR 识别错误（错字、多余字符、乱码、数字/字母混淆如 0↔O, 1↔l↔I）
2. 修复段落连续性（将因分页/分栏导致的断句重新连接为完整段落）
3. 合并跨页断行：如果上一段末尾无句号且下一段开头是小写字母，应合并为同一段

## 标点与格式（非常重要）
4. 英文标点后面必须有且仅有一个空格：句号`. `、逗号`, `、冒号`: `、分号`; `、感叹号`! `、问号`? `
5. 左括号前加空格，右括号后加空格：`word (example) next`
6. 引号使用标准英文引号 "" 和 ''，不要用中文引号
7. 连字符 `-` 和破折号 `—` 应正确区分使用
8. 省略号使用 `...`（三个英文句号）
9. 移除多余空格（连续空格合并为一个，行首行尾空格移除）
10. 移除 OCR 产生的多余空行（连续两个以上空行合并为一个）

## 公式与化学符号（非常重要）
11. 将所有 LaTeX 数学公式转换为 Unicode 纯文本，不要保留 $ 符号和 LaTeX 语法
    - `$CO_{2}$` → `CO₂`
    - `$H_{2}O$` → `H₂O`
    - `$O_{3}$` → `O₃`
    - `$x^{2}$` → `x²`
    - `$10^{6}$` → `10⁶`
    - 下标使用 Unicode 下标字符：₀₁₂₃₄₅₆₇₈₉ₐₑₒₓ
    - 上标使用 Unicode 上标字符：⁰¹²³⁴⁵⁶⁷⁸⁹
    - 其他无法用 Unicode 表示的公式，用纯文本近似表达

## 结构保持
12. 保持原始段落和标题层级结构
13. 保留原文的 Markdown 格式（加粗、斜体、列表等）
14. 保留文中的图片引用标记 `![...](...)` 的路径和格式，不要修改图片引用路径

## 禁止操作
15. 不要翻译任何原文文字
16. 不要添加、删除或重写原文内容
17. 不要添加注释、说明或解释
18. 不要改变原文的措辞或表达方式（只修正明显的 OCR 错误）

只输出校正后的文章 Markdown 内容，不要输出其他任何内容。"#;

    let client = reqwest::Client::new();
    let response = client
        .post(&api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": raw_markdown }
            ],
            "temperature": 0.15,
            "max_tokens": 8192
        }))
        .send()
        .await
        .map_err(|e| format!("AI 校正请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("AI 校正 API 错误 ({}): {}", status, body));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析 AI 校正响应失败: {}", e))?;

    let result = body["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    if result.is_empty() {
        return Err("AI 校正返回空结果".to_string());
    }

    Ok(result)
}
