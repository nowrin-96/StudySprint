// ============================================================================
// Study Sprint — Cloud Firestore Database Module (Phase C & D)
// ============================================================================

import { isFirebaseConfigured } from "./firebase-config.js";
import { getFirebaseApp } from "./auth.js";
import { showToast } from "./ui.js";

let firestoreInstance = null;
let saveDebounceTimer = null;

// Local storage prefix used as fast cache & offline fallback
const LOCAL_STORAGE_PREFIX = "studysprint_local_data_";

/**
 * Initialize Cloud Firestore using modular Firebase SDK v10
 */
export async function initFirestore() {
  if (!isFirebaseConfigured()) {
    console.log("ℹ️ Firestore: Running in Preview / LocalStorage mode.");
    return null;
  }

  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    const app = getFirebaseApp();
    if (!app) {
      console.warn("⚠️ Firebase App not yet initialized when initializing Firestore.");
      return null;
    }

    const { getFirestore } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );

    firestoreInstance = getFirestore(app);
    console.log("✅ Study Sprint: Cloud Firestore connected successfully.");
    return firestoreInstance;
  } catch (err) {
    console.error("❌ Cloud Firestore initialization error:", err);
    return null;
  }
}

/**
 * Load student data: checks localStorage first for speed, then syncs with Firestore
 */
export async function loadStudentData(userId) {
  if (!userId) return null;

  // 1. Fast Cache from LocalStorage
  let cachedData = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + userId);
    if (raw) cachedData = JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading local cache", e);
  }

  // 2. If Firebase is not configured, return local cache
  if (!isFirebaseConfigured()) {
    return cachedData;
  }

  // 3. Sync from Cloud Firestore
  try {
    const db = await initFirestore();
    if (!db) return cachedData;

    const { doc, getDoc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );

    const userDocRef = doc(db, "users", userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const remoteData = snap.data();
      // Update local cache with latest cloud data
      localStorage.setItem(LOCAL_STORAGE_PREFIX + userId, JSON.stringify(remoteData));
      console.log("☁️ Loaded student data from Cloud Firestore.");
      return remoteData;
    } else {
      // Document doesn't exist yet (brand new student account starts completely empty)
      return null;
    }
  } catch (err) {
    console.error("Firestore read error (falling back to local cache):", err);
    return cachedData;
  }
}

/**
 * Save student data: persists to LocalStorage immediately and syncs to Firestore
 */
export async function flushPendingSave(userId, data) {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  if (!userId || !data || !isFirebaseConfigured()) return;

  try {
    const db = await initFirestore();
    if (!db) return;

    const { doc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );

    const userDocRef = doc(db, "users", userId);
    await setDoc(
      userDocRef,
      {
        ...data,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    console.log("☁️ Cloud Firestore synced successfully.");
  } catch (err) {
    console.error("Cloud Firestore sync error:", err);
    if (err.code === "permission-denied") {
      showToast("Firestore permission denied. Check your Firestore Security Rules.", "warning");
    }
  }
}

export function saveStudentData(userId, data, immediate = false) {
  if (!userId || !data) return;

  // 1. Instant local persistence
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + userId, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage error:", e);
  }

  // 2. If Firebase not configured, we're done
  if (!isFirebaseConfigured()) return;

  // 3. If immediate, flush right away
  if (immediate) {
    flushPendingSave(userId, data);
    return;
  }

  // 4. Otherwise debounce cloud sync by 800ms
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);

  saveDebounceTimer = setTimeout(() => {
    flushPendingSave(userId, data);
  }, 800);
}
