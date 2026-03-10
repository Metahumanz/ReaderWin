# Reader

一个基于 Tauri v2 + React 构建的高颜值、现代化桌面电子书阅读器。

## 🌟 核心特性

- **极致阅读体验**：支持沉浸式边框模式、横向翻页对齐、鼠标滚轮翻页。
- **高自由度定制**：动态调整字体大小、行高、字间距、内容宽度，支持自定义背景图片。
- **本地与同步**：支持本地 TXT 导入（自动解析章节索引）、WebDAV 云端同步（支持进度与书架同步）。
- **多端适配设计**：支持多种窗口比例预设（16:9, 9:16, 4:3, 3:4），适配不同的屏幕环境。
- **书源引擎 (开发中)**：支持导入类似“阅读 (Legado)”格式的书源，实现全网小说实时搜索与换源阅读。

## 🛠️ 技术栈

- **Frontend**: React + Tailwind CSS + Vite
- **Backend**: Rust (Tauri v2)
- **Database**: SQLite (via `tauri-plugin-sql`)
- **UI Components**: 自定义高保真组件，支持毛玻璃特效与流畅动画。

## 🚀 快速开始

### 依赖环境
- Node.js (LTS)
- Rust (Stable)

### 运行开发版
```bash
npm install
npm run tauri dev
```

### 构建安装包
```bash
npm run tauri build
```

## 📜 许可证

MIT License
