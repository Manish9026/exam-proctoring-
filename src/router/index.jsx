import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import useAuthStore from '../store/authStore';

// Lazy load pages
const LandingPage = React.lazy(() => import('../pages/Landing/LandingPage'));
const LoginPage = React.lazy(() => import('../pages/Auth/LoginPage'));
const RegisterPage = React.lazy(() => import('../pages/Auth/RegisterPage'));

// Admin pages
const AdminDashboard = React.lazy(() => import('../pages/Admin/AdminDashboard'));
const LiveMonitoring = React.lazy(() => import('../pages/Admin/LiveMonitoring'));
const ExamManagement = React.lazy(() => import('../pages/Admin/ExamManagement'));
const CandidatesPage = React.lazy(() => import('../pages/Admin/CandidatesPage'));
const ViolationsPage = React.lazy(() => import('../pages/Admin/ViolationsPage'));
const RiskAnalytics = React.lazy(() => import('../pages/Admin/RiskAnalytics'));
const RecordingsPage = React.lazy(() => import('../pages/Admin/RecordingsPage'));
const AnalyticsPage = React.lazy(() => import('../pages/Admin/AnalyticsPage'));
const NotificationsPage = React.lazy(() => import('../pages/Admin/NotificationsPage'));
const SettingsPage = React.lazy(() => import('../pages/Admin/SettingsPage'));

// Candidate pages
const CandidateDashboard = React.lazy(() => import('../pages/Candidate/CandidateDashboard'));

// Exam pages
const PreExamVerify = React.lazy(() => import('../pages/Exam/PreExamVerify'));
const ExamTaking = React.lazy(() => import('../pages/Exam/ExamTaking'));

// Loading spinner
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-primary)',
  }}>
    <div style={{
      width: 40,
      height: 40,
      border: '3px solid var(--border-primary)',
      borderTopColor: 'var(--primary-500)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  </div>
);

// Auth guard — uses secure tokenStore via authStore
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={`/${user?.role || ''}`} replace />;
  }
  return children;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<PageLoader />}>
        <RegisterPage />
      </Suspense>
    ),
  },

  // Admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense> },
      { path: 'monitoring', element: <Suspense fallback={<PageLoader />}><LiveMonitoring /></Suspense> },
      { path: 'exams', element: <Suspense fallback={<PageLoader />}><ExamManagement /></Suspense> },
      { path: 'candidates', element: <Suspense fallback={<PageLoader />}><CandidatesPage /></Suspense> },
      { path: 'violations', element: <Suspense fallback={<PageLoader />}><ViolationsPage /></Suspense> },
      { path: 'risk-analytics', element: <Suspense fallback={<PageLoader />}><RiskAnalytics /></Suspense> },
      { path: 'recordings', element: <Suspense fallback={<PageLoader />}><RecordingsPage /></Suspense> },
      { path: 'analytics', element: <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense> },
      { path: 'notifications', element: <Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense> },
    ],
  },

  // Candidate routes
  {
    path: '/candidate',
    element: (
      <ProtectedRoute requiredRole="candidate">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<PageLoader />}><CandidateDashboard /></Suspense> },
      { path: 'exams', element: <Suspense fallback={<PageLoader />}><CandidateDashboard /></Suspense> },
      { path: 'results', element: <Suspense fallback={<PageLoader />}><CandidateDashboard /></Suspense> },
      { path: 'profile', element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense> },
    ],
  },

  // Exam routes (no sidebar)
  {
    path: '/candidate/exam/:examId/verify',
    element: (
      <ProtectedRoute requiredRole="candidate">
        <Suspense fallback={<PageLoader />}><PreExamVerify /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidate/exam/:examId/take',
    element: (
      <ProtectedRoute requiredRole="candidate">
        <Suspense fallback={<PageLoader />}><ExamTaking /></Suspense>
      </ProtectedRoute>
    ),
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);

const AppRouter = () => <RouterProvider router={router} />;

export default AppRouter;
