// 配置包导入命令 — 读取 .shiyu-config JSON 文件并写入 settings 表
use crate::db::Database;
use serde::Deserialize;
use tauri::State;

/// 配置包 JSON 结构
#[derive(Debug, Deserialize)]
struct ConfigPack {
    v: u32,
    #[serde(default)]
    api_key: Option<String>,
    #[serde(default)]
    api_url: Option<String>,
    #[serde(default)]
    api_model: Option<String>,
    #[serde(default)]
    ocr_api_url: Option<String>,
    #[serde(default)]
    ocr_api_token: Option<String>,
}

/// 导入配置包
///
/// 1. 读取 .shiyu-config JSON 文件
/// 2. 解析 JSON → 逐项写入 settings 表
/// 3. 返回成功导入的配置项数
#[tauri::command]
pub fn import_config_pack(
    db: State<Database>,
    file_path: String,
) -> Result<u32, String> {
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    let pack: ConfigPack = serde_json::from_str(content.trim())
        .map_err(|e| format!("配置文件内容格式错误: {}", e))?;

    if pack.v != 1 {
        return Err(format!("不支持的配置文件版本: v{}", pack.v));
    }

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut count: u32 = 0;

    let items: Vec<(&str, &Option<String>)> = vec![
        ("api_key", &pack.api_key),
        ("api_url", &pack.api_url),
        ("api_model", &pack.api_model),
        ("ocr_api_url", &pack.ocr_api_url),
        ("ocr_api_token", &pack.ocr_api_token),
    ];

    for (key, value) in items {
        if let Some(val) = value {
            if !val.is_empty() {
                conn.execute(
                    "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
                    rusqlite::params![key, val],
                )
                .map_err(|e| format!("写入设置失败 ({}): {}", key, e))?;
                count += 1;
            }
        }
    }

    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('config_source', 'config_pack') ON CONFLICT(key) DO UPDATE SET value = 'config_pack'",
        [],
    )
    .map_err(|e| format!("写入来源标记失败: {}", e))?;

    Ok(count)
}
