import VirtualTocList from "../VirtualTocList";

interface Chapter {
    id: number;
    title: string;
}

interface TocOverlayProps {
    chapters: Chapter[];
    currentChapterIndex: number;
    onSelect: (idx: number) => void;
    onClose: () => void;
}

export default function TocOverlay({
    chapters,
    currentChapterIndex,
    onSelect,
    onClose,
}: TocOverlayProps) {
    return (
        <div className="fixed inset-0 z-[110] flex animate-in fade-in duration-300">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-80 bg-slate-900 h-full shadow-2xl flex flex-col border-r border-white/10 animate-in slide-in-from-left duration-500">
                <div className="p-8 border-b border-white/5 shrink-0">
                    <h2 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">
                        目录
                    </h2>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em]">
                        {chapters.length} Chapters
                    </p>
                </div>
                <VirtualTocList
                    chapters={chapters}
                    currentChapterIndex={currentChapterIndex}
                    onSelect={(idx) => {
                        onSelect(idx);
                        onClose();
                    }}
                />
            </div>
        </div>
    );
}
