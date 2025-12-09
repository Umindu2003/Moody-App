import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getMoodEntries, getUserId } from '../services/moodService';

const screenWidth = Dimensions.get('window').width;

export default function Stats() {
  const [moodData, setMoodData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoodData();
  }, []);

  const loadMoodData = async () => {
    try {
      const userId = await getUserId();
      const entries = await getMoodEntries(userId, 7);
      setMoodData(entries);
    } catch (error) {
      console.error('Error loading mood data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (moodData.length === 0) {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ data: [0] }],
      };
    }

    // Get last 7 days
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last7Days.push(date);
    }

    // Map mood entries to days
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = last7Days.map(date => dayLabels[date.getDay()]);
    
    const data = last7Days.map(date => {
      const dayEntries = moodData.filter(entry => {
        const entryDate = entry.timestamp.toDate();
        return (
          entryDate.getDate() === date.getDate() &&
          entryDate.getMonth() === date.getMonth() &&
          entryDate.getFullYear() === date.getFullYear()
        );
      });

      if (dayEntries.length === 0) return 0;
      
      // Average mood for the day
      const avgMood = dayEntries.reduce((sum, entry) => sum + entry.value, 0) / dayEntries.length;
      return avgMood;
    });

    return {
      labels,
      datasets: [{ data: data.length > 0 ? data : [0] }],
    };
  };

  const getTodayYesterdayComparison = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayMoods = moodData.filter(entry => {
      const entryDate = entry.timestamp.toDate();
      return entryDate >= today;
    });

    const yesterdayMoods = moodData.filter(entry => {
      const entryDate = entry.timestamp.toDate();
      return entryDate >= yesterday && entryDate < today;
    });

    const todayAvg = todayMoods.length > 0
      ? todayMoods.reduce((sum, entry) => sum + entry.value, 0) / todayMoods.length
      : 0;

    const yesterdayAvg = yesterdayMoods.length > 0
      ? yesterdayMoods.reduce((sum, entry) => sum + entry.value, 0) / yesterdayMoods.length
      : 0;

    return { todayAvg, yesterdayAvg, todayMood: todayMoods[0], yesterdayMood: yesterdayMoods[0] };
  };

  const chartData = getChartData();
  const comparison = getTodayYesterdayComparison();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Mood Statistics</Text>

      {/* Today vs Yesterday Comparison */}
      <View style={styles.comparisonContainer}>
        <Text style={styles.sectionTitle}>Today vs Yesterday</Text>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>Yesterday</Text>
            <Text style={styles.comparisonEmoji}>
              {comparison.yesterdayMood ? comparison.yesterdayMood.emoji : '😐'}
            </Text>
            <Text style={styles.comparisonValue}>
              {comparison.yesterdayAvg > 0 ? comparison.yesterdayAvg.toFixed(1) : 'No data'}
            </Text>
          </View>
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>Today</Text>
            <Text style={styles.comparisonEmoji}>
              {comparison.todayMood ? comparison.todayMood.emoji : '😐'}
            </Text>
            <Text style={styles.comparisonValue}>
              {comparison.todayAvg > 0 ? comparison.todayAvg.toFixed(1) : 'No data'}
            </Text>
          </View>
        </View>
      </View>

      {/* 7-Day Trend */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>7-Day Mood Trend</Text>
        {moodData.length > 0 ? (
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
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
            }}
            bezier
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>No mood data yet. Start tracking your mood!</Text>
        )}
      </View>

      {/* Recent Moods */}
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Recent Moods</Text>
        {moodData.length > 0 ? (
          moodData.slice(0, 5).map((entry, index) => (
            <View key={entry.id} style={styles.recentItem}>
              <Text style={styles.recentEmoji}>{entry.emoji}</Text>
              <View style={styles.recentInfo}>
                <Text style={styles.recentMood}>{entry.mood}</Text>
                <Text style={styles.recentDate}>
                  {entry.timestamp.toDate().toLocaleDateString()} at{' '}
                  {entry.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No moods recorded yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
    color: '#333',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#666',
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
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentEmoji: {
    fontSize: 32,
    marginRight: 15,
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
  recentDate: {
    fontSize: 14,
    color: '#999',
  },
});