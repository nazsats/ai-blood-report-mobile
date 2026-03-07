# 🩸 AI Blood Report – Mobile App

A premium, AI-powered health companion built with React Native (Expo). This mobile application allows users to upload their blood test reports, instantly analyzes them using advanced AI (GPT-4o), and visualizes the results in an easy-to-understand, personalized dashboard. It also features a community-driven health feed with AI-curated insights.

## ✨ Features

- **📄 Smart Document Scanning**: Upload your blood test results via PDF, gallery images, or take a photo directly using the device camera.
- **🧠 AI-Powered Analysis**: The app securely sends the report to the backend (Next.js) which extracts markers and provides medical-grade insights in under 60 seconds.
- **📊 Comprehensive Results Dashboard**:
  - **Overall Health Score & Risk Level**: A quick snapshot of your health status.
  - **Test Breakdown**: View abnormal and normal markers with detailed explanations, root causes, and action plans.
  - **Health Predictions**: AI-generated risk factors with preventative advice.
  - **Medication & Supplement Alerts**: Potential interactions based on your profile and test results.
  - **Personalized Plans**: Actionable nutrition and lifestyle (exercise, sleep, stress) recommendations.
- **📰 AI Health Feed (Home)**: Discover trending health topics, read AI-curated articles, upvote/downvote posts, and engage in comments. Includes a \"Daily Health Fact\".
- **👤 Personalized Health Profile**: Complete your profile with age, gender, chronic conditions, and current medications to provide the AI with better context for personalized insights.
- **📅 Historical Reports**: Keep track of all your past blood tests in one secure place.
- **🔐 Secure & Private**: Built on Firebase Authentication and Firestore. User data is encrypted and the app emphasizes privacy.

## 📱 App Structure (Tabs)

The app revolves around a bottom tab navigation setup:
1. **Home (`/home`)**: The community health feed with curated posts, interactive voting, and comments.
2. **Analyze (`/upload`)**: The core scanning interface for uploading and analyzing new reports.
3. **Reports (`/history`)**: Your personal vault of past analyzed blood reports.
4. **Profile (`/profile`)**: Manage your personal health data (age, gender, blood type, conditions) and app preferences.

## 🛠 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (SDK 55)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation.
- **Styling**: Custom modern styling system with Animated UI, skeleton loaders, and a premium dark mode aesthetic (`constants/colors.ts`, `constants/theme.tsx`).
- **Backend/Database**: [Firebase](https://firebase.google.com/) (Auth, Firestore)
- **API Communication**: Communicates with a separate Next.js API route (`/api/analyze`) for document OCR and OpenAI GPT-4o analysis.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your physical device (or an iOS Simulator / Android Emulator)
- A Firebase project setup with Authentication (Email/Password) and Firestore enabled.

### Installation & Setup

1. **Clone the repository** (if you haven't already).
2. **Navigate to the mobile app directory**:
   ```bash
   cd ai-blood-report-mobile
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Environment Variables**:
   Create a `.env` file in the root of the mobile directory and add your Firebase configurations and the backend API URL:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # URL of your Next.js backend (use local IP for physical device testing)
   EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
   ```
5. **Start the development server**:
   ```bash
   npx expo start
   ```
6. **Run on Device**: Use the Expo Go app to scan the QR code in the terminal, or press `i` for iOS Simulator or `a` for Android Emulator.

## 🎨 UI / UX Highlights
- **Fluid Animations**: Utilizing `Animated` from React Native for page transitions, pulse effects during loading, and interactive voting buttons.
- **Glassmorphism & Premium Dark Theme**: Deep purples, muted backgrounds, and glowing accents provide a modern, high-end feel.
- **Error Handling & Loading States**: Skeleton loaders (`SkeletonCard`) keep the user engaged while waiting for network requests or AI analysis.

## 🛡 License
This project is proprietary.
