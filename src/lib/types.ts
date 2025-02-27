export interface DragState {
  isDragging: boolean;
  startValue: boolean;
  lastCell: {row: number; col: number} | null;
}

export interface GridCell {
  row: number;
  col: number;
}
