import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Explore from './pages/Explore';
import Matches from './pages/Matches';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, profileCompleted } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!profileCompleted) {
        return <Navigate to="/onboarding" replace />;
    }

    return (
        <>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {children}
            </div>
            <BottomNav />
        </>
    );
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, profileCompleted } = useAuth();

    if (user) {
        if (profileCompleted) {
            return <Navigate to="/" replace />;
        }
        return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
};

function AppRoutes() {
    const { user, profileCompleted, loading } = useAuth();

    if (loading) {
        return <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    }

    return (
        <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/onboarding" element={
                user && !profileCompleted ? <Onboarding /> : <Navigate to="/" replace />
            } />
            <Route path="/" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <div className="app-container">
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </div>
        </AuthProvider>
    );
}

export default App;
