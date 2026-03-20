import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FullscreenIcon, ArrowLeftIcon } from "../icons";
import ReaderMenu from "./ReaderMenu";
import TocOverlay from "./TocOverlay";
import SearchOverlay from "./SearchOverlay";
import type { WindowChapter, ChapterMeta } from "../../hooks/useReader";
import type { Settings } from "../../hooks/useSettings";

interface ReaderViewProps {
    currentBook: any;
    chapters: ChapterMeta[];
    windowChapters: WindowChapter[];
    currentChapterIndex: number;
    loading: boolean;
    viewerRef: React.RefObject<HTMLDivElement | null>;
    settings: Settings;
    bgImageUrl: string;
    onClose: () => void;
    onScroll: () => void;
    onLoadChapter: (idx: number) => void;
    onNextChapter: () => void;
    onPrevChapter: (scrollToEnd?: boolean) => void;
    onFontSizeChange: (v: number) => void;
    onLineHeightChange: (v: number) => void;
    onToggleImmersive: (v: boolean) => void;
    onToggleFont: () => void;
    onPickBgImage: () => void;
}

export default function ReaderView({
    currentBook,
    chapters,
    windowChapters,
    currentChapterIndex,
    loading,
    viewerRef,
    settings,
    bgImageUrl,
    onClose,
    onScroll,
    onLoadChapter,
    onNextChapter,
    onPrevChapter,
    onFontSizeChange,
    onLineHeightChange,
    onToggleImmersive,
    onToggleFont,
    onPickBgImage,
}: ReaderViewProps) {
    const [readerMenuOpen, setReaderMenuOpen] = useState(false);
    const [tocOpen, setTocOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);
    // Bug fix: live clock - update every minute
    const [clockTime, setClockTime] = useState(() =>
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
    const readerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tick = setInterval(() => {
            setClockTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }, 10000); // update every 10s
        return () => clearInterval(tick);
    }, []);

    const progress =
        chapters.length > 0
            ? Math.round(((currentChapterIndex + 1) / chapters.length) * 100)
            : 0;

    const handleMouseUp = (e: React.MouseEvent) => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim() && readerRef.current?.contains(e.target as Node)) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelectionMenu({ x: rect.left + rect.width / 2, y: rect.top - 10, text: sel.toString().trim() });
        } else {
            setSelectionMenu(null);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        const viewer = viewerRef.current;
        if (!viewer || loading) return;
        if (e.deltaY > 0) {
            viewer.scrollBy({ left: viewer.clientWidth, behavior: "smooth" });
        } else {
            viewer.scrollBy({ left: -viewer.clientWidth, behavior: "smooth" });
        }
    };

    return (
        <div
            ref={readerRef}
            className="h-screen text-[#d4d4d4] overflow-hidden flex flex-col relative transition-all duration-700 select-none"
            style={{
                fontFamily: settings.fontFamily,
                backgroundColor: bgImageUrl ? "transparent" : "#1c1c1c",
                backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* Progress Bar */}
            {!settings.immersiveMode && (
                <div className="fixed top-16 left-0 right-0 h-1 bg-white/5 z-50">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Top Nav */}
            <div
                className={`h-16 bg-black/60 border-b border-white/5 flex items-center px-6 justify-between z-50 shrink-0 transition-transform duration-500 ${settings.immersiveMode && !readerMenuOpen ? "-translate-y-full" : "translate-y-0"
                    }`}
            >
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                >
                    <ArrowLeftIcon />
                </button>
                <div className="flex items-center gap-4">
                    <div className="text-sm font-black text-slate-300 truncate max-w-[200px] uppercase tracking-wider">
                        {currentBook?.title}
                    </div>
                    <button
                        onClick={() => setTocOpen(!tocOpen)}
                        className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-indigo-500/20"
                    >
                        目录 {currentChapterIndex + 1}
                    </button>
                </div>
                <button
                    onClick={() => onToggleImmersive(!settings.immersiveMode)}
                    className={`p-2 rounded-xl transition-all ${settings.immersiveMode ? "bg-indigo-500 text-white" : "hover:bg-white/10"
                        }`}
                >
                    <FullscreenIcon />
                </button>
            </div>

            {/* Content Area */}
            <div
                className="flex-1 relative overflow-hidden"
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* Selection menu */}
                {selectionMenu && (
                    <div
                        className="fixed z-[120] -translate-x-1/2 -translate-y-full bg-slate-800 border border-white/10 rounded-xl shadow-2xl p-1 flex gap-1 animate-in zoom-in-95 duration-200"
                        style={{ left: selectionMenu.x, top: selectionMenu.y }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                setSearchOpen(true);
                                setSelectionMenu(null);
                            }}
                            className="px-3 py-1.5 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            书内搜索
                        </button>
                    </div>
                )}

                {/* Click zones */}
                <div
                    className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-w-resize"
                    onClick={() => {
                        const viewer = viewerRef.current;
                        if (viewer) viewer.scrollBy({ left: -viewer.clientWidth, behavior: "smooth" });
                    }}
                />
                <div
                    className="absolute inset-x-1/4 inset-y-0 w-1/2 z-10 cursor-alias"
                    onClick={() => setReaderMenuOpen(!readerMenuOpen)}
                />
                <div
                    className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-e-resize"
                    onClick={() => {
                        const viewer = viewerRef.current;
                        if (viewer) viewer.scrollBy({ left: viewer.clientWidth, behavior: "smooth" });
                    }}
                />

                {/* Spinner */}
                {loading && windowChapters.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/10 border-t-indigo-500" />
                    </div>
                ) : (
                    <div
                        id="viewer-content"
                        ref={viewerRef}
                        onScroll={onScroll}
                        className="h-full overflow-x-auto no-scrollbar block"
                        style={{ columnWidth: "100vw", columnGap: "0px", columnFill: "auto" }}
                    >
                        {windowChapters.map((chap) => (
                            <article
                                key={chap.id}
                                id={`chapter-${chap.index}`}
                                className="block"
                                style={{ breakBefore: "column", breakInside: "auto" }}
                            >
                                <div
                                    className="max-w-none mx-auto px-12 py-12"
                                    style={{ width: `${settings.contentWidth}px`, maxWidth: "90vw" }}
                                >
                                    <h1
                                        className="font-black mb-12 text-white leading-tight border-l-8 border-indigo-500 pl-10 shrink-0"
                                        style={{
                                            fontFamily: settings.fontFamily,
                                            fontSize: `calc(${settings.fontSize * 1.8}px + 1vw)`,
                                            breakInside: "avoid",
                                        }}
                                    >
                                        {chap.title}
                                    </h1>
                                    <div
                                        className="prose prose-invert max-w-none text-justify text-slate-200"
                                        style={{
                                            fontFamily: settings.fontFamily,
                                            fontSize: `calc(${settings.fontSize}px + 0.2vw)`,
                                            lineHeight: settings.lineHeight,
                                            letterSpacing: `${settings.letterSpacing}px`,
                                        }}
                                        dangerouslySetInnerHTML={{ __html: chap.body }}
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {/* Reader Menu Overlay */}
            {readerMenuOpen && !searchOpen && !tocOpen && (
                <ReaderMenu
                    currentChapterIndex={currentChapterIndex}
                    totalChapters={chapters.length}
                    fontSize={settings.fontSize}
                    lineHeight={settings.lineHeight}
                    onPrev={() => { onPrevChapter(true); setReaderMenuOpen(false); }}
                    onNext={() => { onNextChapter(); setReaderMenuOpen(false); }}
                    onOpenToc={() => { setTocOpen(true); setReaderMenuOpen(false); }}
                    onOpenSearch={() => { setSearchOpen(true); setReaderMenuOpen(false); }}
                    onClose={() => setReaderMenuOpen(false)}
                    onFontSizeChange={onFontSizeChange}
                    onLineHeightChange={onLineHeightChange}
                    onToggleFont={onToggleFont}
                    onPickBgImage={onPickBgImage}
                />
            )}

            {/* Search Overlay */}
            {searchOpen && (
                <SearchOverlay
                    onClose={() => setSearchOpen(false)}
                    onJumpToChapter={(idx) => {
                        onLoadChapter(idx);
                        setSearchOpen(false);
                        setReaderMenuOpen(false);
                    }}
                    onSearch={async (query) => {
                        const results: any[] = await invoke("search_in_book", {
                            bookId: currentBook.id,
                            query,
                        });
                        return results;
                    }}
                />
            )}

            {/* ToC Overlay */}
            {tocOpen && (
                <TocOverlay
                    chapters={chapters}
                    currentChapterIndex={currentChapterIndex}
                    onSelect={(idx) => {
                        onLoadChapter(idx);
                        setTocOpen(false);
                    }}
                    onClose={() => setTocOpen(false)}
                />
            )}

            {/* Bottom Status Bar */}
            {!settings.immersiveMode || readerMenuOpen ? (
                <div className="h-10 bg-black/40 backdrop-blur-3xl border-t border-white/5 flex items-center px-6 justify-between shrink-0 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <div>{clockTime}</div>
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
