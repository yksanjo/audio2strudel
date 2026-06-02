# audio2strudel

Convert audio files into [Strudel](https://strudel.cc) live-coding patterns. Upload
an audio file (MP3, WAV, OGG, FLAC, M4A) and the app analyzes it in the browser to
extract melody notes and generate ready-to-use Strudel code. It also supports batch
processing and MIDI export of the detected notes.

Audio analysis runs entirely client-side using the Web Audio API (autocorrelation-based
pitch detection and frequency-to-note conversion); the Express server serves the app
and exposes small health/stats endpoints.

## Tech stack

- **Frontend:** React 18 + TypeScript, Vite, Wouter (routing), TanStack Query,
  Tailwind CSS, shadcn/ui (Radix primitives)
- **Backend:** Express (Node.js) + TypeScript, run via tsx
- **Audio:** Web Audio API (client-side pitch/melody extraction), MIDI export
- **Optional DB:** Drizzle ORM + Neon Postgres (schema in `shared/schema.ts`)

## Quick start

```bash
npm install
npm run dev        # starts the Express server + Vite client (dev)
```

## Scripts

- `npm run dev` – run server + client in development
- `npm run build` – build the production bundle (`script/build.ts`)
- `npm start` – run the production build
- `npm run check` – type-check the project (`tsc`)
- `npm run db:push` – push the Drizzle schema (requires a configured database)

## Project structure

```text
client/   # React + Vite frontend (audio analysis, UI components, MIDI export)
server/   # Express server (entry: index.ts; routes, static, vite middleware)
shared/   # Shared types and Drizzle schema
script/   # Build script
docs/     # Architecture and roadmap
```

## API

- `GET /api/health` – health check
- `GET /api/stats` – supported formats and feature flags
