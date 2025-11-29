# Audio to Strudel Converter

## Overview

Audio to Strudel is a web application that converts audio files (MP3, WAV, OGG, FLAC, M4A) into Strudel live coding notation. The application analyzes uploaded audio to extract melody notes and chord progressions, then generates ready-to-use Strudel code patterns for live coding performances.

The tool serves musicians and live coders who want to transform existing audio material into algorithmic music patterns compatible with the Strudel live coding environment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**Component Strategy**: The application follows a single-page application (SPA) architecture with modular, reusable components. UI components are built using shadcn/ui (Radix UI primitives) for consistent, accessible design patterns.

**Design System**: The application uses a custom design system inspired by professional audio production tools (Ableton Live, FL Studio). The design follows progressive disclosure principles - showing complexity only when needed through a simple upload → processing → results workflow.

**Styling Approach**: TailwindCSS with CSS variables for theming. Typography uses Inter for UI elements and JetBrains Mono for code output. The application supports both light and dark modes through CSS custom properties.

**State Management**: React Query (@tanstack/react-query) handles data fetching and caching. Local component state is managed with React hooks (useState, useCallback, useRef).

**Client-Side Audio Processing**: The Web Audio API is used directly in the browser to:
- Decode uploaded audio files into AudioBuffer objects
- Extract pitch information using autocorrelation-based pitch detection
- Generate waveform visualizations from channel data
- Perform frequency-to-note conversion for melody extraction

**Routing**: Wouter library provides lightweight client-side routing.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript.

**API Design**: RESTful API with minimal endpoints:
- `/api/health` - Health check endpoint
- `/api/stats` - Returns supported audio formats and feature flags

**Processing Model**: Audio analysis is currently performed entirely client-side using the Web Audio API. The backend serves as a static file server and potential future API endpoint for server-side processing.

**Build Strategy**: The application uses separate build processes for client and server:
- Client: Vite builds the React application into static assets
- Server: esbuild bundles the Express server with selected dependencies for faster cold starts
- Dependencies are selectively bundled (allowlist) vs. externalized to optimize startup time

### Data Storage Solutions

**Database**: PostgreSQL (via Neon serverless) configured with Drizzle ORM.

**Schema**: Currently defines a basic users table with username/password authentication structure. The schema also includes TypeScript types for:
- Note objects (note, time, duration, velocity)
- Chord objects (notes array, name, time, duration)
- Strudel code output (melody, chords, combined)
- Analysis results (including waveform data, detected key, tempo)

**Session Management**: The codebase includes infrastructure for session storage (connect-pg-simple) though authentication is not actively implemented in the current interface.

**In-Memory Storage**: A MemStorage class provides an in-memory alternative to database storage for user management during development.

### Audio Processing Architecture

**Pitch Detection**: Custom autocorrelation algorithm implemented in TypeScript:
- Analyzes audio frames to detect fundamental frequency
- Converts frequencies to musical notes using logarithmic relationships
- Filters out low-amplitude signals to avoid noise

**Note Extraction**: Processes audio in time-based chunks to build a melody timeline with note names, timing, duration, and velocity information.

**Chord Detection**: Analyzes harmonic content to identify chord progressions (implementation simplified for the current version).

**Strudel Code Generation**: Transforms extracted musical data into Strudel notation strings for melody patterns, chord progressions, and combined arrangements.

**Visualization**: Canvas-based waveform rendering and piano roll timeline display for visual feedback of detected musical content.

## External Dependencies

### Third-Party UI Libraries

- **Radix UI**: Comprehensive suite of unstyled, accessible component primitives (@radix-ui/react-*) including dialogs, dropdowns, progress bars, tooltips, and form elements
- **shadcn/ui**: Component patterns built on Radix UI with Tailwind styling
- **Lucide React**: Icon library for UI elements
- **cmdk**: Command palette component
- **embla-carousel-react**: Carousel/slider functionality

### Styling and Design

- **TailwindCSS**: Utility-first CSS framework with custom configuration
- **class-variance-authority**: Utility for managing component variants
- **tailwind-merge & clsx**: Class name management utilities
- **Google Fonts**: Inter (UI) and JetBrains Mono (code) via CDN

### Data Management

- **React Query**: Server state management and caching
- **React Hook Form**: Form state management with @hookform/resolvers for validation
- **Zod**: Schema validation and type inference
- **drizzle-zod**: Integration between Drizzle ORM and Zod

### Database and ORM

- **Drizzle ORM**: TypeScript ORM for database operations
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon
- **drizzle-kit**: CLI tools for schema management and migrations

### Development Tools

- **Vite**: Build tool and development server with HMR
- **@vitejs/plugin-react**: React integration for Vite
- **@replit/vite-plugin-***: Replit-specific development plugins (runtime error overlay, cartographer, dev banner)
- **TypeScript**: Type safety across the entire stack
- **esbuild**: Fast server bundling for production builds

### Utility Libraries

- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **wouter**: Lightweight routing library

### Build and Runtime

- **tsx**: TypeScript execution for development and build scripts
- **express**: Web server framework
- **cors**: Cross-origin resource sharing middleware