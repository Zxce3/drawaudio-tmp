type NoteName = 'C' | 'Cs' | 'D' | 'Ds' | 'E' | 'F' | 'Fs' | 'G' | 'Gs' | 'A' | 'As' | 'B';
type Octave = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type FrequencyMap = Record<NoteName, number[]>;
type ScaleMap = Record<string, NoteName[]>;

// Base frequencies for each note (C2 to C7)
const BASE_FREQUENCIES: FrequencyMap = {
  C: [65.41, 130.81, 261.63, 523.25, 1046.5],
  Cs: [69.30, 138.59, 277.18, 554.37, 1108.73],
  D: [73.42, 146.83, 293.66, 587.33, 1174.66],
  Ds: [77.78, 155.56, 311.13, 622.25, 1244.51],
  E: [82.41, 164.81, 329.63, 659.26, 1318.51],
  F: [87.31, 174.61, 349.23, 698.46, 1396.91],
  Fs: [92.50, 185.00, 369.99, 739.99, 1479.98],
  G: [98.00, 196.00, 392.00, 783.99, 1567.98],
  Gs: [103.83, 207.65, 415.30, 830.61, 1661.22],
  A: [110.00, 220.00, 440.00, 880.00, 1760.00],
  As: [116.54, 233.08, 466.16, 932.33, 1864.66],
  B: [123.47, 246.94, 493.88, 987.77, 1975.53]
};

export const SCALES: ScaleMap = {
  // Basic Scales
  Major: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  Minor: ['C', 'D', 'Ds', 'F', 'G', 'Gs', 'As'],
  Pentatonic: ['C', 'D', 'E', 'G', 'A'],
  Blues: ['C', 'Ds', 'F', 'Fs', 'G', 'As'],
  Chromatic: ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'],
  
  // Jazz Scales
  Dorian: ['C', 'D', 'Ds', 'F', 'G', 'A', 'As'],
  Mixolydian: ['C', 'D', 'E', 'F', 'G', 'A', 'As'],
  Bebop: ['C', 'D', 'E', 'F', 'G', 'A', 'As', 'B'],
  
  // World Music Scales
  HarmonicMinor: ['C', 'D', 'Ds', 'F', 'G', 'Gs', 'B'],
  // Reggae commonly uses minor scales and pentatonic variations
  ReggaeMinor: ['C', 'D', 'Ds', 'F', 'G', 'Gs', 'As'],
  // Common in Middle Eastern music
  Phrygian: ['C', 'Cs', 'Ds', 'F', 'G', 'Gs', 'As'],
  
  // Modal Scales
  Lydian: ['C', 'D', 'E', 'Fs', 'G', 'A', 'B'],
  Locrian: ['C', 'Cs', 'Ds', 'F', 'Fs', 'Gs', 'As'],
  
  // Additional Pentatonic Variations
  MinorPentatonic: ['C', 'Ds', 'F', 'G', 'As'],
  // Common in traditional Asian music
  Japanese: ['C', 'Cs', 'F', 'G', 'Gs'],
  
  // Contemporary Scales
  WholeTone: ['C', 'D', 'E', 'Fs', 'Gs', 'As'],
  Diminished: ['C', 'D', 'Ds', 'F', 'Fs', 'Gs', 'A', 'B'],
  // Common in electronic and modern music
  Altered: ['C', 'Cs', 'Ds', 'E', 'Fs', 'Gs', 'As']
} as const;

export function getFrequency(note: NoteName, octave: number): number {
  const frequencies = BASE_FREQUENCIES[note];
  const index = Math.min(Math.max(octave, 0), frequencies.length - 1);
  return frequencies[index];
}

export function getScaleFrequencies(scale: keyof typeof SCALES, octave: number): number[] {
  const scaleNotes = SCALES[scale];
  const baseFreq = 261.63; // Middle C (C4)
  const chromaticRatios = {
    'C': 1,
    'Cs': 1.059463,
    'D': 1.122462,
    'Ds': 1.189207,
    'E': 1.259921,
    'F': 1.334840,
    'Fs': 1.414214,
    'G': 1.498307,
    'Gs': 1.587401,
    'A': 1.681793,
    'As': 1.781797,
    'B': 1.887749
  };

  // Calculate octave shift
  const octaveShift = Math.pow(2, octave - 4);

  return scaleNotes.map(note => {
    const ratio = chromaticRatios[note as keyof typeof chromaticRatios];
    return baseFreq * ratio * octaveShift;
  });
}

// Helper type to get array of available scales
export type AvailableScales = keyof typeof SCALES;
