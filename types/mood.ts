export interface MoodEntry {
  id: string;
  mood: string;
  emoji: string;
  value: number;
  timestamp: Date;
  userId: string;
  note?: string;
}

export const MOODS = [
  {
    emoji: "🤩",
    label: "Very Happy",
    value: 5,
    color: "#4caf50",
    image: require("../assets/images/Very_happy.png"),
  },
  {
    emoji: "🥰",
    label: "Happy",
    value: 4,
    color: "#8bc34a",
    image: require("../assets/images/happy.png"),
  },
  {
    emoji: "😌",
    label: "Neutral",
    value: 3,
    color: "#ffc107",
    image: require("../assets/images/Natural.png"),
  },
  {
    emoji: "🥺",
    label: "Sad",
    value: 2,
    color: "#ff9800",
    image: require("../assets/images/Sad.png"),
  },
  {
    emoji: "😢",
    label: "Very Sad",
    value: 1,
    color: "#f44336",
    image: require("../assets/images/Very_Sad.png"),
  },
];

export interface MoodInsights {
  averageMood: number;
  mostCommonMood: string;
  currentStreak: number;
  totalEntries: number;
  moodTrend: "improving" | "declining" | "stable";
}
