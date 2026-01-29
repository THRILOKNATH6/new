import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import HREmployeesPage from '@/features/hr/pages/HREmployeesPage';
import ITOrdersPage from '@/features/it/pages/ITOrdersPage';
import IEOrdersPage from '@/features/ie/pages/IEOrdersPage';
import IELinesPage from '@/features/ie/pages/IELinesPage';
import IEEmployeesPage from '@/features/ie/pages/IEEmployeesPage';
import IEOperationsPage from '@/features/ie/pages/IEOperationsPage';
import CuttingDashboardPage from '@/features/production/pages/CuttingDashboardPage';
import CuttingEntryPage from '@/features/production/pages/CuttingEntryPage';
import SupermarketDashboard from '@/features/supermarket/pages/SupermarketDashboard';
import DashboardLayout from '@/features/dashboard/components/DashboardLayout';

// Protected Route Component
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}


function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        {/* Dashboard Layout wraps all dashboard sub-routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          {/* Placeholder routes for features - these would be real components later */}
          <Route path="hr" element={<HREmployeesPage />} />
          <Route path="it/orders" element={<ITOrdersPage />} />
          <Route path="ie/orders" element={<IEOrdersPage />} />
          <Route path="ie/lines" element={<IELinesPage />} />
          <Route path="ie/employees" element={<IEEmployeesPage />} />
          <Route path="ie/operations" element={<IEOperationsPage />} />

          {/* Production / Cutting Module */}
          <Route path="production/cutting" element={<CuttingDashboardPage />} />
          <Route path="production/cutting/:id" element={<CuttingEntryPage />} />
          <Route path="production/supermarket" element={<SupermarketDashboard />} />

          <Route path="production" element={<div>Production Module (Coming Soon)</div>} />
          <Route path="machines" element={<div>Machines Module (Coming Soon)</div>} />
          <Route path="reports" element={<div>Reports Module (Coming Soon)</div>} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
