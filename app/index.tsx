import React, { useEffect, useState } from 'react';
import { Alert, Animated, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getTodaysMood, getUserId, saveMood } from '../services/moodService';
import { MOODS } from '../types/mood';

export default function Index() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [todaysMood, setTodaysMood] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

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

  const loadTodaysMood = async () => {
    try {
      const userId = await getUserId();
      const mood = await getTodaysMood(userId);
      setTodaysMood(mood);
      if (mood) {
        setSelectedMood(mood.emoji);
        setNote(mood.note || '');
      }
    } catch (error) {
      console.error('Error loading today\'s mood:', error);
    }
  };

  const handleMoodSelect = (mood: typeof MOODS[0]) => {
    setSelectedMood(mood.emoji);
    setShowNoteInput(true);
  };

  const handleSaveMood = async () => {
    if (!selectedMood) return;
    
    setLoading(true);
    Keyboard.dismiss();

    try {
      const mood = MOODS.find(m => m.emoji === selectedMood);
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
        
        Alert.alert(
          '✨ Success', 
          isUpdating ? 'Your mood has been updated!' : 'Your mood has been saved!',
          [{ text: 'OK', onPress: () => {} }]
        );
        await loadTodaysMood();
        setShowNoteInput(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save mood. Please try again.');
      console.error('Error saving mood:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Text style={styles.title}>How are you feeling today?</Text>
      
      {todaysMood && (
        <View style={styles.todayMoodContainer}>
          <Text style={styles.todayMoodText}>
            Today's mood: {todaysMood.emoji} {todaysMood.mood}
          </Text>
          {todaysMood.note && (
            <Text style={styles.todayNoteText}>"{todaysMood.note}"</Text>
          )}
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
            activeOpacity={0.7}
          >
            <View style={[styles.moodColorIndicator, { backgroundColor: mood.color }]} />
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <View style={styles.moodTextContainer}>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {showNoteInput && (
        <Animated.View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Add a note (optional):</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="How was your day? What made you feel this way?"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.characterCount}>{note.length}/200</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowNoteInput(false);
                setNote('');
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
                {loading ? 'Saving...' : 'Save Mood'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
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
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todayMoodText: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: '600',
    textAlign: 'center',
  },
  todayNoteText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  moodsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  selectedMood: {
    backgroundColor: '#e8f5e9',
    borderWidth: 3,
    borderColor: '#4caf50',
    transform: [{ scale: 1.02 }],
  },
  moodColorIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  emoji: {
    fontSize: 40,
    marginLeft: 10,
    marginRight: 20,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  noteInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
