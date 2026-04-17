<div align="center">
<img width="1200" height="475" alt="Mental Clarity Engine Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🧠 Mental Clarity Engine

**Turn mental chaos into crystalline clarity — powered by Google Gemini AI.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_AI-Powered-4285F4?style=flat&logo=google)](https://ai.google.dev/)

</div>

---

## What Is It?

Mental Clarity Engine is an AI-powered **brain dump organizer**. You paste in all the thoughts swirling around in your head — tasks, worries, ideas, half-formed plans — and the app uses Google Gemini to sort them into five clear action buckets, give you a "clarity score," and tell you exactly what to focus on first.

Stop drowning in your to-do list. One dump, instant clarity.

---

## Features

- **🗑️ Brain Dump Input** — A distraction-free text area where you pour out everything on your mind.
- **🤖 Gemini AI Analysis** — Your thoughts are analyzed in seconds using the Gemini model with structured JSON output.
- **📂 5-Bucket Organization** — Items are sorted into:
  | Bucket | Purpose |
  |---|---|
  | ✅ **Do Today** | Urgent tasks that need action now |
  | 📅 **Schedule It** | Important but not urgent — book a time |
  | 🤔 **Decide** | Things you're on the fence about |
  | 🌬️ **Let Go** | Worries or things outside your control |
  | 💡 **Capture** | Ideas worth keeping but not acting on yet |
- **⚡ Top Win** — The single most important action to unlock momentum.
- **📊 Clarity Score** — A 0–100 score showing how organized your mental load is (with an animated progress bar).
- **🌿 Breathe** — A short, grounding perspective shift to calm your mind.
- **☑️ Interactive Checklist** — Check off tasks as you complete them; progress is tracked in real time.
- **✨ Smooth Animations** — Powered by Motion (Framer Motion) for polished transitions.
- **⌨️ Keyboard Shortcut** — Press `⌘ + Enter` (or `Ctrl + Enter`) to analyze instantly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev/) |
| Language | [TypeScript 5.8](https://www.typescriptlang.org/) |
| Build Tool | [Vite 6](https://vitejs.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| AI | [Google Gemini (`@google/genai`)](https://ai.google.dev/) |
| Animations | [Motion (Framer Motion)](https://motion.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Server | [Express](https://expressjs.com/) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GGWarrior001/Mental-Clarity-Engine.git
   cd Mental-Clarity-Engine
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Copy the example env file and add your Gemini API key:
   ```bash
   cp .env.example .env.local
   ```
   Then open `.env.local` and set:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run the TypeScript type checker |
| `npm run clean` | Remove the `dist` output directory |

---

## How to Use

1. Open the app in your browser.
2. Type (or paste) everything that's on your mind into the text area — tasks, worries, ideas, anything.
3. Click **Find Clarity** (or press `⌘ + Enter`).
4. Review your organized buckets, read your personalized insight, and start with the **⚡ Start Here** action.
5. Check off items as you complete them.
6. Click **New Brain Dump** to start fresh.

---

## Project Structure

```
Mental-Clarity-Engine/
├── src/
│   ├── App.tsx        # Main application component
│   ├── main.tsx       # React entry point
│   └── index.css      # Global styles
├── index.html         # HTML entry point
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
├── .env.example       # Example environment variables
└── package.json       # Dependencies and scripts
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key. Get one at [aistudio.google.com](https://aistudio.google.com/apikey). |
| `APP_URL` | Optional | The URL where the app is hosted (used in cloud deployments). |

> **Note:** When deployed via Google AI Studio, these variables are injected automatically from your project secrets.

---

## Live Demo

View the app on Google AI Studio: [https://ai.studio/apps/8e172fde-4058-465f-84f1-d3cffc67d6e3](https://ai.studio/apps/8e172fde-4058-465f-84f1-d3cffc67d6e3)

---

## License

This project is open source. Feel free to fork, adapt, and build upon it.
