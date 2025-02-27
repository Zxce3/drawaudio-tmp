import { writable, derived } from 'svelte/store';

export interface GridState {
  matrix: boolean[][];
  size: number;
  activeNotes: Set<number>;
  notesInColumn: Map<number, number[]>;
  activeImpulse: 'reverb' | 'guitar' | 'drum';
}

const initialState: GridState = {
  matrix: Array(64).fill(0).map(() => Array(64).fill(false)),
  size: 64,
  activeNotes: new Set(),
  notesInColumn: new Map(),
  activeImpulse: 'reverb'
};

export const gridStore = writable<GridState>(initialState);

export const activeNotesCount = derived(
  gridStore,
  $grid => $grid.activeNotes.size
);

export const activeImpulse = derived(
  gridStore,
  $grid => $grid.activeImpulse
);
