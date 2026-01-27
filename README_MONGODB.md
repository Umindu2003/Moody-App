# Moody App - MongoDB Version

A React Native mood tracking app built with Expo, now powered by MongoDB instead of Firebase.

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB instance
- Expo CLI installed globally: `npm install -g expo-cli`
- Expo Go app on your mobile device

### Installation

1. **Clone the repository**

   ```bash
   cd Moody-App
   npm install
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Start the backend server**

   ```bash
   # From the main directory
   npm run backend

   # Or from the backend directory
   cd backend
   npm run dev
   ```

   The backend server will start on `http://localhost:3001`

4. **Start the React Native app**

   ```bash
   # From the main directory (in a new terminal)
   npm start

   # Or specific platforms
   npm run android  # For Android
   npm run ios      # For iOS
   npm run web      # For Web
   ```

## MongoDB Configuration

The app is currently configured to use MongoDB Atlas with the following connection string:

```
mongodb+srv://u4656mee_db_user:12345@cluster0.l4alpmj.mongodb.net/Moody?retryWrites=true&w=majority
```

### To use your own MongoDB database:

1. Update the connection string in `backend/server.js`
2. Replace the `MONGODB_URI` variable with your database URL

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/health` - Health check
- `POST /api/moods` - Save/update a mood entry
- `GET /api/moods/:userId` - Get mood entries for a user
- `GET /api/moods/:userId/today` - Get today's mood
- `GET /api/moods/:userId/insights` - Get mood insights and analytics
- `GET /api/moods/:userId/all` - Get all mood entries (for history)

## Project Structure

```
├── app/                 # React Native screens
├── assets/             # Images and fonts
├── backend/            # Node.js API server
│   ├── server.js       # Express server with MongoDB
│   └── package.json    # Backend dependencies
├── config/             # Configuration (removed firebase.ts)
├── services/           # API service layer
├── types/              # TypeScript type definitions
└── components/         # Shared React components
```

## Features

- ✅ Mood tracking with emoji selection
- ✅ Daily mood notes
- ✅ Mood history and analytics
- ✅ Streak tracking
- ✅ PDF export functionality
- ✅ Responsive design for mobile and web
- ✅ MongoDB Atlas backend
- ✅ RESTful API architecture

## Changes from Firebase Version

1. **Database**: Migrated from Firebase Firestore to MongoDB Atlas
2. **Backend**: Added Express.js API server (`backend/server.js`)
3. **Services**: Updated `moodService.ts` to use REST API calls instead of direct Firebase SDK
4. **Configuration**: Removed Firebase configuration and credentials
5. **Architecture**: Changed from direct database access to API-based architecture

## Running in Production

1. **Backend**: Deploy the backend to services like Heroku, Vercel, or AWS
2. **Frontend**: Update the `API_BASE_URL` in `services/moodService.ts` to your deployed backend URL
3. **Database**: Ensure your MongoDB instance is accessible from your backend deployment

## Troubleshooting

- **Backend connection issues**: Ensure MongoDB URI is correct and database is accessible
- **API connection errors**: Check that the backend server is running on port 3001
- **Mobile device can't connect**: Make sure your mobile device is on the same network as your development machine

## Development

To run both frontend and backend simultaneously:

```bash
# Terminal 1 - Backend
npm run backend

# Terminal 2 - Frontend
npm start
```

The app will automatically detect changes and reload during development.
