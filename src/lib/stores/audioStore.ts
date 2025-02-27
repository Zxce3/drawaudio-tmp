import { writable } from 'svelte/store';
import type { AvailableScales } from '$lib/scales';

export interface AudioState {
  isPlaying: boolean;
  isInitialized: boolean;
  currentStep: number;
  tempo: number;
  waveform: OscillatorType;
  scale: AvailableScales;
  pattern: 'forward' | 'backward' | 'bounce' | 'random';
  impulseType: 'reverb' | 'guitar' | 'drum';
  effects: {
    delay: number;
    reverb: number;
    delayGain: number;
    distortion: number;
    impulseResponse: {
      type: 'reverb' | 'guitar' | 'drum';
      mix: number;
    };
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

const initialState: AudioState = {
  isPlaying: false,
  isInitialized: false,
  currentStep: 0,
  tempo: 120,
  waveform: 'sine',
  scale: 'Major',
  pattern: 'forward',
  impulseType: 'reverb',
  effects: {
    delay: 0,
    reverb: 10,
    delayGain: 0.3,
    distortion: 0,
    impulseResponse: {
      type: 'reverb',
      mix: 0.3
    }
  },
  envelope: {
    attack: 0.01,
    decay: 0.03,
    sustain: 0.5,
    release: 0.2
  }
};

export const audioStore = writable<AudioState>(initialState);
