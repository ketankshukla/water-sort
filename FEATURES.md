<h1 align="center">🧪✨ Water Sort — Feature Ideas ✨🧪</h1>

<p align="center">
  <img src="https://img.shields.io/badge/status-roadmap-blueviolet?style=for-the-badge" alt="roadmap" />
  <img src="https://img.shields.io/badge/build-passing-success?style=for-the-badge" alt="passing" />
  <img src="https://img.shields.io/badge/let's-build%20one%20at%20a%20time-ff69b4?style=for-the-badge" alt="one at a time" />
</p>

<p align="center"><b>A menu of ideas to make the game more exciting. Pick one and we'll build it together. 🚀</b></p>

---

> [!NOTE]
> Each feature has a **difficulty** badge and an **impact** rating so we can prioritize.
> 🟢 Easy &nbsp;•&nbsp; 🟡 Medium &nbsp;•&nbsp; 🔴 Hard &nbsp;&nbsp;|&nbsp;&nbsp; ⭐ = fun/impact

---

## 🎮 Core Gameplay

### 1. 🏆 Star Goals & Move Targets
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Show the **par** (optimal) move count up-front and award **1–3 stars** based on how close the player gets. We already compute `optimal` in the solver — just surface it in the header with a live "you're at X / par Y" indicator.

### 2. ⏪ Unlimited Undo + Redo
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐-f1c40f)

Add a **redo** button beside undo, and an "are you stuck?" auto-suggest after N seconds of inactivity.

### 3. 🔒 Locked & Frozen Tubes
![diff](https://img.shields.io/badge/difficulty-🟡%20Medium-f39c12) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Introduce **special tubes** that change the rules of a single tube on an otherwise normal board. They add genuine puzzle depth **without** adding new colors — the same liquid, but with constraints that force smarter planning. Three flavors:

#### 3a. 🧊 Frozen Tubes
- **Rule:** the tube is encased in ice and **rejects every pour** until it's thawed.
- **Thaw trigger:** successfully pour a segment of a **matching top color** onto it once — the ice cracks and the tube behaves normally for the rest of the level.
- **Feel:** you must solve toward a color *before* you can use that tube's space, so it gates your move order.
- **Visual:** frosted/foggy glass with a crack-and-shatter animation on thaw.

#### 3b. 🔒 Locked Tubes
- **Rule:** sealed shut — **no pour in and no pour out** — until an unlock condition is met.
- **Unlock conditions** (chosen per level): after **X total moves**, after **Y tubes completed**, or after a **specific color is fully cleared**.
- **Feel:** a threshold gate that adds planning pressure and rewards reading the board ahead.
- **Visual:** padlock badge with a **live counter**, plus a pop/unlatch animation when it opens.

#### 3c. ➡️ One-Way Tubes
- **Rule:** liquid can **only pour out**, never in — like a funnel or valve. **Once fully emptied, the valve clears and it becomes a normal tube** you can pour into again.
- **Feel:** turns the tube into a pure **source** you must drain to "unlock" as usable empty space, so timing its emptying becomes the puzzle. Pairs especially well with boards that have few empty tubes.
- **Visual:** an upward chevron / valve marker on the tube body; it disappears once the tube empties.

> [!NOTE]
> **Design guardrails:**
> - Start with **at most ~1 special tube per board** when these first appear, then ramp frequency with level.
> - The generator must still guarantee the board is solvable **with** the modifier active (verified by an upgraded solver).
> - Modifiers are stored **separately** from the color data, so save/resume and scoring stay unaffected.

<details>
<summary><b>🛠️ How we'd build it</b></summary>

- **Data model:** add a parallel `modifiers[]` (e.g. `{ kind: 'frozen' | 'locked' | 'oneway', ...params }` per tube index), kept separate from `Tube = number[]` so save/resume/scoring are unaffected.
- **Rules:** extend `canPour` to consult modifiers — frozen blocks until its thawed flag is set, locked blocks in/out until its condition is met, one-way blocks pour-in.
- **Solver:** `solve` must respect the same modifier gates so generated boards remain provably solvable.
- **Generator:** `generateLevel` optionally assigns a modifier (frequency scaling with level) and re-verifies solvability via the upgraded solver.
- **Rendering:** `Tube.tsx` overlays — frost + crack (frozen), padlock + live counter (locked), valve chevron (one-way).

*✅ Implemented — frozen from L2, one-way from L4, locked from L6. At least one special tube every level from L2+ (2 from L10, 3 from L18), all solver-verified.*

</details>

### 4. 🌈 Rainbow / Wildcard Liquid
![diff](https://img.shields.io/badge/difficulty-🟡%20Medium-f39c12) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

A special segment that matches **any** color it touches — a satisfying "get out of jail" mechanic for hard boards.

---

## ⏱️ Modes & Progression

### 5. 🕐 Time Attack & Daily Challenge
![diff](https://img.shields.io/badge/difficulty-🟡%20Medium-f39c12) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐⭐-f1c40f)

A **daily seeded puzzle** (same for everyone that day) plus an optional timer mode with a leaderboard-friendly score.

### 6. 🗺️ Level Map / World Progression
![diff](https://img.shields.io/badge/difficulty-🟡%20Medium-f39c12) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

A scrollable map of levels grouped into **themed worlds** (Lab, Ocean, Lava…) with palettes that change per world.

### 7. 🎚️ Difficulty Selector
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐-f1c40f)

Casual / Normal / Hard toggles that tweak the number of colors, empty tubes, and tube capacity.

---

## 💎 Meta & Economy

### 8. 💰 Coins, Hints & Power-Ups
![diff](https://img.shields.io/badge/difficulty-🟡%20Medium-f39c12) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Earn coins for solving fast. Spend them on **hints**, **extra tubes**, or an **undo-all**. We already have a solver to power smart hints.

### 9. 🔥 Daily Streaks & Achievements
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Track streaks ("5 days in a row!") and unlock **badges** ("Solved with no undos", "Beat par"). Stored in `localStorage`.

---

## 🎨 Polish, Feel & Accessibility

### 10. 🫧 Liquid Physics & Pour Polish
![diff](https://img.shields.io/badge/difficulty-🟡%20Medium-f39c12) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐⭐-f1c40f)

Upgrade the pour with **wobble/sloshing**, bubbles rising in filled tubes, and a glossy glass highlight. Big "juice" payoff.

### 11. 🎉 Win Celebrations & Themes
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

More confetti variety, screen-shake on combo completions, and selectable **color themes** (Neon, Pastel, Dark, High-Contrast).

### 12. ♿ Colorblind Mode
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Add **symbols/patterns** on top of each color segment so colorblind players can distinguish them. Important for accessibility.

### 13. 🔊 Sound & Music Toggle+
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐-f1c40f)

Add ambient background music with its own volume slider, plus richer SFX for "tube complete" and "near-win".

---

## 📲 Social & Tech

### 14. 📤 Share Your Result
![diff](https://img.shields.io/badge/difficulty-🟢%20Easy-2ecc71) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Wordle-style **shareable result** ("Water Sort #128 — ⭐⭐⭐ in 14 moves") copied to clipboard.

### 15. 📱 Installable PWA + Offline
![diff](https://img.shields.io/badge/difficulty-🟡%20Medium-f39c12) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Add a manifest + service worker so it installs to the home screen and plays **fully offline**.

### 16. 🎨 Custom Level Builder
![diff](https://img.shields.io/badge/difficulty-🔴%20Hard-e74c3c) ![impact](https://img.shields.io/badge/impact-⭐⭐⭐-f1c40f)

Let players design their own boards (validated by the solver to guarantee solvability) and share via a URL code.

---

## ⭐ My Top Picks To Start

> [!TIP]
> If you want the **biggest excitement boost for the least effort**, I'd start here:
>
> 1. 🏆 **#1 Star Goals & Move Targets** — quick win, instant "just one more try" hook.
> 2. 🫧 **#10 Liquid Physics & Pour Polish** — makes every pour feel amazing.
> 3. 🕐 **#5 Daily Challenge** — strong reason to come back every day.
> 4. ♿ **#12 Colorblind Mode** — small effort, real accessibility value.

---

<p align="center"><b>👉 Tell me which number you want to build first, and we'll tackle it one feature at a time. 🛠️</b></p>
