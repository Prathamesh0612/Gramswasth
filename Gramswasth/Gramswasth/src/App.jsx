import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PatientProvider } from './context/PatientContext';

// Shared
import OfflineBanner from './components/OfflineBanner';
import useNetworkStatus from './hooks/useNetworkStatus';

// Auth / Role Select
import RoleSelect from './pages/RoleSelect';

// Patient
import PatientLogin from './pages/patient/Login';
import PatientDashboard from './pages/patient/Dashboard';
import PatientProfile from './pages/patient/Profile';
import SpecialistSelect from './pages/patient/SpecialistSelect';
import SymptomGateway from './pages/patient/SymptomGateway';
import Questionnaire from './pages/patient/Questionnaire';
import Consultation from './pages/patient/Consultation';
import VideoCall from './pages/patient/VideoCall';
import Prescriptions from './pages/patient/Prescriptions';
import NearbyPharmacy from './pages/patient/NearbyPharmacy';
import MedicalHistory from './pages/patient/MedicalHistory';

// Doctor
import DoctorLogin from './pages/doctor/Login';
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorProfile from './pages/doctor/Profile';

// Pharmacy
import PharmacyLogin from './pages/pharmacy/Login';
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import PharmacyProfile from './pages/pharmacy/Profile';
import InventorySync from './pages/pharmacy/InventorySync';
import { PharmacyProvider } from './context/PharmacyContext';

function App() {
  const isOnline = useNetworkStatus();

  return (
    <PatientProvider>
      <BrowserRouter>
        {!isOnline && <OfflineBanner />}
        <Routes>
          <Route path="/" element={<Navigate to="/role" replace />} />
          <Route path="/role" element={<RoleSelect />} />

          {/* Patient routes */}
          <Route path="/patient/login"       element={<PatientLogin />} />
          <Route path="/patient/dashboard"   element={<PatientDashboard />} />
          <Route path="/patient/profile"     element={<PatientProfile />} />
          <Route path="/patient/specialists" element={<SpecialistSelect />} />
          <Route path="/patient/symptoms"    element={<SymptomGateway />} />
          <Route path="/patient/questionnaire" element={<Questionnaire />} />
          <Route path="/patient/consultation" element={<Consultation />} />
          <Route path="/patient/videocall"   element={<VideoCall />} />
          <Route path="/patient/prescriptions" element={<Prescriptions />} />
          <Route path="/patient/pharmacy"    element={<NearbyPharmacy />} />
          <Route path="/patient/history"     element={<MedicalHistory />} />

          {/* Doctor routes */}
          <Route path="/doctor/login"        element={<DoctorLogin />} />
          <Route path="/doctor/dashboard"    element={<DoctorDashboard />} />
          <Route path="/doctor/profile"      element={<DoctorProfile />} />
          <Route path="/doctor/videocall"    element={<VideoCall />} />

          {/* Pharmacy routes */}
          <Route element={<PharmacyProvider />}>
            <Route path="/pharmacy/login"      element={<PharmacyLogin />} />
            <Route path="/pharmacy/dashboard"  element={<PharmacyDashboard />} />
            <Route path="/pharmacy/profile"    element={<PharmacyProfile />} />
            <Route path="/pharmacy/sync"       element={<InventorySync />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PatientProvider>
  );
}

export default App;
