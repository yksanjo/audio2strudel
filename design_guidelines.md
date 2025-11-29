# Audio to Strudel Converter - Design Guidelines

## Design Approach
**Selected Approach**: Design System with Creative Audio Production Aesthetic
- Foundation: Material Design principles for information-dense interfaces
- Creative Layer: Music production tool aesthetics (inspired by Ableton Live, FL Studio's modern interfaces)
- Rationale: Balances professional utility with creative workflow expectations. Musicians expect polished, modern interfaces that respect their creative process.

## Core Design Principles
1. **Progressive Disclosure**: Show complexity only when needed - simple upload → processing → detailed results
2. **Visual Feedback**: Every action has immediate, clear feedback (uploading, analyzing, copying)
3. **Scannable Output**: Code blocks and visualizations use high contrast and clear hierarchy
4. **Professional Polish**: Production-grade feel matching quality audio tools

## Typography System

**Font Families**:
- Primary: Inter (Google Fonts) - UI elements, body text, labels
- Monospace: JetBrains Mono (Google Fonts) - code blocks, technical output

**Type Scale**:
- Hero Title: text-5xl (48px), font-bold
- Section Headers: text-2xl (24px), font-bold
- Subsection/Card Titles: text-lg (18px), font-semibold
- Body/Labels: text-base (16px), font-medium
- Helper Text: text-sm (14px), font-normal
- Code Output: text-sm (14px), font-mono

## Layout System

**Spacing Primitives**: Use Tailwind units 4, 6, 8, 12, 16
- Component padding: p-6, p-8
- Section spacing: space-y-8, space-y-12
- Card gaps: gap-6
- Tight groupings: space-y-4

**Container Strategy**:
- Max width: max-w-5xl (centered for focused workflow)
- Full-width sections: Use sparingly for waveform visualizations
- Cards/Panels: Consistent rounded-2xl corners

**Grid Layout**:
- Upload + Processing: Single column, centered
- Results Display: Two-column split on desktop (lg:grid-cols-2) - Visualization left, Code output right
- Stats/Metadata: Three columns (grid-cols-3) for compact info display

## Component Library

### File Upload Zone
- Large dropzone with dashed border (border-2 border-dashed)
- Height: min-h-64 for comfortable drag-and-drop
- Hover state: Brighten border, subtle backdrop change
- Icons: Upload icon (48px) + file format icons
- Supporting text: "Drag & drop audio file or click to browse" + "Supports MP3, WAV, OGG, FLAC"

### Processing Status Panel
- Full-width card with progress bar
- Real-time status text: "Analyzing audio...", "Detecting pitches...", "Generating notation..."
- Progress indicator: Animated gradient bar (not circular spinner)
- Processing steps visualization: 4 steps shown with checkmarks as completed

### Audio Visualization Section
- Waveform Display: Full-width, height h-32, canvas-based rendering
- Note Timeline: Horizontal piano roll style visualization showing detected notes over time
- Chord Diagram: Vertical display showing chord progression with note names
- All visualizations use consistent spacing: mb-6 between elements

### Code Output Cards
Three separate collapsible cards:
1. **Melody Output** - Expandable card with copy button
2. **Chord Output** - Expandable card with copy button  
3. **Combined Stack** - Expandable card with copy button (default expanded)

**Card Structure**:
- Header: Title + Copy button (right-aligned)
- Code block: p-6, rounded-lg, monospace font
- Syntax highlighting: Different text treatments for strings, functions, parameters
- Copy button: Icon + "Copy" text, shows "Copied!" confirmation

### Metadata Display
Compact grid showing:
- Detected Notes count
- Duration
- Key Signature (if detected)
- Tempo (BPM if detected)
- File size/format

Each as a small card: p-4, rounded-lg

### Action Buttons
- Primary: "Analyze Audio" - Large, prominent (py-4, text-lg, font-bold)
- Secondary: "Analyze Another File" - Medium size (py-3, text-base)
- Tertiary: Copy buttons - Small (py-2, px-4, text-sm)

## Icons
**Library**: Heroicons (via CDN)
- Upload: upload icon
- Processing: cog icon (animated rotation)
- Success: check-circle
- Audio: musical-note
- Code: code-bracket
- Copy: clipboard-document

## Images
**Hero Section**: No large hero image - this is a utility tool, jump straight to upload
**Supporting Graphics**: Optional abstract audio waveform background patterns (low opacity, decorative only)

## Animations
**Minimal Animation Strategy**:
- Progress bar: Smooth width transition
- Processing spinner: Rotate animation only during analysis
- Copy button: Brief scale + opacity feedback on click
- Card expand/collapse: Height transition (duration-300)
- NO scroll-triggered animations, NO hover animations beyond subtle state changes

## Accessibility
- All interactive elements: Clear focus states with focus-visible:ring-2
- Code blocks: High contrast text on dark backgrounds
- Copy buttons: Announce "Copied to clipboard" to screen readers
- File upload: Keyboard accessible with enter/space activation
- Processing states: aria-live regions for status updates

## Visual Hierarchy Priority
1. Upload zone (when no file) OR Results visualization (when complete)
2. Action buttons (context-dependent prominence)
3. Code output cards
4. Metadata/stats
5. Helper text and instructions