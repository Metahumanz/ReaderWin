import { useState } from "react";
import { SearchIconBold } from "../icons";

interface SearchResult {
    chapter_index: number;
    chapter_title: string;
    snippet: string;
}

interface SearchOverlayProps {
    currentBookId: number | null;
    onJumpToChapter: (idx: number) => void;
    onClose: () => void;
    onSearch: (query: string) => Promise<SearchResult[]>;
}

export default function SearchOverlay({
    onJumpToChapter,
    onClose,
    onSearch,
}: SearchOverlayProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (q = query) => {
        if (!q.trim()) return;
        setSearching(true);
        try {
            const res = await onSearch(q);
            setResults(res);
        } catch (err) {
            alert("搜索失败: " + err);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center animate-in fade-in duration-300">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                onClick={onClose}
            />
            <div
                className="relative w-[500px] h-[600px] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="p-8 border-b border-white/5 shrink-0">
                    <div className="relative">
                        <input
                            autoFocus
                            type="text"
                            placeholder="搜索书内内容..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
                        />
                        <button
                            onClick={() => handleSearch()}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-400"
                        >
                            {searching ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500/20 border-t-indigo-500" />
                            ) : (
                                <SearchIconBold />
                            )}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    {results.length === 0 && !searching && (
                        <div className="h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                            输入关键词开始搜索
                        </div>
                    )}
                    {results.map((res, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                onJumpToChapter(res.chapter_index);
                                onClose();
                            }}
                            className="w-full text-left p-5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
                        >
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                                {res.chapter_title}
                            </div>
                            <div
                                className="text-sm text-slate-400 group-hover:text-slate-200 line-clamp-2 leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: res.snippet.replace(
                                        new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
                                        (match) =>
                                            `<mark class="bg-indigo-500/30 text-indigo-200 rounded px-0.5">${match}</mark>`
                                    ),
                                }}
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
