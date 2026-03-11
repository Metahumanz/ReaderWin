import { useState, useRef, useLayoutEffect, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";

export interface ChapterMeta {
    id: number;
    title: string;
    order_index: number;
}

// ChapterData: raw data from DB (no index)
interface ChapterData {
    id: number;
    title: string;
    body: string;
    link?: string;
}

// WindowChapter: ChapterData + its position in the chapters array
export interface WindowChapter extends ChapterData {
    index: number;
}

interface ScrollAnchor {
    anchorChapterIndex: number;
    offsetFromAnchor: number;
    action: string;
}

interface UseReaderOptions {
    db: Database | null;
    replacementRules: { pattern: string; replacement: string; is_regex: number; active: number }[];
}

export function useReader({ db, replacementRules }: UseReaderOptions) {
    const [chapters, setChapters] = useState<ChapterMeta[]>([]);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [windowChapters, setWindowChapters] = useState<WindowChapter[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentBook, setCurrentBook] = useState<any>(null);

    const viewerRef = useRef<HTMLDivElement | null>(null);
    const scrollAnchorRef = useRef<ScrollAnchor | null>(null);
    const isLoadingEdges = useRef(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Scroll anchor: fire AFTER layout is painted ---
    useLayoutEffect(() => {
        if (!viewerRef.current || !scrollAnchorRef.current) return;
        const viewer = viewerRef.current;
        const { anchorChapterIndex, offsetFromAnchor } = scrollAnchorRef.current;

        const el = document.getElementById(`chapter-${anchorChapterIndex}`);
        if (!el) return;

        const viewerRect = viewer.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const chapOffset = elRect.left - viewerRect.left + viewer.scrollLeft;

        let targetLeft: number;
        if (offsetFromAnchor === 9999999) {
            // scrollToEnd sentinel
            targetLeft = chapOffset + el.scrollWidth - viewer.clientWidth;
            if (targetLeft < chapOffset) targetLeft = chapOffset;
        } else {
            targetLeft = chapOffset + offsetFromAnchor;
        }

        viewer.scrollLeft = targetLeft;
        scrollAnchorRef.current = null;
    }, [windowChapters]);

    // --- ResizeObserver: fix Bug1 (resize jump) ---
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        let lastWidth = viewer.clientWidth;
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const currentWidth = entry.contentRect.width;
            if (currentWidth && Math.abs(currentWidth - lastWidth) > 5) {
                lastWidth = currentWidth;
                // After resize, snap to the nearest page boundary
                const page = Math.round(viewer.scrollLeft / currentWidth);
                viewer.scrollLeft = page * currentWidth;
            }
        });
        ro.observe(viewer);
        return () => ro.disconnect();
    }, [windowChapters.length > 0]); // only re-attach when viewer actually mounts from emptiness

    // --- Auto-save progress every 5 seconds ---
    useEffect(() => {
        if (!currentBook || !db || !viewerRef.current) return;
        const saver = setInterval(async () => {
            const viewer = viewerRef.current;
            if (!viewer) return;
            const el = document.getElementById(`chapter-${currentChapterIndex}`);
            if (!el) return;
            const chapOffset =
                el.getBoundingClientRect().left -
                viewer.getBoundingClientRect().left +
                viewer.scrollLeft;
            const relativeOffset = Math.max(0, viewer.scrollLeft - chapOffset);
            await db.execute(
                "UPDATE books SET progress_offset = $1 WHERE id = $2",
                [Math.round(relativeOffset), currentBook.id]
            );
        }, 5000);
        return () => clearInterval(saver);
    }, [currentBook, db, currentChapterIndex]);

    // --- Fetch & apply replacement rules on chapter body ---
    const fetchChapterData = async (chapterId: number): Promise<ChapterData | null> => {
        if (!db) return null;
        const rows: any[] = await db.select(
            "SELECT title, body, link FROM chapters WHERE id = $1",
            [chapterId]
        );
        if (rows.length === 0) return null;

        let { title, body, link } = rows[0];
        if (link && !body) body = "此章节内容为网络链接，当前版本已关闭网络解析功能。";

        if (replacementRules.length > 0 && body) {
            for (const rule of replacementRules) {
                if (!rule.active) continue;
                try {
                    if (rule.is_regex) {
                        body = body.replace(new RegExp(rule.pattern, "g"), rule.replacement);
                    } else {
                        body = body.split(rule.pattern).join(rule.replacement);
                    }
                } catch { /* ignore invalid regex */ }
            }
        }

        return { id: chapterId, title, body, link };
    };

    // --- Apply new window chapters, preserving scroll position ---
    const applyWindowChapters = (
        newArr: WindowChapter[],
        action: string,
        forceAnchorIndex?: number,
        offsetFromAnchor?: number
    ) => {
        const viewer = viewerRef.current;
        let anchorIndex = forceAnchorIndex !== undefined ? forceAnchorIndex : currentChapterIndex;
        let offset = offsetFromAnchor ?? 0;

        if (viewer && forceAnchorIndex === undefined) {
            const el = document.getElementById(`chapter-${anchorIndex}`);
            if (el) {
                const elRect = el.getBoundingClientRect();
                const viewerRect = viewer.getBoundingClientRect();
                const chapOffset = elRect.left - viewerRect.left + viewer.scrollLeft;
                offset = viewer.scrollLeft - chapOffset;
            }
        }

        scrollAnchorRef.current = { action, anchorChapterIndex: anchorIndex, offsetFromAnchor: offset };
        setWindowChapters(newArr);
    };

    // --- Load a chapter by index ---
    const loadChapter = async (
        chapterIdx: number,
        chapterList: ChapterMeta[],
        book: any,
        options: { restoreOffset?: boolean; scrollToEnd?: boolean } = {}
    ) => {
        const chapList = chapterList.length > 0 ? chapterList : chapters;
        if (!db || chapterIdx < 0 || chapterIdx >= chapList.length) return;

        setLoading(true);
        setCurrentChapterIndex(chapterIdx);
        try {
            const startIdx = Math.max(0, chapterIdx - 1);
            const endIdx = Math.min(chapList.length - 1, chapterIdx + 1);

            const toFetch: Promise<WindowChapter | null>[] = [];
            for (let i = startIdx; i <= endIdx; i++) {
                const idx = i;
                toFetch.push(
                    fetchChapterData(chapList[idx].id).then((data) =>
                        data ? { ...data, index: idx } : null
                    )
                );
            }
            const results = (await Promise.all(toFetch)).filter(
                (c): c is WindowChapter => c !== null
            );

            let offset = 0;
            if (options.restoreOffset && book?.progress_offset) {
                offset = book.progress_offset;
            } else if (options.scrollToEnd) {
                offset = 9999999;
            }

            applyWindowChapters(results as WindowChapter[], "init", chapterIdx, offset);

            if (book && db) {
                await db.execute(
                    "UPDATE books SET progress_index = $1, last_read = CURRENT_TIMESTAMP WHERE id = $2",
                    [chapterIdx, book.id]
                );
            }
        } catch (err) {
            console.error("loadChapter error:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- Open a book ---
    const openBook = async (book: any): Promise<ChapterMeta[]> => {
        if (!db) return [];
        setCurrentBook(book);
        setLoading(true);
        try {
            const rows: ChapterMeta[] = await db.select(
                "SELECT id, title, order_index FROM chapters WHERE book_id = $1 ORDER BY order_index ASC",
                [book.id]
            );
            setChapters(rows);
            const savedIdx = book.progress_index || 0;
            await loadChapter(savedIdx, rows, book, { restoreOffset: true });
            return rows;
        } catch (err) {
            console.error(err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    // --- Lazy load next/prev chapter into window ---
    const loadNextInWindow = async () => {
        if (isLoadingEdges.current || windowChapters.length === 0) return;
        const maxChap = windowChapters[windowChapters.length - 1];
        if (maxChap.index >= chapters.length - 1) return;

        isLoadingEdges.current = true;
        const nextData = await fetchChapterData(chapters[maxChap.index + 1].id);
        if (nextData) {
            const nextItem: WindowChapter = { ...nextData, index: maxChap.index + 1 };
            const nextArr = [...windowChapters, nextItem];
            applyWindowChapters(
                nextArr.length > 15 ? nextArr.slice(nextArr.length - 15) : nextArr,
                "append_drop_left"
            );
        }
        isLoadingEdges.current = false;
    };

    const loadPrevInWindow = async () => {
        if (isLoadingEdges.current || windowChapters.length === 0) return;
        const minChap = windowChapters[0];
        if (minChap.index <= 0) return;

        isLoadingEdges.current = true;
        const prevData = await fetchChapterData(chapters[minChap.index - 1].id);
        if (prevData) {
            const prevItem: WindowChapter = { ...prevData, index: minChap.index - 1 };
            const nextArr = [prevItem, ...windowChapters];
            applyWindowChapters(
                nextArr.length > 15 ? nextArr.slice(0, 15) : nextArr,
                "prepend_drop_right"
            );
        }
        isLoadingEdges.current = false;
    };

    // --- Scroll handler: track current chapter + lazy load ---
    const handleScroll = () => {
        const viewer = viewerRef.current;
        if (!viewer || windowChapters.length === 0 || isLoadingEdges.current) return;

        const currentScrollLeft = viewer.scrollLeft;
        const center = currentScrollLeft + viewer.clientWidth / 2;

        let visibleIdx = windowChapters[0].index;
        let minDiff = Infinity;

        for (const chap of windowChapters) {
            const el = document.getElementById(`chapter-${chap.index}`);
            if (!el) continue;
            const chapOffset =
                el.getBoundingClientRect().left -
                viewer.getBoundingClientRect().left +
                currentScrollLeft;
            const elWidth = el.scrollWidth;

            if (center >= chapOffset && center <= chapOffset + elWidth) {
                visibleIdx = chap.index;
                break;
            } else {
                const diff = Math.abs(chapOffset + elWidth / 2 - center);
                if (diff < minDiff) { minDiff = diff; visibleIdx = chap.index; }
            }
        }

        if (visibleIdx !== currentChapterIndex) {
            setCurrentChapterIndex(visibleIdx);
            if (currentBook && db) {
                db.execute(
                    "UPDATE books SET progress_index = $1, last_read = CURRENT_TIMESTAMP WHERE id = $2",
                    [visibleIdx, currentBook.id]
                );
            }
        }

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            if (!viewerRef.current) return;
            const v = viewerRef.current;
            const TRIGGER = v.clientWidth * 0.8;
            if (v.scrollLeft + v.clientWidth + TRIGGER >= v.scrollWidth) {
                loadNextInWindow();
            } else if (v.scrollLeft <= TRIGGER) {
                loadPrevInWindow();
            }
        }, 150);
    };

    // --- Navigate to next/prev chapter by scrolling ---
    const nextChapter = () => {
        const nextIdx = currentChapterIndex + 1;
        if (nextIdx >= chapters.length) return;
        const el = document.getElementById(`chapter-${nextIdx}`);
        if (el && viewerRef.current) {
            const v = viewerRef.current;
            const chapOffset =
                el.getBoundingClientRect().left - v.getBoundingClientRect().left + v.scrollLeft;
            v.scrollTo({ left: chapOffset, behavior: "smooth" });
        } else {
            loadChapter(nextIdx, chapters, currentBook);
        }
    };

    const prevChapter = (scrollToEnd = false) => {
        const prevIdx = currentChapterIndex - 1;
        if (prevIdx < 0) return;
        const el = document.getElementById(`chapter-${prevIdx}`);
        if (el && viewerRef.current) {
            const v = viewerRef.current;
            const chapOffset =
                el.getBoundingClientRect().left - v.getBoundingClientRect().left + v.scrollLeft;
            if (scrollToEnd) {
                v.scrollTo({ left: chapOffset + el.scrollWidth - v.clientWidth, behavior: "smooth" });
            } else {
                v.scrollTo({ left: chapOffset, behavior: "smooth" });
            }
        } else {
            loadChapter(prevIdx, chapters, currentBook, { scrollToEnd });
        }
    };

    const reset = () => {
        setChapters([]);
        setCurrentChapterIndex(0);
        setWindowChapters([]);
        setCurrentBook(null);
    };

    return {
        chapters,
        currentChapterIndex,
        windowChapters,
        loading,
        currentBook,
        viewerRef,
        openBook,
        loadChapter,
        nextChapter,
        prevChapter,
        handleScroll,
        reset,
    };
}
