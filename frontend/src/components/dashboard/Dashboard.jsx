import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="dashboard">
            <h1 className="dashboard-title">
                Bonjour, {user?.name} 👋
            </h1>
            <p className="dashboard-subtitle">
                Voici le résumé de votre activité
            </p>

            <div className="dashboard-stats">
                <div className="stat-card stat-card-blue">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                        <div className="stat-value">0</div>
                        <div className="stat-label">Équipements</div>
                    </div>
                </div>
                <div className="stat-card stat-card-green">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <div className="stat-value">0</div>
                        <div className="stat-label">Opérationnels</div>
                    </div>
                </div>
                <div className="stat-card stat-card-red">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-info">
                        <div className="stat-value">0</div>
                        <div className="stat-label">En panne</div>
                    </div>
                </div>
                <div className="stat-card stat-card-yellow">
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                        <div className="stat-value">0</div>
                        <div className="stat-label">Interventions</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-welcome">
                <h3>📌 Bienvenue sur GMAO CNS</h3>
                <p>
                    Cette application vous permet de gérer la maintenance des équipements CNS
                    (Communication, Navigation, Surveillance) de l'aéroport Fès-Saïss.
                </p>
                <br />
                <p>
                    <strong>Votre rôle :</strong> {user?.role}
                </p>
            </div>
        </div>
    );
};

export default Dashboard;