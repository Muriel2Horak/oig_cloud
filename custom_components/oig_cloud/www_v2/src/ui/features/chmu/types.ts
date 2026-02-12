export interface ChmuWarning {
  id: string;
  type: string;
  level: 'low' | 'medium' | 'high' | 'extreme';
  title: string;
  description: string;
  start: string;
  end: string;
  regions: string[];
}

export const LEVEL_COLORS: Record<ChmuWarning['level'], string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  extreme: '#9c27b0',
};

export const LEVEL_LABELS: Record<ChmuWarning['level'], string> = {
  low: 'Nízká',
  medium: 'Střední',
  high: 'Vysoká',
  extreme: 'Extrémní',
};
