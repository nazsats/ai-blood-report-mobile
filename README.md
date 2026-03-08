# 🩸 AI Blood Report – Mobile App

A premium, AI-powered health companion built with React Native (Expo). This mobile application allows users to upload their blood test reports, instantly analyzes them using advanced AI (GPT-4o), and visualizes the results in an easy-to-understand, personalized dashboard. It also features a community-driven health feed, AI meal scanning, fitness tracking, and comprehensive health calculators.

---

## ✨ Features

### 🔬 Blood Report Analysis
- **📄 Smart Document Scanning**: Upload blood test results via PDF, gallery images, or take a photo directly using the device camera.
- **🧠 AI-Powered Analysis**: Securely sends the report to the backend (Next.js) which extracts markers and provides medical-grade insights using GPT-4o.
- **📊 Comprehensive Results Dashboard**:
  - **Overall Health Score & Risk Level**: A quick snapshot of your health status.
  - **Test Breakdown**: View abnormal and normal markers with detailed explanations, root causes, and action plans.
  - **Health Predictions**: AI-generated risk factors with preventative advice.
  - **Medication & Supplement Alerts**: Potential interactions based on your profile and test results.
  - **Personalized Plans**: Actionable nutrition and lifestyle (exercise, sleep, stress) recommendations.
- **📅 Historical Reports**: Keep track of all past blood tests in one secure place.

### 🥗 AI Meal Scanner
- **📷 Instant Meal Analysis**: Snap a photo of any meal and get an instant AI-powered nutritional breakdown.
- **🔥 Calorie & Macro Tracking**: Identifies calories, protein, carbs, fats, fiber, and more per meal.
- **🍽️ Ingredient Detection**: AI identifies individual food items and provides per-item nutritional data.
- **📈 Daily Nutrition Log**: Tracks your total daily intake against your personalized health goals.
- **💡 Health Recommendations**: Provides meal-specific health tips linked to your blood report results.

### 💪 Fitness & Health Tracking
- **🏃 Activity Tracking**: Log and monitor daily physical activity and workouts.
- **🛌 Sleep Monitoring**: Track sleep patterns and quality scores.
- **❤️ Vitals Dashboard**: Monitor key health indicators synced with your blood report data.
- **📉 Progress Charts**: Visualize health trends over time.

### 🧮 Health Calculators
- **BMI Calculator**: Body Mass Index with personalized interpretation.
- **Calorie Calculator**: Daily caloric needs based on age, weight, height, and activity level (TDEE).
- **Hydration Calculator**: Daily water intake recommendations.
- **Macro Calculator**: Personalized macronutrient targets.
- **Heart Rate Zones**: Target heart rate ranges for different training intensities.
- **Body Fat Estimator**: Estimated body fat percentage calculator.

### 📰 AI Health Feed
- Discover trending health topics and AI-curated articles.
- Upvote/downvote posts and engage in comments.
- **Daily Health Fact** updated regularly.
- Community-driven insights tailored to your health profile.

### 👤 Health Profile
- Complete profile with age, gender, blood type, chronic conditions, and current medications.
- Profile data provides AI with personalized context for better analysis across all features.

### 🔐 Security & Privacy
- Built on Firebase Authentication (Email/Password) and Firestore.
- All sensitive health data is stored securely and tied to authenticated user accounts.

---

## 📱 App Structure (Tabs)

| Tab | Route | Description |
|-----|-------|-------------|
| **Home** | `/home` | AI health dashboard with vitals, fitness summary, and quick actions |
| **Feed** | `/feed` | Community health feed with AI-curated posts and daily health facts |
| **Analyze** | `/upload` | Core scanning interface for uploading and analyzing blood reports |
| **Reports** | `/history` | Personal vault of all past analyzed blood reports |
| **Profile** | `/profile` | Manage personal health data and app preferences |

**Additional Screens:**
- `/meal-scan` – AI-powered meal photo scanner and nutrition tracker
- `/calculators` – Suite of health & fitness calculators
- `/results/[id]` – Detailed blood report analysis results

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 52) |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based navigation) |
| **Styling** | Custom dark-mode design system with Animated API, skeleton loaders, glassmorphism |
| **Auth & DB** | [Firebase](https://firebase.google.com/) (Authentication + Firestore) |
| **AI Backend** | Next.js API routes + OpenAI GPT-4o (Vision + Text) |
| **Camera** | `expo-image-picker`, `expo-camera` |
| **Storage** | Firebase Firestore |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your physical device (or an iOS Simulator / Android Emulator)
- A Firebase project with **Authentication** (Email/Password) and **Firestore** enabled
- The companion **Next.js backend** running locally or deployed

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nazsats/ai-blood-report-mobile.git
   cd ai-blood-report-mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root:
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

4. **Start the development server**:
   ```bash
   npx expo start
   ```

5. **Run on Device**:
   - Scan the QR code with **Expo Go** app
   - Press `a` for Android Emulator
   - Press `i` for iOS Simulator

---

## 🎨 UI / UX Highlights

- **Fluid Animations**: `Animated` API for transitions, pulse effects during loading, and interactive elements.
- **Glassmorphism & Premium Dark Theme**: Deep purples, muted backgrounds, and glowing accents for a high-end feel.
- **Skeleton Loaders**: `SkeletonCard` components keep the UI engaged during network/AI requests.
- **Responsive Layouts**: Designed for both phones and tablets with adaptive layouts.

---

## 📁 Project Structure

```
ai-blood-report-mobile/
├── app/
│   ├── (auth)/          # Login & registration screens
│   ├── (tabs)/          # Main tab screens (home, feed, upload, history, profile)
│   ├── results/         # Blood report results detail screen
│   ├── meal-scan.tsx    # AI meal scanner screen
│   ├── calculators.tsx  # Health calculators screen
│   └── _layout.tsx      # Root navigation layout
├── lib/
│   ├── firebaseClient.ts # Firebase initialization
│   ├── fitnessData.ts    # Fitness & health data utilities
│   └── healthData.ts     # Blood report data processing
├── constants/
│   ├── colors.ts        # Design system color tokens
│   └── theme.tsx        # Typography and spacing tokens
└── assets/              # Icons, images, fonts
```

---

## 🛡 License

This project is proprietary. All rights reserved.
