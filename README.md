# DrawAudio

An interactive audio sequencer where you can create music by drawing patterns on a grid. Built with Svelte and Web Audio API.

> **Note:** 
> This project requires technical improvements and may have bugs. Contributions and fixes are welcome through pull requests.


> **Inspiration:** This project is inspired by [draw.audio](https://draw.audio/)

## Features

- Visual sequencer with adjustable grid sizes (8×8, 16×16, 32×32, 64×64)
- Multiple waveform types (sine, sawtooth, triangle, square)
- Various playback patterns (forward, backward, bounce, random)
- Real-time audio effects:
  - Adjustable delay with feedback
  - Reverb with different impulse responses
  - Distortion
- Musical scale selection
- Interactive drawing interface with drag support

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Start the development server:

```bash
bun run dev
```

4. Open your browser to the displayed URL (usually http://localhost:5173)

## Building for Production

```bash
bun run build
```

You can preview the production build with `bun run preview`.

## Audio Impulse Responses

To generate custom impulse responses:

```bash
bun run generate-impulse
```

## Technical Overview

DrawAudio uses the Web Audio API to generate sounds in real-time based on the visual grid pattern. The main components:

- `AudioService`: Handles all audio processing, note generation, and effects
- Interactive grid UI built with Svelte
- Tailwind CSS for styling

## License

MIT
