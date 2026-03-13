import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PatientProvider } from './context/PatientContext';
import { Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Shared
import OfflineBanner from './components/OfflineBanner';
import useNetworkStatus from './hooks/useNetworkStatus';

// Auth / Role Select
import RoleSelect from './pages/RoleSelect';

// Lazy load pages
const PatientLogin = lazy(() => import('./pages/patient/Login'));
const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'));
const PatientProfile = lazy(() => import('./pages/patient/Profile'));
const SpecialistSelect = lazy(() => import('./pages/patient/SpecialistSelect'));
const SymptomChecker = lazy(() => import('./pages/patient/SymptomChecker'));
const Questionnaire = lazy(() => import('./pages/patient/Questionnaire'));
const Consultation = lazy(() => import('./pages/patient/Consultation'));
const VideoCall = lazy(() => import('./pages/patient/VideoCall'));
const Prescriptions = lazy(() => import('./pages/patient/Prescriptions'));
const NearbyPharmacy = lazy(() => import('./pages/patient/NearbyPharmacy'));
const MedicalHistory = lazy(() => import('./pages/patient/MedicalHistory'));

const DoctorLogin = lazy(() => import('./pages/doctor/Login'));
const DoctorDashboard = lazy(() => import('./pages/doctor/Dashboard'));
const DoctorProfile = lazy(() => import('./pages/doctor/Profile'));
const WritePrescription = lazy(() => import('./pages/doctor/WritePrescription'));

const PharmacyLogin = lazy(() => import('./pages/pharmacy/Login'));
const PharmacyDashboard = lazy(() => import('./pages/pharmacy/Dashboard'));
const PharmacyProfile = lazy(() => import('./pages/pharmacy/Profile'));

function Loader() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-sage-200 border-t-sage-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Helper: wrap route in ProtectedRoute
const P = (element, role) => <ProtectedRoute requiredRole={role}>{element}</ProtectedRoute>;

function App() {
  const isOnline = useNetworkStatus();

  return (
    <ErrorBoundary>
      <PatientProvider>
        <BrowserRouter>
          {!isOnline && <OfflineBanner />}
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/role" replace />} />
              <Route path="/role" element={<RoleSelect />} />

              {/* Patient routes — requires token + patient role */}
              <Route path="/patient/login"         element={<PatientLogin />} />
              <Route path="/patient/dashboard"     element={P(<PatientDashboard />, 'patient')} />
              <Route path="/patient/profile"       element={P(<PatientProfile />, 'patient')} />
              <Route path="/patient/specialists"   element={P(<SpecialistSelect />, 'patient')} />
              <Route path="/patient/symptoms"      element={P(<SymptomChecker />, 'patient')} />
              <Route path="/patient/questionnaire" element={P(<Questionnaire />, 'patient')} />
              <Route path="/patient/consultation"  element={P(<Consultation />, 'patient')} />
              <Route path="/patient/prescriptions" element={P(<Prescriptions />, 'patient')} />
              <Route path="/patient/pharmacy"      element={P(<NearbyPharmacy />, 'patient')} />
              <Route path="/patient/history"       element={P(<MedicalHistory />, 'patient')} />

              {/* Video call — shared route, any authenticated user (patient or doctor) */}
              <Route path="/videocall" element={P(<VideoCall />)} />

              {/* Doctor routes */}
              <Route path="/doctor/login"             element={<DoctorLogin />} />
              <Route path="/doctor/dashboard"         element={P(<DoctorDashboard />, 'doctor')} />
              <Route path="/doctor/profile"           element={P(<DoctorProfile />, 'doctor')} />
              <Route path="/doctor/prescription-form" element={P(<WritePrescription />, 'doctor')} />

              {/* Pharmacy routes */}
              <Route path="/pharmacy/login"     element={<PharmacyLogin />} />
              <Route path="/pharmacy/dashboard" element={P(<PharmacyDashboard />, 'pharmacy')} />
              <Route path="/pharmacy/profile"   element={P(<PharmacyProfile />, 'pharmacy')} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </PatientProvider>
    </ErrorBoundary>
  );
}

export default App;

