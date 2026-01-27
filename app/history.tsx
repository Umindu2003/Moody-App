import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getAllMoodEntries, getUserId } from "../services/moodService";
import { MOODS } from "../types/mood";

export default function History() {
  const [moodData, setMoodData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadMoodData();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-refresh when screen comes into focus
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

  const renderMoodItem = ({ item }: { item: any }) => {
    const date = item.timestamp.toDate();
    const timeAgo = getTimeAgo(date);

    return (
      <View style={styles.moodItem}>
        <View style={styles.moodHeader}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <View style={styles.moodDetails}>
            <Text style={styles.moodLabel}>{item.mood}</Text>
            <Text style={styles.timeText}>{timeAgo}</Text>
            <Text style={styles.dateText}>
              {date.toLocaleDateString()} at{" "}
              {date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
        {item.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>"{item.note}"</Text>
          </View>
        )}
      </View>
    );
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>Mood History</Text>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
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

        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.filterButton,
              selectedFilter === mood.value && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(mood.value)}
          >
            <Text style={styles.filterEmoji}>{mood.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mood List */}
      {filteredData.length > 0 ? (
        <FlatList
          data={filteredData}
          renderItem={renderMoodItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>📝</Text>
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
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    padding: 20,
    paddingBottom: 10,
    color: "#333",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    color: "#666",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterTextActive: {
    color: "white",
  },
  filterEmoji: {
    fontSize: 20,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  moodItem: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  emoji: {
    fontSize: 40,
    marginRight: 15,
  },
  moodDetails: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: "#4caf50",
    fontWeight: "500",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: "#999",
  },
  noteContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  noteText: {
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
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
