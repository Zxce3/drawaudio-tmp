import pkg from 'wavefile';
const { WaveFile } = pkg;
import { writeFileSync } from 'fs';

// Utility function for creating filtered noise with a non-recursive implementation
function createFilteredNoise(sampleRate: number, cutoffFreq: number, resonance: number): Float32Array {
  const samples = new Float32Array(sampleRate);
  const bufferSize = 1024; // Process in smaller chunks to avoid stack overflow
  
  // Two-pole low-pass filter coefficients
  const w0 = 2 * Math.PI * cutoffFreq / sampleRate;
  const alpha = Math.sin(w0) / (2 * resonance);
  const cosw0 = Math.cos(w0);
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;

  let lastSample = 0;
  let lastLastSample = 0;

  // Process in chunks
  for (let offset = 0; offset < samples.length; offset += bufferSize) {
    const chunkSize = Math.min(bufferSize, samples.length - offset);
    
    for (let i = 0; i < chunkSize; i++) {
      const noise = Math.random() * 2 - 1;
      const sample = (b0 * noise + b1 * lastSample + b2 * lastLastSample - a1 * lastSample - a2 * lastLastSample) / a0;
      samples[offset + i] = sample;
      lastLastSample = lastSample;
      lastSample = sample;
    }
  }
  
  return samples;
}

// Generate guitar cabinet impulse response
function generateGuitarImpulse(sampleRate: number, duration: number): Float32Array {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples * 2);
  const bufferSize = 1024;
  
  const resonances = [
    { freq: 120, gain: 0.4 },
    { freq: 400, gain: 0.3 },
    { freq: 800, gain: 0.2 },
    { freq: 1200, gain: 0.15 },
    { freq: 2400, gain: 0.1 }
  ];
  
  const cabinetNoise = createFilteredNoise(numSamples, 2000, 0.7);
  
  // Process in chunks to avoid stack overflow
  for (let offset = 0; offset < numSamples * 2; offset += bufferSize * 2) {
    const chunkSize = Math.min(bufferSize * 2, numSamples * 2 - offset);
    
    for (let i = 0; i < chunkSize; i += 2) {
      const t = (offset + i) / (2 * sampleRate);
      let signal = 0;
      
      for (const { freq, gain } of resonances) {
        signal += Math.sin(2 * Math.PI * freq * t) * gain;
      }
      
      const attack = 1 - Math.exp(-50 * t);
      const decay = Math.exp(-12 * t);
      const envelope = attack * decay;
      
      signal = (signal * 0.7 + cabinetNoise[(offset + i) / 2] * 0.3) * envelope;
      
      samples[offset + i] = signal;
      samples[offset + i + 1] = signal * 0.95;
    }
  }
  
  return samples;
}

// Generate drum room impulse response
function generateDrumImpulse(sampleRate: number, duration: number): Float32Array {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples * 2);
  const bufferSize = 1024;
  
  const earlyReflections = [
    { delay: 0.008, gain: 0.7 },
    { delay: 0.013, gain: 0.6 },
    { delay: 0.019, gain: 0.5 },
    { delay: 0.024, gain: 0.4 },
    { delay: 0.031, gain: 0.35 },
    { delay: 0.037, gain: 0.3 }
  ];
  
  const diffuseNoise = createFilteredNoise(numSamples, 5000, 1.2);
  
  // Process in chunks
  for (let offset = 0; offset < numSamples * 2; offset += bufferSize * 2) {
    const chunkSize = Math.min(bufferSize * 2, numSamples * 2 - offset);
    
    for (let i = 0; i < chunkSize; i += 2) {
      const t = (offset + i) / (2 * sampleRate);
      let signal = 0;
      
      if (t < 0.002) {
        signal += Math.exp(-1000 * t);
      }
      
      for (const { delay, gain } of earlyReflections) {
        if (t >= delay) {
          signal += gain * Math.exp(-20 * (t - delay));
        }
      }
      
      const lateDiffusion = Math.exp(-3 * (t - 0.05)) * (t > 0.05 ? 1 : 0);
      signal += diffuseNoise[(offset + i) / 2] * lateDiffusion * 0.2;
      
      const roomEnvelope = Math.exp(-2 * t);
      signal *= roomEnvelope;
      
      const stereoSpread = Math.sin(t * 2.5);
      samples[offset + i] = signal * (1 + stereoSpread * 0.1);
      samples[offset + i + 1] = signal * (1 - stereoSpread * 0.1);
    }
  }
  
  return samples;
}

// Generate plate reverb
function generatePlateReverb(sampleRate: number, duration: number): Float32Array {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples * 2);
  const bufferSize = 1024;
  
  const metalResonances = [
    { freq: 200, gain: 0.3 },
    { freq: 400, gain: 0.4 },
    { freq: 800, gain: 0.5 },
    { freq: 1600, gain: 0.4 },
    { freq: 3200, gain: 0.2 }
  ];
  
  const plateNoise = createFilteredNoise(numSamples, 8000, 0.5);
  
  // Process in chunks
  for (let offset = 0; offset < numSamples * 2; offset += bufferSize * 2) {
    const chunkSize = Math.min(bufferSize * 2, numSamples * 2 - offset);
    
    for (let i = 0; i < chunkSize; i += 2) {
      const t = (offset + i) / (2 * sampleRate);
      let signal = 0;
      
      for (const { freq, gain } of metalResonances) {
        signal += Math.sin(2 * Math.PI * freq * t) * gain;
      }
      
      const initialDiffusion = Math.exp(-8000 * t) * Math.sin(2 * Math.PI * 1000 * t);
      const decay = Math.exp(-3 * t);
      
      signal = (signal * 0.3 + initialDiffusion * 0.4 + plateNoise[(offset + i) / 2] * 0.3) * decay;
      
      const modulation = Math.sin(2 * Math.PI * 2 * t) * 0.002;
      samples[offset + i] = signal * (1 + modulation);
      samples[offset + i + 1] = signal * (1 - modulation);
    }
  }
  
  return samples;
}

// Generate and save impulse responses
const sampleRate = 44100;
const duration = 3;

// Create and save WAV files
const impulses = {
  'guitar-cab': generateGuitarImpulse(sampleRate, 0.5),
  'drum-room': generateDrumImpulse(sampleRate, duration),
  'plate-reverb': generatePlateReverb(sampleRate, duration)
};

// Normalize and save files
for (const [name, samples] of Object.entries(impulses)) {
  // Find peak amplitude
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  
  // Normalize
  const normalizedSamples = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    normalizedSamples[i] = samples[i] / peak * 0.95;
  }
  
  // Save to file
  const wav = new WaveFile();
  wav.fromScratch(2, sampleRate, '32f', normalizedSamples);
  writeFileSync(`./static/impulse-${name}.wav`, wav.toBuffer());
}