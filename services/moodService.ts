import AsyncStorage from "@react-native-async-storage/async-storage";
import { MoodInsights } from "../types/mood";

const USER_ID_KEY = "@moody_user_id";
const API_BASE_URL = "http://localhost:3001/api"; // Change this to your API server URL

// Generate or retrieve a unique user ID
export async function getUserId(): Promise<string> {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return `user_${Date.now()}`;
  }
}

// Save or update a mood entry with optional note
export async function saveMood(
  mood: string,
  emoji: string,
  value: number,
  note?: string,
): Promise<void> {
  try {
    const userId = await getUserId();

    const response = await fetch(`${API_BASE_URL}/moods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mood,
        emoji,
        value,
        userId,
        note: note || "",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save mood");
    }
  } catch (error) {
    console.error("Error saving mood:", error);
    throw error;
  }
}

// Get mood entries for a user
export async function getMoodEntries(
  userId: string,
  days: number = 7,
): Promise<any[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/moods/${userId}?days=${days}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get mood entries");
    }

    const entries = await response.json();

    // Convert API response to the expected format
    return entries.map((entry: any) => ({
      id: entry._id,
      mood: entry.mood,
      emoji: entry.emoji,
      value: entry.value,
      timestamp: {
        toDate: () => new Date(entry.timestamp),
      },
      userId: entry.userId,
      note: entry.note || "",
    }));
  } catch (error) {
    console.error("Error getting mood entries:", error);
    throw error;
  }
}

// Get today's mood
export async function getTodaysMood(userId: string): Promise<any | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/moods/${userId}/today`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to get today's mood");
    }

    const moodEntry = await response.json();

    if (moodEntry) {
      return {
        id: moodEntry._id,
        mood: moodEntry.mood,
        emoji: moodEntry.emoji,
        value: moodEntry.value,
        timestamp: {
          toDate: () => new Date(moodEntry.timestamp),
        },
        userId: moodEntry.userId,
        note: moodEntry.note || "",
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting today's mood:", error);
    throw error;
  }
}

// Get mood insights
export async function getMoodInsights(
  userId: string,
  days: number = 30,
): Promise<MoodInsights> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/moods/${userId}/insights?days=${days}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get mood insights");
    }

    const insights = await response.json();
    return insights;
  } catch (error) {
    console.error("Error getting mood insights:", error);
    throw error;
  }
}

// Get all mood entries (for history)
export async function getAllMoodEntries(userId: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/moods/${userId}/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get all mood entries");
    }

    const entries = await response.json();

    // Convert API response to the expected format
    return entries.map((entry: any) => ({
      id: entry._id,
      mood: entry.mood,
      emoji: entry.emoji,
      value: entry.value,
      timestamp: {
        toDate: () => new Date(entry.timestamp),
      },
      userId: entry.userId,
      note: entry.note || "",
    }));
  } catch (error) {
    console.error("Error getting all mood entries:", error);
    throw error;
  }
}
