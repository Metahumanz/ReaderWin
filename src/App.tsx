import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { open } from "@tauri-apps/plugin-dialog";

// --- Components & Icons ---
const BookshelfIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2L20 2v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
);
const ExploreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
);
const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const SyncIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
);
const AddIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`relative group flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>
      <div className={`p-3 rounded-xl transition-all ${active ? 'bg-indigo-500/10' : 'group-hover:bg-slate-700/50'}`}>{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 text-center">{label}</span>
      {active && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full shadow-[4px_0_12px_rgba(99,102,241,0.5)]" />}
    </button>
  );
}

function BookCard({ book, onClick }: { book: any, onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex flex-col gap-4 group cursor-pointer active:scale-95 transition-all">
      <div className="aspect-[3/4.2] rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-2xl overflow-hidden relative border border-white/5 group-hover:border-indigo-500/50 transition-all duration-300 group-hover:-translate-y-2">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-5 left-5 right-5">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" style={{ width: `${book.progress_index || 0}%` }} />
          </div>
        </div>
        {book.path?.endsWith('.txt') && (
          <div className="absolute top-4 left-4 px-2 py-1 bg-amber-500/80 text-[10px] font-black uppercase text-white rounded-md backdrop-blur-sm">Local TXT</div>
        )}
      </div>
      <div>
        <h3 className="font-bold text-white leading-tight line-clamp-2 group-hover:text-indigo-400 transition-colors text-lg">{book.title}</h3>
        <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest">{book.author || '未知作者'}</p>
      </div>
    </div>
  );
}

const DEFAULT_SOURCES = [
  {
    name: "笔趣阁 (lu)",
    url: "https://www.biquge.lu",
    search_url: "https://www.biquge.lu/s?q={key}",
    search_list_selector: "div.bookbox",
    search_title_selector: "h4.bookname a",
    search_author_selector: "div.author",
    search_link_selector: "h4.bookname a",
    search_cover_selector: "div.bookimg img",
    chapter_list_selector: "div.listmain dl dd a",
    chapter_title_selector: "a",
    chapter_link_selector: "a",
    content_title_selector: "h1.wap_title",
    content_body_selector: "div#content"
  },
  {
    name: "新笔趣阁 (so)",
    url: "http://www.xbiquge.so",
    search_url: "http://www.xbiquge.so/modules/article/search.php?searchkey={key}",
    search_list_selector: "tr:nth-child(n+2)",
    search_title_selector: "td:nth-child(1) a",
    search_author_selector: "td:nth-child(3)",
    search_link_selector: "td:nth-child(1) a",
    search_cover_selector: "img", // Usually not in list
    chapter_list_selector: "#list dd a",
    chapter_title_selector: "a",
    chapter_link_selector: "a",
    content_title_selector: "div.bookname h1",
    content_body_selector: "div#content"
  }
];

// --- Main App ---
function App() {
  const [activeTab, setActiveTab] = useState("bookshelf");
  const [readerOpen, setReaderOpen] = useState(false);
  const [currentBook, setCurrentBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [content, setContent] = useState({ title: "", body: "" });
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [db, setDb] = useState<Database | null>(null);

  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUser, setWebdavUser] = useState("");
  const [webdavPass, setWebdavPass] = useState("");

  const [tocOpen, setTocOpen] = useState(false);
  const [fontFamily, setFontFamily] = useState("'Georgia', serif");
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [contentWidth, setContentWidth] = useState(800);
  const [readerMenuOpen, setReaderMenuOpen] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [bgImage, setBgImage] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, bookId: number } | null>(null);

  // --- Source Engine State ---
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [resultChapters, setResultChapters] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      console.log("Initializing database...");
      try {
        const _db = await Database.load("sqlite:reader.db");
        console.log("Database loaded successfully:", _db);
        setDb(_db);
        await fetchBooks(_db);
        await fetchSources(_db);
        await loadSettings(_db);
      } catch (err) {
        console.error("Database initialization failed:", err);
      }
    };
    initDb();

    // Disable default context menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  const fetchSources = async (database: Database) => {
    let res = await database.select<any[]>("SELECT * FROM sources");
    if (res.length === 0) {
      console.log("Seeding default sources...");
      for (const source of DEFAULT_SOURCES) {
        await database.execute(
          "INSERT INTO sources (name, url, search_url, search_list_selector, search_title_selector, search_author_selector, search_link_selector, search_cover_selector, chapter_list_selector, chapter_title_selector, chapter_link_selector, content_title_selector, content_body_selector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            source.name, source.url, source.search_url,
            source.search_list_selector, source.search_title_selector,
            source.search_author_selector, source.search_link_selector,
            source.search_cover_selector, source.chapter_list_selector,
            source.chapter_title_selector, source.chapter_link_selector,
            source.content_title_selector, source.content_body_selector
          ]
        );
      }
      res = await database.select<any[]>("SELECT * FROM sources");
    }
    setSources(res);
    if (res.length > 0) setSelectedSource(res[0]);
  };

  const handleSearch = async () => {
    if (!searchQuery || !selectedSource || !db) return;
    setSearching(true);
    try {
      const results = await invoke<any[]>("search_books", { query: searchQuery, source: selectedSource });
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleImportSource = async () => {
    if (!importUrl || !db) return;
    try {
      const response = await fetch(importUrl);
      const sourceData = await response.json();
      // Simple validation and insert
      await db.execute(
        "INSERT INTO sources (name, url, search_url, search_list_selector, search_title_selector, search_author_selector, search_link_selector, search_cover_selector, chapter_list_selector, chapter_title_selector, chapter_link_selector, content_title_selector, content_body_selector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          sourceData.name, sourceData.url, sourceData.search_url,
          sourceData.search_list_selector, sourceData.search_title_selector,
          sourceData.search_author_selector, sourceData.search_link_selector,
          sourceData.search_cover_selector, sourceData.chapter_list_selector,
          sourceData.chapter_title_selector, sourceData.chapter_link_selector,
          sourceData.content_title_selector, sourceData.content_body_selector
        ]
      );
      await fetchSources(db);
      setImportUrl("");
      setIsImportOpen(false);
    } catch (err) {
      console.error("Import failed:", err);
    }
  };

  const handleSaveToBookshelf = async () => {
    if (!selectedResult || !db) return;
    try {
      // 1. Insert book
      const res = await db.execute(
        "INSERT INTO books (title, author, cover_path, path, source_id) VALUES (?, ?, ?, ?, ?)",
        [selectedResult.title, selectedResult.author, selectedResult.cover, "network", selectedSource.id]
      );
      const bookId = res.lastInsertId;

      // 2. Insert chapters
      for (let i = 0; i < resultChapters.length; i++) {
        await db.execute(
          "INSERT INTO chapters (book_id, title, body, order_index, link) VALUES (?, ?, ?, ?, ?)",
          [bookId, resultChapters[i].title, "", i, resultChapters[i].link]
        );
      }

      await fetchBooks(db);
      setSelectedResult(null);
      setResultChapters([]);
      setActiveTab("bookshelf");
    } catch (err) {
      console.error("Save to bookshelf failed:", err);
    }
  };

  const handleViewDetails = async (book: any) => {
    setSelectedResult(book);
    setLoadingDetails(true);
    try {
      const chapters = await invoke<any[]>("fetch_chapters", { url: book.link, source: selectedSource });
      setResultChapters(chapters);
    } catch (err) {
      console.error("Fetch chapters failed:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchBooks = async (database = db) => {
    if (!database) return;
    try {
      const result: any[] = await database.select("SELECT * FROM books ORDER BY last_read DESC");
      setBooks(result);
    } catch (err) {
      console.error("Fetching books failed:", err);
    }
  };

  const deleteBook = async (id: number) => {
    if (!db) return;
    if (confirm("确定要删除这本书吗？相关章节缓存也将被清除。")) {
      await db.execute("DELETE FROM books WHERE id = $1", [id]);
      await fetchBooks();
      setContextMenu(null);
    }
  };

  const loadSettings = async (database = db) => {
    if (!database) return;
    try {
      const rows: any[] = await database.select("SELECT * FROM settings");
      rows.forEach(row => {
        if (row.key === 'webdav_url') setWebdavUrl(row.value);
        if (row.key === 'webdav_user') setWebdavUser(row.value);
        if (row.key === 'webdav_pass') setWebdavPass(row.value);
        if (row.key === 'font_family') setFontFamily(row.value);
        if (row.key === 'font_size') setFontSize(parseInt(row.value));
        if (row.key === 'line_height') setLineHeight(parseFloat(row.value));
        if (row.key === 'letter_spacing') setLetterSpacing(parseFloat(row.value));
        if (row.key === 'content_width') setContentWidth(parseInt(row.value));
        if (row.key === 'bg_image') setBgImage(row.value);
        if (row.key === 'immersive_mode') {
          const isImmersive = row.value === 'true';
          setImmersiveMode(isImmersive);
          toggleImmersive(isImmersive);
        }
      });
    } catch (err) { console.error(err); }
  };

  const saveSetting = async (key: string, value: string) => {
    if (!db) return;
    await db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)", [key, value]);
  };

  const handleWebdavSync = async (mode: 'upload' | 'download') => {
    if (!webdavUrl || !webdavUser || !webdavPass) {
      alert("请填写完整 WebDAV 配置。");
      return;
    }
    setLoading(true);
    try {
      await saveSetting('webdav_url', webdavUrl);
      await saveSetting('webdav_user', webdavUser);
      await saveSetting('webdav_pass', webdavPass);

      const res: string = await invoke("webdav_sync", { url: webdavUrl, user: webdavUser, pass: webdavPass, mode });
      alert(res);
      if (mode === 'download') {
        await fetchBooks();
      }
    } catch (err) {
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportTxt = async () => {
    try {
      const selected = await open({ multiple: false, filters: [{ name: 'Text', extensions: ['txt'] }] });
      if (selected && typeof selected === 'string') {
        setLoading(true);
        const parsedChapters: any[] = await invoke("parse_txt", { path: selected });
        const fileName = selected.split(/\\|\//).pop() || "未知书籍";
        if (db) {
          const res = await db.execute("INSERT INTO books (title, path, author) VALUES ($1, $2, $3)", [fileName, selected, "本地导入"]);
          const bookId = res.lastInsertId;
          for (let i = 0; i < parsedChapters.length; i++) {
            await db.execute("INSERT INTO chapters (book_id, title, body, order_index) VALUES ($1, $2, $3, $4)", [bookId, parsedChapters[i].title, parsedChapters[i].body, i]);
          }
          await fetchBooks(db);
          alert(`导入成功！共 ${parsedChapters.length} 章。`);
        }
      }
    } catch (err) { alert(err); } finally { setLoading(false); }
  };

  const openReader = async (book: any) => {
    if (!db) return;
    setCurrentBook(book);
    setReaderOpen(true);
    setLoading(true);
    try {
      const rows: any[] = await db.select("SELECT id, title, order_index FROM chapters WHERE book_id = $1 ORDER BY order_index ASC", [book.id]);
      setChapters(rows);
      const savedIdx = book.progress_index || 0;
      setCurrentChapterIndex(savedIdx);
      await loadChapter(rows[savedIdx].id, db);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadChapter = async (chapterId: number, database = db) => {
    if (!database) return;
    setLoading(true);
    try {
      const rows: any[] = await database.select("SELECT title, body, link FROM chapters WHERE id = $1", [chapterId]);
      if (rows.length > 0) {
        let { title, body, link } = rows[0];

        if (link && !body) {
          // Fetch source rules for this book
          const bookSources = await database.select<any[]>(
            "SELECT * FROM sources WHERE id = ?",
            [currentBook.source_id]
          );
          const source = bookSources[0];

          try {
            const res = await invoke<any>("fetch_chapter", {
              url: link,
              rule: {
                title_selector: source?.content_title_selector || "h1",
                body_selector: source?.content_body_selector || "div"
              }
            });
            body = res.body;
            // Cache the body
            await database.execute("UPDATE chapters SET body = ? WHERE id = ?", [body, chapterId]);
          } catch (err) {
            console.error("Fetch content failed:", err);
            body = "加载失败，请检查网络或书源规则。";
          }
        }

        setContent({ title, body });
        const currentIdx = chapters.findIndex(c => c.id === chapterId);
        if (currentIdx !== -1 && currentBook) {
          await database.execute("UPDATE books SET progress_index = $1, last_read = CURRENT_TIMESTAMP WHERE id = $2", [currentIdx, currentBook.id]);
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const nextIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIdx);
      loadChapter(chapters[nextIdx].id);
      window.scrollTo(0, 0);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(prevIdx);
      loadChapter(chapters[prevIdx].id);
      window.scrollTo(0, 0);
    }
  };

  const toggleImmersive = async (immersive: boolean) => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.setDecorations(!immersive);
    await win.setFullscreen(immersive);
    setImmersiveMode(immersive);
    saveSetting('immersive_mode', immersive.toString());
  };

  const setWindowPreset = async (ratio: string) => {
    const { getCurrentWindow, LogicalSize } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.setDecorations(true);
    await win.setFullscreen(false);
    setImmersiveMode(false);

    let size = new LogicalSize(1024, 576);
    if (ratio === "16:9") size = new LogicalSize(1024, 576);
    if (ratio === "9:16") size = new LogicalSize(450, 800);
    if (ratio === "4:3") size = new LogicalSize(800, 600);
    if (ratio === "3:4") size = new LogicalSize(600, 800);

    await win.setSize(size);
    await win.center();
  };

  if (readerOpen) {
    const progress = chapters.length > 0 ? Math.round(((currentChapterIndex + 1) / chapters.length) * 100) : 0;

    return (
      <div
        className="h-screen text-[#d4d4d4] overflow-hidden flex flex-col relative transition-all duration-700 select-none"
        style={{
          fontFamily,
          backgroundColor: bgImage ? 'transparent' : '#1c1c1c',
          backgroundImage: bgImage ? `url(${bgImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Progress Bar (at very top) */}
        {!immersiveMode && (
          <div className="fixed top-16 left-0 right-0 h-1 bg-white/5 z-50">
            <div className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Top Nav (Hidden in immersive unless menu open) */}
        <div className={`h-16 bg-black/60 backdrop-blur-3xl border-b border-white/5 flex items-center px-6 justify-between z-50 shrink-0 transition-transform duration-500 ${immersiveMode && !readerMenuOpen ? '-translate-y-full' : 'translate-y-0'}`}>
          <button onClick={() => { setReaderOpen(false); toggleImmersive(false); fetchBooks(); }} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="text-sm font-black text-slate-300 truncate max-w-[200px] uppercase tracking-wider">{currentBook?.title}</div>
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-indigo-500/20"
            >
              目录 {currentChapterIndex + 1}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleImmersive(!immersiveMode)} className={`p-2 rounded-xl transition-all ${immersiveMode ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            </button>
          </div>
        </div>

        {/* Paginated Content Area */}
        <div
          className="flex-1 relative overflow-hidden"
          onWheel={(e) => {
            const el = document.getElementById('viewer-content');
            if (!el || loading) return;
            if (e.deltaY > 0) {
              const start = el.scrollLeft;
              el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
              setTimeout(() => { if (Math.abs(el.scrollLeft - start) < 10) nextChapter(); }, 350);
            } else {
              const start = el.scrollLeft;
              el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
              setTimeout(() => { if (Math.abs(el.scrollLeft - start) < 10 && start === 0) prevChapter(); }, 350);
            }
          }}
        >
          {/* Click areas for turning pages & menu */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-w-resize" onClick={() => {
            const el = document.getElementById('viewer-content');
            if (el) {
              const start = el.scrollLeft;
              el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
              setTimeout(() => { if (Math.abs(el.scrollLeft - start) < 10 && start === 0) prevChapter(); }, 350);
            }
          }} />
          <div className="absolute inset-x-1/4 inset-y-0 w-1/2 z-10 cursor-alias" onClick={() => setReaderMenuOpen(!readerMenuOpen)} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-e-resize" onClick={() => {
            const el = document.getElementById('viewer-content');
            if (el) {
              const start = el.scrollLeft;
              el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
              setTimeout(() => { if (Math.abs(el.scrollLeft - start) < 10) nextChapter(); }, 350);
            }
          }} />

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/10 border-t-indigo-500"></div>
            </div>
          ) : (
            <div
              id="viewer-content"
              className="h-full overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar"
              style={{
                columnWidth: '100vw',
                columnGap: '0px',
                columnFill: 'auto',
              }}
            >
              <article className="h-full snap-start" style={{ width: '100vw' }}>
                <div
                  className="max-w-none mx-auto h-full px-12 py-12 flex flex-col"
                  style={{ width: `${contentWidth}px`, maxWidth: '90vw' }}
                >
                  <h1
                    className="font-black mb-12 text-white leading-tight border-l-8 border-indigo-500 pl-10 shrink-0"
                    style={{ fontSize: `calc(${fontSize * 1.8}px + 1vw)` }}
                  >
                    {content.title}
                  </h1>
                  <div
                    className="prose prose-invert max-w-none text-justify text-slate-200 flex-1"
                    style={{
                      fontSize: `calc(${fontSize}px + 0.2vw)`,
                      lineHeight: lineHeight,
                      letterSpacing: `${letterSpacing}px`,
                    }}
                    dangerouslySetInnerHTML={{ __html: content.body }}
                  />
                </div>
              </article>
            </div>
          )}
        </div>

        {/* Reader Settings Menu */}
        {readerMenuOpen && (
          <div className="fixed inset-x-0 bottom-0 z-[100] p-6 animate-in slide-in-from-bottom duration-500">
            <div className="max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between">
                      <span>字体大小</span>
                      <span className="text-indigo-400 font-bold">{fontSize}</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <button onClick={() => { setFontSize(s => Math.max(12, s - 1)); saveSetting('font_size', (fontSize - 1).toString()); }} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold">-</button>
                      <input type="range" min="12" max="64" value={fontSize} onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFontSize(val);
                        saveSetting('font_size', val.toString());
                      }} className="flex-1 accent-indigo-500 h-1.5" />
                      <button onClick={() => { setFontSize(s => Math.min(64, s + 1)); saveSetting('font_size', (fontSize + 1).toString()); }} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold">+</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between">
                      <span>字符间距</span>
                      <span className="text-indigo-400 font-bold">{letterSpacing}</span>
                    </label>
                    <input type="range" min="-2" max="10" step="0.5" value={letterSpacing} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLetterSpacing(val);
                      saveSetting('letter_spacing', val.toString());
                    }} className="w-full accent-indigo-500 h-1.5" />
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between">
                      <span>行高</span>
                      <span className="text-indigo-400 font-bold">{lineHeight}</span>
                    </label>
                    <input type="range" min="1" max="4" step="0.1" value={lineHeight} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLineHeight(val);
                      saveSetting('line_height', val.toString());
                    }} className="w-full accent-indigo-500 h-1.5" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between">
                      <span>内容页边距</span>
                      <span className="text-indigo-400 font-bold">{contentWidth}px</span>
                    </label>
                    <input type="range" min="400" max="1400" step="50" value={contentWidth} onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setContentWidth(val);
                      saveSetting('content_width', val.toString());
                    }} className="w-full accent-indigo-500 h-1.5" />
                  </div>
                </div>
              </div>
              <div className="mt-10 flex gap-4">
                <button onClick={() => {
                  const nextFont = fontFamily.includes("serif") ? "system-ui, sans-serif" : "'Georgia', serif";
                  setFontFamily(nextFont);
                  saveSetting('font_family', nextFont);
                }} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                  切换字体库
                </button>
                <button onClick={async () => {
                  const { open } = await import("@tauri-apps/plugin-dialog");
                  const selected = await open({ multiple: false, filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }] });
                  if (selected && typeof selected === 'string') {
                    setBgImage(`https://asset.localhost/${selected.replace(/\\/g, '/')}`);
                    saveSetting('bg_image', `https://asset.localhost/${selected.replace(/\\/g, '/')}`);
                  }
                }} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                  自定义背景
                </button>
                <button onClick={() => setReaderMenuOpen(false)} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20">
                  完成设定
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ToC Overlay */}
        {tocOpen && (
          <div className="fixed inset-0 z-[60] flex animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setTocOpen(false)} />
            <div className="relative w-80 bg-slate-900 h-full shadow-2xl overflow-y-auto border-r border-white/10 animate-in slide-in-from-left duration-500">
              <div className="p-8 border-b border-white/5 sticky top-0 bg-slate-900 z-10">
                <h2 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">目录</h2>
                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em]">{chapters.length} Chapters</p>
              </div>
              <div className="p-4">
                {chapters.map((chap, idx) => (
                  <button
                    key={chap.id}
                    onClick={async () => { // Made onClick async
                      setCurrentChapterIndex(idx);
                      // loadChapter(chap.id); // Original call, now integrated below
                      setTocOpen(false);
                      const el = document.getElementById('viewer-content');
                      if (el) el.scrollLeft = 0;

                      // Start of new logic for loadChapter
                      if (chapters[idx].link && !chapters[idx].body) {
                        setLoading(true);
                        try {
                          // Fetch source rules for this book
                          const bookSources = await db.select<any[]>(
                            "SELECT * FROM sources WHERE id = ?",
                            [currentBook.source_id]
                          );
                          const source = bookSources[0];

                          const res = await invoke<any>("fetch_chapter", {
                            url: chapters[idx].link,
                            rule: {
                              title_selector: source?.content_title_selector || "h1",
                              body_selector: source?.content_body_selector || "div"
                            }
                          });
                          setContent({ title: res.title, body: res.body });
                          // Update the chapter in state with the fetched body
                          setChapters(prev => prev.map((c, i) => i === idx ? { ...c, body: res.body } : c));
                        } catch (err) {
                          console.error("Failed to fetch chapter content:", err);
                          // Optionally, display an error message to the user
                        } finally {
                          setLoading(false);
                        }
                      } else {
                        // If chapter body is already available or no link, just set content
                        setContent({ title: chapters[idx].title, body: chapters[idx].body || '' });
                      }
                      // End of new logic for loadChapter
                    }}
                    className={`w-full text-left px-5 py-4 rounded-2xl transition-all mb-2 flex items-center gap-4 ${idx === currentChapterIndex ? 'bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20' : 'hover:bg-white/5 text-slate-400 font-medium'}`}
                  >
                    <span className="text-[10px] opacity-40 font-black">{idx + 1}</span>
                    <span className="truncate text-sm">{chap.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Status (Hidden in immersive unless menu open) */}
        {!immersiveMode || readerMenuOpen ? (
          <div className="h-10 bg-black/40 backdrop-blur-3xl border-t border-white/5 flex items-center px-6 justify-between shrink-0 text-[10px] font-black text-slate-500 uppercase tracking-widest transition-transform duration-500">
            <div>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="flex gap-4 text-indigo-500">
              <span className="opacity-40">Chapter {currentChapterIndex + 1}</span>
              <span>{progress}%</span>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
            <div className="h-1 bg-white/10 w-32 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans" onClick={() => setContextMenu(null)}>
      {/* Custom Context Menu */}
      {contextMenu && (
        <div className="fixed z-[100] w-48 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-2 animate-in zoom-in-95 duration-200" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button
            onClick={() => {
              const book = books.find(b => b.id === contextMenu.bookId);
              openReader(book);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-white/5 rounded-xl text-sm font-medium transition-all"
          >
            开始阅读
          </button>
          <div className="h-px bg-white/5 my-1" />
          <button onClick={() => deleteBook(contextMenu.bookId)} className="w-full text-left px-4 py-2.5 hover:bg-red-500/10 text-red-500 rounded-xl text-sm font-bold transition-all">
            删除书籍
          </button>
        </div>
      )}

      <nav className="fixed left-0 top-0 h-full w-20 bg-slate-800/80 backdrop-blur-2xl border-r border-slate-700/50 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-pulse"><span className="text-2xl font-bold text-white">R</span></div>
        <NavButton active={activeTab === "bookshelf"} onClick={() => setActiveTab("bookshelf")} icon={<BookshelfIcon />} label="书架" />
        <NavButton active={activeTab === "explore"} onClick={() => setActiveTab("explore")} icon={<ExploreIcon />} label="发现" />
        <NavButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={<SettingsIcon />} label="设置" />
      </nav>
      <main className="pl-20 min-h-screen">
        <header className="px-8 pt-10 pb-10 flex justify-between items-end sticky top-0 bg-slate-900/80 backdrop-blur-md z-40">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2">{activeTab === "bookshelf" ? "我的书架" : activeTab === "explore" ? "发现新世界" : "系统设置"}</h1>
            <p className="text-slate-400 font-medium">{activeTab === "bookshelf" ? `你当前有 ${books.length} 本藏书` : activeTab === "explore" ? "从数千个书源中寻找灵感" : "账号同步与个性化配置"}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleImportTxt} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold transform active:scale-95 transition-all outline-none">本地 TXT</button>
            <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-all outline-none">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35"></path></svg>
                <span>网文书源</span>
              </div>
            </button>
          </div>
        </header>

        <section className="px-8 pb-20">
          {activeTab === "bookshelf" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 animate-in fade-in duration-500">
              {books.map((book) => (
                <div key={book.id} onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, bookId: book.id });
                }}>
                  <BookCard book={book} onClick={() => openReader(book)} />
                </div>
              ))}
              <div onClick={handleImportTxt} className="aspect-[3/4] border-2 border-dashed border-slate-700/50 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all cursor-pointer group shadow-inner">
                <div className="p-4 rounded-2xl bg-slate-800 group-hover:bg-indigo-500/10 shadow-lg"><AddIcon /></div>
                <span className="font-bold text-sm">添加本地书籍</span>
              </div>
            </div>
          )}

          {activeTab === "explore" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">探索源</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Search Books Across Sources</p>
                </div>
                <button onClick={() => setIsImportOpen(true)} className="px-6 py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-2xl transition-all font-bold text-xs flex items-center gap-2">
                  <AddIcon /> 导入书源
                </button>
              </div>

              {/* Source Selection & Search Bar */}
              <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md flex flex-col md:flex-row gap-4 items-center">
                <select
                  value={selectedSource?.id || ""}
                  onChange={(e) => setSelectedSource(sources.find(s => s.id === parseInt(e.target.value)))}
                  className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-4 text-white hover:border-indigo-500 outline-none appearance-none transition-all w-full md:w-48 font-bold text-sm"
                >
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  {sources.length === 0 && <option value="">未导入书源</option>}
                </select>
                <div className="flex-1 relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="输入书名或作者搜索..."
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-6 pr-20 py-5 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all disabled:opacity-50"
                  >
                    {searching ? "搜索中..." : "立刻搜索"}
                  </button>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {searchResults.map((book, idx) => (
                  <div key={idx} className="flex flex-col gap-4 group cursor-pointer active:scale-95 transition-all">
                    <div className="aspect-[3/4.2] rounded-3xl bg-slate-700 shadow-2xl overflow-hidden relative border border-white/5 group-hover:border-indigo-500/50 transition-all duration-300">
                      {book.cover ? (
                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500"><ExploreIcon /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <button
                          onClick={() => handleViewDetails(book)}
                          className="w-full py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/40"
                        >
                          详情 / 加入
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-white line-clamp-2 text-sm">{book.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">{book.author}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Book Details Modal */}
              {selectedResult && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setSelectedResult(null)} />
                  <div className="relative w-full max-w-4xl max-h-[80vh] bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="p-10 border-b border-white/5 flex gap-10 items-start shrink-0">
                      <div className="w-40 aspect-[3/4.2] rounded-2xl bg-slate-800 shadow-xl overflow-hidden shrink-0 border border-white/5">
                        <img src={selectedResult.cover} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 pt-4">
                        <h2 className="text-4xl font-black text-white tracking-tight">{selectedResult.title}</h2>
                        <p className="text-indigo-400 font-bold uppercase tracking-widest mt-2">{selectedResult.author}</p>
                        <div className="mt-8 flex gap-4">
                          <button
                            onClick={handleSaveToBookshelf}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/30 active:scale-95"
                          >
                            加入书架
                          </button>
                          <button onClick={() => setSelectedResult(null)} className="px-10 py-5 border border-white/10 text-white rounded-3xl font-bold hover:bg-white/5 transition-all">取消</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-10 bg-black/20">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">章节明细 ({resultChapters.length})</h4>
                      {loadingDetails ? (
                        <div className="py-20 text-center animate-pulse text-indigo-400 font-bold uppercase tracking-[0.3em]">目录加载中...</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {resultChapters.map((chap, idx) => (
                            <div key={idx} className="bg-white/5 p-4 rounded-xl text-xs text-slate-400 truncate border border-transparent hover:border-indigo-500/30 transition-all font-medium">
                              {chap.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {searchResults.length === 0 && !searching && (
                <div className="py-20 text-center text-slate-600">
                  <p className="font-bold text-lg">开启你的阅读探索之旅</p>
                  <p className="text-xs uppercase mt-2 tracking-widest">请选择书源并输入关键词进行搜索</p>
                </div>
              )}

              {/* Import Modal */}
              {isImportOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsImportOpen(false)} />
                  <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">导入书源</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Import Source JSON URL</p>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">书源 JSON 链接</label>
                        <input
                          type="text"
                          value={importUrl}
                          onChange={e => setImportUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="pt-4 flex gap-4">
                        <button onClick={() => setIsImportOpen(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all text-xs">取消</button>
                        <button onClick={handleImportSource} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest">确认导入</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-300">
              <div className="bg-slate-800/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-xl"><SyncIcon /></div>WebDAV 同步
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">服务器地址</label>
                    <input type="text" value={webdavUrl} onChange={e => setWebdavUrl(e.target.value)} placeholder="https://dav.jianguoyun.com/dav/" className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">账号</label>
                      <input type="text" value={webdavUser} onChange={e => setWebdavUser(e.target.value)} placeholder="Username" className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">应用密码</label>
                      <input type="password" value={webdavPass} onChange={e => setWebdavPass(e.target.value)} placeholder="••••••••" className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="pt-6 flex gap-4">
                    <button onClick={() => handleWebdavSync('upload')} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">备份至云端</button>
                    <button onClick={() => handleWebdavSync('download')} className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl active:scale-95 transition-all">恢复备份</button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-xl">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12V4h16v8"></path><path d="M4 12h16"></path><path d="M12 4v16"></path></svg>
                  </div>界面与布局
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">阅读默认字体</label>
                    <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); saveSetting('font_family', e.target.value); }} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white hover:border-indigo-500 outline-none appearance-none transition-all">
                      <option value="'Georgia', serif">纤细衬线 (Georgia)</option>
                      <option value="'Times New Roman', serif">经典衬线 (Times New Roman)</option>
                      <option value="system-ui, sans-serif">现代无衬线 (System UI)</option>
                      <option value="'Microsoft YaHei', sans-serif">微软雅黑 (Microsoft YaHei)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">窗口比例预设 (Aspect Ratio)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setWindowPreset("16:9")} className="py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-xl text-xs font-bold hover:border-indigo-500 transition-all">16:9 宽屏</button>
                      <button onClick={() => setWindowPreset("9:16")} className="py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-xl text-xs font-bold hover:border-indigo-500 transition-all">9:16 竖屏</button>
                      <button onClick={() => setWindowPreset("4:3")} className="py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-xl text-xs font-bold hover:border-indigo-500 transition-all">4:3 标准</button>
                      <button onClick={() => setWindowPreset("3:4")} className="py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-xl text-xs font-bold hover:border-indigo-500 transition-all">3:4 文档</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
