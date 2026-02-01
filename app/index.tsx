import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import LoadingScreen from "../components/LoadingScreen";
import { getTodaysMood, getUserId, saveMood } from "../services/moodService";
import { getGreeting, getSubtitle, getUserName } from "../services/userService";
import { MOODS } from "../types/mood";

export default function Index() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [todaysMood, setTodaysMood] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [userName, setUserName] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");

  useEffect(() => {
    loadTodaysMood();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Reload user data when tab comes into focus (for real-time name updates)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, []),
  );

  const loadUserData = async () => {
    try {
      const name = await getUserName();
      if (name) {
        setUserName(name);
        setGreeting(getGreeting(name));
        setSubtitle(getSubtitle());
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadTodaysMood = async () => {
    try {
      const userId = await getUserId();
      const mood = await getTodaysMood(userId);
      setTodaysMood(mood);
      if (mood) {
        setSelectedMood(mood.emoji);
        setNote(mood.note || "");
        setShowNoteInput(false);
      } else {
        // Reset if no mood for today
        setSelectedMood(null);
        setNote("");
        setShowNoteInput(false);
      }
    } catch (error) {
      console.error("Error loading today's mood:", error);
      // Reset on error to prevent stuck state
      setTodaysMood(null);
      setSelectedMood(null);
      setNote("");
      setShowNoteInput(false);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleMoodSelect = (mood: (typeof MOODS)[0]) => {
    setSelectedMood(mood.emoji);
    setShowNoteInput(true);
  };

  const handleSaveMood = async () => {
    if (!selectedMood) return;

    setLoading(true);
    Keyboard.dismiss();

    try {
      const mood = MOODS.find((m) => m.emoji === selectedMood);
      if (mood) {
        const isUpdating = todaysMood !== null;
        await saveMood(mood.label, mood.emoji, mood.value, note);

        // Success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Reload mood data
        await loadTodaysMood();

        Alert.alert(
          "✨ Success",
          isUpdating
            ? "Your mood has been updated!"
            : "Your mood has been saved!",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      Alert.alert(
        "❌ Error",
        "Failed to save mood. Please check your connection and try again.",
        [{ text: "OK" }],
      );
      console.error("Error saving mood:", error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingScreen message="Getting your mood data..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={60}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Greeting Section */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle}>{greeting}</Text>
          <Text style={styles.greetingSubtitle}>{subtitle}</Text>
        </View>

        {/* Today's Mood Card - Centered & Beautiful */}
        {todaysMood && (
          <View style={styles.todayMoodContainer}>
            <LinearGradient
              colors={["#e8f5e9", "#f1f8e9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.todayMoodGradient}
            >
              <Text style={styles.todayMoodLabel}>✨ Today's Mood</Text>
              <Image
                source={MOODS.find((m) => m.emoji === todaysMood.emoji)?.image}
                style={styles.todayMoodEmoji}
                resizeMode="contain"
              />
              <Text style={styles.todayMoodText}>{todaysMood.mood}</Text>
              {todaysMood.note && (
                <Text style={styles.todayNoteText}>"{todaysMood.note}"</Text>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Mood Selection */}
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <View style={styles.moodsContainer}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodButton,
                selectedMood === mood.emoji && styles.selectedMood,
                { borderLeftColor: mood.color, borderLeftWidth: 5 },
              ]}
              onPress={() => handleMoodSelect(mood)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Image
                source={mood.image}
                style={styles.emoji}
                resizeMode="contain"
              />
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note Input */}
        {showNoteInput && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Add a note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="How's your day going?"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={150}
              placeholderTextColor="#aaa"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowNoteInput(false);
                  setNote("");
                  setSelectedMood(todaysMood?.emoji || null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveMood}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? "Saving..." : "Save Mood"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Developer Credit */}
        <View style={styles.developerCredit}>
          <Text style={styles.developerText}>Developed by </Text>
          <Image
            source={require("../assets/images/MainLogo.png")}
            style={styles.developerLogo}
            resizeMode="contain"
          />
          <Text style={styles.developerText}>mindu Isith</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  greetingContainer: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 15,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    marginTop: 5,
  },
  todayMoodContainer: {
    marginBottom: 18,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  todayMoodGradient: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  todayMoodEmoji: {
    width: 60,
    height: 60,
    marginVertical: 8,
  },
  todayMoodLabel: {
    fontSize: 12,
    color: "#4caf50",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  todayMoodText: {
    fontSize: 20,
    color: "#2e7d32",
    fontWeight: "800",
    marginTop: 4,
  },
  todayNoteText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  moodsContainer: {
    flexDirection: "column",
    gap: 10,
  },
  moodButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedMood: {
    backgroundColor: "#e8f5e9",
    borderWidth: 2,
    borderColor: "#4caf50",
    transform: [{ scale: 1.02 }],
  },
  emoji: {
    width: 40,
    height: 40,
    marginRight: 14,
  },
  moodLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  noteContainer: {
    marginTop: 14,
    backgroundColor: "white",
    padding: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    minHeight: 55,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#4caf50",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  developerCredit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    paddingVertical: 8,
  },
  developerLogo: {
    width: 11,
    height: 11,
    opacity: 0.5,
    marginLeft: 2,
    marginRight: -1,
  },
  developerText: {
    fontSize: 11,
    color: "#bbb",
    fontWeight: "400",
  },
});
