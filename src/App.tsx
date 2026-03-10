import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [activeTab, setActiveTab] = useState("bookshelf");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
          <span className="text-2xl font-bold">R</span>
        </div>

        <NavButton
          active={activeTab === "bookshelf"}
          onClick={() => setActiveTab("bookshelf")}
          icon={<BookshelfIcon />}
          label="书架"
        />
        <NavButton
          active={activeTab === "explore"}
          onClick={() => setActiveTab("explore")}
          icon={<ExploreIcon />}
          label="发现"
        />
        <NavButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={<SettingsIcon />}
          label="设置"
        />
      </nav>

      {/* Main Content Area */}
      <main className="pl-20 pt-6 min-h-screen">
        <header className="px-8 mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white capitalize">
              {activeTab === "bookshelf" ? "我的书架" : activeTab === "explore" ? "发现新世界" : "系统设置"}
            </h1>
            <p className="text-slate-400 mt-1">
              {activeTab === "bookshelf" ? "继续阅读你未完成的故事" : activeTab === "explore" ? "从数千个书源中寻找灵感" : "自定义你的阅读体验"}
            </p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-lg font-medium shadow-lg shadow-indigo-600/20 active:scale-95">
            导入书源
          </button>
        </header>

        {/* Content Grids (Placeholder) */}
        <section className="px-8 pb-12">
          {activeTab === "bookshelf" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <BookCard key={i} />
              ))}
              <div className="aspect-[3/4] border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-slate-500 hover:text-slate-400 transition-all cursor-pointer group">
                <div className="p-3 rounded-full bg-slate-800 group-hover:bg-slate-750 transition-colors">
                  <AddIcon />
                </div>
                <span className="font-medium text-sm">添加本地书籍</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative group flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
    >
      <div className={`p-3 rounded-xl transition-all ${active ? 'bg-indigo-500/10' : 'group-hover:bg-slate-700/50'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 text-center">
        {label}
      </span>
      {active && (
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full shadow-[4px_0_12px_rgba(99,102,241,0.5)]" />
      )}
    </button>
  );
}

// Simple Icons
const BookshelfIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2L20 2v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
);
const ExploreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
);
const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const AddIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

function BookCard() {
  return (
    <div className="flex flex-col gap-3 group cursor-pointer active:scale-95 transition-all">
      <div className="aspect-[3/4] rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 shadow-xl overflow-hidden relative border border-white/5 group-hover:border-indigo-500/50 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
        <div className="absolute bottom-3 left-3 right-3">
          <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-indigo-500 rounded-full" />
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-white line-clamp-1 group-hover:text-indigo-400 transition-colors">书名占位符</h3>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">作者 · 67% 已读</p>
      </div>
    </div>
  );
}

export default App;
