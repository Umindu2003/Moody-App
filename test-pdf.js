import { generatePDF } from "./services/pdfExportService";

// Test data for PDF generation
const testData = {
  period: "week",
  insights: {
    totalEntries: 10,
    averageMood: 3.8,
    currentStreak: 5,
    moodTrend: "improving",
  },
  moodData: [
    {
      mood: "Happy",
      emoji: "😊",
      note: "Had a great day at work",
      timestamp: { toDate: () => new Date() },
    },
    {
      mood: "Excited",
      emoji: "🤗",
      note: "Looking forward to the weekend",
      timestamp: { toDate: () => new Date(Date.now() - 86400000) },
    },
  ],
  comparison: {
    previousLabel: "Previous Week",
    currentLabel: "This Week",
    previousAvg: 3.2,
    currentAvg: 3.8,
    previousMood: { emoji: "😐" },
    currentMood: { emoji: "😊" },
  },
  distribution: [
    { name: "😊", percentage: 40 },
    { name: "🤗", percentage: 30 },
    { name: "😐", percentage: 20 },
    { name: "😔", percentage: 10 },
  ],
};

console.log("Testing PDF generation...");
console.log("Test data prepared:", JSON.stringify(testData, null, 2));
