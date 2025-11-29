<img width="1238" height="1422" alt="image" src="https://github.com/user-attachments/assets/4bc5cacf-07b0-4cd8-b3de-97a904d83471" />


# Audio to Strudel Converter

Transform audio files into Strudel live coding patterns. Extract melodies, detect chords, and generate ready-to-use notation for live algorithmic music performance.

## Features

### 🎵 Audio Analysis
- **Multi-format support**: MP3, WAV, OGG, FLAC, M4A audio files
- **Real-time pitch detection**: Autocorrelation-based algorithm for accurate melody extraction
- **Key detection**: Automatic harmonic key detection using Krumhansl-Schmuckler algorithm
- **Tempo estimation**: Intelligent BPM detection from audio onset strength

### 🎼 Pattern Generation
- **Strudel notation**: Generate ready-to-use Strudel code patterns
- **Melody extraction**: Continuous pitch tracking with note segmentation
- **Chord detection**: Harmonic analysis with chord progression generation
- **Duration awareness**: Preserve note timing and rhythm information

### ⚙️ Advanced Analysis
- **Adjustable parameters**:
  - Pitch sensitivity (0-100%)
  - Amplitude threshold
  - Minimum note duration
  - Quantization grid (none, 1/4, 1/8, 1/16, 1/32)
  - Time signature configuration
  - Octave range selection

### 🎹 Interactive Editing
- **Note editor**: Fine-tune detected notes and chords
- **Pattern preview**: Web Audio synthesis playback with melody/chords/combined modes
- **Piano roll visualization**: Visual representation of note timing
- **Waveform display**: Real-time audio waveform rendering

### 📤 Export Options
- **MIDI export**: Standard MIDI files (Type 1, 480 PPQ)
- **Strudel code**: Copy-paste ready patterns
- **Batch processing**: Process up to 10 audio files simultaneously
- **Pause/resume**: Sequential processing with progress tracking

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/yksanjo/audio2strudel.git
cd audio2strudel
npm install
```

### Development

```bash
npm run dev
```

The application will start on `http://localhost:5000`

### Production Build

```bash
npm run build
```

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling framework
- **Radix UI / shadcn** - Component library
- **React Query** - Data fetching & state management
- **Web Audio API** - Audio processing & synthesis
- **Wouter** - Lightweight routing

### Backend
- **Express.js** - Web server
- **PostgreSQL** - Database (optional)
- **Drizzle ORM** - Type-safe database access

### Audio Processing
- Web Audio API for:
  - Audio decoding
  - Pitch detection via autocorrelation
  - FFT analysis
  - Synthesis for playback

## How It Works

### 1. Upload Audio
Select an audio file (MP3, WAV, OGG, FLAC, M4A) to analyze.

### 2. Analysis
The application performs:
- Waveform normalization
- Frame-by-frame pitch detection
- Key and tempo detection
- Chord progression analysis

### 3. Fine-tuning
Adjust analysis parameters or manually edit detected notes and chords in the editor.

### 4. Preview & Export
- Play back the generated patterns with Web Audio synthesis
- Export as Strudel code to copy into your live coding environment
- Export as MIDI for use in DAWs or other applications

### 5. Batch Processing
Upload multiple files (up to 10) and process them sequentially with consistent parameters.

## Audio Analysis Details

### Pitch Detection
Uses autocorrelation algorithm on audio frames:
1. Extract frame of audio data (4096 samples)
2. Calculate autocorrelation for multiple lag periods
3. Find period with highest correlation
4. Convert period to frequency and then to note

### Key Detection
Implements Krumhansl-Schmuckler key finding algorithm:
1. Build pitch class histogram from detected notes
2. Compare against major and minor key profiles
3. Find best matching key through correlation

### Tempo Estimation
Energy-based beat tracking:
1. Calculate frame-by-frame energy envelope
2. Detect onsets from energy increases
3. Find BPM that best aligns with detected onsets

## Strudel Output Format

### Melody Pattern
```
note("c4 e4 g4*2 e4").sound("piano")
```

### Chord Pattern
```
note("[c4,e4,g4] [d4,f4,a4]*2").sound("piano")
```

### Combined Stack
```
stack(
  note("c4 e4 g4 e4").sound("piano"),
  note("[c4,e4,g4] [d4,f4,a4]").sound("piano")
).cpm(30)
```

## Duration Notation
- `c4` = 1 beat (quarter note)
- `c4*0.5` = half a beat (eighth note)
- `c4*2` = 2 beats (half note)
- `c4*4` = 4 beats (whole note)

## Keyboard Shortcuts
- `⌘/Ctrl + Z` - Undo note edits
- `⌘/Ctrl + Y` - Redo note edits

## Known Limitations

- Monophonic audio detection (single melodic line)
- Drum/percussion not analyzed
- Requires relatively clean/isolated audio for best results
- Maximum 64 notes per analysis for performance

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Pitch detection algorithm inspired by academic research on autocorrelation-based pitch tracking
- Key detection based on Krumhansl-Schmuckler key finding algorithm
- UI designed with Strudel live coding community in mind
- Built with React, TailwindCSS, and shadcn/ui

## Strudel Community

Learn more about Strudel: https://strudel.cycles/

## Contact

Questions or feedback? Open an issue on GitHub or reach out to the community.

---

**Made with ♪ for live coders and musicians**
