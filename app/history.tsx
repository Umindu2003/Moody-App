import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LoadingScreen from "../components/LoadingScreen";
import { getAllMoodEntries, getUserId } from "../services/moodService";
import { MOODS } from "../types/mood";

const { width } = Dimensions.get("window");

export default function History() {
  const [moodData, setMoodData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null);

  // Animations - Start with values at 1 to avoid gray card flash
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const filterAnims = useRef(MOODS.map(() => new Animated.Value(1))).current;
  const allFilterAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadMoodData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMoodData();
    }, []),
  );

  useEffect(() => {
    applyFilter();
  }, [selectedFilter, moodData]);

  const loadMoodData = async () => {
    try {
      const userId = await getUserId();
      const entries = await getAllMoodEntries(userId);
      setMoodData(entries);
    } catch (error) {
      console.error("Error loading mood data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = () => {
    if (selectedFilter === null) {
      setFilteredData(moodData);
    } else {
      setFilteredData(
        moodData.filter((entry) => entry.value === selectedFilter),
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMoodData();
  };

  const AnimatedMoodItem = ({ item, index }: { item: any; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    const date = item.timestamp.toDate();
    const timeAgo = getTimeAgo(date);
    const moodColor =
      MOODS.find((m) => m.value === item.value)?.color || "#4caf50";

    return (
      <Animated.View
        style={[
          styles.moodItemContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.moodItem}
        >
          <View style={[styles.moodAccent, { backgroundColor: moodColor }]} />
          <View style={styles.moodContent}>
            <View style={styles.moodHeader}>
              <View
                style={[
                  styles.emojiContainer,
                  { backgroundColor: `${moodColor}15` },
                ]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <View style={styles.moodDetails}>
                <Text style={styles.moodLabel}>{item.mood}</Text>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={14} color="#4caf50" />
                  <Text style={styles.timeText}>{timeAgo}</Text>
                </View>
                <Text style={styles.dateText}>
                  {date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
            {item.note && (
              <View style={styles.noteContainer}>
                <Ionicons
                  name="chatbubble-outline"
                  size={14}
                  color="#999"
                  style={styles.noteIcon}
                />
                <Text style={styles.noteText}>"{item.note}"</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  if (loading) {
    return <LoadingScreen message="Loading your mood history..." />;
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.title}>Mood History</Text>
            <Text style={styles.subtitle}>
              {filteredData.length}{" "}
              {filteredData.length === 1 ? "entry" : "entries"}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="time" size={40} color="rgba(255,255,255,0.3)" />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <Animated.View
          style={[
            styles.filterButtonWrapper,
            {
              opacity: allFilterAnim,
              transform: [
                {
                  scale: allFilterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === null && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(null)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === null && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {MOODS.map((mood, index) => (
          <Animated.View
            key={mood.value}
            style={[
              styles.filterButtonWrapper,
              {
                opacity: filterAnims[index],
                transform: [
                  {
                    scale: filterAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === mood.value && styles.filterButtonActive,
                selectedFilter === mood.value && {
                  backgroundColor: mood.color,
                  borderColor: mood.color,
                },
              ]}
              onPress={() => setSelectedFilter(mood.value)}
            >
              <Text style={styles.filterEmoji}>{mood.emoji}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {filteredData.length > 0 ? (
        <FlatList
          data={filteredData}
          renderItem={({ item, index }) => (
            <AnimatedMoodItem item={item} index={index} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4caf50"
              colors={["#4caf50"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Animated.View
          style={[
            styles.emptyState,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="journal-outline" size={60} color="#ccc" />
          </View>
          <Text style={styles.emptyStateText}>
            {selectedFilter
              ? "No moods found for this filter"
              : "No moods recorded yet"}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedFilter
              ? "Try selecting a different mood"
              : "Start tracking your mood today!"}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  headerContainer: {
    marginHorizontal: 20,
    marginTop: 50,
    marginBottom: 15,
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
  headerContent: { flex: 1 },
  headerIcon: { opacity: 0.5 },
  title: { fontSize: 28, fontWeight: "bold", color: "white", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.8)" },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 8,
  },
  filterButtonWrapper: { flex: 1 },
  filterButton: {
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e8e8e8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
    shadowColor: "#4caf50",
    shadowOpacity: 0.3,
  },
  filterText: { fontSize: 13, fontWeight: "700", color: "#666" },
  filterTextActive: { color: "white" },
  filterEmoji: { fontSize: 20 },
  listContainer: { padding: 20, paddingTop: 5 },
  moodItemContainer: { marginBottom: 12 },
  moodItem: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    flexDirection: "row",
  },
  moodAccent: { width: 5 },
  moodContent: { flex: 1, padding: 16 },
  moodHeader: { flexDirection: "row", alignItems: "center" },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  emoji: { fontSize: 32 },
  moodDetails: { flex: 1 },
  moodLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  timeText: { fontSize: 13, color: "#4caf50", fontWeight: "600" },
  dateText: { fontSize: 12, color: "#999" },
  noteContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteIcon: { marginRight: 8, marginTop: 2 },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: { fontSize: 14, color: "#999", textAlign: "center" },
});
