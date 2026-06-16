<div align="center">

<h1 style="font-family:'Segoe UI',Verdana,sans-serif;">🧪🌈 Water Sort 🌈🧪</h1>

<p style="font-size:1.3rem; line-height:1.6;"><b>A colorful, never-get-stuck Water Sort puzzle, built with Next.js &amp; React.</b></p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

</div>

---

<h2 style="font-family:'Segoe UI',Verdana,sans-serif;">🎮 About</h2>

<p style="font-size:1.1rem; line-height:1.7;">
A Next.js + React + TypeScript implementation of the classic <b>Water Sort</b> puzzle, refactored from a single-file HTML prototype into clean, reusable components. Every level is <b>solver-verified</b> and the game blocks dead-end moves, so you can <b>never get permanently stuck</b>. 💚
</p>

> [!TIP]
> 🎯 New player? Head straight to the **[📖 Player's Guide](./USER_GUIDE.md)** for a full walkthrough.

---

<h2 style="font-family:'Segoe UI',Verdana,sans-serif;">🛠️ Tech Stack</h2>

| Tech | Role |
| :--- | :--- |
| ⚫ **Next.js 16** (App Router) | Framework &amp; build |
| ⚛️ **React 19** | UI components |
| 🔷 **TypeScript** | Type-safe game logic |
| 🎨 **Tailwind CSS** | Styling |

---

<h2 style="font-family:'Segoe UI',Verdana,sans-serif;">📁 Project Structure</h2>

```
src/
  app/
    layout.tsx        # Root layout + fonts
    page.tsx          # Composes the game from components
    globals.css       # Theme variables + keyframe animations
  components/
    GameHeader.tsx    # Level / moves / score / sound toggle
    GameBoard.tsx     # Renders the scattered tube layout
    Tube.tsx          # A single tube + its color segments
    Toolbar.tsx       # Undo / Add tube / Hint / Level 1
    WinOverlay.tsx    # Level-complete panel with star rating
    Confetti.tsx      # Win confetti effect
  hooks/
    useGame.ts        # Game state, pour choreography, controls
  lib/
    game.ts           # Rules, DFS solver, level generator
    audio.ts          # Web Audio synthesized pour / blip sounds
    layout.ts         # Seeded scattered grid layout
```

---

<h2 style="font-family:'Segoe UI',Verdana,sans-serif;">🚀 Getting Started</h2>

<p style="font-size:1.1rem; line-height:1.7;">📦 Install dependencies:</p>

```bash
npm install
```

<p style="font-size:1.1rem; line-height:1.7;">🔥 Run the dev server:</p>

```bash
npm run dev
```

<p style="font-size:1.1rem; line-height:1.7;">🌐 Open <a href="http://localhost:3000">http://localhost:3000</a>.</p>

<p style="font-size:1.1rem; line-height:1.7;">🏗️ Build for production:</p>

```bash
npm run build
```

---

<h2 style="font-family:'Segoe UI',Verdana,sans-serif;">☁️ Deployment</h2>

> [!NOTE]
> 🚀 This app deploys to **Vercel** via GitHub. Pushing to the default branch triggers a Vercel build and deploy **automatically**.

---

<h2 style="font-family:'Segoe UI',Verdana,sans-serif;">🕹️ How to Play</h2>

<p style="font-size:1.1rem; line-height:1.7;">
👆 Tap a tube to pick it up, then 👉 tap another tube to pour the top color onto a matching color (or into an empty tube). Sort every tube so each holds a <b>single color</b> to complete the level! 🎉
</p>

<p style="font-size:1.1rem; line-height:1.7;">
📖 For the full rundown of rules, special tubes, scoring, and strategy, see the <b>[Player's Guide](./USER_GUIDE.md)</b>.
</p>

---

<div align="center">

<p style="font-size:1.2rem; line-height:1.6;"><b>🧪 Happy pouring! 🌈</b></p>

</div>
