let tempo = 120;
let isPlaying = false;
let lastStepTime = 0;

function scheduleNextStep() {
  if (!isPlaying) return;

  const now = performance.now();
  if (!lastStepTime) lastStepTime = now;

  // Send message to trigger next step
  postMessage({ type: 'playStep' });

  // Calculate next step time based on tempo
  const stepInterval = (60000 / tempo) / 4; // sixteenth notes
  lastStepTime += stepInterval;
  
  // Schedule next step with timing correction
  let nextStepDelay = lastStepTime - now;
  nextStepDelay = Math.max(nextStepDelay, 10); // Minimum delay of 10ms
  
  setTimeout(scheduleNextStep, nextStepDelay);
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'startPlayback':
      if (!isPlaying) {
        isPlaying = true;
        tempo = payload?.bpm || tempo;
        lastStepTime = 0;
        scheduleNextStep();
      }
      break;
      
    case 'stopPlayback':
      isPlaying = false;
      lastStepTime = 0;
      break;
      
    case 'setTempo':
      tempo = payload;
      // Reset timing if playing to maintain sync
      if (isPlaying) {
        lastStepTime = 0;
      }
      break;
  }
};

// Error handling
self.onerror = (error) => {
  console.error('Worker error:', error);
  postMessage({ type: 'error', payload: error.message });
};
