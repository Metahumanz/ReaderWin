import { ChevronLeftIcon, ChevronRightIcon, MenuListIcon, SearchIcon } from "../icons";

interface ReaderMenuProps {
    currentChapterIndex: number;
    totalChapters: number;
    fontSize: number;
    lineHeight: number;
    onPrev: () => void;
    onNext: () => void;
    onOpenToc: () => void;
    onOpenSearch: () => void;
    onClose: () => void;
    onFontSizeChange: (v: number) => void;
    onLineHeightChange: (v: number) => void;
    onToggleFont: () => void;
    onPickBgImage: () => void;
    onGoToChapter: (idx: number) => void;
}

export default function ReaderMenu({
    currentChapterIndex,
    totalChapters,
    fontSize,
    lineHeight,
    onPrev,
    onNext,
    onOpenToc,
    onOpenSearch,
    onClose,
    onFontSizeChange,
    onLineHeightChange,
    onToggleFont,
    onPickBgImage,
    onGoToChapter,
}: ReaderMenuProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pb-10 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div
                className="relative w-full max-w-xl px-6 animate-in slide-in-from-bottom-8 duration-500 z-[101]"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="bg-slate-900/95 border border-white/10 rounded-[2rem] shadow-2xl p-6 space-y-5">

                    {/* Chapter progress slider - NEW */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                            <span>章节进度</span>
                            <span className="text-indigo-400">{currentChapterIndex + 1} / {totalChapters}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={totalChapters - 1}
                            value={currentChapterIndex}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onGoToChapter(parseInt(e.target.value))}
                            className="w-full accent-indigo-500 h-1.5"
                        />
                    </div>

                    {/* Navigation row */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onPrev}
                            disabled={currentChapterIndex <= 0}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                            <ChevronLeftIcon />
                            上一章
                        </button>
                        <button
                            onClick={onOpenToc}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                            <MenuListIcon />
                            目录
                        </button>
                        <button
                            onClick={onNext}
                            disabled={currentChapterIndex >= totalChapters - 1}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                            下一章
                            <ChevronRightIcon />
                        </button>
                    </div>

                    {/* Font size */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                            <span>字体大小</span>
                            <span className="text-indigo-400">{fontSize}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))}
                                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                            >
                                -
                            </button>
                            <input
                                type="range"
                                min="12"
                                max="64"
                                value={fontSize}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFontSizeChange(parseInt(e.target.value))}
                                className="flex-1 accent-indigo-500 h-1.5"
                            />
                            <button
                                onClick={() => onFontSizeChange(Math.min(64, fontSize + 1))}
                                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Line height */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                            <span>行高</span>
                            <span className="text-indigo-400">{lineHeight.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="4"
                            step="0.1"
                            value={lineHeight}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onLineHeightChange(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1.5"
                        />
                    </div>

                    {/* Bottom action row */}
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={onOpenSearch}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
                        >
                            <SearchIcon />
                            搜索
                        </button>
                        <button
                            onClick={onToggleFont}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
                        >
                            切换字体
                        </button>
                        <button
                            onClick={onPickBgImage}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
                        >
                            背景图
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
                        >
                            关闭
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
