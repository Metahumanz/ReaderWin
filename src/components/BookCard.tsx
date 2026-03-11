interface Book {
    id: number;
    title: string;
    author?: string;
    path?: string;
    progress_index?: number;
}

interface BookCardProps {
    book: Book;
    onClick: () => void;
}

export default function BookCard({ book, onClick }: BookCardProps) {
    const progress = book.progress_index || 0;

    return (
        <div
            onClick={onClick}
            className="flex flex-col gap-4 group cursor-pointer active:scale-95 transition-all"
        >
            <div className="aspect-[3/4.2] rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-2xl overflow-hidden relative border border-white/5 group-hover:border-indigo-500/50 transition-all duration-300 group-hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-5 left-5 right-5">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                            className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                {book.path?.endsWith(".txt") && (
                    <div className="absolute top-4 left-4 px-2 py-1 bg-amber-500/80 text-[10px] font-black uppercase text-white rounded-md backdrop-blur-sm">
                        Local TXT
                    </div>
                )}
            </div>
            <div>
                <h3 className="font-bold text-white leading-tight line-clamp-2 group-hover:text-indigo-400 transition-colors text-lg">
                    {book.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest">
                    {book.author || "未知作者"}
                </p>
            </div>
        </div>
    );
}
