import { createContext, useContext, useState, useEffect } from 'react';

const PatientContext = createContext(null);

const DEFAULT_PROFILE = {
  name: '',
  age: '',
  phone: '',
  village: '',
  state: '',
  gender: '',
  bloodType: '',
  allergies: [],
  conditions: [],
  currentMedications: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  registeredAt: null,
};

export function PatientProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem('gs_patient_profiles');
      if (stored) return JSON.parse(stored);
      // Migration from single profile
      const oldStore = localStorage.getItem('gs_patient_profile');
      if (oldStore) return { activeIndex: 0, profiles: [{...DEFAULT_PROFILE, ...JSON.parse(oldStore), id: Date.now()}] };
      return { activeIndex: 0, profiles: [{...DEFAULT_PROFILE, id: Date.now()}] };
    } catch { return { activeIndex: 0, profiles: [{...DEFAULT_PROFILE, id: Date.now()}] }; }
  });

  useEffect(() => {
    localStorage.setItem('gs_patient_profiles', JSON.stringify(state));
  }, [state]);

  const profile = state.profiles[state.activeIndex] || state.profiles[0];

  const updateProfile = (data) => {
    setState(s => {
      const newProfiles = [...s.profiles];
      newProfiles[s.activeIndex] = { ...newProfiles[s.activeIndex], ...data };
      return { ...s, profiles: newProfiles };
    });
  };

  const addProfile = (newProfile) => {
    setState(s => ({
      profiles: [...s.profiles, { ...DEFAULT_PROFILE, ...newProfile, id: Date.now() }],
      activeIndex: s.profiles.length
    }));
  };

  const switchProfile = (index) => {
    if (index >= 0 && index < state.profiles.length) {
      setState(s => ({ ...s, activeIndex: index }));
    }
  };

  const clearProfiles = () => { 
    setState({ activeIndex: 0, profiles: [{...DEFAULT_PROFILE, id: Date.now()}] }); 
    localStorage.removeItem('gs_patient_profiles'); 
    localStorage.removeItem('gs_patient_profile'); 
  };

  return (
    <PatientContext.Provider value={{ 
      profile, profiles: state.profiles, activeIndex: state.activeIndex, 
      updateProfile, addProfile, switchProfile, clearProfiles 
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be inside PatientProvider');
  return ctx;
}
