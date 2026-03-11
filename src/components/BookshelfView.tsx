import BookCard from "./BookCard";
import { AddIcon } from "./icons";

interface Book {
    id: number;
    title: string;
    author?: string;
    path?: string;
    progress_index?: number;
}

interface BookshelfViewProps {
    books: Book[];
    importing: boolean;
    onOpenBook: (book: Book) => void;
    onImport: () => void;
    onContextMenu: (e: React.MouseEvent, bookId: number) => void;
}

export default function BookshelfView({
    books,
    importing,
    onOpenBook,
    onImport,
    onContextMenu,
}: BookshelfViewProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 animate-in fade-in duration-500">
            {books.map((book) => (
                <div
                    key={book.id}
                    onContextMenu={(e: React.MouseEvent) => {
                        e.preventDefault();
                        if (!importing) onContextMenu(e, book.id);
                    }}
                >
                    <BookCard book={book} onClick={() => !importing && onOpenBook(book)} />
                </div>
            ))}
            <div
                onClick={!importing ? onImport : undefined}
                className={`aspect-[3/4] border-2 border-dashed border-slate-700/50 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-500 transition-all cursor-pointer group shadow-inner ${importing
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5"
                    }`}
            >
                <div
                    className={`p-4 rounded-2xl bg-slate-800 shadow-lg ${!importing && "group-hover:bg-indigo-500/10"
                        }`}
                >
                    <AddIcon />
                </div>
                <span className="font-bold text-sm">
                    {importing ? "正在解析书籍..." : "导入 TXT / EPUB"}
                </span>
            </div>
        </div>
    );
}
