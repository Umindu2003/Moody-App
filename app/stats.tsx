import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import {
  getMoodEntries,
  getMoodInsights,
  getUserId,
} from "../services/moodService";
import { generateAndSharePDF } from "../services/pdfExportService";
import { MOODS, MoodInsights } from "../types/mood";

const screenWidth = Dimensions.get("window").width;

type TimePeriod = "today" | "week" | "month" | "year";

export default function Stats() {
  const [moodData, setMoodData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [insights, setInsights] = useState<MoodInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadMoodData();

    // Entrance animation
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
    filterDataByPeriod();
  }, [selectedPeriod, moodData]);

  const getDaysForPeriod = (period: TimePeriod): number => {
    switch (period) {
      case "today":
        return 1;
      case "week":
        return 7;
      case "month":
        return 30;
      case "year":
        return 365;
      default:
        return 7;
    }
  };

  const loadMoodData = async () => {
    try {
      const userId = await getUserId();
      // Load enough data for year view
      const entries = await getMoodEntries(userId, 365);
      setMoodData(entries);
    } catch (error) {
      console.error("Error loading mood data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterDataByPeriod = async () => {
    const days = getDaysForPeriod(selectedPeriod);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const filtered = moodData.filter((entry) => {
      const entryDate = entry.timestamp.toDate();
      return entryDate >= startDate;
    });

    setFilteredData(filtered);

    // Calculate insights for filtered data
    try {
      const userId = await getUserId();
      const insightsData = await getMoodInsights(userId, days);
      setInsights(insightsData);
    } catch (error) {
      console.error("Error calculating insights:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMoodData();
  };

  const getChartData = () => {
    if (filteredData.length === 0) {
      return {
        labels: ["No data"],
        datasets: [{ data: [0] }],
      };
    }

    const today = new Date();
    let periods: Date[] = [];
    let labels: string[] = [];

    switch (selectedPeriod) {
      case "today":
        // Show hourly data for today
        for (let i = 0; i < 24; i += 4) {
          const date = new Date(today);
          date.setHours(i, 0, 0, 0);
          periods.push(date);
          labels.push(`${i}:00`);
        }
        break;

      case "week":
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          periods.push(date);
        }
        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        labels = periods.map((date) => dayLabels[date.getDay()]);
        break;

      case "month":
        // Last 30 days grouped by weeks
        for (let i = 4; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i * 7);
          periods.push(date);
          labels.push(`Week ${5 - i}`);
        }
        break;

      case "year":
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(date.getMonth() - i);
          periods.push(date);
        }
        const monthLabels = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        labels = periods.map((date) => monthLabels[date.getMonth()]);
        break;
    }

    const data = periods.map((period, index) => {
      let periodEntries: any[] = [];

      if (selectedPeriod === "today") {
        // Group by hour
        const nextHour =
          index < periods.length - 1
            ? periods[index + 1]
            : new Date(today.setHours(23, 59, 59));
        periodEntries = filteredData.filter((entry) => {
          const entryDate = entry.timestamp.toDate();
          return entryDate >= period && entryDate < nextHour;
        });
      } else if (selectedPeriod === "week") {
        // Group by day
        periodEntries = filteredData.filter((entry) => {
          const entryDate = entry.timestamp.toDate();
          return (
            entryDate.getDate() === period.getDate() &&
            entryDate.getMonth() === period.getMonth() &&
            entryDate.getFullYear() === period.getFullYear()
          );
        });
      } else if (selectedPeriod === "month") {
        // Group by week
        const weekEnd = new Date(period);
        weekEnd.setDate(weekEnd.getDate() + 7);
        periodEntries = filteredData.filter((entry) => {
          const entryDate = entry.timestamp.toDate();
          return entryDate >= period && entryDate < weekEnd;
        });
      } else if (selectedPeriod === "year") {
        // Group by month
        periodEntries = filteredData.filter((entry) => {
          const entryDate = entry.timestamp.toDate();
          return (
            entryDate.getMonth() === period.getMonth() &&
            entryDate.getFullYear() === period.getFullYear()
          );
        });
      }

      if (periodEntries.length === 0) return 0;

      const avgMood =
        periodEntries.reduce((sum, entry) => sum + entry.value, 0) /
        periodEntries.length;
      return avgMood;
    });

    return {
      labels,
      datasets: [
        { data: data.length > 0 && data.some((d) => d > 0) ? data : [0] },
      ],
    };
  };

  const getMoodDistribution = () => {
    if (filteredData.length === 0) return [];

    const moodCounts: { [key: string]: number } = {};

    filteredData.forEach((entry) => {
      moodCounts[entry.value] = (moodCounts[entry.value] || 0) + 1;
    });

    return MOODS.map((mood) => {
      const count = moodCounts[mood.value] || 0;
      const percentage = ((count / filteredData.length) * 100).toFixed(1);

      return {
        name: mood.emoji,
        population: count,
        percentage: parseFloat(percentage),
        color: mood.color,
        legendFontColor: "#333",
        legendFontSize: 14,
      };
    }).filter((item) => item.population > 0);
  };

  const getMoodEmoji = (value: number) => {
    if (value === 0) return "😐";
    const mood = MOODS.find((m) => {
      if (value >= 4.5) return m.value === 5;
      if (value >= 3.5) return m.value === 4;
      if (value >= 2.5) return m.value === 3;
      if (value >= 1.5) return m.value === 2;
      return m.value === 1;
    });
    return mood?.emoji || "😐";
  };

  const getPeriodComparison = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentPeriodStart = new Date(today);
    let previousPeriodStart = new Date(today);
    let currentLabel = "Current";
    let previousLabel = "Previous";

    switch (selectedPeriod) {
      case "today":
        currentLabel = "Today";
        previousLabel = "Yesterday";
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        break;
      case "week":
        currentLabel = "This Week";
        previousLabel = "Last Week";
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 14);
        break;
      case "month":
        currentLabel = "This Month";
        previousLabel = "Last Month";
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 30);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 60);
        break;
      case "year":
        currentLabel = "This Year";
        previousLabel = "Last Year";
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 365);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 730);
        break;
    }

    const currentMoods = moodData.filter((entry) => {
      const entryDate = entry.timestamp.toDate();
      return entryDate >= currentPeriodStart;
    });

    const previousMoods = moodData.filter((entry) => {
      const entryDate = entry.timestamp.toDate();
      return entryDate >= previousPeriodStart && entryDate < currentPeriodStart;
    });

    const currentAvg =
      currentMoods.length > 0
        ? currentMoods.reduce((sum, entry) => sum + entry.value, 0) /
          currentMoods.length
        : 0;

    const previousAvg =
      previousMoods.length > 0
        ? previousMoods.reduce((sum, entry) => sum + entry.value, 0) /
          previousMoods.length
        : 0;

    return {
      currentAvg,
      previousAvg,
      currentMood: currentMoods[0],
      previousMood: previousMoods[0],
      currentLabel,
      previousLabel,
    };
  };

  const handleExportPDF = async () => {
    if (filteredData.length === 0) {
      Alert.alert(
        "No Data Available",
        `There is no mood data to export for the ${selectedPeriod} period. Please select a different time period or add some mood entries first.`,
        [{ text: "OK", style: "default" }],
      );
      return;
    }

    // Show period confirmation
    Alert.alert(
      "Export PDF Report",
      `Export your mood report for the ${selectedPeriod.toUpperCase()} period?\n\nThis will include ${filteredData.length} mood entries.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export & Share",
          style: "default",
          onPress: async () => {
            setExporting(true);
            try {
              await generateAndSharePDF({
                period: selectedPeriod,
                insights,
                moodData: filteredData,
                comparison: getPeriodComparison(),
                distribution: getMoodDistribution(),
              });

              Alert.alert(
                "Success! 🎉",
                "Your mood report has been generated and is ready to share! You can save it to your device or share it with others.",
                [{ text: "Great!", style: "default" }],
              );
            } catch (error) {
              console.error("Export error:", error);
              Alert.alert(
                "Export Failed ❌",
                "Unable to generate your mood report. Please check your device permissions and try again.\n\nError: " +
                  (error as Error).message,
                [{ text: "OK", style: "default" }],
              );
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  const chartData = getChartData();
  const comparison = getPeriodComparison();

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case "improving":
        return "📈";
      case "declining":
        return "📉";
      default:
        return "➡️";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "#4caf50";
      case "declining":
        return "#f44336";
      default:
        return "#ffc107";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4caf50"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Statistics</Text>
            <Text style={styles.subtitle}>Track your mood journey</Text>
          </View>
          <TouchableOpacity
            style={styles.exportIcon}
            onPress={handleExportPDF}
            disabled={exporting || filteredData.length === 0}
          >
            {exporting ? (
              <ActivityIndicator color="#4caf50" size="small" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#4caf50" />
            )}
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {["week", "month", "year"].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodChip,
                selectedPeriod === period && styles.periodChipActive,
              ]}
              onPress={() => setSelectedPeriod(period as TimePeriod)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  selectedPeriod === period && styles.periodChipTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        {insights && insights.totalEntries > 0 ? (
          <>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {getMoodEmoji(insights.averageMood)}
                </Text>
                <Text style={styles.metricLabel}>Average</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="flame-outline" size={24} color="#ff9800" />
                <Text style={styles.metricValue}>{insights.currentStreak}</Text>
                <Text style={styles.metricLabel}>Streak</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricEmoji}>
                  {getTrendEmoji(insights.moodTrend)}
                </Text>
                <Text style={styles.metricValue}>{insights.moodTrend}</Text>
                <Text style={styles.metricLabel}>Trend</Text>
              </View>
            </View>

            {/* Mood Trend Chart */}
            {filteredData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Mood Trend</Text>
                <LineChart
                  data={chartData}
                  width={screenWidth - 40}
                  height={200}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                    labelColor: (opacity = 1) =>
                      `rgba(0, 0, 0, ${opacity * 0.6})`,
                    propsForDots: {
                      r: "5",
                      strokeWidth: "2",
                      stroke: "#4caf50",
                    },
                    formatYLabel: (value) => {
                      const numValue = parseFloat(value);
                      if (numValue === 0) return "";
                      return getMoodEmoji(numValue);
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={false}
                  segments={4}
                />
              </View>
            )}

            {/* Mood Distribution */}
            {getMoodDistribution().length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Distribution</Text>
                <View style={styles.distributionGrid}>
                  {getMoodDistribution().map((item, index) => (
                    <View key={index} style={styles.distributionItem}>
                      <View style={styles.distributionBar}>
                        <View
                          style={[
                            styles.distributionFill,
                            {
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.distributionInfo}>
                        <Text style={styles.distributionEmoji}>
                          {item.name}
                        </Text>
                        <Text style={styles.distributionPercent}>
                          {item.percentage}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📊</Text>
            <Text style={styles.emptyStateText}>No data yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start tracking your mood to see insights
            </Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
  },
  exportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#999",
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 10,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodChipActive: {
    backgroundColor: "#4caf50",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  periodChipTextActive: {
    color: "#fff",
  },
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricEmoji: {
    fontSize: 28,
  },
  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  distributionGrid: {
    gap: 16,
  },
  distributionItem: {
    gap: 8,
  },
  distributionBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  distributionFill: {
    height: "100%",
    borderRadius: 4,
  },
  distributionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distributionEmoji: {
    fontSize: 20,
  },
  distributionPercent: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});
