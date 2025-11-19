"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Institution } from "@/server/db/schema/institutions";

interface InstitutionContextType {
  activeInstitution: Institution | null;
  setActiveInstitution: (institution: Institution | null) => void;
  clearInstitution: () => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

const STORAGE_KEY = "active-institution-id";

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [activeInstitution, setActiveInstitutionState] = useState<Institution | null>(null);

  // Load active institution from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      // In a real app, you would fetch the institution data here
      // For now, we just store the ID
      console.log("Loaded institution ID from storage:", storedId);
    }
  }, []);

  const setActiveInstitution = (institution: Institution | null) => {
    setActiveInstitutionState(institution);
    if (institution) {
      localStorage.setItem(STORAGE_KEY, institution.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearInstitution = () => {
    setActiveInstitutionState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <InstitutionContext.Provider
      value={{
        activeInstitution,
        setActiveInstitution,
        clearInstitution,
      }}
    >
      {children}
    </InstitutionContext.Provider>
  );
}

/**
 * Hook to access institution context
 * Throws error if used outside provider
 */
export function useInstitution() {
  const context = useContext(InstitutionContext);
  if (context === undefined) {
    throw new Error("useInstitution must be used within InstitutionProvider");
  }
  return context;
}
