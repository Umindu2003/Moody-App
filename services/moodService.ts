import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

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

// Save a mood entry
export async function saveMood(mood: string, emoji: string, value: number): Promise<void> {
  try {
    const userId = await getUserId();
    await addDoc(collection(db, MOODS_COLLECTION), {
      mood,
      emoji,
      value,
      userId,
      timestamp: new Date(),
    });
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
