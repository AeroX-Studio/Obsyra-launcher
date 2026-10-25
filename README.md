<div align="center">

<img src="public/obsyra-logo.png" alt="Obsyra Launcher" width="128" height="128" />

# 💎 Obsyra Launcher

**A blazing-fast, lightweight, and modern cross-platform Minecraft launcher.**
*By Obsyra Studio by AeroX*

[![Release](https://img.shields.io/github/v/release/AeroX-Studio/Obsyra-launcher?style=for-the-badge&color=6366f1)](https://github.com/AeroX-Studio/Obsyra-launcher/releases)
[![Rust](https://img.shields.io/badge/Rust-Backend-dea584?style=for-the-badge&logo=rust)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri_v2-Native-24C8D8?style=for-the-badge&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React_19-Frontend-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

[🇷🇺 **Читать на русском**](#-obsyra-launcher-русский) • [📥 **Download**](#-getting-started) • [🧩 **Addons Guide**](addons/README.md) • [🤝 **Contributing**](CONTRIBUTING.md)

<br/>

</div>

---

## ✨ Features

- ⚡ **Ultra-Fast & Resource-Efficient**: Starts in under **400 ms** with minimal RAM usage (~**40 MB** idle) thanks to the native Rust + Tauri v2 core.
- 🎨 **Sleek Modern Interface**: Responsive glassmorphic UI built with React 19, Tailwind CSS, Base UI, and smooth Framer Motion micro-animations.
- 🎮 **Built-In Discord Rich Presence**: First-party, out-of-the-box Discord activity integration. Automatically broadcasts your game state, Minecraft version, and session time without needing third-party add-ons.
- 🔄 **Background Auto-Updater**: Seamless background update checks with cryptographic signature verification, download progress, and restart notification.
- 🧩 **Modular Addon Ecosystem**: Extend launcher features on the fly with live widgets, Modrinth integration, 3D skin dolls, custom themes, and launch hooks.
- 👤 **Universal Account Management**: Instant switching between Microsoft MSA and Offline accounts, with custom skin previews and cape wardrobe support.
- 🚀 **Smart Instance & Version Control**: Filter and launch Vanilla releases, snapshots, Fabric, Forge, NeoForge, and Quilt with isolated directories.
- 🛠️ **Power-User Performance Tweaks**: One-click Aikar's garbage collection flags, automatic RAM allocation detection, customizable JVM arguments, and live streaming console logs.
- 🌐 **Multi-Language Support**: English and Russian localization with seamless real-time switching.

---

## 🚀 Getting Started

### 📥 Download (For Players)

1. Head over to the official [Releases](https://github.com/AeroX-Studio/Obsyra-launcher/releases) page.
2. Download the installer for your operating system:
   - **Windows:** `.exe` (NSIS Installer) or `.msi`
   - **macOS:** `.dmg` (Apple Silicon & Intel)
   - **Linux:** `.AppImage` or `.deb`
3. Launch Obsyra Launcher, select your Minecraft version, and jump right into the game!

---

### 💻 Development (For Contributors)

#### Prerequisites

- [Node.js](https://nodejs.org/) (version 20+) or [Bun](https://bun.sh/)
- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- [Tauri v2 Prerequisites](https://tauri.app/start/prerequisites/)

#### Build & Run

```bash
# 1. Clone repository
git clone https://github.com/AeroX-Studio/Obsyra-launcher.git
cd Obsyra-launcher

# 2. Install dependencies
npm install

# 3. Start development server
npm run tauri dev
```

#### Production Build

```bash
npm run tauri build
```

---

## 🛠️ Tech Stack

| Layer                | Technologies                                      |
| -------------------- | ------------------------------------------------- |
| **Frontend Core**    | React 19, TypeScript, Vite, Base UI               |
| **Styling & Motion** | Tailwind CSS v4, Framer Motion, Lucide Icons      |
| **3D Graphics**      | skinview3d (Three.js WebGL skin & cape rendering) |
| **Desktop Runtime**  | Tauri v2, WebKit / WebView2                       |
| **Native Backend**   | Rust 2021, Tokio, Reqwest, Serde                  |

---

<br/>

---

<div align="center">

# 🇷🇺 Obsyra Launcher (Русский)

**Молниеносный, легковесный и современный кроссплатформенный лаунчер для Minecraft.**
*Разработано Obsyra Studio by AeroX*

[📥 **Скачать**](#-скачивание-для-игроков) • [🧩 **Руководство по аддонам**](addons/README.md) • [🤝 **Участие в разработке**](CONTRIBUTING.md) • [📄 **Лицензия**](LICENSE)

<br/>

</div>

---

## ✨ Возможности

- ⚡ **Максимальная производительность**: Время холодного запуска менее **400 мс**, потребление оперативной памяти в фоне ~**40 МБ** благодаря связке Rust и Tauri v2.
- 🎨 **Современный стеклянный интерфейс**: UI на React 19 и Tailwind CSS с плавной анимацией на Framer Motion.
- 🎮 **Встроенный Discord Rich Presence**: Нативная интеграция с Discord "из коробки" без необходимости скачивать отдельные плагины.
- 🔄 **Фоновое автообновление**: Проверка и загрузка подписанных обновлений в фоновом режиме с проверкой целостности и цифровых подписей.
- 🧩 **Модульный движок аддонов**: 3D-модель персонажа с гардеробом скинов и плащей, каталог Modrinth, темы и хуки запуска.
- 👤 **Удобное управление аккаунтами**: Мгновенное переключение между аккаунтами Microsoft (MSA) и оффлайн-профилями.
- 🚀 **Поддержка любых версий и модпаков**: Запуск официальных релизов, снапшотов, Fabric, Forge, NeoForge и Quilt в изолированных директориях.
- 🛠️ **Тонкая оптимизация**: Флаги сборщика мусора Aikar's Flags в один клик, автоопределение памяти, аргументы JVM и консоль с логами.
- 🌐 **Двуязычный интерфейс**: Полная поддержка русского и английского языков с переключением в реальном времени.

---

## 🤝 Вклад в проект

Мы рады любой помощи в развитии проекта! Перед отправкой Pull Request, пожалуйста, ознакомьтесь с файлом [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 Лицензия

Проект распространяется под открытой лицензией [MIT](LICENSE). Copyright © 2026 Obsyra Studio by AeroX.
