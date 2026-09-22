import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Création du contexte
const AuthContext = createContext();

// Provider qui va envelopper l'application
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Vérifier si l'utilisateur est déjà connecté au chargement
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Erreur lors du chargement de l\'utilisateur:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    // Fonction de connexion
    const login = async (email, password) => {
        try {
            const response = await api.post('/login', { email, password });
            const { user, token } = response.data;
            
            // Stocker les données
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // ✅ Stocker également le groupe (si présent)
            if (user.group) {
                localStorage.setItem('user_group_id', user.group.id);
                localStorage.setItem('user_group_name', user.group.name);
            } else {
                localStorage.setItem('user_group_name', 'Non assigné');
            }

            setUser(user);
            setIsAuthenticated(true);
            toast.success('✅ Connexion réussie !');
            
            return { success: true, user }; // retourner user pour les autres composants
        } catch (error) {
            const message = error.response?.data?.message || 'Erreur de connexion';
            toast.error(`❌ ${message}`);
            return { success: false, error: message };
        }
    };

    // Fonction de déconnexion
    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            // Ignorer les erreurs de logout
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('user_group_id');
            localStorage.removeItem('user_group_name');
            setUser(null);
            setIsAuthenticated(false);
            // ✅ Correction : utiliser toast() au lieu de toast.info
            toast('👋 Déconnecté');
        }
    };

    // Vérification des rôles
    const isAdmin = user?.role === 'admin';
    const isResponsable = user?.role === 'responsable' || user?.role === 'admin';
    const isIntervenant = user?.role === 'intervenant';

    const value = {
        user,
        login,
        logout,
        loading,
        isAuthenticated,
        isAdmin,
        isResponsable,
        isIntervenant,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }
    return context;
};