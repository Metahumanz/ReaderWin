import { ReactNode } from "react";

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: ReactNode;
    label: string;
}

export default function NavButton({ active, onClick, icon, label }: NavButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`relative group flex flex-col items-center gap-1 transition-all ${active ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
        >
            <div
                className={`p-3 rounded-xl transition-all ${active ? "bg-indigo-500/10" : "group-hover:bg-slate-700/50"
                    }`}
            >
                {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 text-center">
                {label}
            </span>
            {active && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full shadow-[4px_0_12px_rgba(99,102,241,0.5)]" />
            )}
        </button>
    );
}
