// ============================================================================
// Study Sprint — Authentication Module (Firebase Auth & Session State)
// ============================================================================

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";
import { showToast } from "./ui.js";

let authInstance = null;
let currentUser = null;
let authStateListenerCallback = null;
let firebaseAppInstance = null;

export function getFirebaseApp() {
  return firebaseAppInstance;
}

// Storage keys
const DEMO_USER_KEY = "studysprint_demo_user";
const ACTIVE_TAB_SESSION_KEY = "studysprint_active_tab_session";

/**
 * Friendly error messages for common Firebase Authentication errors
 */
export function getFriendlyAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Please enter a valid student email address (e.g. name@college.edu).";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please verify and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please Sign In instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access temporarily restricted. Try again later.";
    default:
      return "Authentication error: " + (errorCode || "Unknown issue occurred.");
  }
}

/**
 * Initialize Authentication with Firebase Web SDK v10 (Modular ESM)
 */
export async function initAuth(onAuthStateChangedCallback) {
  authStateListenerCallback = onAuthStateChangedCallback;

  // Check if live Firebase credentials have been entered
  if (isFirebaseConfigured()) {
    try {
      // Dynamically load Firebase Web SDK from official Google CDN (v10 modular)
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
      const { 
        getAuth, 
        setPersistence,
        browserSessionPersistence,
        onAuthStateChanged,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signOut,
        sendPasswordResetEmail,
        updateProfile 
      } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

      const app = initializeApp(firebaseConfig);
      firebaseAppInstance = app;
      authInstance = getAuth(app);

      // Enforce session-only persistence (logout automatically on tab/browser close)
      try {
        await setPersistence(authInstance, browserSessionPersistence);
        console.log("🔒 Study Sprint: Tab-only session persistence active.");
      } catch (pErr) {
        console.warn("Could not set session persistence:", pErr);
      }

      // Listen to real-time authentication state changes with strict Tab Session Guard
      onAuthStateChanged(authInstance, async (user) => {
        const isTabSessionActive = sessionStorage.getItem(ACTIVE_TAB_SESSION_KEY) === "true";

        if (user && !isTabSessionActive) {
          // A user was stored in IndexedDB from an earlier session, but THIS tab has no active session.
          // Force sign out immediately so that opening a fresh tab always presents the login screen.
          console.log("🔒 Tab was closed or fresh tab opened. Clearing stale session to show login page.");
          try {
            await signOut(authInstance);
          } catch (e) {}
          currentUser = null;
          if (typeof authStateListenerCallback === "function") {
            authStateListenerCallback(null);
          }
          return;
        }

        currentUser = user;
        if (typeof authStateListenerCallback === "function") {
          authStateListenerCallback(user);
        }
      });

      console.log("✅ Study Sprint: Firebase Auth initialized successfully.");
      const notice = document.getElementById("authSetupNotice");
      if (notice) notice.classList.add("hidden");
      return { isLive: true };
    } catch (err) {
      console.error("❌ Firebase Auth initialization failed:", err);
      showToast("Firebase initialization error. Check console.", "error");
      return { isLive: false, error: err };
    }
  } else {
    // Phase B Preview Mode: Inform the student
    console.warn("⚠️ Study Sprint: Running in Phase B Preview Mode (Firebase not yet configured).");
    const notice = document.getElementById("authSetupNotice");
    if (notice) notice.classList.remove("hidden");

    // Check if there is an active tab session
    const isTabSessionActive = sessionStorage.getItem(ACTIVE_TAB_SESSION_KEY) === "true";
    const savedDemoUser = sessionStorage.getItem(DEMO_USER_KEY);
    if (isTabSessionActive && savedDemoUser) {
      try {
        currentUser = JSON.parse(savedDemoUser);
        if (typeof authStateListenerCallback === "function") {
          authStateListenerCallback(currentUser);
        }
      } catch (e) {
        currentUser = null;
      }
    } else {
      currentUser = null;
      if (typeof authStateListenerCallback === "function") {
        authStateListenerCallback(null);
      }
    }

    return { isLive: false, isDemo: true };
  }
}

/**
 * Register a new student account
 */
export async function registerStudent(name, email, password, confirmPassword) {
  // Input Validation
  if (!name || name.trim().length < 2) {
    throw new Error("Please enter your full name (at least 2 characters).");
  }
  if (!email || !email.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match. Please re-enter.");
  }

  // Live Firebase Registration
  if (isFirebaseConfigured() && authInstance) {
    const { createUserWithEmailAndPassword, updateProfile, setPersistence, browserSessionPersistence } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    try {
      await setPersistence(authInstance, browserSessionPersistence);
    } catch (e) {}

    // Mark tab session active BEFORE creating user so onAuthStateChanged recognizes this registration
    sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, "true");

    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      // Attach display name to student account
      await updateProfile(userCredential.user, {
        displayName: name.trim()
      });

      currentUser = userCredential.user;
      return userCredential.user;
    } catch (err) {
      sessionStorage.removeItem(ACTIVE_TAB_SESSION_KEY);
      currentUser = null;
      throw err;
    }
  } else {
    // Preview Mode Demo Registration
    const demoUser = {
      uid: "demo_student_" + Date.now(),
      displayName: name.trim(),
      email: email.trim(),
      isDemo: true
    };
    sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, "true");
    sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    currentUser = demoUser;
    if (typeof authStateListenerCallback === "function") {
      authStateListenerCallback(currentUser);
    }
    return demoUser;
  }
}

/**
 * Sign in existing student
 */
export async function loginStudent(email, password) {
  if (!email || !email.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }
  if (!password) {
    throw new Error("Please enter your password.");
  }

  if (isFirebaseConfigured() && authInstance) {
    const { signInWithEmailAndPassword, setPersistence, browserSessionPersistence } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );

    try {
      await setPersistence(authInstance, browserSessionPersistence);
    } catch (e) {}

    // Mark tab session active BEFORE starting sign-in so onAuthStateChanged recognizes this login on first click
    sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, "true");

    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      currentUser = userCredential.user;
      return userCredential.user;
    } catch (err) {
      sessionStorage.removeItem(ACTIVE_TAB_SESSION_KEY);
      currentUser = null;
      throw err;
    }
  } else {
    // Preview Mode Demo Login
    const demoUser = {
      uid: "demo_student_preview",
      displayName: email.split("@")[0].replace(".", " "),
      email: email.trim(),
      isDemo: true
    };
    sessionStorage.setItem(ACTIVE_TAB_SESSION_KEY, "true");
    sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    currentUser = demoUser;
    if (typeof authStateListenerCallback === "function") {
      authStateListenerCallback(currentUser);
    }
    return demoUser;
  }
}

/**
 * Send password reset email
 */
export async function resetStudentPassword(email) {
  if (!email || !email.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }

  if (isFirebaseConfigured() && authInstance) {
    const { sendPasswordResetEmail } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );
    await sendPasswordResetEmail(authInstance, email);
    return true;
  } else {
    // Preview mode confirmation
    return true;
  }
}

/**
 * Sign out current student
 */
export async function logoutStudent() {
  sessionStorage.removeItem(ACTIVE_TAB_SESSION_KEY);
  sessionStorage.removeItem(DEMO_USER_KEY);
  if (isFirebaseConfigured() && authInstance) {
    const { signOut } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
    );
    await signOut(authInstance);
  }
  currentUser = null;
  if (typeof authStateListenerCallback === "function") {
    authStateListenerCallback(null);
  }
}

/**
 * Returns currently logged-in student or null
 */
export function getCurrentUser() {
  return currentUser;
}
