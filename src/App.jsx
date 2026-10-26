import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layout
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import StudyTimerModal from './components/timer/StudyTimerModal';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import SubjectDetails from './pages/SubjectDetails';
import RevisionQueue from './pages/RevisionQueue';
import StudySessions from './pages/StudySessions';
import Exams from './pages/Exams';
import Goals from './pages/Goals';
import Notes from './pages/Notes';

const ProtectedLayout = ({ children, onOpenTimer }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar onOpenTimer={onOpenTimer} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Academic Routes */}
        <Route
          path="/"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <Dashboard onOpenTimer={() => setIsTimerOpen(true)} />
            </ProtectedLayout>
          }
        />
        <Route
          path="/subjects"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <Subjects />
            </ProtectedLayout>
          }
        />
        <Route
          path="/subjects/:id"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <SubjectDetails />
            </ProtectedLayout>
          }
        />
        <Route
          path="/revisions"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <RevisionQueue />
            </ProtectedLayout>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <StudySessions onOpenTimer={() => setIsTimerOpen(true)} />
            </ProtectedLayout>
          }
        />
        <Route
          path="/exams"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <Exams />
            </ProtectedLayout>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <Goals />
            </ProtectedLayout>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedLayout onOpenTimer={() => setIsTimerOpen(true)}>
              <Notes />
            </ProtectedLayout>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Focus Study Timer Modal */}
      <StudyTimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        onSessionSaved={() => {
          // Trigger refresh if needed
        }}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
