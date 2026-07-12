import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { initFirebase, getFirebaseAuth, getFirebaseDb } from "./firebase";
import { BrandData, BrandGuide, MarketResearch, IdeaEvaluation } from "../types";

// Everything the app gathers for one venture, snapshotted per user.
export interface WorkspaceSnapshot {
  brandData: BrandData;
  roughIdea: string;
  stressTestResult: any;
  marketResearch: MarketResearch | null;
  evaluation: IdeaEvaluation | null;
  brandGuide: BrandGuide | null;
}

export type CloudStatus = 'disabled' | 'ready' | 'syncing' | 'synced' | 'error';

// Initializes Firebase (if configured) and subscribes to auth changes.
// Returns false when cloud sync is unavailable (no config / offline dev).
export async function initCloud(onUserChanged: (user: User | null) => void): Promise<boolean> {
  const ok = await initFirebase();
  if (!ok) return false;
  const auth = getFirebaseAuth();
  if (!auth) return false;
  onAuthStateChanged(auth, onUserChanged);
  return true;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Cloud sync is not configured in this environment.");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

function workspaceRef(uid: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore unavailable");
  // firestore.rules scope access to users/{uid} and its subcollections
  return doc(db, "users", uid, "workspaces", "default");
}

export async function loadWorkspace(uid: string): Promise<Partial<WorkspaceSnapshot> | null> {
  const snap = await getDoc(workspaceRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as Partial<WorkspaceSnapshot>;
}

export async function saveWorkspace(uid: string, data: WorkspaceSnapshot): Promise<void> {
  // Firestore rejects undefined values; JSON round-trip strips them.
  const clean = JSON.parse(JSON.stringify(data));
  await setDoc(workspaceRef(uid), { ...clean, updatedAt: serverTimestamp() }, { merge: true });
}
