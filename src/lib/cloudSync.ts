import { initSupabase, getSupabase } from "./supabase";
import { BrandData, BrandGuide, MarketResearch, IdeaEvaluation } from "../types";

// A normalized user shape so the app doesn't depend on the auth provider.
export interface CloudUser {
  id: string;
  email: string | null;
}

// Everything the app gathers for one venture, snapshotted per user.
export interface WorkspaceSnapshot {
  brandData: BrandData;
  roughIdea: string;
  stressTestResult: any;
  marketResearch: MarketResearch | null;
  evaluation: IdeaEvaluation | null;
  brandGuide: BrandGuide | null;
}

function toCloudUser(u: { id: string; email?: string | null } | null | undefined): CloudUser | null {
  return u ? { id: u.id, email: u.email ?? null } : null;
}

// Initializes Supabase (if configured) and subscribes to auth changes.
// Returns false when cloud sync is unavailable (no config / offline dev).
export async function initCloud(onUserChanged: (user: CloudUser | null) => void): Promise<boolean> {
  const ok = await initSupabase();
  if (!ok) return false;
  const supabase = getSupabase();
  if (!supabase) return false;

  // Emit the current session immediately, then on every change.
  const { data } = await supabase.auth.getUser();
  onUserChanged(toCloudUser(data.user));
  supabase.auth.onAuthStateChange((_event, session) => {
    onUserChanged(toCloudUser(session?.user));
  });
  return true;
}

// Returns { needsConfirmation: true } when the project requires email
// confirmation before the user is signed in.
export async function signUpWithEmail(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured in this environment.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured in this environment.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutUser(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Row-Level Security ensures a user can only read/write their own row,
// so user_id is always the authenticated user's id.
export async function loadWorkspace(uid: string): Promise<Partial<WorkspaceSnapshot> | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("workspaces")
    .select("data")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data?.data as Partial<WorkspaceSnapshot>) ?? null;
}

export async function saveWorkspace(uid: string, snapshot: WorkspaceSnapshot): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  // Strip undefined values before storing as jsonb.
  const clean = JSON.parse(JSON.stringify(snapshot));
  const { error } = await supabase
    .from("workspaces")
    .upsert(
      { user_id: uid, data: clean, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}
