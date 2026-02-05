const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

// User Schema
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", UserSchema);

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

// ============ USER ROUTES ============

// Register a new user
app.post("/api/users/register", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters" });
    }

    const newUser = new User({
      name: name.trim(),
    });

    await newUser.save();

    res.status(201).json({
      id: newUser._id.toString(),
      name: newUser.name,
      createdAt: newUser.createdAt,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Get user profile
app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Update user profile
app.put("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ============ MOOD ROUTES ============

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

// ============ AI ROUTES ============

// Get AI mood analysis for a user
app.get("/api/ai/analyze/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch last 7 days of mood entries
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const entries = await MoodEntry.find({
      userId: userId,
      timestamp: { $gte: startDate },
    })
      .sort({ timestamp: -1 })
      .lean();

    if (entries.length === 0) {
      return res.json({
        analysis:
          "Hey friend! 👋 I don't have any mood data from you yet. Start logging your moods and I'll give you personalized insights! 🌟",
      });
    }

    // Format mood data into a summary string
    const moodSummary = entries
      .map((entry) => {
        const date = new Date(entry.timestamp).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        return `${date}: ${entry.mood} (${entry.value}/5)`;
      })
      .join(", ");

    // Calculate basic stats for context
    const avgMood =
      entries.reduce((sum, e) => sum + e.value, 0) / entries.length;
    const moodCounts = {};
    entries.forEach((e) => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) =>
      moodCounts[a] > moodCounts[b] ? a : b,
    );

    const prompt = `Act as a supportive best friend. Analyze this mood history: [${moodSummary}].
Average mood: ${avgMood.toFixed(1)}/5.
Most common: ${mostCommonMood}.
Give a 1-sentence observation and 1 short, fun recommendation.
Use emojis. Keep it under 50 words.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const analysis = result.response.text();

    res.json({ analysis });
  } catch (error) {
    console.error("Error getting AI analysis:", error);
    res.status(500).json({
      error: "Failed to get AI analysis",
      analysis: "Oops! 😅 I'm having a moment. Try again in a bit, friend! 💫",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Moody API is running" });
});

// List available Gemini models (for debugging)
app.get("/api/ai/models", async (req, res) => {
  const https = require("https");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;

  https
    .get(url, (response) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        try {
          res.json(JSON.parse(data));
        } catch (e) {
          res
            .status(500)
            .json({ error: "Failed to parse response", raw: data });
        }
      });
    })
    .on("error", (error) => {
      res.status(500).json({ error: error.message });
    });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Moody API server is running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}/api/health`);
  console.log(`Network: http://192.168.1.2:${PORT}/api/health`);
});
