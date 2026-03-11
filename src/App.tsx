import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import Database from "@tauri-apps/plugin-sql";
import { open } from "@tauri-apps/plugin-dialog";
import { check } from "@tauri-apps/plugin-updater";

import { useSettings } from "./hooks/useSettings";
import { useReader } from "./hooks/useReader";

import NavButton from "./components/NavButton";
import BookshelfView from "./components/BookshelfView";
import SettingsView from "./components/SettingsView";
import ReaderView from "./components/reader/ReaderView";
import { BookshelfIcon, SettingsIcon, AddIcon } from "./components/icons";

function App() {
  // ---- Core state ----
  const [activeTab, setActiveTab] = useState<"bookshelf" | "settings">("bookshelf");
  const [readerOpen, setReaderOpen] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [db, setDb] = useState<Database | null>(null);
  const [importing, setImporting] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; bookId: number } | null>(null);
  // Replacement rules
  const [replacementRules, setReplacementRules] = useState<any[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState("");
  const [newRuleReplacement, setNewRuleReplacement] = useState("");
  const [newRuleIsRegex, setNewRuleIsRegex] = useState(false);

  // ---- Custom hooks ----
  const {
    settings,
    bgImageUrl,
    saveSetting,
    updateSetting,
    loadSettings,
    resetSettings,
    toggleImmersive,
    setWindowPreset,
    pickBgImage,
    toggleFont,
  } = useSettings(db);

  const reader = useReader({ db, replacementRules });

  // ---- DB init ----
  useEffect(() => {
    const initDb = async () => {
      try {
        const _db = await Database.load("sqlite:reader.db");
        setDb(_db);
        await _db.execute(`CREATE TABLE IF NOT EXISTS replacement_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern TEXT NOT NULL,
          replacement TEXT NOT NULL,
          scope TEXT NOT NULL DEFAULT 'global',
          is_regex INTEGER NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1
        )`);
        const rules: any[] = await _db.select("SELECT * FROM replacement_rules WHERE active = 1");
        setReplacementRules(rules);
        await fetchBooks(_db);
        await loadSettings(_db);
        const v = await getVersion();
        setAppVersion(v);
      } catch (err) {
        console.error("DB init failed:", err);
      }
    };
    initDb();

    // Disable default context menu
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  // ---- Books ----
  const fetchBooks = async (database = db) => {
    if (!database) return;
    const result: any[] = await database.select(
      "SELECT * FROM books ORDER BY last_read DESC"
    );
    setBooks(result);
  };

  const deleteBook = async (id: number) => {
    if (!db) return;
    if (confirm("确定要删除这本书吗？相关章节缓存也将被清除。")) {
      await db.execute("DELETE FROM books WHERE id = $1", [id]);
      await fetchBooks();
      setContextMenu(null);
    }
  };

  // ---- Import ----
  const handleImportBook = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Books", extensions: ["txt", "epub"] }],
      });
      if (selected && typeof selected === "string") {
        const isEpub = selected.toLowerCase().endsWith(".epub");
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

  // ---- WebDAV ----
  const handleWebdavSync = async (mode: "upload" | "download") => {
    if (!settings.webdavUrl || !settings.webdavUser || !settings.webdavPass) {
      alert("请填写完整 WebDAV 配置。");
      return;
    }
    try {
      await saveSetting("webdav_url", settings.webdavUrl);
      await saveSetting("webdav_user", settings.webdavUser);
      await saveSetting("webdav_pass", settings.webdavPass);
      const res: string = await invoke("webdav_sync", {
        url: settings.webdavUrl,
        user: settings.webdavUser,
        pass: settings.webdavPass,
        mode,
      });
      alert(res);
      if (mode === "download") await fetchBooks();
    } catch (err) {
      alert(err);
    }
  };

  // ---- Update ----
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateInfo("正在检查更新...");
    try {
      const update = await check();
      if (update) {
        setUpdateInfo(`发现新版本: ${update.version}\n${update.body || ""}`);
        if (confirm(`发现新版本 ${update.version}，是否现在更新？`)) {
          setUpdateInfo("正在下载并安装更新...");
          await update.downloadAndInstall();
          setUpdateInfo("更新已安装，请重启应用。");
        }
      } else {
        setUpdateInfo("普通检查未发现更新，尝试绕过代理检查...");
        const updateUrl =
          "https://github.com/Metahumanz/ReaderWin/releases/latest/download/update.json";
        const res: string = await invoke("check_update_custom", { url: updateUrl });
        const data = JSON.parse(res);
        const currentVersion = await getVersion();
        const cleanData = data.version.replace(/^v/, "");
        const cleanCurrent = currentVersion.replace(/^v/, "");
        if (cleanData !== cleanCurrent) {
          setUpdateInfo(`(直连检查) 发现新版本: ${data.version}。本地: ${currentVersion}。请手动下载。`);
        } else {
          setUpdateInfo(`当前已是最新版本: ${currentVersion}`);
        }
      }
    } catch (err) {
      setUpdateInfo("检查更新失败 (可能是 GitHub 无法连接): " + err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  // ---- Replacement rules ----
  const handleAddRule = async () => {
    if (!newRulePattern || !db) return;
    await db.execute(
      "INSERT INTO replacement_rules (pattern, replacement, is_regex, scope) VALUES ($1, $2, $3, $4)",
      [newRulePattern, newRuleReplacement, newRuleIsRegex ? 1 : 0, "global"]
    );
    const rules: any[] = await db.select("SELECT * FROM replacement_rules WHERE active = 1");
    setReplacementRules(rules);
    setNewRulePattern("");
    setNewRuleReplacement("");
    setRulesOpen(false);
  };

  const handleDeleteRule = async (id: number) => {
    if (!db) return;
    await db.execute("DELETE FROM replacement_rules WHERE id = $1", [id]);
    setReplacementRules((r: any[]) => r.filter((rule: any) => rule.id !== id));
  };

  // ---- Open reader ----
  const openReader = async (book: any) => {
    await reader.openBook(book);
    setReaderOpen(true);
  };

  const closeReader = async () => {
    setReaderOpen(false);
    await toggleImmersive(false);
    await fetchBooks();
    reader.reset();
  };

  // ============================
  // RENDER
  // ============================

  if (readerOpen && reader.currentBook) {
    return (
      <ReaderView
        currentBook={reader.currentBook}
        chapters={reader.chapters}
        windowChapters={reader.windowChapters}
        currentChapterIndex={reader.currentChapterIndex}
        loading={reader.loading}
        viewerRef={reader.viewerRef}
        settings={settings}
        bgImageUrl={bgImageUrl}
        onClose={closeReader}
        onScroll={reader.handleScroll}
        onLoadChapter={(idx) => reader.loadChapter(idx, reader.chapters, reader.currentBook)}
        onNextChapter={reader.nextChapter}
        onPrevChapter={reader.prevChapter}
        onFontSizeChange={(v) => {
          updateSetting("fontSize", v);
          saveSetting("font_size", v.toString());
        }}
        onLineHeightChange={(v) => {
          updateSetting("lineHeight", v);
          saveSetting("line_height", v.toString());
        }}
        onToggleImmersive={toggleImmersive}
        onToggleFont={toggleFont}
        onPickBgImage={pickBgImage}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-900 text-slate-100 font-sans"
      onClick={() => setContextMenu(null)}
    >
      {/* Book right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] w-48 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-2 animate-in zoom-in-95 duration-200"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              const book = books.find((b: any) => b.id === contextMenu.bookId);
              if (book) openReader(book);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-white/5 rounded-xl text-sm font-medium transition-all"
          >
            开始阅读
          </button>
          <div className="h-px bg-white/5 my-1" />
          <button
            onClick={() => deleteBook(contextMenu.bookId)}
            className="w-full text-left px-4 py-2.5 hover:bg-red-500/10 text-red-500 rounded-xl text-sm font-bold transition-all"
          >
            删除书籍
          </button>
        </div>
      )}

      {/* Sidebar nav */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-slate-800/80 backdrop-blur-2xl border-r border-slate-700/50 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-pulse">
          <span className="text-2xl font-bold text-white">R</span>
        </div>
        <NavButton
          active={activeTab === "bookshelf"}
          onClick={() => setActiveTab("bookshelf")}
          icon={<BookshelfIcon />}
          label="书架"
        />
        <NavButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={<SettingsIcon />}
          label="设置"
        />
      </nav>

      <main className="pl-20 min-h-screen">
        <header className="px-8 pt-10 pb-10 flex justify-between items-end sticky top-0 bg-slate-900/80 backdrop-blur-md z-40">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2">
              {activeTab === "bookshelf" ? "我的书架" : "系统设置"}
            </h1>
            <p className="text-slate-400 font-medium">
              {activeTab === "bookshelf"
                ? `你当前有 ${books.length} 本藏书`
                : "账号同步与个性化配置"}
            </p>
          </div>
          {activeTab === "bookshelf" && (
            <button
              onClick={handleImportBook}
              disabled={importing}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <AddIcon />
              <span>导入本地书籍 (TXT/EPUB)</span>
            </button>
          )}
        </header>

        <section className="px-8 pb-20">
          {activeTab === "bookshelf" && (
            <BookshelfView
              books={books}
              importing={importing}
              onOpenBook={openReader}
              onImport={handleImportBook}
              onContextMenu={(e, bookId) =>
                setContextMenu({ x: e.clientX, y: e.clientY, bookId })
              }
            />
          )}
          {activeTab === "settings" && (
            <SettingsView
              settings={settings}
              replacementRules={replacementRules}
              appVersion={appVersion}
              checkingUpdate={checkingUpdate}
              updateInfo={updateInfo}
              onSaveSetting={saveSetting}
              onUpdateSetting={updateSetting}
              onWebdavSync={handleWebdavSync}
              onCheckUpdate={handleCheckUpdate}
              onResetSettings={() => db && resetSettings(db)}
              onSetWindowPreset={setWindowPreset}
              onAddRule={() => setRulesOpen(true)}
              onDeleteRule={handleDeleteRule}
            />
          )}
        </section>

        {/* Import overlay */}
        {importing && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 animate-in fade-in duration-300">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                  正在导入并拆分章节
                </h3>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 animate-pulse">
                  Parsing local file... Please wait
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Rule Modal */}
        {rulesOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center animate-in fade-in duration-300">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              onClick={() => setRulesOpen(false)}
            />
            <div
              className="relative w-[400px] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">添加替换规则</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">净化阅读体验</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">
                    查找内容 (Pattern)
                  </label>
                  <input
                    type="text"
                    value={newRulePattern}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRulePattern(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
                    placeholder="例如: 广告文字"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">
                    替换为 (Replacement)
                  </label>
                  <input
                    type="text"
                    value={newRuleReplacement}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRuleReplacement(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all"
                    placeholder="留空则直接删除"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">使用正则表达式</span>
                  <button
                    onClick={() => setNewRuleIsRegex(!newRuleIsRegex)}
                    className={`w-12 h-6 rounded-full p-1 transition-all ${newRuleIsRegex ? "bg-indigo-500" : "bg-slate-800"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-all ${newRuleIsRegex ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setRulesOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleAddRule}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
