import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getUserName, updateUserName } from "../services/userService";

// Notification service will be loaded dynamically
type NotificationService = typeof import("../services/notificationService");
let notificationService: NotificationService | null = null;

const loadNotificationService = async (): Promise<NotificationService> => {
  if (!notificationService) {
    notificationService = await import("../services/notificationService");
  }
  return notificationService;
};

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedTime, setSelectedTime] = useState({ hour: 21, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile states
  const [userName, setUserName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [availableTimes, setAvailableTimes] = useState<
    Array<{ label: string; hour: number; minute: number }>
  >([]);

  // Animations - Start with values at 1 to avoid gray card flash
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const sectionAnims = useRef(
    [0, 1, 2, 3].map(() => new Animated.Value(1)),
  ).current;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const service = await loadNotificationService();
      const [enabled, time, name] = await Promise.all([
        service.isNotificationEnabled(),
        service.getReminderTime(),
        getUserName(),
      ]);
      setNotificationsEnabled(enabled);
      setSelectedTime(time);
      setAvailableTimes(service.getAvailableReminderTimes());
      if (name) {
        setUserName(name);
        setNewName(name);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (newName.trim().length < 2) {
      Alert.alert("Invalid Name", "Please enter at least 2 characters.", [
        { text: "OK" },
      ]);
      return;
    }

    setSavingName(true);
    try {
      await updateUserName(newName.trim());
      setUserName(newName.trim());
      setEditingName(false);
      Alert.alert("✅ Success", "Your name has been updated!", [
        { text: "OK" },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update name. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setSavingName(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    const service = await loadNotificationService();

    if (value) {
      // Request permissions first
      const hasPermission = await service.requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive mood reminders.",
          [{ text: "OK" }],
        );
        return;
      }

      // Schedule the reminder
      const result = await service.scheduleDailyReminder(
        selectedTime.hour,
        selectedTime.minute,
      );
      if (result) {
        setNotificationsEnabled(true);
        Alert.alert(
          "✅ Reminder Set!",
          `You'll receive a daily reminder at ${service.formatReminderTime(selectedTime.hour, selectedTime.minute)} to log your mood.`,
          [{ text: "Great!" }],
        );
      }
    } else {
      const service = await loadNotificationService();
      await service.cancelAllReminders();
      setNotificationsEnabled(false);
      Alert.alert("Reminders Disabled", "You won't receive mood reminders.", [
        { text: "OK" },
      ]);
    }
  };

  const handleTimeSelect = async (hour: number, minute: number) => {
    setSelectedTime({ hour, minute });
    setShowTimePicker(false);

    if (notificationsEnabled) {
      const service = await loadNotificationService();
      await service.scheduleDailyReminder(hour, minute);
      Alert.alert(
        "⏰ Time Updated!",
        `Your reminder is now set for ${service.formatReminderTime(hour, minute)}.`,
        [{ text: "OK" }],
      );
    }
  };

  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, "0");
    return `${displayHour}:${displayMinute} ${period}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: headerScale }, { translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["#4caf50", "#66bb6a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>Customize your experience</Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons
                name="settings"
                size={40}
                color="rgba(255,255,255,0.3)"
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Profile Section */}
        <Animated.View
          style={[
            styles.sectionWrapper,
            {
              opacity: sectionAnims[0],
              transform: [
                {
                  translateY: sectionAnims[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={[styles.sectionIconBg, { backgroundColor: "#e8f5e9" }]}
              >
                <Ionicons name="person" size={20} color="#4caf50" />
              </View>
              <Text style={styles.sectionTitle}>Profile</Text>
            </View>

            {editingName ? (
              <View style={styles.editNameContainer}>
                <View style={styles.nameInputWrapper}>
                  <TextInput
                    style={styles.nameInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Enter your name"
                    maxLength={30}
                    autoFocus
                  />
                </View>
                <View style={styles.editButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={() => {
                      setEditingName(false);
                      setNewName(userName);
                    }}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveNameButton,
                      savingName && styles.saveNameButtonDisabled,
                    ]}
                    onPress={handleSaveName}
                    disabled={savingName}
                  >
                    <Text style={styles.saveNameText}>
                      {savingName ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Name</Text>
                  <Text style={styles.userName}>{userName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingName(true)}
                >
                  <Ionicons name="pencil" size={18} color="#4caf50" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Notification Settings Section */}
        <Animated.View
          style={[
            styles.sectionWrapper,
            {
              opacity: sectionAnims[1],
              transform: [
                {
                  translateY: sectionAnims[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={[styles.sectionIconBg, { backgroundColor: "#fff3e0" }]}
              >
                <Ionicons name="notifications" size={20} color="#ff9800" />
              </View>
              <Text style={styles.sectionTitle}>Daily Reminders</Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Mood Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get a daily notification to log your mood
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: "#e0e0e0", true: "#a5d6a7" }}
                thumbColor={notificationsEnabled ? "#4caf50" : "#f4f3f4"}
              />
            </View>

            {notificationsEnabled && (
              <View style={styles.timeSettingContainer}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Reminder Time</Text>
                    <Text style={styles.settingDescription}>
                      When would you like to be reminded?
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker(!showTimePicker)}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatTime(selectedTime.hour, selectedTime.minute)}
                    </Text>
                    <Ionicons
                      name={showTimePicker ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#4caf50"
                    />
                  </TouchableOpacity>
                </View>

                {showTimePicker && (
                  <View style={styles.timePickerContainer}>
                    {availableTimes.map((time) => (
                      <TouchableOpacity
                        key={time.label}
                        style={[
                          styles.timeOption,
                          selectedTime.hour === time.hour &&
                            selectedTime.minute === time.minute &&
                            styles.timeOptionSelected,
                        ]}
                        onPress={() => handleTimeSelect(time.hour, time.minute)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            selectedTime.hour === time.hour &&
                              selectedTime.minute === time.minute &&
                              styles.timeOptionTextSelected,
                          ]}
                        >
                          {time.label}
                        </Text>
                        {selectedTime.hour === time.hour &&
                          selectedTime.minute === time.minute && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#4caf50"
                            />
                          )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Info Section */}
        <Animated.View
          style={[
            styles.sectionWrapper,
            {
              opacity: sectionAnims[2],
              transform: [
                {
                  translateY: sectionAnims[2].interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.infoSection}>
            <View style={styles.infoIconBg}>
              <Ionicons name="bulb" size={20} color="#2196f3" />
            </View>
            <Text style={styles.infoText}>
              Daily reminders help you maintain a consistent mood tracking
              habit. We recommend setting a reminder in the evening so you can
              reflect on your entire day.
            </Text>
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View
          style={[
            styles.sectionWrapper,
            {
              opacity: sectionAnims[3],
              transform: [
                {
                  translateY: sectionAnims[3].interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={[styles.sectionIconBg, { backgroundColor: "#fce4ec" }]}
              >
                <Ionicons name="heart" size={20} color="#e91e63" />
              </View>
              <Text style={styles.sectionTitle}>About Moody</Text>
            </View>
            <View style={styles.aboutContainer}>
              <Text style={styles.aboutText}>
                Moody helps you track and understand your emotional patterns
                over time. By logging your mood daily, you can gain insights
                into what affects your well-being.
              </Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>Version 1.0.0</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerContainer: {
    marginHorizontal: 20,
    marginTop: 50,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerGradient: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerIcon: {
    opacity: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  sectionWrapper: {
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  userName: {
    fontSize: 18,
    color: "#4caf50",
    fontWeight: "600",
    marginTop: 4,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4caf50",
  },
  editNameContainer: {
    gap: 15,
  },
  nameInputWrapper: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  nameInput: {
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: "#333",
  },
  editButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelEditButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelEditText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  saveNameButton: {
    flex: 1,
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveNameButtonDisabled: {
    backgroundColor: "#a5d6a7",
  },
  saveNameText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  settingDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  timeSettingContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4caf50",
  },
  timePickerContainer: {
    marginTop: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    overflow: "hidden",
  },
  timeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timeOptionSelected: {
    backgroundColor: "#e8f5e9",
  },
  timeOptionText: {
    fontSize: 16,
    color: "#333",
  },
  timeOptionTextSelected: {
    fontWeight: "600",
    color: "#4caf50",
  },
  infoSection: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#bbdefb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  aboutContainer: {
    gap: 12,
  },
  aboutText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  versionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 5,
  },
  versionText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
});
