import Dexie from 'dexie';

export const offlineDB = new Dexie('GramSwasthOfflineDB');

offlineDB.version(1).stores({
  patients: '++id, name, village',
  pending_consultations: '++id, patientId, specialistId, createdAt',
  pending_messages: '++id, consultationId, createdAt',
  offline_records: '++id, patientId, createdAt',
});

export default offlineDB;

