import { useRef, useState, useEffect, useCallback } from "react";

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
    const [containerHeight, setContainerHeight] = useState(window.innerHeight);

    // Calculate visible range
    const visibleCount = Math.ceil(containerHeight / ITEM_H) + 4;
    const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_H) - 2);
    const endIdx = Math.min(chapters.length - 1, startIdx + visibleCount);

    // Update container height on mount and resize
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    // Scroll active chapter into view when list mounts or active chapter changes
    useEffect(() => {
        if (!containerRef.current || chapters.length === 0) return;
        
        // Clamp index to valid range
        const clampedIndex = Math.max(0, Math.min(currentChapterIndex, chapters.length - 1));
        
        // Calculate target position to center the item
        const itemTop = clampedIndex * ITEM_H;
        const halfContainer = containerRef.current.clientHeight / 2;
        const target = Math.max(0, itemTop - halfContainer + ITEM_H / 2);
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            if (containerRef.current) {
                containerRef.current.scrollTop = target;
                setScrollTop(target);
            }
        });
    }, [currentChapterIndex, chapters.length]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Calculate total height safely (avoid overflow for very large numbers)
    const totalHeight = Math.min(chapters.length * ITEM_H, 20000000); // Cap at 20M px

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto"
            onScroll={handleScroll}
        >
            {/* Spacer so virtual items sit at correct absolute positions */}
            <div style={{ height: totalHeight, position: "relative" }}>
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
                            className={`w-full text-left px-5 flex items-center gap-4 transition-all ${
                                idx === currentChapterIndex
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
