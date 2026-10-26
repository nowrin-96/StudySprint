// ============================================================================
// Study Sprint — Firebase Configuration Module
// ============================================================================
//
// ⚠️ IMPORTANT INSTRUCTIONS FOR THE STUDENT:
// 1. This file connects your Study Sprint frontend to Google Firebase.
// 2. The keys below are "Public Project Identifiers" (they identify your
//    Firebase project to Google servers from the browser).
// 3. Keep private server credentials (such as serviceAccountKey.json) OFF
//    the frontend. Never put admin private keys in this file.
// 4. In Phase C, you will replace the placeholders below with the real values
//    from your Firebase Console (Project Settings -> General -> Your apps -> Web app).
// ============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyD8IL8sXxQgP_16a_PKzXAzfmrYi0RUw-w",
  authDomain: "study-sprint-a99f3.firebaseapp.com",
  projectId: "study-sprint-a99f3",
  storageBucket: "study-sprint-a99f3.firebasestorage.app",
  messagingSenderId: "310775131204",
  appId: "1:310775131204:web:6deb9d0b48affc5fc46011",
  measurementId: "G-TPT18ZC5SB"
};

/**
 * Checks whether the student has configured real Firebase credentials.
 * If the placeholders are still present, the app will run in "Preview / Setup Mode"
 * so you can inspect and test the UI before creating your Firebase project in Phase C.
 */
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("REPLACE_WITH_") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes("REPLACE_WITH_")
  );
}
