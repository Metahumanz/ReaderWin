import { SyncIcon, PenIcon, LayoutIcon, DownloadIcon, ResetIcon, ArrowRightSmIcon } from "./icons";
import type { Settings } from "../hooks/useSettings";

interface ReplacementRule {
    id: number;
    pattern: string;
    replacement: string;
    is_regex: number;
    scope: string;
    active: number;
}

interface SettingsViewProps {
    settings: Settings;
    replacementRules: ReplacementRule[];
    appVersion: string;
    checkingUpdate: boolean;
    updateInfo: string | null;
    onSaveSetting: (key: string, value: string) => void;
    onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    onWebdavSync: (mode: "upload" | "download") => void;
    onCheckUpdate: () => void;
    onResetSettings: () => void;
    onSetWindowPreset: (ratio: string) => void;
    onAddRule: () => void;
    onDeleteRule: (id: number) => void;
}

export default function SettingsView({
    settings,
    replacementRules,
    appVersion,
    checkingUpdate,
    updateInfo,
    onSaveSetting,
    onUpdateSetting,
    onWebdavSync,
    onCheckUpdate,
    onResetSettings,
    onSetWindowPreset,
    onAddRule,
    onDeleteRule,
}: SettingsViewProps) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-300">

                {/* WebDAV Sync */}
                <div className="bg-slate-800/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl"><SyncIcon /></div>
                        WebDAV 同步
                    </h2>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">服务器地址</label>
                            <input
                                type="text"
                                value={settings.webdavUrl}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateSetting("webdavUrl", e.target.value)}
                                placeholder="https://dav.jianguoyun.com/dav/"
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">账号</label>
                                <input
                                    type="text"
                                    value={settings.webdavUser}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateSetting("webdavUser", e.target.value)}
                                    placeholder="Username"
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">应用密码</label>
                                <input
                                    type="password"
                                    value={settings.webdavPass}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateSetting("webdavPass", e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="pt-6 flex gap-4">
                            <button
                                onClick={() => onWebdavSync("upload")}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                            >
                                备份至云端
                            </button>
                            <button
                                onClick={() => onWebdavSync("download")}
                                className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl active:scale-95 transition-all"
                            >
                                恢复备份
                            </button>
                        </div>
                    </div>
                </div>

                {/* Replacement Rules */}
                <div className="bg-slate-800/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-pink-500/20 rounded-xl"><PenIcon /></div>
                            文本替换规则
                        </h2>
                        <button
                            onClick={onAddRule}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                        {replacementRules.length === 0 && (
                            <div className="text-center py-10 text-slate-600 text-xs font-bold uppercase tracking-widest">
                                暂无替换规则
                            </div>
                        )}
                        {replacementRules.map((rule) => (
                            <div
                                key={rule.id}
                                className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/5 rounded-2xl group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-black text-indigo-400 truncate">{rule.pattern}</span>
                                        <ArrowRightSmIcon />
                                        <span className="text-xs font-black text-emerald-400 truncate">
                                            {rule.replacement || "空"}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {rule.is_regex === 1 && (
                                            <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-md font-black uppercase">
                                                Regex
                                            </span>
                                        )}
                                        <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md font-black uppercase">
                                            {rule.scope}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDeleteRule(rule.id)}
                                    className="p-2 text-red-500/50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Layout & Font */}
                <div className="bg-slate-800/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl"><LayoutIcon /></div>
                        界面与布局
                    </h2>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">阅读默认字体</label>
                            <select
                                value={settings.fontFamily}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    onUpdateSetting("fontFamily", e.target.value);
                                    onSaveSetting("font_family", e.target.value);
                                }}
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-4 text-white hover:border-indigo-500 outline-none appearance-none transition-all"
                            >
                                <option value="'Georgia', serif">纤细衬线 (Georgia)</option>
                                <option value="'Times New Roman', serif">经典衬线 (Times New Roman)</option>
                                <option value="system-ui, sans-serif">现代无衬线 (System UI)</option>
                                <option value="'Microsoft YaHei', sans-serif">微软雅黑 (Microsoft YaHei)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">窗口比例预设</label>
                            <div className="grid grid-cols-2 gap-3">
                                {(["16:9", "9:16", "4:3", "3:4"] as const).map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => onSetWindowPreset(ratio)}
                                        className="py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-xl text-xs font-bold hover:border-indigo-500 transition-all"
                                    >
                                        {ratio === "16:9" ? "16:9 宽屏" : ratio === "9:16" ? "9:16 竖屏" : ratio === "4:3" ? "4:3 标准" : "3:4 文档"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4">
                            <button
                                onClick={onResetSettings}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl border border-white/5 shadow-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <ResetIcon />
                                恢复全套默认设置
                            </button>
                        </div>
                    </div>
                </div>

                {/* Update */}
                <div className="bg-slate-800/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-xl"><DownloadIcon /></div>
                        软件更新
                    </h2>
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl">
                            <div className="text-sm font-bold text-slate-300 mb-2">当前版本: {appVersion}</div>
                            <div className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">
                                {updateInfo || "点击下方按钮检查是否有新版本可用。"}
                            </div>
                        </div>
                        <button
                            onClick={onCheckUpdate}
                            disabled={checkingUpdate}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            {checkingUpdate ? "正在检查..." : "检查更新"}
                        </button>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center">
                            系统将尝试通过代理和绕过代理两种方式检查
                        </p>
                    </div>
                </div>

            </div>
        </>
    );
}
