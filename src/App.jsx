import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext'; // <-- ADDED
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ApplicantDashboard from './pages/ApplicantDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import AdminDashboard from './pages/AdminDashboard'; 

function App() {
  const auth = useAuth();
  const ADMIN_EMAIL = "admin@livelimatch.com";

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center p-12 bg-white rounded-[3rem] shadow-xl border border-red-50 max-w-sm w-full mx-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">System Error</h2>
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">Auth Provider Missing</p>
        </div>
      </div>
    );
  }

  const { user, userData, loading } = auth;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans relative overflow-hidden">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-pulse"></div>
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-900 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <h2 className="text-sm font-black text-blue-900 uppercase tracking-[0.3em] animate-pulse">
            LIVELI<span className="text-blue-500">MATCH</span>
          </h2>
        </div>
      </div>
    );
  }

  const SyncingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white">
          <div className="w-10 h-10 border-4 border-blue-900/10 border-t-blue-900 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Syncing Profile</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Connecting to Barangay Portal...</p>
        </div>
    </div>
  );

  return (
    // <-- WRAPPED WITH TOAST PROVIDER
    <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route 
              path="/admin-dashboard" 
              element={
                user && user.email === ADMIN_EMAIL 
                  ? <AdminDashboard /> 
                  : <Navigate to="/login" replace />
              } 
            />

            <Route 
              path="/employer-dashboard" 
              element={
                user ? (
                  userData ? (
                     userData.role === 'employer' ? <EmployerDashboard /> : <Navigate to="/applicant-dashboard" />
                  ) : <SyncingScreen /> 
                ) : <Navigate to="/login" replace />
              } 
            />

            <Route 
              path="/applicant-dashboard" 
              element={
                user ? (
                  userData ? (
                     userData.role === 'applicant' ? <ApplicantDashboard /> : <Navigate to="/employer-dashboard" />
                  ) : <SyncingScreen />
                ) : <Navigate to="/login" replace />
              } 
            />

            <Route 
              path="/dashboard" 
              element={
                 user ? (
                   userData ? (
                     userData.role === 'employer' ? <Navigate to="/employer-dashboard" /> : <Navigate to="/applicant-dashboard" />
                   ) : <SyncingScreen />
                 ) : <Navigate to="/login" replace />
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
    </ToastProvider>
  );
}

export default App;