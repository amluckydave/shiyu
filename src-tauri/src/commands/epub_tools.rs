// EPUB 提取工具
use regex::Regex;
use epub::doc::EpubDoc;
use serde::Serialize;
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Get the images directory: ~/.shiyu/images/
fn get_images_dir() -> PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".shiyu");
    path.push("images");
    std::fs::create_dir_all(&path).ok();
    path
}

/// Save image bytes to disk, return the absolute file path.
/// Filename = sha256(data)[..16].ext (short, collision-safe).
fn save_image_to_disk(data: &[u8], mime: &str) -> Result<String, String> {
    let ext = match mime {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/svg+xml" => "svg",
        "image/webp" => "webp",
        _ => "png",
    };
    let hash = Sha256::digest(data);
    let hash_hex: String = hash.iter().take(8).map(|b| format!("{:02x}", b)).collect();
    let filename = format!("{}.{}", hash_hex, ext);
    let file_path = get_images_dir().join(&filename);

    // Skip writing if file already exists (same content)
    if !file_path.exists() {
        let mut f = std::fs::File::create(&file_path)
            .map_err(|e| format!("Failed to save image: {}", e))?;
        f.write_all(data)
            .map_err(|e| format!("Failed to write image: {}", e))?;
    }

    // Use forward slashes for markdown compatibility (backslash = escape in markdown)
    Ok(file_path.to_string_lossy().to_string().replace('\\', "/"))
}

#[derive(Debug, Clone, Serialize)]
pub struct TocEntry {
    pub index: usize,
    pub label: String,
    pub path: String,
    pub level: usize,
    pub children: Vec<TocEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EpubImage {
    pub filename: String,
    pub mime_type: String,
    pub data_base64: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChapterResult {
    pub title: String,
    pub markdown: String,
    pub html_content: String,
    pub images: Vec<EpubImage>,
}

#[tauri::command]
pub fn parse_epub_toc(
    file_path: String,
) -> Result<Vec<TocEntry>, String> {
    let mut doc = EpubDoc::new(&file_path).map_err(|e| format!("无法打开 EPUB 文件: {}", e))?;

    let toc = doc.toc.clone();
    let mut entries: Vec<TocEntry>;

    fn convert_navpoints(
        navpoints: &[epub::doc::NavPoint],
        start_index: &mut usize,
        depth: usize,
    ) -> Vec<TocEntry> {
        let mut entries = Vec::new();
        for np in navpoints {
            let idx = *start_index;
            *start_index += 1;
            let children = convert_navpoints(&np.children, start_index, depth + 1);
            entries.push(TocEntry {
                index: idx,
                label: np.label.clone(),
                path: np.content.to_string_lossy().to_string(),
                level: depth,
                children,
            });
        }
        entries
    }

    let mut idx = 0;
    entries = convert_navpoints(&toc, &mut idx, 0);

    if entries.is_empty() {
        let spine: Vec<String> = doc.spine.iter().map(|s| s.idref.clone()).collect();
        let resources_snapshot: HashMap<String, (PathBuf, String)> = doc.resources.iter()
            .map(|(k, v)| (k.clone(), (v.path.clone(), v.mime.clone())))
            .collect();

        for (i, spine_id) in spine.iter().enumerate() {
            let mut label = String::new();
            if let Some((content, _)) = doc.get_resource_str(spine_id) {
                label = extract_best_title(&content);
            }
            if label.is_empty() {
                label = resources_snapshot.get(spine_id)
                    .and_then(|r| r.0.file_stem().map(|s| s.to_string_lossy().to_string()))
                    .unwrap_or_else(|| format!("Chapter {}", i + 1));
            }
            let path = resources_snapshot.get(spine_id)
                .map(|r| r.0.to_string_lossy().to_string())
                .unwrap_or_else(|| spine_id.clone());

            entries.push(TocEntry { index: i, label, path, level: 0, children: Vec::new() });
        }
    }

    Ok(entries)
}

// ── Optimized batch extraction ───────────────────────────

#[tauri::command]
pub fn extract_epub_chapters(
    file_path: String,
    chapter_paths: Vec<String>,
) -> Result<Vec<ChapterResult>, String> {
    // 只打开一次EPUB文件
    let mut doc = EpubDoc::new(&file_path).map_err(|e| format!("无法打开 EPUB 文件: {}", e))?;
    let spine: Vec<String> = doc.spine.iter().map(|s| s.idref.clone()).collect();
    let resources_snapshot: HashMap<String, (PathBuf, String)> = doc.resources.iter()
        .map(|(k, v)| (k.clone(), (v.path.clone(), v.mime.clone())))
        .collect();

    let mut results = Vec::new();
    for path in chapter_paths {
        match extract_epub_chapter_internal(&mut doc, &spine, &resources_snapshot, &path) {
            Ok(result) => results.push(result),
            Err(e) => {
                results.push(ChapterResult {
                    title: format!("Error: {}", e),
                    markdown: String::new(),
                    html_content: String::new(),
                    images: Vec::new(),
                });
            }
        }
    }
    Ok(results)
}

/// 内部函数：从已打开的EpubDoc中提取章节（避免重复打开文件）
fn extract_epub_chapter_internal<R: std::io::Read + std::io::Seek>(
    doc: &mut EpubDoc<R>,
    spine: &[String],
    resources_snapshot: &HashMap<String, (PathBuf, String)>,
    chapter_path: &str
) -> Result<ChapterResult, String> {
    let chapter_path_clean = chapter_path.split('#').next().unwrap_or(chapter_path);
    let mut target_resource_id: Option<String> = None;

    for (res_id, (res_path, _mime)) in resources_snapshot {
        let res_path_str = res_path.to_string_lossy().to_string();
        if res_path_str == chapter_path_clean
            || res_path_str.ends_with(chapter_path_clean)
            || chapter_path_clean.ends_with(&res_path_str)
        {
            target_resource_id = Some(res_id.clone());
            break;
        }
    }

    if let Some(ref res_id) = target_resource_id {
        for (i, sid) in spine.iter().enumerate() {
            if sid == res_id {
                doc.set_current_chapter(i);
                break;
            }
        }
    }

    let html_content = if let Some(ref res_id) = target_resource_id {
        doc.get_resource_str(res_id).map(|(c, _)| c).unwrap_or_default()
    } else {
        doc.get_current_str().map(|(c, _)| c).unwrap_or_default()
    };

    if html_content.is_empty() {
        return Err("无法读取章节内容".to_string());
    }

    // ── Extract body content only ──────────────────────────
    let body_html = extract_body_content(&html_content);

    // ── Save images to disk, build src -> file path map ────
    let mut images: Vec<EpubImage> = Vec::new();
    let mut src_to_file_path: HashMap<String, String> = HashMap::new();

    let chapter_dir = if let Some(ref res_id) = target_resource_id {
        resources_snapshot.get(res_id)
            .and_then(|(p, _)| p.parent().map(|pp| pp.to_path_buf()))
    } else {
        None
    };

    let img_srcs = extract_image_paths(&body_html);

    for img_src in &img_srcs {
        if src_to_file_path.contains_key(img_src) {
            continue;
        }

        let resolved = if let Some(ref base_dir) = chapter_dir {
            normalize_path(&base_dir.join(img_src))
        } else {
            PathBuf::from(img_src.trim_start_matches("../"))
        };
        let resolved_str = resolved.to_string_lossy().to_string();

        let mut found = false;

        // Match by path
        for (res_id, (res_path, mime)) in resources_snapshot {
            if !mime.starts_with("image/") { continue; }
            let res_path_str = res_path.to_string_lossy().to_string();
            let filename_match = res_path.file_name()
                .and_then(|f| resolved.file_name().map(|rf| f == rf))
                .unwrap_or(false);

            if res_path_str == resolved_str
                || res_path_str.ends_with(&resolved_str)
                || resolved_str.ends_with(&res_path_str)
                || filename_match
            {
                if let Some((data, _)) = doc.get_resource(res_id) {
                    let filename = res_path.file_name()
                        .map(|f| f.to_string_lossy().to_string())
                        .unwrap_or_else(|| format!("{}.png", res_id));
                    if let Ok(saved_path) = save_image_to_disk(&data, mime) {
                        src_to_file_path.insert(img_src.clone(), saved_path.clone());
                        images.push(EpubImage {
                            filename,
                            mime_type: mime.clone(),
                            data_base64: saved_path,  // reuse field to store file path
                        });
                        found = true;
                    }
                }
                break;
            }
        }

        // Fallback: match by filename
        if !found {
            let src_fn = Path::new(img_src).file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_default();
            if !src_fn.is_empty() {
                for (res_id, (res_path, mime)) in resources_snapshot {
                    if !mime.starts_with("image/") { continue; }
                    let res_fn = res_path.file_name()
                        .map(|f| f.to_string_lossy().to_string())
                        .unwrap_or_default();
                    if res_fn == src_fn {
                        if let Some((data, _)) = doc.get_resource(res_id) {
                            if let Ok(saved_path) = save_image_to_disk(&data, mime) {
                                src_to_file_path.insert(img_src.clone(), saved_path.clone());
                                images.push(EpubImage {
                                    filename: res_fn,
                                    mime_type: mime.clone(),
                                    data_base64: saved_path,
                                });
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    // Replace image src in body HTML with local file paths
    let mut processed_body = body_html.clone();
    for (original_src, file_path) in &src_to_file_path {
        processed_body = processed_body.replace(original_src, file_path);
    }

    // Add basic styling wrapper
    let styled_html = format!(
        "<div style=\"font-family:Georgia,serif;line-height:1.8;color:#1e293b;max-width:100%;\">{}</div>",
        processed_body
    );

    let title = extract_best_title(&html_content);
    let title = if title.is_empty() { chapter_path.to_string() } else { title };

    // Markdown for export (from processed HTML so it includes base64 data URIs)
    let mut markdown = html2md::parse_html(&processed_body);

    // Clean up junk headers from the start of the markdown
    markdown = intelligent_clean_markdown(&markdown, &title);

    Ok(ChapterResult {
        title,
        markdown,
        html_content: styled_html,
        images,
    })
}

/// 提取单个章节（保持向后兼容，内部调用批量提取）
#[tauri::command]
pub fn extract_epub_chapter(
    file_path: String,
    chapter_path: String,
) -> Result<ChapterResult, String> {
    // 只打开一次文件
    let mut doc = EpubDoc::new(&file_path).map_err(|e| format!("无法打开 EPUB 文件: {}", e))?;
    let spine: Vec<String> = doc.spine.iter().map(|s| s.idref.clone()).collect();
    let resources_snapshot: HashMap<String, (PathBuf, String)> = doc.resources.iter()
        .map(|(k, v)| (k.clone(), (v.path.clone(), v.mime.clone())))
        .collect();

    extract_epub_chapter_internal(&mut doc, &spine, &resources_snapshot, &chapter_path)
}

// ── Helper functions ────────────────────────────────────

/// Extract only the content inside <body>...</body> tags.
/// If no body tag found, return the original HTML.
fn extract_body_content(html: &str) -> String {
    // Try to find <body> or <body ...>
    let body_start = html.find("<body")
        .and_then(|pos| {
            html[pos..].find('>').map(|gt| pos + gt + 1)
        });
    let body_end = html.rfind("</body>");

    match (body_start, body_end) {
        (Some(start), Some(end)) if start < end => {
            html[start..end].trim().to_string()
        }
        _ => {
            // No body tags found — might be a fragment, return as-is
            html.to_string()
        }
    }
}

fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    for comp in path.components() {
        match comp {
            std::path::Component::ParentDir => { components.pop(); }
            std::path::Component::CurDir => {}
            _ => components.push(comp),
        }
    }
    components.iter().collect()
}

fn extract_image_paths(html: &str) -> Vec<String> {
    let mut paths = Vec::new();
    for attr in &["src=\"", "src='", "xlink:href=\"", "xlink:href='"] {
        let mut search_from = 0;
        while let Some(start) = html[search_from..].find(attr) {
            let abs_start = search_from + start + attr.len();
            let quote = if attr.ends_with('"') { '"' } else { '\'' };
            if let Some(end) = html[abs_start..].find(quote) {
                let path = &html[abs_start..abs_start + end];
                if !path.starts_with("data:") && !path.is_empty() {
                    paths.push(path.to_string());
                }
            }
            search_from = abs_start + 1;
        }
    }
    paths
}

fn extract_best_title(html: &str) -> String {
    let generic_titles = [
        "the economist", "economist", "untitled", "cover",
        "table of contents", "contents", "titlepage", "title page",
    ];
    let is_generic = |t: &str| -> bool {
        let lower = t.to_lowercase();
        generic_titles.iter().any(|g| lower == *g || lower.starts_with(g))
    };

    for heading_tag in &["h1", "h2", "h3"] {
        let open_exact = format!("<{}>", heading_tag);
        let open_attr = format!("<{} ", heading_tag);
        let close = format!("</{}>", heading_tag);
        for open in &[open_exact.as_str(), open_attr.as_str()] {
            if let Some(start) = html.find(open) {
                let after = &html[start..];
                if let Some(gt) = after.find('>') {
                    let after_gt = &after[gt + 1..];
                    if let Some(end) = after_gt.find(close.as_str()) {
                        let raw = after_gt[..end].trim();
                        let clean = strip_html_tags(raw);
                        if !clean.is_empty() && clean.len() < 200 && !is_generic(&clean) {
                            return clean;
                        }
                    }
                }
            }
        }
    }

    if let Some(start) = html.find("<title>") {
        let after = &html[start + 7..];
        if let Some(end) = after.find("</title>") {
            let title = after[..end].trim();
            if !title.is_empty() && title.len() < 200 && !is_generic(title) {
                return title.to_string();
            }
        }
    }

    if let Some(start) = html.find("<p") {
        let after = &html[start..];
        if let Some(gt) = after.find('>') {
            let after_gt = &after[gt + 1..];
            if let Some(end) = after_gt.find("</p>") {
                let raw = after_gt[..end].trim();
                let clean = strip_html_tags(raw);
                if clean.len() > 10 {
                    let truncated: String = clean.chars().take(60).collect();
                    if truncated.len() < clean.len() {
                        return format!("{}...", truncated);
                    }
                    return truncated;
                }
            }
        }
    }

    String::new()
}


// Uses regex to smartly strip leading brackets, titles, and dates.
fn intelligent_clean_markdown(markdown: &str, title: &str) -> String {
    let lines: Vec<&str> = markdown.lines().collect();
    let mut start_idx = 0;
    
    // Patterns to look out for at the top of imported articles
    let brackets_pattern = Regex::new(r"^(?:(?:\[\]\(\))+|\[\])+\s*").unwrap();
    let date_pattern = Regex::new(r"(?i)^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)").unwrap();

    let clean_title = title.trim().to_lowercase();
    
    // We only check the first 20 lines for junk headers
    let check_limit = std::cmp::min(20, lines.len());
    
    for i in 0..check_limit {
        let line = lines[i].trim();
        if line.is_empty() {
             start_idx = i + 1;
             continue;
        }

        // 1. Remove empty brackets like []()[]()[]() or [][]
        let mut cleaned_line = line.to_string();
        if brackets_pattern.is_match(&cleaned_line) {
            cleaned_line = brackets_pattern.replace_all(&cleaned_line, "").to_string();
        }
        cleaned_line = cleaned_line.trim().to_string();

        if cleaned_line.is_empty() {
            start_idx = i + 1;
            continue;
        }

        // 2. Remove if it's just the title repeated
        if cleaned_line.to_lowercase() == clean_title {
            start_idx = i + 1;
            continue;
        }

        // 3. Remove date blocks like "Feb 26, 2026 05:57 AM"
        if date_pattern.is_match(&cleaned_line) || date_pattern.is_match(line) {
            start_idx = i + 1;
            continue;
        }

        // If after bracket removal there's still text, and it's not the title/date, 
        // we probably hit the real content.
        if !cleaned_line.is_empty() {
             // Check one special case: the line might contain the title AND the date consecutively
             let line_lower = cleaned_line.to_lowercase();
             if line_lower.starts_with(&clean_title) && line_lower.len() > clean_title.len() {
                 let remainder = &cleaned_line[clean_title.len()..].trim();
                 if date_pattern.is_match(remainder) {
                      start_idx = i + 1;
                      continue;
                 }
                 // If the remainder starts with | or - and then date
                 if (remainder.starts_with('|') || remainder.starts_with('-')) && date_pattern.is_match(remainder[1..].trim()) {
                      start_idx = i + 1;
                      continue;
                 }
             }
             
             // Check if it's something like "Author name | Date"
             if cleaned_line.contains('|') && date_pattern.is_match(cleaned_line.split('|').last().unwrap_or("").trim()) {
                  start_idx = i + 1;
                  continue;
             }
             if cleaned_line.contains('-') && date_pattern.is_match(cleaned_line.split('-').last().unwrap_or("").trim()) {
                  start_idx = i + 1;
                  continue;
             }

             break;
        }
    }

    lines[start_idx..].join("\n").trim().to_string()
}

fn strip_html_tags(html: &str) -> String {
    let mut result = String::new();
    let mut inside_tag = false;
    for ch in html.chars() {
        match ch {
            '<' => inside_tag = true,
            '>' => inside_tag = false,
            _ if !inside_tag => result.push(ch),
            _ => {}
        }
    }
    result.trim().to_string()
}
