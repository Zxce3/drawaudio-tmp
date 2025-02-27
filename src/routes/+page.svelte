<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { AudioService } from '$lib/audio';
  import { SCALES } from '$lib/scales';
  
  type EffectParam = "delayTime" | "reverbMix" | "delayFeedback" | "distortion";

  let audioService: AudioService;
  let matrix: boolean[][] = [];
  let matrixSize = 8; // Changed default to 8
  let isAudioInitialized = false;
  let isPlaying = false;
  let activeColumn = 0;
  let unsubscribe: (() => void) | null = null;

  // UI state variables
  let waveform: OscillatorType = 'sine';
  let gridSize = 8; // Changed default to 8
  let tempo = 80;
  let delay = 0.3;
  let reverb = 0.3;
  let delayGain = 0.3;
  let distortion = 0;
  let playbackPattern: 'forward' | 'backward' | 'bounce' | 'random' = 'forward';

  // Add new state
  let currentScale = 'Major';
  let scaleOptions = Object.keys(SCALES);

  let impulseType: 'reverb' | 'guitar' | 'drum' = 'reverb';


  // Add event options

  let isDragging = false;
  let lastDragPosition: { row: number; col: number } | null = null;

  onMount(() => {
    initMatrix();
    audioService = new AudioService(matrixSize);
    
    // Register step change callback
    if (audioService) {
      unsubscribe = audioService.onStepChange((step) => {
        activeColumn = step;
      });
    }
  });

  onDestroy(() => {
    unsubscribe?.();
    audioService?.cleanup();
  });

  function initMatrix() {
    matrix = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(false));
  }

  async function initAudio() {
    if (!isAudioInitialized) {
      await audioService.initialize();
      isAudioInitialized = true;
    }
  }

  async function changeGridSize(newSize: number) {
    matrixSize = newSize;
    gridSize = newSize;
    
    if (audioService) {
      const wasPlaying = audioService.isSequencePlaying();
      audioService.resizeMatrix(newSize);
      
      // Update matrix after resize
      initMatrix();
      updateMatrix();
      
      if (wasPlaying) {
        await audioService.startSequence();
        isPlaying = true;
      }
    }
  }

  function handleDragStart(event: MouseEvent | TouchEvent, row: number, col: number) {
    isDragging = true;
    lastDragPosition = { row, col };
    const currentValue = !matrix[row][col];
    
    toggleCell(row, col, currentValue);
    event.preventDefault();
  }

  function handleDrag(event: MouseEvent | TouchEvent) {
    if (!isDragging) return;

    const gridElement = document.getElementById('matrix');
    if (!gridElement) return;

    const rect = gridElement.getBoundingClientRect();
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    const col = Math.floor((clientX - rect.left) / (rect.width / matrixSize));
    const row = Math.floor((clientY - rect.top) / (rect.height / matrixSize));

    // Only update if we've moved to a new cell and it's within bounds
    if (row >= 0 && row < matrixSize && col >= 0 && col < matrixSize &&
        (lastDragPosition?.row !== row || lastDragPosition?.col !== col)) {
      toggleCell(row, col, matrix[lastDragPosition?.row ?? 0][lastDragPosition?.col ?? 0]);
      lastDragPosition = { row, col };
    }
  }

  function handleDragEnd() {
    isDragging = false;
    lastDragPosition = null;
  }

  function toggleCell(row: number, col: number, forceState?: boolean) {
    if (row < 0 || row >= matrixSize || col < 0 || col >= matrixSize) return;

    const newValue = forceState ?? !matrix[row][col];
    matrix[row][col] = newValue;
    
    if (isAudioInitialized) {
      updateMatrix();
      if (newValue) {
        audioService.updateSound(col, row);
      }
    }
  }

  function updateWaveform(type: OscillatorType) {
    waveform = type;
    if (isAudioInitialized) {
      audioService.setWaveform(type);
    }
  }

  function clearMatrix() {
    matrix = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(false));
    if (isAudioInitialized) {
      audioService.stopSound();
    }
  }

  async function togglePlayback() {
    if (!isAudioInitialized) {
      await initAudio();
    }
    
    try {
      if (isPlaying) {
        audioService.stopSequence();
        isPlaying = false;
        activeColumn = -1; // Reset active column
      } else {
        await audioService.startSequence();
        isPlaying = true;
      }
    } catch (error) {
      console.error('Playback error:', error);
      isPlaying = false;
      activeColumn = -1; // Reset active column on error
    }
  }

  function updateMatrix() {
    if (!audioService) return;
    const currentMatrix = matrix.map(row => row.map(cell => Boolean(cell)));
    audioService.setMatrix(currentMatrix);
  }

  function setPattern(pattern: 'forward' | 'backward' | 'bounce' | 'random') {
    playbackPattern = pattern;
    audioService?.setPlaybackPattern(pattern);
  }

  async function updateScale(scale: string) {
    currentScale = scale;
    if (audioService && isAudioInitialized) {
      audioService.setScale(scale);
      // Update matrix to trigger new frequencies
      updateMatrix();
    }
  }

  function updateImpulse(type: 'reverb' | 'guitar' | 'drum') {
    impulseType = type;
    if (isAudioInitialized) {
      audioService.setImpulseType(type);
    }
  }

  function getGridCellClasses(rowIndex: number, colIndex: number, cell: boolean): string {
    return [
      'gridButton',
      cell ? 'bg-blue-500' : 'bg-white hover:bg-blue-100',
      colIndex === activeColumn && isPlaying ? 'trigger-line' : '',
      audioService?.isNotePlaying(rowIndex, colIndex) ? 'playing-note' : '',
      audioService?.getActiveNotesInColumn(colIndex)?.includes(rowIndex) ? 'active-note' : ''
    ].filter(Boolean).join(' ');
  }

  function updateEffect(param: EffectParam, value: number) {
    if (isAudioInitialized) {
      audioService.setParameter(param, value);
    }
  }

  $: if (matrix && audioService && isAudioInitialized) {
    updateMatrix();
  }

  $: if (tempo && audioService && isAudioInitialized) {
    audioService.setBpm(tempo);
  }

  $: {
    if (audioService?.isSequencePlaying()) {
      activeColumn = audioService.getCurrentStep();
    }
  }

  const patterns = [
    { id: 'forward', icon: '→', label: 'Forward' },
    { id: 'backward', icon: '←', label: 'Backward' },
    { id: 'bounce', icon: '↔', label: 'Bounce' },
    { id: 'random', icon: '⟳', label: 'Random' }
  ];

  const effectControls = [
    {id: 'delayTime' as EffectParam, label: 'Delay Time', value: delay, min: 0, max: 1, step: 0.01},
    {id: 'reverbMix' as EffectParam, label: 'Reverb Mix', value: reverb, min: 0, max: 1, step: 0.01},
    {id: 'delayFeedback' as EffectParam, label: 'Delay Feedback', value: delayGain, min: 0, max: 0.9, step: 0.01},
    {id: 'distortion' as EffectParam, label: 'Distortion', value: distortion, min: 0, max: 50, step: 1}
  ];
</script>

<main class="min-h-screen bg-gray-100">
  <div id="pageContainer" class="container mx-auto p-4">
    <!-- Main Layout Grid -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Left Column: Matrix Grid -->
      <div class="space-y-4">
        <!-- Top Controls -->
        <div class="flex flex-wrap gap-4">
          <button 
            class="px-4 py-2 {isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition-colors"
            on:click={togglePlayback}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <button 
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            on:click={clearMatrix}
          >
            Clear Pattern
          </button>
          <select 
            class="px-3 py-2 border border-gray-300 rounded bg-white"
            bind:value={gridSize}
            on:change={() => changeGridSize(gridSize)}
          >
            <option value={8}>8x8</option>
            <option value={16}>16x16</option>
            <option value={32}>32x32</option>
            <option value={64}>64x64</option>
          </select>
        </div>

        <!-- Matrix Grid -->
        <div class="aspect-square w-full overflow-hidden border border-gray-300 bg-white rounded-lg shadow-md">
          <div 
            id="matrix" 
            class="grid w-full h-full select-none"
            style="grid-template-columns: repeat({matrixSize}, 1fr); grid-auto-rows: 1fr;"
            on:mousemove={handleDrag}
            on:mouseup={handleDragEnd}
            on:mouseleave={handleDragEnd}
            on:touchmove|preventDefault={handleDrag}
            on:touchend={handleDragEnd}
            on:touchcancel={handleDragEnd}
          >
            {#each matrix as row, rowIndex}
              {#each row as cell, colIndex}
                <button
                  class={getGridCellClasses(rowIndex, colIndex, cell)}
                  data-row={rowIndex}
                  data-col={colIndex}
                  on:mousedown={(e) => handleDragStart(e, rowIndex, colIndex)}
                  on:touchstart|preventDefault={(e) => handleDragStart(e, rowIndex, colIndex)}
                />
              {/each}
            {/each}
          </div>
        </div>

        <!-- Stats under grid -->
        <div class="text-sm text-gray-600">
          Active Notes: {audioService ? audioService.getActiveNotesCount() : 0}
        </div>
      </div>

      <!-- Right Column: Controls -->
      <div class="space-y-6">
        <!-- Controls Section -->
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Controls</h3>
          </div>
          <div class="space-y-4">
            <!-- Waveform Controls -->
            <div class="grid grid-cols-4 gap-2">
              {#each ['sine', 'sawtooth', 'triangle', 'square'] as type}
                <button 
                  class="aspect-square border rounded-md cursor-pointer transition-colors
                         {waveform === type ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}"
                  on:click={() => updateWaveform(type as OscillatorType)}
                  aria-label={`Set waveform to ${type}`}
                >{type}</button>
              {/each}
            </div>

            <!-- Rest of controls... -->
            <div class="space-y-2">
              <div class="flex justify-between">
                <label for="tempoSlider" class="text-sm text-gray-600">Tempo:</label>
                <span class="text-sm text-gray-600">{tempo} bpm</span>
              </div>
              <input 
                type="range" 
                id="tempoSlider"
                class="w-full"
                bind:value={tempo}
                min="40"
                max="200"
                step="1"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm text-gray-600">Scale:</label>
              <select 
                class="w-full px-3 py-2 border border-gray-300 rounded"
                bind:value={currentScale}
                on:change={() => updateScale(currentScale)}
              >
                {#each scaleOptions as scale}
                  <option value={scale}>{scale}</option>
                {/each}
              </select>
            </div>

            <!-- Add Pattern Controls -->
            <div class="space-y-2">
              <label class="text-sm text-gray-600">Pattern:</label>
              <div class="grid grid-cols-4 gap-2">
                {#each patterns as { id, icon, label }}
                  <button
                    class="px-4 py-2 border rounded-md transition-colors aspect-square flex items-center justify-center text-xl
                           {playbackPattern === id ? 'bg-blue-500 text-white' : 'bg-white hover:bg-blue-100'}"
                    on:click={() => setPattern(id as typeof playbackPattern)}
                    aria-label={label}
                  >
                    {icon}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <!-- Effects Section -->
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Effects</h3>
          </div>
          <div class="space-y-4">
            {#each effectControls as param}
              <div class="space-y-2">
                <div class="flex justify-between">
                  <label class="text-sm text-gray-600">{param.label}:</label>
                  <span class="text-sm text-gray-600">{param.value.toFixed(2)}</span>
                </div>
                <input 
                  type="range"
                  class="w-full"
                  value={param.value}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  on:input={(e) => {
                    const value = parseFloat(e.currentTarget.value);
                    switch(param.id) {
                      case 'delayTime': delay = value; break;
                      case 'reverbMix': reverb = value; break;
                      case 'delayFeedback': delayGain = value; break;
                      case 'distortion': distortion = value; break;
                    }
                    updateEffect(param.id, value);
                  }}
                />
              </div>
            {/each}
            <div class="space-y-2">
              <label class="text-sm text-gray-600">Impulse Response:</label>
              <div class="grid grid-cols-3 gap-2">
                {#each ['reverb', 'guitar', 'drum'] as type}
                  <button
                    class="px-3 py-2 border rounded-md transition-colors
                           {impulseType === type ? 'bg-blue-500 text-white' : 'bg-white hover:bg-blue-100'}"
                    on:click={() => updateImpulse(type as 'reverb' | 'guitar' | 'drum')}
                  >
                    {type}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  .gridButton {
    border: 0.5px solid rgb(0, 0, 0);
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    touch-action: none; /* Prevent scrolling on touch devices */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    transition: all 0.1s ease;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .animate-pulse {
    animation: pulse 0.5s ease-in-out infinite;
  }

  .trigger-line {
    position: relative;
  }

  .trigger-line::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(234, 179, 8, 0.15);
    border-left: 2px solid rgba(234, 179, 8, 0.6);
    border-right: 2px solid rgba(234, 179, 8, 0.6);
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.1s ease;
  }

  .playing-note {
    animation: playPulse 0.2s ease-in-out infinite;
    background-color: rgb(34, 197, 94) !important; /* Green */
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  }

  @keyframes playPulse {
    0% {
      transform: scale(0.95);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.05);
      opacity: 1;
    }
    100% {
      transform: scale(0.95);
      opacity: 0.8;
    }
  }

  .active-note {
    border: 2px solid rgb(144, 187, 255);
  }

  @media (max-width: 1024px) {
    #pageContainer {
      max-width: 100%;
      padding: 1rem;
    }
  }

  @media (min-width: 1024px) {
    #pageContainer {
      max-width: 1280px;
      padding: 2rem;
    }
  }

</style>
