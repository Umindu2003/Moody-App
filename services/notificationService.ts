import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Lazy load expo-notifications to prevent errors during app startup in Expo Go
let Notifications: typeof import("expo-notifications") | null = null;

const getNotifications = async () => {
  if (!Notifications) {
    try {
      Notifications = await import("expo-notifications");
    } catch (error) {
      console.log("Could not load expo-notifications:", error);
      return null;
    }
  }
  return Notifications;
};

// Storage keys
const NOTIFICATION_ENABLED_KEY = "moody_notification_enabled";
const NOTIFICATION_TIME_KEY = "moody_notification_time";

// Default reminder time (9:00 PM - gives users time to log before midnight)
const DEFAULT_REMINDER_HOUR = 21;
const DEFAULT_REMINDER_MINUTE = 0;

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === "expo";

/**
 * Setup notification handler (call once when ready)
 */
async function setupNotificationHandler(): Promise<void> {
  try {
    const notif = await getNotifications();
    if (!notif) return;

    notif.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.log("Notification handler setup skipped (Expo Go limitation)");
  }
}

// Notification messages to randomly choose from
const REMINDER_MESSAGES = [
  {
    title: "🌙 Don't forget your mood!",
    body: "How was your day? Take a moment to log your mood before midnight.",
  },
  {
    title: "😊 Mood check-in time!",
    body: "Your daily mood entry awaits. How are you feeling today?",
  },
  {
    title: "📝 Log your mood",
    body: "A few seconds to reflect on your day. Ready to track your mood?",
  },
  {
    title: "✨ Daily reminder",
    body: "Haven't logged your mood yet? Let's capture how you're feeling!",
  },
  {
    title: "🎯 Mood tracking time",
    body: "Keep your streak going! Log today's mood now.",
  },
];

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const notif = await getNotifications();
    if (!notif) {
      console.log("Notifications not available");
      return false;
    }

    // In Expo Go, notifications have limited support
    if (isExpoGo) {
      console.log(
        "Running in Expo Go - notifications have limited functionality",
      );
    }

    const { status: existingStatus } = await notif.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await notif.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permissions not granted");
      return false;
    }

    // Android specific channel setup
    if (Platform.OS === "android") {
      try {
        await notif.setNotificationChannelAsync("mood-reminders", {
          name: "Mood Reminders",
          importance: notif.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4caf50",
          sound: "default",
        });
      } catch (error) {
        console.log("Notification channel setup skipped");
      }
    }

    return true;
  } catch (error) {
    console.log("Error requesting notification permissions:", error);
    return false;
  }
}

/**
 * Schedule the daily mood reminder notification
 */
export async function scheduleDailyReminder(
  hour: number = DEFAULT_REMINDER_HOUR,
  minute: number = DEFAULT_REMINDER_MINUTE,
): Promise<string | null> {
  try {
    const notif = await getNotifications();
    if (!notif) {
      console.log("Notifications not available for scheduling");
      return null;
    }

    // Cancel any existing reminders first
    await cancelAllReminders();

    // Get a random message
    const message =
      REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];

    // Schedule the notification
    const identifier = await notif.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: "default",
        priority: notif.AndroidNotificationPriority.HIGH,
        data: { type: "mood_reminder" },
      },
      trigger: {
        type: notif.SchedulableTriggerInputTypes.DAILY,
        hour: hour,
        minute: minute,
      },
    });

    // Save settings
    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, "true");
    await AsyncStorage.setItem(
      NOTIFICATION_TIME_KEY,
      JSON.stringify({ hour, minute }),
    );

    console.log(`Daily reminder scheduled for ${hour}:${minute}`);
    return identifier;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

/**
 * Cancel all scheduled reminders
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    const notif = await getNotifications();
    if (notif) {
      await notif.cancelAllScheduledNotificationsAsync();
    }
    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, "false");
    console.log("All reminders cancelled");
  } catch (error) {
    console.error("Error cancelling reminders:", error);
  }
}

/**
 * Check if notifications are enabled
 */
export async function isNotificationEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    return enabled === "true";
  } catch (error) {
    return false;
  }
}

/**
 * Get the current reminder time
 */
export async function getReminderTime(): Promise<{
  hour: number;
  minute: number;
}> {
  try {
    const timeStr = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);
    if (timeStr) {
      return JSON.parse(timeStr);
    }
  } catch (error) {
    console.error("Error getting reminder time:", error);
  }
  return { hour: DEFAULT_REMINDER_HOUR, minute: DEFAULT_REMINDER_MINUTE };
}

/**
 * Initialize notifications on app start
 * This will re-schedule the reminder if it was enabled
 */
export async function initializeNotifications(): Promise<void> {
  try {
    // Skip full initialization in Expo Go to avoid errors
    if (isExpoGo) {
      console.log(
        "Expo Go detected - local notifications will work with limitations",
      );
    }

    // Setup the notification handler first
    await setupNotificationHandler();

    const hasPermission = await requestNotificationPermissions();

    if (hasPermission) {
      const isEnabled = await isNotificationEnabled();
      if (isEnabled) {
        const { hour, minute } = await getReminderTime();
        await scheduleDailyReminder(hour, minute);
      }
    }
  } catch (error) {
    console.log("Notification initialization skipped:", error);
  }
}

/**
 * Format time for display (e.g., "9:00 PM")
 */
export function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Get list of available reminder times
 */
export function getAvailableReminderTimes(): Array<{
  label: string;
  hour: number;
  minute: number;
}> {
  return [
    { label: "6:00 PM", hour: 18, minute: 0 },
    { label: "7:00 PM", hour: 19, minute: 0 },
    { label: "8:00 PM", hour: 20, minute: 0 },
    { label: "9:00 PM", hour: 21, minute: 0 },
    { label: "10:00 PM", hour: 22, minute: 0 },
    { label: "11:00 PM", hour: 23, minute: 0 },
  ];
}
