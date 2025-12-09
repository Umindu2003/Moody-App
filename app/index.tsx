import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTodaysMood, getUserId, saveMood } from '../services/moodService';
import { MOODS } from '../types/mood';

export default function Index() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [todaysMood, setTodaysMood] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTodaysMood();
  }, []);

  const loadTodaysMood = async () => {
    try {
      const userId = await getUserId();
      const mood = await getTodaysMood(userId);
      setTodaysMood(mood);
      if (mood) {
        setSelectedMood(mood.emoji);
      }
    } catch (error) {
      console.error('Error loading today\'s mood:', error);
    }
  };

  const handleMoodSelect = async (mood: typeof MOODS[0]) => {
    setSelectedMood(mood.emoji);
    setLoading(true);

    try {
      await saveMood(mood.label, mood.emoji, mood.value);
      Alert.alert('Success', 'Your mood has been saved!');
      await loadTodaysMood();
    } catch (error) {
      Alert.alert('Error', 'Failed to save mood. Please check your Firebase configuration.');
      console.error('Error saving mood:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you feeling today?</Text>
      
      {todaysMood && (
        <View style={styles.todayMoodContainer}>
          <Text style={styles.todayMoodText}>Today's mood: {todaysMood.emoji}</Text>
        </View>
      )}

      <View style={styles.moodsContainer}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.moodButton,
              selectedMood === mood.emoji && styles.selectedMood,
            ]}
            onPress={() => handleMoodSelect(mood)}
            disabled={loading}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <Text style={styles.loadingText}>Saving...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  todayMoodContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  todayMoodText: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: '600',
  },
  moodsContainer: {
    flexDirection: 'column',
    gap: 15,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedMood: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  emoji: {
    fontSize: 40,
    marginRight: 20,
  },
  moodLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});
