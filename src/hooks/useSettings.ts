import { useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";

export interface Settings {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    contentWidth: number;
    bgImagePath: string; // raw file path, NOT convertFileSrc URL
    immersiveMode: boolean;
    webdavUrl: string;
    webdavUser: string;
    webdavPass: string;
}

const DEFAULTS: Settings = {
    fontFamily: "'Georgia', serif",
    fontSize: 20,
    lineHeight: 1.8,
    letterSpacing: 0,
    contentWidth: 800,
    bgImagePath: "",
    immersiveMode: false,
    webdavUrl: "",
    webdavUser: "",
    webdavPass: "",
};

export function useSettings(db: Database | null) {
    const [settings, setSettings] = useState<Settings>(DEFAULTS);

    const saveSetting = async (key: string, value: string) => {
        if (!db) return;
        await db.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
            [key, value]
        );
    };

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const loadSettings = async (database: Database) => {
        try {
            const rows: { key: string; value: string }[] = await database.select(
                "SELECT * FROM settings"
            );
            let savedWidth = 0, savedHeight = 0;
            const next = { ...DEFAULTS };

            for (const row of rows) {
                switch (row.key) {
                    case "webdav_url": next.webdavUrl = row.value; break;
                    case "webdav_user": next.webdavUser = row.value; break;
                    case "webdav_pass": next.webdavPass = row.value; break;
                    case "font_family": next.fontFamily = row.value; break;
                    case "font_size": next.fontSize = parseInt(row.value); break;
                    case "line_height": next.lineHeight = parseFloat(row.value); break;
                    case "letter_spacing": next.letterSpacing = parseFloat(row.value); break;
                    case "content_width": next.contentWidth = parseInt(row.value); break;
                    // Bug fix: store raw path, convert at render time
                    case "bg_image_path": next.bgImagePath = row.value; break;
                    case "window_width": savedWidth = parseInt(row.value); break;
                    case "window_height": savedHeight = parseInt(row.value); break;
                    case "immersive_mode": next.immersiveMode = row.value === "true"; break;
                }
            }

            setSettings(next);

            if (savedWidth > 0 && savedHeight > 0) {
                try {
                    const win = getCurrentWindow();
                    await win.setSize(new LogicalSize(savedWidth, savedHeight));
                    await win.center();
                } catch (e) {
                    console.error("Failed to restore window size:", e);
                }
            }
        } catch (err) {
            console.error("loadSettings failed:", err);
        }
    };

    const resetSettings = async (database: Database) => {
        const defaults = {
            "font_size": DEFAULTS.fontSize.toString(),
            "font_family": DEFAULTS.fontFamily,
            "line_height": DEFAULTS.lineHeight.toString(),
            "letter_spacing": DEFAULTS.letterSpacing.toString(),
            "content_width": DEFAULTS.contentWidth.toString(),
            "bg_image_path": "",
        };
        for (const [key, val] of Object.entries(defaults)) {
            await database.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
                [key, val]
            );
        }
        setSettings((prev) => ({
            ...prev,
            fontSize: DEFAULTS.fontSize,
            fontFamily: DEFAULTS.fontFamily,
            lineHeight: DEFAULTS.lineHeight,
            letterSpacing: DEFAULTS.letterSpacing,
            contentWidth: DEFAULTS.contentWidth,
            bgImagePath: "",
        }));
    };

    const toggleImmersive = async (immersive: boolean) => {
        const win = getCurrentWindow();
        await win.setDecorations(!immersive);
        await win.setFullscreen(immersive);
        setSettings((prev) => ({ ...prev, immersiveMode: immersive }));
        saveSetting("immersive_mode", immersive.toString());
    };

    const setWindowPreset = async (ratio: string) => {
        const win = getCurrentWindow();
        await win.setDecorations(true);
        await win.setFullscreen(false);
        setSettings((prev) => ({ ...prev, immersiveMode: false }));

        const sizes: Record<string, [number, number]> = {
            "16:9": [1024, 576],
            "9:16": [450, 800],
            "4:3": [800, 600],
            "3:4": [600, 800],
        };
        const [w, h] = sizes[ratio] ?? [1024, 576];
        const size = new LogicalSize(w, h);
        await win.setSize(size);
        await win.center();
        saveSetting("window_width", size.width.toString());
        saveSetting("window_height", size.height.toString());
    };

    // Bug fix: pick background image, save raw path
    const pickBgImage = async () => {
        const sel = await open({
            multiple: false,
            filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
        });
        if (sel && typeof sel === "string") {
            setSettings((prev) => ({ ...prev, bgImagePath: sel }));
            saveSetting("bg_image_path", sel);
        }
    };

    // Toggle font between serif and sans-serif
    const toggleFont = () => {
        const nf = settings.fontFamily.includes("serif")
            ? "system-ui, sans-serif"
            : "'Georgia', serif";
        setSettings((prev) => ({ ...prev, fontFamily: nf }));
        saveSetting("font_family", nf);
    };

    // Getter for the actual CSS background image value
    // Tauri v2 convertFileSrc: convertFileSrc(filePath, protocol)
    // On Windows, paths like C:\path\to\file.jpg need to be converted to asset:// URLs
    const bgImageUrl = settings.bgImagePath
        ? convertFileSrc(settings.bgImagePath, "asset")
        : "";

    return {
        settings,
        bgImageUrl,
        saveSetting,
        updateSetting,
        loadSettings,
        resetSettings,
        toggleImmersive,
        setWindowPreset,
        pickBgImage,
        toggleFont,
    };
}
