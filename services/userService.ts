import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const USER_ID_KEY = "@moody_user_id";
const USER_NAME_KEY = "@moody_user_name";
const USER_ONBOARDED_KEY = "@moody_user_onboarded";

// Get the correct API base URL based on platform
const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return "http://localhost:3001/api";
  }
  if (Platform.OS === "android") {
    return "http://192.168.1.2:3001/api";
  }
  return "http://192.168.1.2:3001/api";
};

const API_BASE_URL = getApiBaseUrl();

export interface User {
  id: string;
  name: string;
  createdAt?: Date;
}

/**
 * Check if user has completed onboarding
 */
export async function isUserOnboarded(): Promise<boolean> {
  try {
    const onboarded = await AsyncStorage.getItem(USER_ONBOARDED_KEY);
    return onboarded === "true";
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
}

/**
 * Get the current user's ID
 */
export async function getUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY);
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

/**
 * Get the current user's name
 */
export async function getUserName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_NAME_KEY);
  } catch (error) {
    console.error("Error getting user name:", error);
    return null;
  }
}

/**
 * Register a new user
 */
export async function registerUser(name: string): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error("Failed to register user");
    }

    const user = await response.json();

    // Save user data locally
    await AsyncStorage.setItem(USER_ID_KEY, user.id);
    await AsyncStorage.setItem(USER_NAME_KEY, user.name);
    await AsyncStorage.setItem(USER_ONBOARDED_KEY, "true");

    return user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
}

/**
 * Update user's name
 */
export async function updateUserName(newName: string): Promise<User> {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("No user ID found");
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      throw new Error("Failed to update user");
    }

    const user = await response.json();

    // Update local storage
    await AsyncStorage.setItem(USER_NAME_KEY, user.name);

    return user;
  } catch (error) {
    console.error("Error updating user name:", error);
    throw error;
  }
}

/**
 * Get user profile from backend
 */
export async function getUserProfile(): Promise<User | null> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to get user profile");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Get a personalized greeting based on time of day
 */
export function getGreeting(name: string): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return `Good morning, ${name}! ☀️`;
  } else if (hour < 17) {
    return `Good afternoon, ${name}! 🌤️`;
  } else if (hour < 21) {
    return `Good evening, ${name}! 🌅`;
  } else {
    return `Good night, ${name}! 🌙`;
  }
}

/**
 * Get a motivational subtitle based on time of day
 */
export function getSubtitle(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "How are you starting your day?";
  } else if (hour < 17) {
    return "How's your day going so far?";
  } else if (hour < 21) {
    return "How was your day today?";
  } else {
    return "How are you feeling before bed?";
  }
}

/**
 * Clear all user data (for logout/reset)
 */
export async function clearUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      USER_ID_KEY,
      USER_NAME_KEY,
      USER_ONBOARDED_KEY,
    ]);
  } catch (error) {
    console.error("Error clearing user data:", error);
  }
}
