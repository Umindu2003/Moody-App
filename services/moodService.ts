import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { MoodInsights } from "../types/mood";

const USER_ID_KEY = "@moody_user_id";

// Get the correct API base URL based on platform
const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return "http://localhost:3001/api";
  }
  if (Platform.OS === "android") {
    // For Android physical device, use your local network IP
    // For Android emulator, use 10.0.2.2
    return "http://192.168.1.4:3001/api";
  }
  // For iOS simulator and physical devices, use your local network IP
  return "http://192.168.1.4:3001/api";
};

const API_BASE_URL = getApiBaseUrl();
console.log(
  `[Moody API] Using API base URL: ${API_BASE_URL} (Platform: ${Platform.OS})`,
);

// Get user ID from storage (created during onboarding)
export async function getUserId(): Promise<string> {
  try {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      // Fallback for backward compatibility
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, newUserId);
      return newUserId;
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
