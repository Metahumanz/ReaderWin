use serde::{Deserialize, Serialize};
use scraper::{Html, Selector};
use reqwest::header::{HeaderMap, USER_AGENT};
use tauri_plugin_sql::{Migration, MigrationKind};
use std::fs;
use regex::Regex;
use tauri::{AppHandle, Manager, Runtime};
use encoding_rs::{GB18030, UTF_8};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterContent {
    pub title: String,
    pub body: String,
}

#[derive(Debug, Deserialize)]
pub struct ScrapeRule {
    pub title_selector: String,
    pub body_selector: String,
}

#[tauri::command]
async fn fetch_chapter(url: String, rule: ScrapeRule) -> Result<ChapterContent, String> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".parse().unwrap());

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let html_content = response.text().await.map_err(|e| e.to_string())?;

    let document = Html::parse_document(&html_content);
    
    let title_selector = Selector::parse(&rule.title_selector).map_err(|_| "Invalid title selector")?;
    let body_selector = Selector::parse(&rule.body_selector).map_err(|_| "Invalid body selector")?;

    let title = document
        .select(&title_selector)
        .next()
        .map(|el| el.text().collect::<Vec<_>>().join(""))
        .unwrap_or_else(|| "Unknown Title".to_string());

    let body = document
        .select(&body_selector)
        .next()
        .map(|el| el.html()) 
        .unwrap_or_else(|| "No content found".to_string());

    Ok(ChapterContent { title, body })
}

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

#[derive(Debug, Serialize, Deserialize)]
pub struct BookSource {
    pub id: Option<i64>,
    pub name: String,
    pub url: String,
    pub search_url: String, // e.g. "https://example.com/search?key={key}"
    pub search_list_selector: String,
    pub search_title_selector: String,
    pub search_author_selector: String,
    pub search_link_selector: String,
    pub search_cover_selector: String,
    pub chapter_list_selector: String,
    pub chapter_title_selector: String,
    pub chapter_link_selector: String,
    pub content_title_selector: String,
    pub content_body_selector: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub title: String,
    pub author: String,
    pub link: String,
    pub cover: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterLink {
    pub title: String,
    pub link: String,
}

#[tauri::command]
async fn fetch_chapters(url: String, source: BookSource) -> Result<Vec<ChapterLink>, String> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".parse().unwrap());

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let html_content = response.text().await.map_err(|e| e.to_string())?;

    let document = Html::parse_document(&html_content);
    let list_selector = Selector::parse(&source.chapter_list_selector).map_err(|_| "Invalid list selector")?;
    let title_selector = Selector::parse(&source.chapter_title_selector).map_err(|_| "Invalid chapter title selector")?;
    let link_selector = Selector::parse(&source.chapter_link_selector).map_err(|_| "Invalid chapter link selector")?;

    let mut results = Vec::new();
    for element in document.select(&list_selector) {
        let title = element.select(&title_selector).next().map(|el| el.text().collect::<Vec<_>>().join("")).unwrap_or_default();
        let link = element.select(&link_selector).next().map(|el| el.attr("href").unwrap_or_default().to_string()).unwrap_or_default();
        
        let full_link = if link.starts_with('/') {
            let base = reqwest::Url::parse(&source.url).map_err(|e| e.to_string())?;
            base.join(&link).map_err(|e| e.to_string())?.to_string()
        } else if !link.is_empty() && !link.starts_with("http") {
             // Handle relative to page url
             let base = reqwest::Url::parse(&url).map_err(|e| e.to_string())?;
             base.join(&link).map_err(|e| e.to_string())?.to_string()
        } else {
            link
        };
        
        if !title.is_empty() {
            results.push(ChapterLink { title, link: full_link });
        }
    }

    Ok(results)
}

#[tauri::command]
async fn search_books(query: String, source: BookSource) -> Result<Vec<SearchResult>, String> {
    let url = source.search_url.replace("{key}", &query);
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".parse().unwrap());

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let html_content = response.text().await.map_err(|e| e.to_string())?;

    let document = Html::parse_document(&html_content);
    let list_selector = Selector::parse(&source.search_list_selector).map_err(|_| "Invalid list selector")?;
    let title_selector = Selector::parse(&source.search_title_selector).map_err(|_| "Invalid title selector")?;
    let author_selector = Selector::parse(&source.search_author_selector).map_err(|_| "Invalid author selector")?;
    let link_selector = Selector::parse(&source.search_link_selector).map_err(|_| "Invalid link selector")?;
    let cover_selector = Selector::parse(&source.search_cover_selector).map_err(|_| "Invalid cover selector")?;

    let mut results = Vec::new();
    for element in document.select(&list_selector) {
        let title = element.select(&title_selector).next().map(|el| el.text().collect::<Vec<_>>().join("")).unwrap_or_default();
        let author = element.select(&author_selector).next().map(|el| el.text().collect::<Vec<_>>().join("")).unwrap_or_default();
        let link = element.select(&link_selector).next().map(|el| el.attr("href").unwrap_or_default().to_string()).unwrap_or_default();
        // Resolve relative links
        let full_link = if link.starts_with('/') {
            let base = reqwest::Url::parse(&source.url).map_err(|e| e.to_string())?;
            base.join(&link).map_err(|e| e.to_string())?.to_string()
        } else {
            link
        };
        
        let cover = element.select(&cover_selector).next().map(|el| el.attr("src").unwrap_or_else(|| el.attr("data-src").unwrap_or_default()).to_string()).unwrap_or_default();
        
        results.push(SearchResult { title, author, link: full_link, cover });
    }

    Ok(results)
}

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
        .invoke_handler(tauri::generate_handler![fetch_chapter, parse_txt, webdav_sync, search_books, fetch_chapters])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
