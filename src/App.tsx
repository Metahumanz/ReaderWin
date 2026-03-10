import { useState, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { open } from "@tauri-apps/plugin-dialog";

// --- Components & Icons ---
const BookshelfIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2L20 2v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
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
  const [importing, setImporting] = useState(false);
  const progress = chapters.length > 0 ? Math.round((currentChapterIndex / Math.max(1, chapters.length - 1)) * 100) : 0;
  const [tempProgress, setTempProgress] = useState(0);

  useEffect(() => {
    setTempProgress(progress);
  }, [progress]);

  useEffect(() => {
    const initDb = async () => {
      console.log("Initializing database...");
      try {
        const _db = await Database.load("sqlite:reader.db");
        console.log("Database loaded successfully:", _db);
        setDb(_db);
        await fetchBooks(_db);
        await loadSettings(_db);
      } catch (err) {
        console.error("Database initialization failed:", err);
      }
    };
    initDb();

    // Disable default context menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);

    // Handle Resize
    const handleResize = () => {
      const el = document.getElementById('viewer-content');
      if (el) {
        // Just snapping to the nearest page boundary
        const page = Math.round(el.scrollLeft / el.clientWidth);
        el.scrollLeft = page * el.clientWidth;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sync ToC Scroll
  useEffect(() => {
    if (tocOpen) {
      setTimeout(() => {
        const activeItem = document.getElementById(`toc-item-${currentChapterIndex}`);
        if (activeItem) {
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [tocOpen, currentChapterIndex]);

  // Save detailed progress
  useEffect(() => {
    if (!readerOpen || !currentBook || !db) return;

    const saver = setInterval(async () => {
      const el = document.getElementById('viewer-content');
      if (el) {
        await db.execute("UPDATE books SET progress_offset = $1 WHERE id = $2", [Math.round(el.scrollLeft), currentBook.id]);
      }
    }, 5000);

    return () => clearInterval(saver);
  }, [readerOpen, currentBook, db]);

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

  const handleImportBook = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Books', extensions: ['txt', 'epub'] }]
      });
      if (selected && typeof selected === 'string') {
        const isEpub = selected.toLowerCase().endsWith('.epub');
        setImporting(true);
        try {
          const command = isEpub ? "parse_epub" : "parse_txt";
          const parsedChapters: any[] = await invoke(command, { path: selected });
          const fileName = selected.split(/\\|\//).pop() || "未知书籍";

          if (db) {
            const res = await db.execute(
              "INSERT INTO books (title, path, author) VALUES ($1, $2, $3)",
              [fileName, selected, isEpub ? "EPUB 导入" : "TXT 导入"]
            );
            const bookId = res.lastInsertId;
            for (let i = 0; i < parsedChapters.length; i++) {
              await db.execute(
                "INSERT INTO chapters (book_id, title, body, order_index) VALUES ($1, $2, $3, $4)",
                [bookId, parsedChapters[i].title, parsedChapters[i].body, i]
              );
            }
            await fetchBooks(db);
            alert(`导入成功！共 ${parsedChapters.length} 章。`);
          }
        } catch (err) {
          alert("解析失败: " + err);
        } finally {
          setImporting(false);
        }
      }
    } catch (err) {
      alert(err);
      setImporting(false);
    }
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
      await loadChapter(rows[savedIdx].id, true, db);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadChapter = async (chapterId: number, restoreOffset = false, database = db) => {
    if (!database) return;
    setLoading(true);
    try {
      const rows: any[] = await database.select("SELECT title, body, link FROM chapters WHERE id = $1", [chapterId]);
      if (rows.length > 0) {
        let { title, body, link } = rows[0];

        if (link && !body) {
          body = "此章节内容为网络链接，当前版本已关闭网络解析功能。";
        }

        setContent({ title, body });
        const currentIdx = chapters.findIndex(c => c.id === chapterId);
        if (currentIdx !== -1 && currentBook) {
          await database.execute("UPDATE books SET progress_index = $1, last_read = CURRENT_TIMESTAMP WHERE id = $2", [currentIdx, currentBook.id]);

          if (restoreOffset) {
            setTimeout(() => {
              const el = document.getElementById('viewer-content');
              if (el && currentBook.progress_offset) {
                el.scrollLeft = currentBook.progress_offset;
              }
            }, 100);
          }
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const nextIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIdx);
      loadChapter(chapters[nextIdx].id);
      const el = document.getElementById('viewer-content');
      if (el) el.scrollLeft = 0;
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(prevIdx);
      loadChapter(chapters[prevIdx].id);
      const el = document.getElementById('viewer-content');
      if (el) el.scrollLeft = 0;
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

        {/* Reader Settings Menu Overlay */}
        {readerMenuOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/20" onClick={() => setReaderMenuOpen(false)} />
            <div className="relative p-6 animate-in slide-in-from-bottom duration-500">
              <div className="max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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

                {/* Progress & Chapter Navigation */}
                <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between px-2">
                    <span>阅读进度</span>
                    <span className="text-indigo-400 font-bold">{tempProgress}%</span>
                  </label>
                  <div className="flex items-center gap-6">
                    <button
                      onClick={prevChapter}
                      disabled={currentChapterIndex <= 0}
                      className="w-12 h-12 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>

                    <div className="flex-1 relative group">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tempProgress}
                        onChange={(e) => setTempProgress(parseInt(e.target.value))}
                        onMouseUp={async (e: any) => {
                          const newPercent = parseInt(e.target.value);
                          if (newPercent === progress) return;

                          if (confirm(`确定要跳转到全书的 ${newPercent}% 附近吗？`)) {
                            const targetIdx = Math.min(
                              chapters.length - 1,
                              Math.floor((newPercent / 100) * chapters.length)
                            );
                            setCurrentChapterIndex(targetIdx);
                            await loadChapter(chapters[targetIdx].id);
                            const el = document.getElementById('viewer-content');
                            if (el) el.scrollLeft = 0;
                          } else {
                            setTempProgress(progress);
                          }
                        }}
                        className="w-full accent-indigo-500 h-2 bg-white/10 rounded-full cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={nextChapter}
                      disabled={currentChapterIndex >= chapters.length - 1}
                      className="w-12 h-12 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
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
                      const imageSrc = convertFileSrc(selected);
                      setBgImage(imageSrc);
                      saveSetting('bg_image', imageSrc);
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
                    id={`toc-item-${idx}`}
                    onClick={async () => {
                      setCurrentChapterIndex(idx);
                      const el = document.getElementById('viewer-content');
                      if (el) el.scrollLeft = 0;
                      await loadChapter(chap.id);
                      setTocOpen(false);
                      setReaderMenuOpen(false);
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
        <NavButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={<SettingsIcon />} label="设置" />
      </nav>
      <main className="pl-20 min-h-screen">
        <header className="px-8 pt-10 pb-10 flex justify-between items-end sticky top-0 bg-slate-900/80 backdrop-blur-md z-40">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2">{activeTab === "bookshelf" ? "我的书架" : activeTab === "explore" ? "发现新世界" : "系统设置"}</h1>
            <p className="text-slate-400 font-medium">{activeTab === "bookshelf" ? `你当前有 ${books.length} 本藏书` : activeTab === "explore" ? "从数千个书源中寻找灵感" : "账号同步与个性化配置"}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleImportBook} disabled={importing} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="flex items-center gap-2">
                <AddIcon />
                <span>导入本地书籍 (TXT/EPUB)</span>
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
                  if (importing) return;
                  setContextMenu({ x: e.clientX, y: e.clientY, bookId: book.id });
                }}>
                  <BookCard book={book} onClick={() => !importing && openReader(book)} />
                </div>
              ))}
              <div onClick={!importing ? handleImportBook : undefined} className={`aspect-[3/4] border-2 border-dashed border-slate-700/50 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-500 transition-all cursor-pointer group shadow-inner ${importing ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5'}`}>
                <div className={`p-4 rounded-2xl bg-slate-800 shadow-lg ${!importing && 'group-hover:bg-indigo-500/10'}`}><AddIcon /></div>
                <span className="font-bold text-sm">{importing ? "正在解析书籍..." : "导入 TXT / EPUB"}</span>
              </div>
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

        {/* Global Import Progress Overlay */}
        {importing && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-lg animate-in fade-in duration-300">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">正在导入并拆分章节</h3>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 animate-pulse">Parsing local file... Please wait</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
