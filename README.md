# Water Sort

A Next.js + React + TypeScript implementation of the Water Sort puzzle game, refactored from a single-file HTML prototype into reusable components.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**

## Project Structure

```
src/
  app/
    layout.tsx        # Root layout + fonts
    page.tsx          # Composes the game from components
    globals.css       # Theme variables + keyframe animations
  components/
    GameHeader.tsx    # Level / moves / sound toggle
    GameBoard.tsx     # Renders the scattered tube layout
    Tube.tsx          # A single tube + its color segments
    Toolbar.tsx       # Undo / Add tube / New deal / Hint
    WinOverlay.tsx    # Level-complete panel with star rating
    Confetti.tsx      # Win confetti effect
  hooks/
    useGame.ts        # Game state, pour choreography, controls
  lib/
    game.ts           # Rules, DFS solver, level generator
    audio.ts          # Web Audio synthesized pour / blip sounds
    layout.ts         # Seeded scattered grid layout
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Build for production:

```bash
npm run build
```

## Deployment

This app is deployed to **Vercel** via GitHub. Pushing to the default branch
triggers a Vercel build and deploy automatically.

## How to Play

Tap a tube to pick it up, then tap another tube to pour the top color onto a
matching color (or into an empty tube). Sort every tube so each holds a single
color to complete the level.
