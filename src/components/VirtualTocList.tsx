import { useRef, useState, useEffect } from "react";

const ITEM_H = 60; // px per chapter row

interface Chapter {
    id: number;
    title: string;
}

interface VirtualTocListProps {
    chapters: Chapter[];
    currentChapterIndex: number;
    onSelect: (idx: number) => void;
}

export default function VirtualTocList({ chapters, currentChapterIndex, onSelect }: VirtualTocListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const visibleCount = Math.ceil(window.innerHeight / ITEM_H) + 4;
    const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_H) - 2);
    const endIdx = Math.min(chapters.length - 1, startIdx + visibleCount);

    // Scroll active chapter into view when list mounts or active chapter changes
    useEffect(() => {
        if (!containerRef.current) return;
        const target = Math.max(
            0,
            currentChapterIndex * ITEM_H - containerRef.current.clientHeight / 2 + ITEM_H / 2
        );
        containerRef.current.scrollTop = target;
        setScrollTop(target);
    }, [currentChapterIndex]);

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto"
            onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        >
            {/* Spacer so virtual items sit at correct absolute positions */}
            <div style={{ height: chapters.length * ITEM_H, position: "relative" }}>
                {chapters.slice(startIdx, endIdx + 1).map((chap, i) => {
                    const idx = startIdx + i;
                    return (
                        <button
                            key={chap.id}
                            id={`toc-item-${idx}`}
                            onClick={() => onSelect(idx)}
                            style={{
                                position: "absolute",
                                top: idx * ITEM_H,
                                left: 0,
                                right: 0,
                                height: ITEM_H,
                            }}
                            className={`w-full text-left px-5 flex items-center gap-4 transition-all ${idx === currentChapterIndex
                                    ? "bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20"
                                    : "hover:bg-white/5 text-slate-400 font-medium"
                                }`}
                        >
                            <span className="text-[10px] opacity-40 font-black w-10 shrink-0 text-right">
                                {idx + 1}
                            </span>
                            <span className="truncate text-sm">{chap.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
