import { createContext, useContext, useMemo, useState } from "react";
import { getLastProfileId, setLastProfileId } from "./storage";

// Spec §4: exactly two static local profiles, no accounts/auth.
export const PROFILES = [
  {
    id: "p1",
    name: "Ma princesse Sebin",
    initials: "LM",
    examDate: "2026-03-15",
  },
  { id: "p2", name: "Profil 2", initials: "P2", examDate: "2026-03-15" },
];

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profileId, setProfileIdState] = useState(
    () => getLastProfileId() ?? PROFILES[0].id,
  );

  const setProfileId = (id) => {
    setProfileIdState(id);
    setLastProfileId(id);
  };

  const profile = useMemo(
    () => PROFILES.find((p) => p.id === profileId) ?? PROFILES[0],
    [profileId],
  );

  const value = useMemo(
    () => ({
      profile,
      profiles: PROFILES,
      setProfileId,
      switchProfile: () =>
        setProfileId(
          profile.id === PROFILES[0].id ? PROFILES[1].id : PROFILES[0].id,
        ),
    }),
    [profile],
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
