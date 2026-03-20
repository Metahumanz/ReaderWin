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
        if (!el) {
            console.warn("useLayoutEffect: chapter element not found", anchorChapterIndex);
            // Reset scroll anchor if element not found
            scrollAnchorRef.current = null;
            return;
        }

        const viewerRect = viewer.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const chapOffset = elRect.left - viewerRect.left + viewer.scrollLeft;

        let targetLeft: number;
        if (offsetFromAnchor === 9999999) {
            // scrollToEnd sentinel
            targetLeft = chapOffset + el.scrollWidth - viewer.clientWidth;
            // Ensure we don't scroll past the chapter start
            targetLeft = Math.max(chapOffset, targetLeft);
        } else {
            targetLeft = chapOffset + offsetFromAnchor;
        }

        // Clamp to valid scroll range
        const maxScroll = viewer.scrollWidth - viewer.clientWidth;
        targetLeft = Math.max(0, Math.min(targetLeft, maxScroll));

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
        if (!db) {
            console.warn("fetchChapterData: no database");
            return null;
        }
        
        try {
            const rows: any[] = await db.select(
                "SELECT title, body, link FROM chapters WHERE id = $1",
                [chapterId]
            );
            
            console.log("fetchChapterData: chapter", chapterId, "rows:", rows.length);
            
            if (rows.length === 0) {
                console.warn("fetchChapterData: no data for chapter", chapterId);
                return null;
            }

            let { title, body, link } = rows[0];
            
            // Log content info
            console.log("fetchChapterData: chapter", chapterId, "title:", title, "body length:", body?.length || 0);
            
            // Log large content
            if (body && body.length > 1000000) {
                console.warn("fetchChapterData: large chapter", chapterId, "size:", body.length);
            }
            
            if (link && !body) {
                body = "此章节内容为网络链接，当前版本已关闭网络解析功能。";
            }

            // Apply replacement rules (limit to prevent slowdown)
            if (replacementRules.length > 0 && body && replacementRules.length < 100) {
                for (const rule of replacementRules) {
                    if (!rule.active) continue;
                    try {
                        if (rule.is_regex) {
                            body = body.replace(new RegExp(rule.pattern, "g"), rule.replacement);
                        } else {
                            body = body.split(rule.pattern).join(rule.replacement);
                        }
                    } catch (e) { 
                        console.warn("fetchChapterData: invalid rule", rule.pattern, e);
                    }
                }
            }

            return { id: chapterId, title, body: body || "", link };
        } catch (err) {
            console.error("fetchChapterData error for chapter", chapterId, ":", err);
            return null;
        }
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
        // Use the provided list or fall back to state
        const chapList = chapterList.length > 0 ? chapterList : chapters;
        
        console.log("loadChapter:", { 
            requestedIdx: chapterIdx, 
            listLength: chapList.length,
            bookId: book?.id,
            savedProgress: book?.progress_index
        });
        
        // Early validation
        if (!db) {
            console.error("loadChapter: database not ready");
            return;
        }
        if (chapList.length === 0) {
            console.error("loadChapter: empty chapter list");
            return;
        }
        
        // Clamp index to valid range - THIS IS CRITICAL
        const validIdx = Math.max(0, Math.min(chapterIdx, chapList.length - 1));
        if (validIdx !== chapterIdx) {
            console.warn("loadChapter: clamped index from", chapterIdx, "to", validIdx);
        }
        
        if (!chapList[validIdx]) {
            console.error("loadChapter: chapter not found at valid index", validIdx);
            return;
        }

        setLoading(true);
        setCurrentChapterIndex(validIdx);
        
        try {
            // Calculate which chapters to load (prev, current, next)
            const startIdx = Math.max(0, validIdx - 1);
            const endIdx = Math.min(chapList.length - 1, validIdx + 1);
            
            console.log("loadChapter: fetching range", startIdx, "-", endIdx);

            // Fetch all chapters in parallel
            const fetchPromises: Promise<WindowChapter | null>[] = [];
            for (let i = startIdx; i <= endIdx; i++) {
                if (chapList[i]?.id) {
                    fetchPromises.push(
                        fetchChapterData(chapList[i].id)
                            .then(data => data ? { ...data, index: i } : null)
                            .catch(err => {
                                console.error("loadChapter: fetch error for index", i, err);
                                return null;
                            })
                    );
                }
            }
            
            const results = (await Promise.all(fetchPromises)).filter(
                (c): c is WindowChapter => c !== null
            );
            
            console.log("loadChapter: fetched", results.length, "chapters");

            if (results.length === 0) {
                console.error("loadChapter: no chapters loaded");
                setLoading(false);
                return;
            }

            // Calculate scroll offset
            let offset = 0;
            if (options.restoreOffset && book?.progress_offset) {
                offset = book.progress_offset;
            } else if (options.scrollToEnd) {
                offset = 9999999;
            }

            // Apply chapters to window
            applyWindowChapters(results, "init", validIdx, offset);
            console.log("loadChapter: applied chapters for index", validIdx);

            // Save progress to database
            if (book?.id && db) {
                await db.execute(
                    "UPDATE books SET progress_index = $1, last_read = CURRENT_TIMESTAMP WHERE id = $2",
                    [validIdx, book.id]
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
        if (!db) {
            console.error("openBook: database not ready");
            return [];
        }
        setCurrentBook(book);
        setLoading(true);
        try {
            console.log("openBook: loading chapters for book", book.id);
            const rows: ChapterMeta[] = await db.select(
                "SELECT id, title, order_index FROM chapters WHERE book_id = $1 ORDER BY order_index ASC",
                [book.id]
            );
            console.log("openBook: loaded", rows.length, "chapters");
            setChapters(rows);
            
            // Clamp saved index to valid range
            const savedIdx = Math.min(book.progress_index || 0, rows.length - 1);
            console.log("openBook: opening chapter", savedIdx, "of", rows.length);
            
            if (rows.length === 0) {
                console.error("openBook: no chapters found for book", book.id);
                setLoading(false);
                return [];
            }
            
            await loadChapter(Math.max(0, savedIdx), rows, book, { restoreOffset: true });
            return rows;
        } catch (err) {
            console.error("openBook error:", err);
            setLoading(false);
            return [];
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
