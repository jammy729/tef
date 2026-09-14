import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase/client";
import { getProfileMeta, setProfileMeta, hydrateFromSupabase, clearCache } from "./storage";

export const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

function initialsFrom(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

const ProfileContext = createContext(null);

// Supabase Auth (spec §4) replaces the old two-static-profile model: `profile` is null until a
// real session exists, and the per-user progress blob (storage.js) is hydrated from Supabase
// right after sign-in, before `ready` flips true — so no screen ever has to handle a half-loaded
// profile (App.jsx's Router shows a loading state until `ready`, and only renders normal screens
// once both a session and an onboarded profile exist).
export function ProfileProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [metaVersion, setMetaVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (nextSession) => {
      if (nextSession) {
        await hydrateFromSupabase(nextSession.user.id);
      } else {
        clearCache();
      }
      if (cancelled) return;
      setSession(nextSession);
      setReady(true);
    };

    supabase.auth.getSession().then(({ data: { session: initial } }) => applySession(initial));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const profile = useMemo(() => {
    if (!session) return null;
    const meta = getProfileMeta(session.user.id) ?? {};
    const name = meta.name || session.user.email;
    return {
      id: session.user.id,
      email: session.user.email,
      name,
      initials: initialsFrom(name),
      startingLevel: meta.startingLevel ?? null,
      onboarded: meta.onboarded ?? false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, metaVersion]);

  const saveProfile = (patch) => {
    if (!profile) return;
    setProfileMeta(profile.id, patch);
    setMetaVersion((v) => v + 1);
  };

  const completeOnboarding = ({ name, startingLevel }) =>
    saveProfile({ name, startingLevel, onboarded: true });

  const signUp = ({ email, password }) => supabase.auth.signUp({ email, password });
  const signIn = ({ email, password }) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();

  const value = useMemo(
    () => ({ session, profile, ready, signUp, signIn, signOut, completeOnboarding, saveProfile }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, ready],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
