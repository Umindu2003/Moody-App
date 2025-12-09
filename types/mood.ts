export interface MoodEntry {
  id: string;
  mood: string;
  emoji: string;
  timestamp: Date;
  userId: string;
}

export const MOODS = [
  { emoji: '😄', label: 'Very Happy', value: 5 },
  { emoji: '😊', label: 'Happy', value: 4 },
  { emoji: '😐', label: 'Neutral', value: 3 },
  { emoji: '😔', label: 'Sad', value: 2 },
  { emoji: '😢', label: 'Very Sad', value: 1 },
];
