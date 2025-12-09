import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MoodInsights } from '../types/mood';

const MOODS_COLLECTION = 'moods';
const USER_ID_KEY = '@moody_user_id';

// Generate or retrieve a unique user ID
export async function getUserId(): Promise<string> {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return `user_${Date.now()}`;
  }
}

// Save or update a mood entry with optional note
export async function saveMood(
  mood: string, 
  emoji: string, 
  value: number, 
  note?: string
): Promise<void> {
  try {
    const userId = await getUserId();
    
    // Check if there's already a mood entry for today
    const existingMood = await getTodaysMood(userId);
    
    if (existingMood) {
      // Update existing mood
      const moodRef = doc(db, MOODS_COLLECTION, existingMood.id);
      await updateDoc(moodRef, {
        mood,
        emoji,
        value,
        note: note || '',
        timestamp: new Date(), // Update timestamp to current time
      });
    } else {
      // Create new mood entry
      await addDoc(collection(db, MOODS_COLLECTION), {
        mood,
        emoji,
        value,
        userId,
        timestamp: new Date(),
        note: note || '',
      });
    }
  } catch (error) {
    console.error('Error saving mood:', error);
    throw error;
  }
}

// Get mood entries for a user
export async function getMoodEntries(userId: string, days: number = 7): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const q = query(
      collection(db, MOODS_COLLECTION),
      where('userId', '==', userId),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const entries: any[] = [];
    
    querySnapshot.forEach((doc) => {
      entries.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return entries;
  } catch (error) {
    console.error('Error getting mood entries:', error);
    throw error;
  }
}

// Get today's mood
export async function getTodaysMood(userId: string): Promise<any | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, MOODS_COLLECTION),
      where('userId', '==', userId),
      where('timestamp', '>=', today),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting today\'s mood:', error);
    throw error;
  }
}

// Get mood insights
export async function getMoodInsights(userId: string, days: number = 30): Promise<MoodInsights> {
  try {
    const entries = await getMoodEntries(userId, days);
    
    if (entries.length === 0) {
      return {
        averageMood: 0,
        mostCommonMood: 'No data',
        currentStreak: 0,
        totalEntries: 0,
        moodTrend: 'stable',
      };
    }

    // Calculate average mood
    const averageMood = entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;

    // Find most common mood
    const moodCounts: { [key: string]: number } = {};
    entries.forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );

    // Calculate current streak (consecutive days with entries)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    
    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      const hasEntry = entries.some(entry => {
        const entryDate = entry.timestamp.toDate();
        return (
          entryDate.getDate() === checkDate.getDate() &&
          entryDate.getMonth() === checkDate.getMonth() &&
          entryDate.getFullYear() === checkDate.getFullYear()
        );
      });
      
      if (hasEntry) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate mood trend (last week vs previous week)
    const lastWeek = entries.filter(e => {
      const daysDiff = Math.floor((Date.now() - e.timestamp.toDate().getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7;
    });
    
    const previousWeek = entries.filter(e => {
      const daysDiff = Math.floor((Date.now() - e.timestamp.toDate().getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 7 && daysDiff <= 14;
    });

    let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (lastWeek.length > 0 && previousWeek.length > 0) {
      const lastWeekAvg = lastWeek.reduce((sum, e) => sum + e.value, 0) / lastWeek.length;
      const previousWeekAvg = previousWeek.reduce((sum, e) => sum + e.value, 0) / previousWeek.length;
      
      if (lastWeekAvg > previousWeekAvg + 0.3) {
        moodTrend = 'improving';
      } else if (lastWeekAvg < previousWeekAvg - 0.3) {
        moodTrend = 'declining';
      }
    }

    return {
      averageMood,
      mostCommonMood,
      currentStreak,
      totalEntries: entries.length,
      moodTrend,
    };
  } catch (error) {
    console.error('Error getting mood insights:', error);
    throw error;
  }
}

// Get all mood entries (for history)
export async function getAllMoodEntries(userId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, MOODS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const querySnapshot = await getDocs(q);
    const entries: any[] = [];
    
    querySnapshot.forEach((doc) => {
      entries.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return entries;
  } catch (error) {
    console.error('Error getting all mood entries:', error);
    throw error;
  }
}
