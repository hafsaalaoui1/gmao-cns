import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return <div className="loading">Chargement...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Vérification des rôles
    if (allowedRoles.length > 0) {
        const userRole = String(user?.role || '').trim().toLowerCase();

        const normalizedAllowedRoles = allowedRoles.map(
            role => String(role).trim().toLowerCase()
        );

        if (!normalizedAllowedRoles.includes(userRole)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;