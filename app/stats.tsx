import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import LoadingScreen from "../components/LoadingScreen";
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

  // Animations - Start with values at 1 to avoid gray card flash
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const periodAnims = useRef(
    ["week", "month", "year"].map(() => new Animated.Value(1)),
  ).current;
  const metricAnims = useRef(
    [0, 1, 2].map(() => new Animated.Value(1)),
  ).current;
  const chartAnims = useRef([0, 1, 2].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    loadMoodData();
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
        name: "", // Empty string to hide default legend
        label: mood.label,
        image: mood.image,
        population: count,
        percentage: parseFloat(percentage),
        color: mood.color,
        legendFontColor: "#333",
        legendFontSize: 14,
      };
    }).filter((item) => item.population > 0);
  };

  const getMoodEmoji = (value: number) => {
    if (value === 0) return MOODS.find((m) => m.value === 3)?.image;
    const mood = MOODS.find((m) => {
      if (value >= 4.5) return m.value === 5;
      if (value >= 3.5) return m.value === 4;
      if (value >= 2.5) return m.value === 3;
      if (value >= 1.5) return m.value === 2;
      return m.value === 1;
    });
    return mood?.image || MOODS.find((m) => m.value === 3)?.image;
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
    return <LoadingScreen message="Analyzing your mood data..." />;
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
        {/* Header with Gradient */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
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
              <Text style={styles.title}>Statistics</Text>
              <Text style={styles.subtitle}>Track your mood journey</Text>
            </View>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportPDF}
              disabled={exporting || filteredData.length === 0}
            >
              {exporting ? (
                <ActivityIndicator color="#4caf50" size="small" />
              ) : (
                <Ionicons name="download-outline" size={24} color="white" />
              )}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {["week", "month", "year"].map((period, index) => (
            <Animated.View
              key={period}
              style={[
                styles.periodChipWrapper,
                {
                  opacity: periodAnims[index],
                  transform: [
                    {
                      scale: periodAnims[index].interpolate({
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
            </Animated.View>
          ))}
        </View>

        {/* Key Metrics */}
        {insights && insights.totalEntries > 0 ? (
          <>
            <View style={styles.metricsRow}>
              <Animated.View
                style={[
                  styles.metricCardWrapper,
                  {
                    opacity: metricAnims[0],
                    transform: [
                      {
                        translateY: metricAnims[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                      {
                        scale: metricAnims[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.metricCard}>
                  <View
                    style={[
                      styles.metricIconBg,
                      { backgroundColor: "#e8f5e9" },
                    ]}
                  >
                    <Image
                      source={getMoodEmoji(insights.averageMood)}
                      style={styles.metricEmoji}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.metricValue}>
                    {insights.averageMood.toFixed(1)}
                  </Text>
                  <Text style={styles.metricLabel}>Average</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.metricCardWrapper,
                  {
                    opacity: metricAnims[1],
                    transform: [
                      {
                        translateY: metricAnims[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                      {
                        scale: metricAnims[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.metricCard}>
                  <View
                    style={[
                      styles.metricIconBg,
                      { backgroundColor: "#fff3e0" },
                    ]}
                  >
                    <Ionicons name="flame" size={28} color="#ff9800" />
                  </View>
                  <Text style={styles.metricValue}>
                    {insights.currentStreak}
                  </Text>
                  <Text style={styles.metricLabel}>Streak</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.metricCardWrapper,
                  {
                    opacity: metricAnims[2],
                    transform: [
                      {
                        translateY: metricAnims[2].interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                      {
                        scale: metricAnims[2].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.metricCard}>
                  <View
                    style={[
                      styles.metricIconBg,
                      {
                        backgroundColor:
                          insights.moodTrend === "improving"
                            ? "#e8f5e9"
                            : insights.moodTrend === "declining"
                              ? "#ffebee"
                              : "#fff8e1",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        insights.moodTrend === "improving"
                          ? "trending-up"
                          : insights.moodTrend === "declining"
                            ? "trending-down"
                            : "stats-chart"
                      }
                      size={28}
                      color={getTrendColor(insights.moodTrend)}
                    />
                  </View>
                  <Text
                    style={[
                      styles.metricValue,
                      { fontSize: 16, textTransform: "capitalize" },
                    ]}
                  >
                    {insights.moodTrend}
                  </Text>
                  <Text style={styles.metricLabel}>Trend</Text>
                </View>
              </Animated.View>
            </View>

            {/* Mood Trend Chart */}
            {filteredData.length > 0 && (
              <Animated.View
                style={[
                  styles.chartCardWrapper,
                  {
                    opacity: chartAnims[0],
                    transform: [
                      {
                        translateY: chartAnims[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [40, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Ionicons name="analytics" size={20} color="#4caf50" />
                    <Text style={styles.chartTitle}>Mood Trend</Text>
                  </View>
                  <View style={styles.chartWrapper}>
                    <LineChart
                      data={chartData}
                      width={screenWidth - 60}
                      height={220}
                      chartConfig={{
                        backgroundColor: "#f8f9fa",
                        backgroundGradientFrom: "#ffffff",
                        backgroundGradientTo: "#f8f9fa",
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                        labelColor: (opacity = 1) =>
                          `rgba(0, 0, 0, ${opacity * 0.7})`,
                        propsForDots: {
                          r: "6",
                          strokeWidth: "3",
                          stroke: "#4caf50",
                          fill: "#ffffff",
                        },
                        strokeWidth: 3,
                        propsForBackgroundLines: {
                          strokeDasharray: "",
                          stroke: "#e0e0e0",
                          strokeWidth: 1,
                        },
                        propsForLabels: {
                          fontSize: 9,
                        },
                      }}
                      bezier
                      style={styles.chart}
                      withInnerLines={true}
                      withOuterLines={true}
                      withShadow={true}
                      segments={4}
                      yAxisLabel=""
                      yAxisSuffix=""
                      formatYLabel={(value) => {
                        const numValue = Math.round(parseFloat(value));
                        switch (numValue) {
                          case 1:
                            return "Very Sad";
                          case 2:
                            return "Sad";
                          case 3:
                            return "Neutral";
                          case 4:
                            return "Happy";
                          case 5:
                            return "Very Happy";
                          default:
                            return "";
                        }
                      }}
                    />
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Period Comparison */}
            {filteredData.length > 0 && comparison.previousAvg > 0 && (
              <Animated.View
                style={[
                  styles.chartCardWrapper,
                  {
                    opacity: chartAnims[1],
                    transform: [
                      {
                        translateY: chartAnims[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [40, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Ionicons name="git-compare" size={20} color="#4caf50" />
                    <Text style={styles.chartTitle}>Period Comparison</Text>
                  </View>
                  <View style={styles.comparisonContainer}>
                    <View style={styles.comparisonItem}>
                      <Text style={styles.comparisonLabel}>
                        {comparison.currentLabel}
                      </Text>
                      <View style={styles.comparisonEmojiContainer}>
                        <Image
                          source={getMoodEmoji(comparison.currentAvg)}
                          style={styles.comparisonEmoji}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.comparisonValue}>
                        {comparison.currentAvg.toFixed(1)}
                      </Text>
                    </View>

                    <View style={styles.comparisonDivider}>
                      <View
                        style={[
                          styles.comparisonArrowBg,
                          {
                            backgroundColor:
                              comparison.currentAvg > comparison.previousAvg
                                ? "#e8f5e9"
                                : comparison.currentAvg < comparison.previousAvg
                                  ? "#ffebee"
                                  : "#fff8e1",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            comparison.currentAvg > comparison.previousAvg
                              ? "trending-up"
                              : comparison.currentAvg < comparison.previousAvg
                                ? "trending-down"
                                : "remove"
                          }
                          size={28}
                          color={
                            comparison.currentAvg > comparison.previousAvg
                              ? "#4caf50"
                              : comparison.currentAvg < comparison.previousAvg
                                ? "#f44336"
                                : "#ffc107"
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.comparisonItem}>
                      <Text style={styles.comparisonLabel}>
                        {comparison.previousLabel}
                      </Text>
                      <View style={styles.comparisonEmojiContainer}>
                        <Image
                          source={getMoodEmoji(comparison.previousAvg)}
                          style={styles.comparisonEmoji}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.comparisonValue}>
                        {comparison.previousAvg.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Mood Distribution */}
            {getMoodDistribution().length > 0 && (
              <Animated.View
                style={[
                  styles.chartCardWrapper,
                  {
                    opacity: chartAnims[2],
                    transform: [
                      {
                        translateY: chartAnims[2].interpolate({
                          inputRange: [0, 1],
                          outputRange: [40, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Ionicons name="pie-chart" size={20} color="#4caf50" />
                    <Text style={styles.chartTitle}>Mood Distribution</Text>
                  </View>
                  <View style={styles.distributionContainer}>
                    {/* Pie Chart Section */}
                    <View style={styles.pieChartSection}>
                      <PieChart
                        data={getMoodDistribution()}
                        width={140}
                        height={160}
                        chartConfig={{
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor="percentage"
                        backgroundColor="transparent"
                        paddingLeft="30"
                        center={[0, -10]}
                        hasLegend={false}
                      />
                    </View>

                    {/* Legend Section on Right */}
                    <View style={styles.legendSection}>
                      {getMoodDistribution().map((item, index) => (
                        <View key={index} style={styles.legendItemHorizontal}>
                          <View style={styles.legendItemLeft}>
                            <View
                              style={[
                                styles.legendColorDot,
                                { backgroundColor: item.color },
                              ]}
                            />
                            <Image
                              source={item.image}
                              style={styles.legendEmojiSmall}
                              resizeMode="contain"
                            />
                          </View>
                          <View style={styles.legendItemRight}>
                            <Text style={styles.legendTextSmall}>
                              {item.label}
                            </Text>
                            <View style={styles.legendStatsRow}>
                              <Text style={styles.legendCount}>
                                {item.population}{" "}
                                {item.population === 1 ? "entry" : "entries"}
                              </Text>
                              <Text style={styles.legendPercentageLarge}>
                                {item.percentage}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}
          </>
        ) : (
          <Animated.View
            style={[
              styles.emptyState,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="bar-chart-outline" size={60} color="#ccc" />
            </View>
            <Text style={styles.emptyStateText}>No data yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start tracking your mood to see insights
            </Text>
          </Animated.View>
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
  exportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  periodChipWrapper: {
    flex: 1,
  },
  periodChip: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  periodChipActive: {
    backgroundColor: "#4caf50",
    shadowColor: "#4caf50",
    shadowOpacity: 0.3,
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: "700",
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
  metricCardWrapper: {
    flex: 1,
  },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  metricIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  metricEmoji: {
    width: 36,
    height: 36,
  },
  chartCardWrapper: {
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 15,
  },
  comparisonItem: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  comparisonLabel: {
    fontSize: 11,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  comparisonEmojiContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonEmoji: {
    width: 50,
    height: 50,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  comparisonDivider: {
    paddingHorizontal: 15,
  },
  comparisonArrowBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
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
  distributionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  pieChartSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  legendSection: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 5,
  },
  legendItemHorizontal: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  legendItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  legendItemRight: {
    flex: 1,
  },
  legendColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendEmojiSmall: {
    width: 28,
    height: 28,
  },
  legendTextSmall: {
    fontSize: 13,
    color: "#333",
    fontWeight: "700",
    marginBottom: 3,
  },
  legendStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendCount: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  legendPercentageLarge: {
    fontSize: 13,
    color: "#4caf50",
    fontWeight: "800",
  },
});
