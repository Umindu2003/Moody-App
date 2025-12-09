import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { getMoodEntries, getMoodInsights, getUserId } from '../services/moodService';
import { generateAndSharePDF } from '../services/pdfExportService';
import { MOODS, MoodInsights } from '../types/mood';

const screenWidth = Dimensions.get('window').width;

type TimePeriod = 'today' | 'week' | 'month' | 'year';

export default function Stats() {
  const [moodData, setMoodData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [insights, setInsights] = useState<MoodInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');
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

  useEffect(() => {
    filterDataByPeriod();
  }, [selectedPeriod, moodData]);

  const getDaysForPeriod = (period: TimePeriod): number => {
    switch (period) {
      case 'today': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 7;
    }
  };

  const loadMoodData = async () => {
    try {
      const userId = await getUserId();
      // Load enough data for year view
      const entries = await getMoodEntries(userId, 365);
      setMoodData(entries);
    } catch (error) {
      console.error('Error loading mood data:', error);
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

    const filtered = moodData.filter(entry => {
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
      console.error('Error calculating insights:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMoodData();
  };

  const getChartData = () => {
    if (filteredData.length === 0) {
      return {
        labels: ['No data'],
        datasets: [{ data: [0] }],
      };
    }

    const today = new Date();
    let periods: Date[] = [];
    let labels: string[] = [];

    switch (selectedPeriod) {
      case 'today':
        // Show hourly data for today
        for (let i = 0; i < 24; i += 4) {
          const date = new Date(today);
          date.setHours(i, 0, 0, 0);
          periods.push(date);
          labels.push(`${i}:00`);
        }
        break;
      
      case 'week':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          periods.push(date);
        }
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        labels = periods.map(date => dayLabels[date.getDay()]);
        break;
      
      case 'month':
        // Last 30 days grouped by weeks
        for (let i = 4; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - (i * 7));
          periods.push(date);
          labels.push(`Week ${5 - i}`);
        }
        break;
      
      case 'year':
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(date.getMonth() - i);
          periods.push(date);
        }
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels = periods.map(date => monthLabels[date.getMonth()]);
        break;
    }

    const data = periods.map((period, index) => {
      let periodEntries: any[] = [];

      if (selectedPeriod === 'today') {
        // Group by hour
        const nextHour = index < periods.length - 1 ? periods[index + 1] : new Date(today.setHours(23, 59, 59));
        periodEntries = filteredData.filter(entry => {
          const entryDate = entry.timestamp.toDate();
          return entryDate >= period && entryDate < nextHour;
        });
      } else if (selectedPeriod === 'week') {
        // Group by day
        periodEntries = filteredData.filter(entry => {
          const entryDate = entry.timestamp.toDate();
          return (
            entryDate.getDate() === period.getDate() &&
            entryDate.getMonth() === period.getMonth() &&
            entryDate.getFullYear() === period.getFullYear()
          );
        });
      } else if (selectedPeriod === 'month') {
        // Group by week
        const weekEnd = new Date(period);
        weekEnd.setDate(weekEnd.getDate() + 7);
        periodEntries = filteredData.filter(entry => {
          const entryDate = entry.timestamp.toDate();
          return entryDate >= period && entryDate < weekEnd;
        });
      } else if (selectedPeriod === 'year') {
        // Group by month
        periodEntries = filteredData.filter(entry => {
          const entryDate = entry.timestamp.toDate();
          return (
            entryDate.getMonth() === period.getMonth() &&
            entryDate.getFullYear() === period.getFullYear()
          );
        });
      }

      if (periodEntries.length === 0) return 0;
      
      const avgMood = periodEntries.reduce((sum, entry) => sum + entry.value, 0) / periodEntries.length;
      return avgMood;
    });

    return {
      labels,
      datasets: [{ data: data.length > 0 && data.some(d => d > 0) ? data : [0] }],
    };
  };

  const getMoodDistribution = () => {
    if (filteredData.length === 0) return [];

    const moodCounts: { [key: string]: number } = {};
    
    filteredData.forEach(entry => {
      moodCounts[entry.value] = (moodCounts[entry.value] || 0) + 1;
    });

    return MOODS.map(mood => {
      const count = moodCounts[mood.value] || 0;
      const percentage = ((count / filteredData.length) * 100).toFixed(1);
      
      return {
        name: mood.emoji,
        population: count,
        percentage: parseFloat(percentage),
        color: mood.color,
        legendFontColor: '#333',
        legendFontSize: 14,
      };
    }).filter(item => item.population > 0);
  };

  const getMoodEmoji = (value: number) => {
    if (value === 0) return '😐';
    const mood = MOODS.find(m => {
      if (value >= 4.5) return m.value === 5;
      if (value >= 3.5) return m.value === 4;
      if (value >= 2.5) return m.value === 3;
      if (value >= 1.5) return m.value === 2;
      return m.value === 1;
    });
    return mood?.emoji || '😐';
  };

  const getPeriodComparison = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentPeriodStart = new Date(today);
    let previousPeriodStart = new Date(today);
    let currentLabel = 'Current';
    let previousLabel = 'Previous';

    switch (selectedPeriod) {
      case 'today':
        currentLabel = 'Today';
        previousLabel = 'Yesterday';
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        break;
      case 'week':
        currentLabel = 'This Week';
        previousLabel = 'Last Week';
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 14);
        break;
      case 'month':
        currentLabel = 'This Month';
        previousLabel = 'Last Month';
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 30);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 60);
        break;
      case 'year':
        currentLabel = 'This Year';
        previousLabel = 'Last Year';
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 365);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 730);
        break;
    }

    const currentMoods = moodData.filter(entry => {
      const entryDate = entry.timestamp.toDate();
      return entryDate >= currentPeriodStart;
    });

    const previousMoods = moodData.filter(entry => {
      const entryDate = entry.timestamp.toDate();
      return entryDate >= previousPeriodStart && entryDate < currentPeriodStart;
    });

    const currentAvg = currentMoods.length > 0
      ? currentMoods.reduce((sum, entry) => sum + entry.value, 0) / currentMoods.length
      : 0;

    const previousAvg = previousMoods.length > 0
      ? previousMoods.reduce((sum, entry) => sum + entry.value, 0) / previousMoods.length
      : 0;

    return { 
      currentAvg, 
      previousAvg, 
      currentMood: currentMoods[0], 
      previousMood: previousMoods[0],
      currentLabel,
      previousLabel
    };
  };

  const handleExportPDF = async () => {
    if (filteredData.length === 0) {
      Alert.alert('No Data', 'There is no mood data to export for this period.');
      return;
    }

    setExporting(true);
    try {
      await generateAndSharePDF({
        period: selectedPeriod,
        insights,
        moodData: filteredData,
        comparison: getPeriodComparison(),
        distribution: getMoodDistribution(),
      });
      
      Alert.alert('Success', 'Report generated and ready to share!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Unable to generate report. Please try again.');
    } finally {
      setExporting(false);
    }
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
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#4caf50';
      case 'declining': return '#f44336';
      default: return '#ffc107';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Your Mood Statistics</Text>
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleExportPDF}
            disabled={exporting || filteredData.length === 0}
          >
            {exporting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.exportButtonText}>Export</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'today' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'today' && styles.periodTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'year' && styles.periodTextActive]}>
              Year
            </Text>
          </TouchableOpacity>
        </View>

        {/* Insights Cards */}
        {insights && insights.totalEntries > 0 && (
          <View style={styles.insightsGrid}>
            <View style={[styles.insightCard, { backgroundColor: '#e3f2fd' }]}>
              <Text style={styles.insightValue}>{insights.averageMood.toFixed(1)}</Text>
              <Text style={styles.insightLabel}>Average Mood</Text>
              <Text style={styles.insightSubtext}>out of 5.0</Text>
            </View>
            
            <View style={[styles.insightCard, { backgroundColor: '#f3e5f5' }]}>
              <Text style={styles.insightValue}>{insights.currentStreak}</Text>
              <Text style={styles.insightLabel}>Day Streak</Text>
              <Text style={styles.insightSubtext}>Keep it up! 🔥</Text>
            </View>
            
            <View style={[styles.insightCard, { backgroundColor: '#fff3e0' }]}>
              <Text style={styles.insightValue}>{insights.totalEntries}</Text>
              <Text style={styles.insightLabel}>Total Entries</Text>
              <Text style={styles.insightSubtext}>in this period</Text>
            </View>
            
            <View style={[styles.insightCard, { backgroundColor: getTrendColor(insights.moodTrend) + '20' }]}>
              <Text style={styles.insightValue}>{getTrendEmoji(insights.moodTrend)}</Text>
              <Text style={styles.insightLabel}>Mood Trend</Text>
              <Text style={[styles.insightSubtext, { color: getTrendColor(insights.moodTrend) }]}>
                {insights.moodTrend}
              </Text>
            </View>
          </View>
        )}

      {/* Period Comparison */}
      <View style={styles.comparisonContainer}>
        <Text style={styles.sectionTitle}>Period Comparison</Text>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>{comparison.previousLabel}</Text>
            <Text style={styles.comparisonEmoji}>
              {comparison.previousMood ? comparison.previousMood.emoji : '😐'}
            </Text>
            <Text style={styles.comparisonValue}>
              {comparison.previousAvg > 0 ? comparison.previousAvg.toFixed(1) : 'No data'}
            </Text>
          </View>
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>{comparison.currentLabel}</Text>
            <Text style={styles.comparisonEmoji}>
              {comparison.currentMood ? comparison.currentMood.emoji : '😐'}
            </Text>
            <Text style={styles.comparisonValue}>
              {comparison.currentAvg > 0 ? comparison.currentAvg.toFixed(1) : 'No data'}
            </Text>
          </View>
        </View>
      </View>

      {/* Mood Distribution Pie Chart */}
      {filteredData.length > 0 && getMoodDistribution().length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Mood Distribution</Text>
          <PieChart
            data={getMoodDistribution()}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={styles.chart}
          />
          <View style={styles.legendContainer}>
            {getMoodDistribution().map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <Text style={styles.legendEmoji}>{item.name}</Text>
                <View style={styles.legendInfo}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>
                    {item.percentage}% ({item.population} entries)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Mood Trend Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Mood Trend</Text>
        {filteredData.length > 0 ? (
          <>
            <LineChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#4caf50',
                },
                formatYLabel: (value) => getMoodEmoji(parseFloat(value)),
              }}
              bezier
              style={styles.chart}
              withInnerLines={false}
              segments={4}
            />
            <View style={styles.chartLegend}>
              {MOODS.map((mood) => (
                <View key={mood.value} style={styles.chartLegendItem}>
                  <Text style={styles.chartLegendEmoji}>{mood.emoji}</Text>
                  <Text style={styles.chartLegendText}>{mood.label}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.noDataText}>No mood data yet. Start tracking your mood!</Text>
        )}
      </View>

      {/* Recent Moods */}
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Recent Moods in {selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : selectedPeriod === 'month' ? 'This Month' : 'This Year'}</Text>
        {filteredData.length > 0 ? (
          filteredData.slice(0, 10).map((entry, index) => (
            <View key={entry.id} style={styles.recentItem}>
              <Text style={styles.recentEmoji}>{entry.emoji}</Text>
              <View style={styles.recentInfo}>
                <Text style={styles.recentMood}>{entry.mood}</Text>
                {entry.note && (
                  <Text style={styles.recentNote} numberOfLines={2}>
                    "{entry.note}"
                  </Text>
                )}
                <Text style={styles.recentDate}>
                  {entry.timestamp.toDate().toLocaleDateString()} at{' '}
                  {entry.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📊</Text>
            <Text style={styles.emptyStateText}>No moods recorded yet</Text>
            <Text style={styles.emptyStateSubtext}>Start tracking your mood to see statistics!</Text>
          </View>
        )}
      </View>
    </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4caf50',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodTextActive: {
    color: 'white',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  insightCard: {
    flex: 1,
    minWidth: (screenWidth - 60) / 2,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 3,
  },
  insightSubtext: {
    fontSize: 12,
    color: '#999',
  },
  comparisonContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  comparisonCard: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  comparisonEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  chartContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 15,
    gap: 8,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chartLegendEmoji: {
    fontSize: 18,
    marginRight: 5,
  },
  chartLegendText: {
    fontSize: 11,
    color: '#666',
  },
  legendContainer: {
    marginTop: 15,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legendEmoji: {
    fontSize: 28,
    width: 40,
  },
  legendInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    padding: 20,
  },
  recentContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentEmoji: {
    fontSize: 32,
    marginRight: 15,
    marginTop: 4,
  },
  recentInfo: {
    flex: 1,
  },
  recentMood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
    lineHeight: 20,
  },
  recentDate: {
    fontSize: 13,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});