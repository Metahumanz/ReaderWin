use serde::{Deserialize, Serialize};
use tauri_plugin_sql::{Migration, MigrationKind};
use std::fs;
use regex::Regex;
use tauri::{AppHandle, Manager, Runtime};
use encoding_rs::{GB18030, UTF_8};
use epub::doc::EpubDoc;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterContent {
    pub title: String,
    pub body: String,
}

// --- Commands ---

#[tauri::command]
async fn parse_txt(path: String) -> Result<Vec<ChapterContent>, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    
    // Try UTF-8 first, fallback to GB18030 (which covers GBK)
    let (res, _encoding, has_malformed) = UTF_8.decode(&bytes);
    let content = if has_malformed {
        let (res_gbk, _, _) = GB18030.decode(&bytes);
        res_gbk.into_owned()
    } else {
        res.into_owned()
    };
    
    let re = Regex::new(r"(?m)^(第[一二三四五六七八九十百千万\d]+[章节回].*|Chapter\s+\d+.*)$").unwrap();
    
    let mut last_idx = 0;
    let mut chapters = Vec::new();
    let mut current_title = "序章".to_string();

    for mat in re.find_iter(&content) {
        let chunk = content[last_idx..mat.start()].trim();
        if !chunk.is_empty() {
            chapters.push(ChapterContent {
                title: current_title,
                body: chunk.replace("\n", "<br/>").to_string(),
            });
        }
        current_title = mat.as_str().trim().to_string();
        last_idx = mat.end();
    }
    
    let last_chunk = content[last_idx..].trim();
    if !last_chunk.is_empty() {
        chapters.push(ChapterContent {
            title: current_title,
            body: last_chunk.replace("\n", "<br/>").to_string(),
        });
    }

    Ok(chapters)
}

#[tauri::command]
async fn parse_epub(path: String) -> Result<Vec<ChapterContent>, String> {
    let mut doc = EpubDoc::new(&path).map_err(|e| e.to_string())?;
    let mut chapters = Vec::new();

    // Iterate over the toc by reference
    for entry in &doc.toc {
        let title = entry.title.clone();
        let content_path = entry.content.to_str().unwrap_or_default().split('#').next().unwrap_or_default();
        
        if let Ok(content) = doc.get_resource_str(content_path) {
            chapters.push(ChapterContent {
                title,
                body: content,
            });
        }
    }

    Ok(chapters)
}

#[tauri::command]
async fn webdav_sync<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    user: String,
    pass: String,
    mode: String,
) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("reader.db");
    let client = reqwest::Client::new();
    let remote_url = if url.ends_with('/') { format!("{}reader_backup.db", url) } else { format!("{}/reader_backup.db", url) };

    if mode == "upload" {
        if !db_path.exists() { return Err("本地数据库不存在".to_string()); }
        let bytes = fs::read(&db_path).map_err(|e| e.to_string())?;
        let res = client.put(&remote_url).basic_auth(&user, Some(&pass)).body(bytes).send().await.map_err(|e| e.to_string())?;
        if res.status().is_success() { Ok("备份成功".to_string()) } else { Err(format!("上传失败: {}", res.status())) }
    } else {
        let res = client.get(&remote_url).basic_auth(&user, Some(&pass)).send().await.map_err(|e| e.to_string())?;
        if res.status().is_success() {
            let bytes = res.bytes().await.map_err(|e| e.to_string())?;
            fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
            fs::write(&db_path, bytes).map_err(|e| e.to_string())?;
            Ok("还原成功，请重启应用".to_string())
        } else { Err(format!("下载失败: {}", res.status())) }
    }
}

// Legacy source code removed

pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_books_table",
            sql: "CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT,
                cover_path TEXT,
                path TEXT,
                progress_index INTEGER DEFAULT 0,
                last_read DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_chapters_table",
            sql: "CREATE TABLE IF NOT EXISTS chapters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_settings_table",
            sql: "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_sources_table",
            sql: "CREATE TABLE IF NOT EXISTS sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                search_url TEXT,
                search_list_selector TEXT,
                search_title_selector TEXT,
                search_author_selector TEXT,
                search_link_selector TEXT,
                search_cover_selector TEXT,
                chapter_list_selector TEXT,
                chapter_title_selector TEXT,
                chapter_link_selector TEXT,
                content_title_selector TEXT,
                content_body_selector TEXT
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_link_to_chapters",
            sql: "ALTER TABLE chapters ADD COLUMN link TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_source_id_to_books",
            sql: "ALTER TABLE books ADD COLUMN source_id INTEGER;",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:reader.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![parse_txt, parse_epub, webdav_sync])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
