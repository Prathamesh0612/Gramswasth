import { createContext, useContext, useState, useEffect } from 'react';
import { patientAPI } from '../services/api';

const PatientContext = createContext(null);

const DEFAULT_PROFILE = {
  id: '', name: '', age: '', phone: '', village: '', state: '', gender: '',
  bloodType: '', allergies: [], conditions: [], currentMedications: '',
  emergencyContactName: '', emergencyContactPhone: '', registeredAt: null,
  history: [], questionnaires: [], symptoms: []
};

export function PatientProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loadingDb, setLoadingDb] = useState(true);

  const fetchProfile = async () => {
    setLoadingDb(true);
    try {
      const res = await patientAPI.getProfile();
      if (res.success && res.data) {
        setProfile({ ...DEFAULT_PROFILE, ...res.data });
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    if (role === 'patient' && token) {
      fetchProfile();
    } else {
      setLoadingDb(false);
    }
  }, []);

  const updateProfile = async (updatedData) => {
    try {
      // Optimistic update
      setProfile(prev => ({ ...prev, ...updatedData }));
      await patientAPI.updateProfile(updatedData);
    } catch (err) {
      console.error(err);
    }
  };

  const addRecordToProfile = async (recordType, recordData) => {
    // 1. Optimistic local update
    const newProfile = { ...profile };
    if (!newProfile[recordType]) newProfile[recordType] = [];
    newProfile[recordType] = [
      ...newProfile[recordType],
      { ...recordData, timestamp: new Date().toISOString() }
    ];
    setProfile(newProfile);

    // 2. Persist to backend
    try {
      const { healthAPI } = require('../services/api').default;
      await healthAPI.createRecord({
        record_type: recordType,
        data: recordData
      });
    } catch (err) {
      console.error("Failed to sync record to backend", err);
    }
  };

  // Mock implementations for multi-profile features to prevent crashes in the UI
  // Note: Backend doesn't support multiple family members per account yet.
  const profiles = [profile];
  const activeIndex = 0;
  const switchProfile = () => {}; 
  const addProfile = () => {};
  const clearProfiles = () => setProfile(DEFAULT_PROFILE);

  return (
    <PatientContext.Provider value={{
      profile, profiles, activeIndex, loadingDb,
      updateProfile, addProfile, switchProfile, clearProfiles,
      addRecordToProfile, fetchProfile
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
