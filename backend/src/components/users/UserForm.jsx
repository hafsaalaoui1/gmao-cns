import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, RefreshCw, User, Mail, Briefcase, Shield } from 'lucide-react';

const UserForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        role: 'intervenant',
        service: '',
        is_active: true,
    });

    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, password });
        toast.success('🔑 Mot de passe généré !');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const fullName = `${formData.prenom} ${formData.nom}`.trim();

        try {
            const payload = {
                name: fullName,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                is_active: formData.is_active,
                service: formData.service,
            };

            await api.post('/users', payload);
            toast.success('✅ Utilisateur créé avec succès ! Un email a été envoyé.');
            navigate('/users');
        } catch (error) {
            const message = error.response?.data?.message || 'Erreur lors de la création';
            toast.error(`❌ ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const services = [
        'Radar',
        'Radionavigation',
        'Communication',
        'Télécommunications',
        'Informatique',
        'Électromécanique',
        'Administration',
    ];

    return (
        <div className="user-form-page">
            <div className="page-header-modern">
                <div>
                    <h1 className="page-title">➕ Nouvel utilisateur</h1>
                    <p className="page-subtitle">Créez un nouveau compte pour le personnel du Service Radar & Radionavigation</p>
                </div>
                <button 
                    className="btn-secondary" 
                    onClick={() => navigate('/users')}
                >
                    ← Retour à la liste
                </button>
            </div>

            <div className="user-form-container">
                <form onSubmit={handleSubmit} className="user-form-modern">

                    {/* Nom + Prénom */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                <User size={16} className="label-icon" />
                                Prénom *
                            </label>
                            <input
                                type="text"
                                name="prenom"
                                className="form-control"
                                placeholder="Jean"
                                value={formData.prenom}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                <User size={16} className="label-icon" />
                                Nom *
                            </label>
                            <input
                                type="text"
                                name="nom"
                                className="form-control"
                                placeholder="Dupont"
                                value={formData.nom}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Email + Rôle */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                <Mail size={16} className="label-icon" />
                                Email professionnel *
                            </label>
                            <input
                                type="email"
                                name="email"
                                className="form-control"
                                placeholder="prenom.nom@onda.ma"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <p className="field-hint">Format recommandé : prenom.nom@onda.ma</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                <Shield size={16} className="label-icon" />
                                Rôle *
                            </label>
                            <select
                                name="role"
                                className="form-control"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="admin">👑 Administrateur</option>
                                <option value="responsable">📋 Responsable</option>
                                <option value="intervenant">🔧 Intervenant terrain</option>
                            </select>
                        </div>
                    </div>

                    {/* Service */}
                    <div className="form-row">
                        <div className="form-group full-width">
                            <label className="form-label">
                                <Briefcase size={16} className="label-icon" />
                                Service / Département
                            </label>
                            <select
                                name="service"
                                className="form-control"
                                value={formData.service}
                                onChange={handleChange}
                            >
                                <option value="">Sélectionner un service...</option>
                                {services.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Mot de passe */}
                    <div className="form-row">
                        <div className="form-group full-width">
                            <label className="form-label">
                                🔑 Mot de passe
                            </label>
                            <div className="password-field">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-control password-input"
                                    placeholder="Générer ou saisir un mot de passe"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button 
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="password-actions">
                                <button 
                                    type="button" 
                                    className="btn-generate"
                                    onClick={generatePassword}
                                >
                                    <RefreshCw size={16} />
                                    Générer un mot de passe sécurisé
                                </button>
                                <span className="password-hint">
                                    {formData.password ? '🔒 12 caractères sécurisé' : 'Cliquez sur "Générer" ou saisissez un mot de passe'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Toggle Compte actif */}
                    <div className="form-row">
                        <div className="form-group full-width">
                            <div className="toggle-wrapper">
                                <label className="toggle-label">
                                    <span className="toggle-text">
                                        {formData.is_active ? '✅ Compte actif' : '❌ Compte inactif'}
                                    </span>
                                    <div 
                                        className={`toggle-switch ${formData.is_active ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    >
                                        <div className="toggle-slider"></div>
                                    </div>
                                </label>
                                <p className="toggle-hint">
                                    {formData.is_active 
                                        ? 'L\'utilisateur pourra se connecter immédiatement' 
                                        : 'L\'utilisateur ne pourra pas se connecter'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Boutons */}
                    <div className="form-actions-modern">
                        <button 
                            type="submit" 
                            className="btn-primary-modern"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Création en cours...
                                </>
                            ) : (
                                '➕ Créer l\'utilisateur'
                            )}
                        </button>
                        <button 
                            type="button" 
                            className="btn-cancel-modern"
                            onClick={() => navigate('/users')}
                        >
                            ❌ Annuler
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;