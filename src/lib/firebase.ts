import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { initializeFirestore, Firestore } from "firebase/firestore";

// Firebase config is injected by AI Studio into firebase-applet-config.json at
// deploy time; locally the file may be empty. We fetch it at runtime via the
// server so an empty config degrades gracefully to local-only mode instead of
// breaking the build.

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initPromise: Promise<boolean> | null = null;

export async function initFirebase(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const res = await fetch('/api/firebase-config');
      const data = await res.json();
      if (!data.configured || !data.config) {
        return false;
      }
      app = getApps().length === 0 ? initializeApp(data.config) : getApp();
      db = initializeFirestore(app, {}, data.config.firestoreDatabaseId || "(default)");
      auth = getAuth(app);
      return true;
    } catch (e) {
      console.warn("Firebase unavailable, running in local-only mode:", e);
      return false;
    }
  })();
  return initPromise;
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  return db;
}
