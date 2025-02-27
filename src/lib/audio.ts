import { getScaleFrequencies } from './scales';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGainNode: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private reverbGainNode: GainNode | null = null;
  private isInitialized = false;
  private bpm = 120;
  private stepInterval: number | null = null;
  private currentStep = 0;
  private isPlaying = false;
  private matrix: boolean[][] = [];
  private playbackPatterns = {
    forward: (step: number) => (step + 1) % this.matrixSize,
    backward: (step: number) => (step - 1 + this.matrixSize) % this.matrixSize,
    bounce: (step: number) => {
      if (this.isReverse) {
        if (step <= 0) {
          this.isReverse = false;
          return 1;
        }
        return step - 1;
      } else {
        if (step >= this.matrixSize - 1) {
          this.isReverse = true;
          return step - 1;
        }
        return step + 1;
      }
    },
    random: () => Math.floor(Math.random() * this.matrixSize)
  };

  private currentPattern: keyof typeof this.playbackPatterns = 'forward';
  private isReverse = false;

  // Audio parameters with defaults
  private params = {
    attack: 0.05,    // Increased attack time
    decay: 0.2,      // Increased decay time
    sustain: 0.7,    // Increased sustain level
    release: 0.3,    // Increased release time
    delayTime: 0.3,
    delayFeedback: 0.3,
    reverbMix: 0.3,
    filterCutoff: 2000,  // Lower cutoff frequency
    filterResonance: 2,  // Increased resonance
    distortion: 0,
    waveform: 'sine' as OscillatorType
  };

  private activeNotes: Set<number> = new Set();
  private notesInColumn: Map<number, number[]> = new Map();
  private currentScale = 'Major';
  private currentOctave = 4;
  private worker: Worker | null = null;
  private activePlayingNotes: Set<string> = new Set(); // Format: "row,col"
  private previousStep: number = -1;
  private playStepCallbacks: Set<(step: number) => void> = new Set();
  private scaleFrequencies: number[] = [];
  private impulseResponses: Map<string, AudioBuffer> = new Map();

  constructor(private matrixSize: number = 64) {
    this.createWorker();
  }

  private createWorker(): void {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'playStep') {
        this.playCurrentStep();
      }
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new AudioContext();
      await this.setupNodes();
      await this.loadImpulseResponse();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }

  private async setupNodes(): Promise<void> {
    if (!this.audioContext) return;

    // Create main nodes
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();
    this.filterNode = this.audioContext.createBiquadFilter();
    this.delayNode = this.audioContext.createDelay(2.0);
    this.delayGainNode = this.audioContext.createGain();
    this.convolverNode = this.audioContext.createConvolver();
    this.reverbGainNode = this.audioContext.createGain();

    // Configure nodes
    this.oscillator.type = this.params.waveform;
    this.gainNode.gain.value = 0;
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = this.params.filterCutoff;
    this.filterNode.Q.value = this.params.filterResonance;
    this.delayNode.delayTime.value = this.params.delayTime;
    this.delayGainNode.gain.value = this.params.delayFeedback;
    this.reverbGainNode.gain.value = this.params.reverbMix;

    // Connect nodes
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.filterNode);
    this.filterNode.connect(this.audioContext.destination);
    this.filterNode.connect(this.delayNode);
    this.delayNode.connect(this.delayGainNode);
    this.delayGainNode.connect(this.delayNode);
    this.delayGainNode.connect(this.audioContext.destination);
    this.filterNode.connect(this.convolverNode);
    this.convolverNode.connect(this.reverbGainNode);
    this.reverbGainNode.connect(this.audioContext.destination);

    // Start oscillator
    this.oscillator.start();
  }

  private async loadImpulseResponse(): Promise<void> {
    if (!this.audioContext || !this.convolverNode) return;

    const impulseTypes = ['plate-reverb', 'guitar-cab', 'drum-room'];
    
    try {
      for (const type of impulseTypes) {
        const response = await fetch(`/impulse-${type}.wav`);
        if (!response.ok) {
          throw new Error(`Impulse response ${type} not found`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.impulseResponses.set(type, audioBuffer);
      }
      
      // Set default impulse
      this.convolverNode.buffer = this.impulseResponses.get('reverb') || null;
    } catch (error) {
      console.warn('Using fallback impulse response:', error);
      const sampleRate = this.audioContext.sampleRate;
      const length = 2 * sampleRate; // 2 seconds
      const impulse = this.audioContext.createBuffer(2, length, sampleRate);
      
      // Generate simple exponential decay noise
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          channelData[i] = (Math.random() * 2 - 1) * Math.exp(-4 * t);
        }
      }
      
      this.convolverNode.buffer = impulse;
    }
  }

  private sendWorkerMessage(type: string, payload?: any): void {
    if (this.worker) {
      this.worker.postMessage({ type, payload });
    }
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    this.sendWorkerMessage('setTempo', bpm);
  }

  setMatrix(matrix: boolean[][]): void {
    this.matrix = matrix;
    this.scanGrid();
  }

  setPlaybackPattern(pattern: keyof typeof this.playbackPatterns) {
    this.currentPattern = pattern;
    if (this.isPlaying) {
      this.stopSequence();
      this.startSequence();
    }
  }

  async startSequence(): Promise<void> {
    if (!this.audioContext) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.isReverse = false;

    // Set initial state before starting worker
    await this.audioContext.resume();
    
    // Start the worker
    this.sendWorkerMessage('startPlayback', { 
      bpm: this.bpm,
      currentPattern: this.currentPattern
    });
  }

  stopSequence(): void {
    this.sendWorkerMessage('stopPlayback');
    this.isPlaying = false;
    this.stopSound();
  }

  private playStep(step: number, time: number): void {
    const activeRows = this.notesInColumn.get(step);
    if (!activeRows) return;

    for (const row of activeRows) {
      const frequency = this.getFrequency(step, row);
      const volume = this.getVolume(row);
      this.triggerNote(frequency, volume, time);
    }
  }

  private playCurrentStep(): void {
    if (!this.audioContext || !this.isPlaying) return;

    // Clear previous playing notes
    this.activePlayingNotes.clear();

    // Play all active cells in current column
    const activeRows = this.notesInColumn.get(this.currentStep);
    if (activeRows) {
      const now = this.audioContext.currentTime;
      activeRows.forEach(row => {
        const frequency = this.getFrequency(this.currentStep, row);
        const volume = this.getVolume(row);
        this.triggerNote(frequency, volume, now);
        this.activePlayingNotes.add(`${row},${this.currentStep}`);
      });
    }

    // Notify UI of step change
    this.notifyStepChange();
    
    // Update step based on pattern
    this.currentStep = this.playbackPatterns[this.currentPattern](this.currentStep);
  }

  private triggerNote(frequency: number, volume: number, time: number): void {
    if (!this.audioContext || !this.gainNode || !this.oscillator) return;

    const now = time;
    const attackTime = now + this.params.attack;
    const decayTime = attackTime + this.params.decay;
    const releaseTime = decayTime + this.params.release;

    // Create nodes for this note
    const noteOscillator = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();
    const noteLowPass = this.audioContext.createBiquadFilter();
    
    // Configure filter
    noteLowPass.type = 'lowpass';
    noteLowPass.frequency.value = this.params.filterCutoff;
    noteLowPass.Q.value = this.params.filterResonance;

    // Configure oscillator
    noteOscillator.type = this.params.waveform;
    noteOscillator.frequency.setValueAtTime(frequency, now);
    
    // Smooth frequency changes
    noteOscillator.frequency.setTargetAtTime(frequency, now, 0.03);

    // Connect nodes
    noteOscillator.connect(noteGain);
    noteGain.connect(noteLowPass);
    noteLowPass.connect(this.filterNode!);

    // Smoother envelope
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(volume * 0.8, attackTime); // Reduced peak volume
    noteGain.gain.linearRampToValueAtTime(volume * this.params.sustain, decayTime);
    noteGain.gain.linearRampToValueAtTime(0, releaseTime);

    // Start and stop
    noteOscillator.start(now);
    noteOscillator.stop(releaseTime + 0.1);

    // Cleanup
    setTimeout(() => {
      noteOscillator.disconnect();
      noteGain.disconnect();
      noteLowPass.disconnect();
    }, (releaseTime - now + 0.2) * 1000);
  }

  // Add method to get current step for UI highlighting
  getCurrentStep(): number {
    return this.currentStep;
  }

  // Add method to check if sequence is playing
  isSequencePlaying(): boolean {
    return this.isPlaying;
  }

  updateSound(x: number, y: number): void {
    if (!this.isInitialized || !this.audioContext || !this.oscillator || !this.gainNode) return;

    const frequency = this.getFrequency(x, y);
    const volume = this.getVolume(y);

    // Apply ADSR envelope
    const now = this.audioContext.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(volume, now + this.params.attack);
    this.gainNode.gain.linearRampToValueAtTime(volume * this.params.sustain, now + this.params.attack + this.params.decay);
    this.gainNode.gain.linearRampToValueAtTime(0, now + this.params.attack + this.params.decay + this.params.release);

    this.oscillator.frequency.setTargetAtTime(frequency, now, 0.003);
  }

  private getFrequency(x: number, y: number): number {
    // Get note from scale based on y position
    const scaleLength = this.scaleFrequencies.length;
    if (scaleLength === 0) {
      // Fallback to chromatic scale if no scale is set
      const minFreq = 65.41; // C2
      const maxFreq = 1046.50; // C6
      return minFreq * Math.pow(2, (y / this.matrixSize) * 4);
    }

    // Map y position to scale index
    const octaveSize = scaleLength;
    const octave = Math.floor(y / octaveSize);
    const noteIndex = y % octaveSize;
    const baseFreq = this.scaleFrequencies[noteIndex];

    // Shift octaves
    return baseFreq * Math.pow(2, octave);
  }

  private getVolume(y: number): number {
    return 1 - (y / this.matrixSize);
  }

  setWaveform(type: OscillatorType): void {
    if (!this.oscillator) return;
    this.params.waveform = type;
    this.oscillator.type = type;
  }

  stopSound(): void {
    if (!this.gainNode) return;
    this.gainNode.gain.value = 0;
  }

  setParameter(param: keyof typeof this.params, value: number | OscillatorType): void {
    if (param in this.params) {
      (this.params[param] as any) = value;
      this.updateParameter(param, value as number);
    }
  }

  private updateParameter(param: string, value: number): void {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;
    
    switch (param) {
      case 'filterCutoff':
        this.filterNode?.frequency.setTargetAtTime(value, time, 0.1);
        break;
      case 'filterResonance':
        this.filterNode?.Q.setTargetAtTime(value, time, 0.1);
        break;
      case 'delayTime':
        this.delayNode?.delayTime.setTargetAtTime(value, time, 0.1);
        break;
      case 'delayFeedback':
        this.delayGainNode?.gain.setTargetAtTime(value, time, 0.1);
        break;
      case 'reverbMix':
        this.reverbGainNode?.gain.setTargetAtTime(value, time, 0.1);
        break;
      case 'distortion':
        // Add distortion effect when implemented
        break;
    }
  }

  private terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  cleanup(): void {
    this.terminateWorker();
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }

  private scanGrid(): void {
    this.activeNotes.clear();
    this.notesInColumn.clear();

    for (let col = 0; col < this.matrixSize; col++) {
      const activeInColumn: number[] = [];
      
      for (let row = 0; row < this.matrixSize; row++) {
        if (this.matrix[row][col]) {
          const noteIndex = row * this.matrixSize + col;
          this.activeNotes.add(noteIndex);
          activeInColumn.push(row);
        }
      }
      
      if (activeInColumn.length > 0) {
        this.notesInColumn.set(col, activeInColumn);
      }
    }
  }

  getActiveNotesCount(): number {
    return this.activeNotes.size;
  }

  getActiveNotesInColumn(column: number): number[] {
    return this.notesInColumn.get(column) || [];
  }

  setScale(scale: string): void {
    this.currentScale = scale;
    this.updateFrequencyMap();
  }

  private updateFrequencyMap(): void {
    // Get base frequencies for the selected scale
    this.scaleFrequencies = getScaleFrequencies(this.currentScale, this.currentOctave);
    
    // Update all active notes with new frequencies if playing
    if (this.isPlaying) {
      const activeRows = this.notesInColumn.get(this.currentStep);
      if (activeRows && this.audioContext) {
        const now = this.audioContext.currentTime;
        activeRows.forEach(row => {
          const frequency = this.getFrequency(this.currentStep, row);
          const volume = this.getVolume(row);
          this.triggerNote(frequency, volume, now);
        });
      }
    }
  }

  isNotePlaying(row: number, col: number): boolean {
    return (
      this.activePlayingNotes.has(`${row},${col}`) || 
      (this.isPlaying && col === this.currentStep)
    );
  }

  isColumnActive(col: number): boolean {
    return this.currentStep === col;
  }

  // Add method to register step callback
  onStepChange(callback: (step: number) => void) {
    this.playStepCallbacks.add(callback);
    return () => this.playStepCallbacks.delete(callback);
  }

  private notifyStepChange() {
    this.playStepCallbacks.forEach(callback => callback(this.currentStep));
  }

  resizeMatrix(newSize: number): void {
    this.matrixSize = newSize;
    this.matrix = Array(newSize).fill(0).map(() => Array(newSize).fill(false));
    this.scanGrid();
    this.currentStep = 0;
    this.activePlayingNotes.clear();

    // Recreate worker to ensure clean state
    this.terminateWorker();
    this.createWorker();
  }

  setImpulseType(type: 'reverb' | 'guitar' | 'drum'): void {
    if (this.convolverNode && this.impulseResponses.has(type)) {
      this.convolverNode.buffer = this.impulseResponses.get(type) || null;
    }
  }
}
