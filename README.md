# Moody - Mood Tracking App 😊

A React Native mobile app built with Expo that helps you track your daily moods and visualize mood trends over time.

## Features

- 📊 Track your mood with emoji selections (Very Happy, Happy, Neutral, Sad, Very Sad)
- 📈 View mood statistics and trends over the last 7 days
- 📅 Compare today's mood with yesterday
- 🔥 Firebase backend for data persistence
- 📱 Beautiful, intuitive UI with tab navigation

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Click on "Add app" and select the Web platform (</> icon)
4. Register your app and copy the Firebase configuration
5. Open `config/firebase.ts` and replace the placeholder values with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select your preferred region
5. Click "Enable"

### 4. Configure Firestore Rules (Optional but Recommended)

Replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /moods/{document=**} {
      allow read, write: if true;  // For development only
    }
  }
}
```

For production, implement proper authentication and security rules.

### 5. Run the App

```bash
npx expo start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your phone

## Project Structure

```
Moody/
├── app/
│   ├── _layout.tsx       # Tab navigation layout
│   ├── index.tsx         # Mood tracking screen
│   ├── stats.tsx         # Statistics and graphs screen
│   └── global.css        # Global styles
├── config/
│   └── firebase.ts       # Firebase configuration
├── services/
│   └── moodService.ts    # Firebase Firestore operations
├── types/
│   └── mood.ts           # TypeScript types and mood definitions
└── package.json
```

## How It Works

1. **Track Mood**: Select your current mood from 5 emoji options
2. **Save to Firebase**: Mood is saved with timestamp and user ID
3. **View Stats**: See your mood trends over the past 7 days
4. **Compare**: View today vs yesterday mood comparison

## Technologies Used

- React Native with Expo
- TypeScript
- Firebase Firestore
- React Native Chart Kit
- Expo Router (File-based routing)
- AsyncStorage (for user ID persistence)

## Notes

- Each device gets a unique user ID stored locally
- Moods are stored with timestamps for trend analysis
- Charts show average mood values (1-5 scale)
- Data persists across app sessions via Firebase

## Troubleshooting

If you encounter errors:

1. Make sure Firebase config is correct in `config/firebase.ts`
2. Verify Firestore database is created and enabled
3. Check that internet connection is available
4. Clear cache with `npx expo start -c`

## Future Enhancements

- Add user authentication
- Include notes/journal entries with moods
- More detailed analytics and insights
- Mood reminders/notifications
- Export mood data
- Dark mode support
