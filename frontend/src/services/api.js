/**
 * API Service - Handles all HTTP requests to the backend
 * Backend runs on http://localhost:5000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body = null,
    headers = {},
  } = options;

  const token = getAuthToken();
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: defaultHeaders,
  };

  if (body instanceof FormData) {
    config.body = body;
    // Don't set Content-Type for FormData, browser will set it with boundary
    delete defaultHeaders['Content-Type'];
  } else if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Media Endpoints
export const mediaAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiCall('/records/image', {
      method: 'POST',
      body: formData,
    });
  },
};

// Auth Endpoints
export const authAPI = {
  sendOtp: (payload) =>
    apiCall('/auth/send-otp', {
      method: 'POST',
      body: payload,
    }),

  register: (payload) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: payload,
    }),

  login: (payload) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: payload,
    }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve({ success: true });
  },

  refresh: () =>
    apiCall('/auth/refresh', {
      method: 'POST',
    }),
};

// Patient Endpoints
export const patientAPI = {
  getProfile: () =>
    apiCall('/auth/me', {
      method: 'GET',
    }),

  updateProfile: (payload) =>
    apiCall('/auth/profile', {
      method: 'PUT',
      body: payload,
    }),

  getHistory: () =>
    apiCall('/patient/history', {
      method: 'GET',
    }),
};

// Doctor Endpoints
export const doctorAPI = {
  getAll: () =>
    apiCall('/doctors', {
      method: 'GET',
    }),

  getById: (id) =>
    apiCall(`/doctors/${id}`, {
      method: 'GET',
    }),

  getProfile: () =>
    apiCall('/auth/me', {
      method: 'GET',
    }),

  updateProfile: (payload) =>
    apiCall('/auth/profile', {
      method: 'PUT',
      body: payload,
    }),

  getQueue: () =>
    apiCall('/consultations', {
      method: 'GET',
    }),
};

// Consultation Endpoints
export const consultationAPI = {
  create: (payload) =>
    apiCall('/consultations', {
      method: 'POST',
      body: payload,
    }),

  getAll: () =>
    apiCall('/consultations', {
      method: 'GET',
    }),

  getById: (id) =>
    apiCall(`/consultations/${id}`, {
      method: 'GET',
    }),

  update: (id, payload) =>
    apiCall(`/consultations/${id}`, {
      method: 'PUT',
      body: payload,
    }),

  accept: (id) =>
    apiCall(`/consultations/${id}/status`, {
      method: 'PATCH',
      body: { status: 'accepted' },
    }),

  complete: (id) =>
    apiCall(`/consultations/${id}/complete`, {
      method: 'PATCH',
    }),

  cancel: (id) =>
    apiCall(`/consultations/${id}/status`, {
      method: 'PATCH',
      body: { status: 'cancelled' },
    }),
};

// Health Record Endpoints
export const healthAPI = {
  getRecords: () =>
    apiCall('/records', {
      method: 'GET',
    }),

  createRecord: (payload) =>
    apiCall('/records', {
      method: 'POST',
      body: payload,
    }),

  getById: (id) =>
    apiCall(`/records/${id}`, {
      method: 'GET',
    }),
};

// Prescription Endpoints
export const prescriptionAPI = {
  getAll: () =>
    apiCall('/prescriptions', {
      method: 'GET',
    }),

  getById: (id) =>
    apiCall(`/prescriptions/${id}`, {
      method: 'GET',
    }),

  create: (payload) =>
    apiCall('/prescriptions', {
      method: 'POST',
      body: payload,
    }),
};

// AI/Symptom Endpoints
export const aiAPI = {
  checkSymptoms: (payload) =>
    apiCall('/ai/symptoms/enhanced', {
      method: 'POST',
      body: payload,
    }),

  getFirstAid: (condition) =>
    apiCall(`/emergency/first-aid/${condition}`, {
      method: 'GET',
    }),
};

// Medicine Endpoints
export const medicineAPI = {
  search: (query) =>
    apiCall(`/medicine/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
    }),

  getById: (id) =>
    apiCall(`/medicine/${id}`, {
      method: 'GET',
    }),
};

// Pharmacy Endpoints
export const pharmacyAPI = {
  getProfile: () =>
    apiCall('/pharmacy/profile', {
      method: 'GET',
    }),

  updateProfile: (payload) =>
    apiCall('/pharmacy/profile', {
      method: 'PUT',
      body: payload,
    }),

  getInventory: () =>
    apiCall('/pharmacy/inventory', {
      method: 'GET',
    }),

  updateInventory: (payload) =>
    apiCall('/pharmacy/inventory', {
      method: 'PUT',
      body: payload,
    }),
};

// Emergency Endpoints
export const emergencyAPI = {
  createAlert: (payload) =>
    apiCall('/emergency/sos', {
      method: 'POST',
      body: payload,
    }),

  getContacts: () =>
    apiCall('/emergency/active', {
      method: 'GET',
    }),

  accept: (id) =>
    apiCall(`/emergency/${id}/accept`, {
      method: 'PATCH',
    }),

  resolve: (id) =>
    apiCall(`/emergency/${id}/resolve`, {
      method: 'PATCH',
    }),
};

// Sync Endpoints
export const syncAPI = {
  syncData: (payload) =>
    apiCall('/sync/data', {
      method: 'POST',
      body: payload,
    }),
};

export default {
  authAPI,
  patientAPI,
  doctorAPI,
  consultationAPI,
  healthAPI,
  prescriptionAPI,
  aiAPI,
  medicineAPI,
  pharmacyAPI,
  emergencyAPI,
  syncAPI,
};
