const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI =
  "mongodb+srv://u4656mee_db_user:12345@cluster0.l4alpmj.mongodb.net/Moody?retryWrites=true&w=majority";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Mood Entry Schema
const MoodEntrySchema = new mongoose.Schema(
  {
    mood: {
      type: String,
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    userId: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better query performance
MoodEntrySchema.index({ userId: 1, timestamp: -1 });
MoodEntrySchema.index({ userId: 1, timestamp: 1 });

const MoodEntry = mongoose.model("MoodEntry", MoodEntrySchema);

// Routes

// Save or update mood entry
app.post("/api/moods", async (req, res) => {
  try {
    const { mood, emoji, value, userId, note } = req.body;

    // Check if there's already a mood entry for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingMood = await MoodEntry.findOne({
      userId: userId,
      timestamp: {
        $gte: today,
        $lt: tomorrow,
      },
    }).sort({ timestamp: -1 });

    if (existingMood) {
      // Update existing mood
      existingMood.mood = mood;
      existingMood.emoji = emoji;
      existingMood.value = value;
      existingMood.note = note || "";
      existingMood.timestamp = new Date();
      await existingMood.save();
      res.json(existingMood);
    } else {
      // Create new mood entry
      const newMoodEntry = new MoodEntry({
        mood,
        emoji,
        value,
        userId,
        timestamp: new Date(),
        note: note || "",
      });
      await newMoodEntry.save();
      res.status(201).json(newMoodEntry);
    }
  } catch (error) {
    console.error("Error saving mood:", error);
    res.status(500).json({ error: "Failed to save mood" });
  }
});

// Get mood entries for a user
app.get("/api/moods/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const entries = await MoodEntry.find({
      userId: userId,
      timestamp: { $gte: startDate },
    })
      .sort({ timestamp: -1 })
      .lean();

    res.json(entries);
  } catch (error) {
    console.error("Error getting mood entries:", error);
    res.status(500).json({ error: "Failed to get mood entries" });
  }
});

// Get today's mood
app.get("/api/moods/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const moodEntry = await MoodEntry.findOne({
      userId: userId,
      timestamp: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .sort({ timestamp: -1 })
      .lean();

    if (moodEntry) {
      res.json(moodEntry);
    } else {
      res.status(404).json({ message: "No mood entry found for today" });
    }
  } catch (error) {
    console.error("Error getting today's mood:", error);
    res.status(500).json({ error: "Failed to get today's mood" });
  }
});

// Get mood insights
app.get("/api/moods/:userId/insights", async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const entries = await MoodEntry.find({
      userId: userId,
      timestamp: { $gte: startDate },
    })
      .sort({ timestamp: -1 })
      .lean();

    if (entries.length === 0) {
      return res.json({
        averageMood: 0,
        mostCommonMood: "No data",
        currentStreak: 0,
        totalEntries: 0,
        moodTrend: "stable",
      });
    }

    // Calculate average mood
    const averageMood =
      entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;

    // Find most common mood
    const moodCounts = {};
    entries.forEach((entry) => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) =>
      moodCounts[a] > moodCounts[b] ? a : b,
    );

    // Calculate current streak (consecutive days with entries)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;

    for (let i = 0; i < parseInt(days); i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasEntry = entries.some((entry) => {
        const entryDate = new Date(entry.timestamp);
        return (
          entryDate.getDate() === checkDate.getDate() &&
          entryDate.getMonth() === checkDate.getMonth() &&
          entryDate.getFullYear() === checkDate.getFullYear()
        );
      });

      if (hasEntry) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate mood trend (last week vs previous week)
    const lastWeek = entries.filter((e) => {
      const daysDiff = Math.floor(
        (Date.now() - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysDiff <= 7;
    });

    const previousWeek = entries.filter((e) => {
      const daysDiff = Math.floor(
        (Date.now() - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysDiff > 7 && daysDiff <= 14;
    });

    let moodTrend = "stable";
    if (lastWeek.length > 0 && previousWeek.length > 0) {
      const lastWeekAvg =
        lastWeek.reduce((sum, e) => sum + e.value, 0) / lastWeek.length;
      const previousWeekAvg =
        previousWeek.reduce((sum, e) => sum + e.value, 0) / previousWeek.length;

      if (lastWeekAvg > previousWeekAvg + 0.3) {
        moodTrend = "improving";
      } else if (lastWeekAvg < previousWeekAvg - 0.3) {
        moodTrend = "declining";
      }
    }

    res.json({
      averageMood,
      mostCommonMood,
      currentStreak,
      totalEntries: entries.length,
      moodTrend,
    });
  } catch (error) {
    console.error("Error getting mood insights:", error);
    res.status(500).json({ error: "Failed to get mood insights" });
  }
});

// Get all mood entries (for history)
app.get("/api/moods/:userId/all", async (req, res) => {
  try {
    const { userId } = req.params;

    const entries = await MoodEntry.find({
      userId: userId,
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json(entries);
  } catch (error) {
    console.error("Error getting all mood entries:", error);
    res.status(500).json({ error: "Failed to get all mood entries" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Moody API is running" });
});

app.listen(PORT, () => {
  console.log(`Moody API server is running on port ${PORT}`);
});
