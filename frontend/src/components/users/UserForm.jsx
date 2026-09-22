import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import {
    User,
    Mail,
    Shield,
    ArrowLeft,
    UserPlus
} from 'lucide-react';

const UserForm = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        email: '',
        role: 'intervenant',
        is_active: true,
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const prenom = formData.prenom.trim();
        const nom = formData.nom.trim();
        const email = formData.email.trim();

        if (!prenom) {
            toast.error('Veuillez saisir le prénom');
            return;
        }

        if (!nom) {
            toast.error('Veuillez saisir le nom');
            return;
        }

        if (!email) {
            toast.error('Veuillez saisir l’adresse email');
            return;
        }

        const fullName = `${prenom} ${nom}`.trim();

        setLoading(true);

        try {
            const response = await api.post('/users', {
                name: fullName,
                email: email,
                role: formData.role,
                is_active: formData.is_active,
            });

            const message = response.data?.message || 'Utilisateur créé avec succès';

            toast.success(message, {
                duration: 8000,
            });

            // Retour vers la liste des utilisateurs
            setTimeout(() => {
                navigate('/users');
            }, 500);

        } catch (error) {
            console.error('Erreur création utilisateur :', error);

            if (error.response?.status === 422) {
                const errors = error.response.data?.errors;

                if (errors) {
                    const firstError = Object.values(errors)[0];

                    if (Array.isArray(firstError)) {
                        toast.error(firstError[0]);
                    } else {
                        toast.error('Erreur de validation');
                    }
                } else {
                    toast.error(
                        error.response.data?.message ||
                        'Erreur de validation'
                    );
                }
            } else {
                toast.error(
                    error.response?.data?.message ||
                    'Une erreur est survenue lors de la création de l’utilisateur'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#f8fafc',
                padding: '30px',
            }}
        >
            <div
                style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        marginBottom: '30px',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => navigate('/users')}
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <ArrowLeft size={20} color="#475569" />
                    </button>

                    <div>
                        <h1
                            style={{
                                margin: 0,
                                fontSize: '28px',
                                fontWeight: '700',
                                color: '#0f172a',
                            }}
                        >
                            Ajouter un utilisateur
                        </h1>

                        <p
                            style={{
                                margin: '5px 0 0',
                                color: '#64748b',
                                fontSize: '14px',
                            }}
                        >
                            Créer un nouveau compte utilisateur
                        </p>
                    </div>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit}>
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '30px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        {/* Informations personnelles */}
                        <div style={{ marginBottom: '30px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '20px',
                                }}
                            >
                                <User size={20} color="#2563eb" />

                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#0f172a',
                                    }}
                                >
                                    Informations personnelles
                                </h2>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        'repeat(2, minmax(0, 1fr))',
                                    gap: '20px',
                                }}
                            >
                                {/* Prénom */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#334155',
                                        }}
                                    >
                                        Prénom
                                    </label>

                                    <input
                                        type="text"
                                        name="prenom"
                                        value={formData.prenom}
                                        onChange={handleChange}
                                        placeholder="Ex : Ahmed"
                                        required
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '12px 14px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                {/* Nom */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#334155',
                                        }}
                                    >
                                        Nom
                                    </label>

                                    <input
                                        type="text"
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        placeholder="Ex : Alaoui"
                                        required
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '12px 14px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: '30px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '20px',
                                }}
                            >
                                <Mail size={20} color="#2563eb" />

                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#0f172a',
                                    }}
                                >
                                    Coordonnées
                                </h2>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#334155',
                                    }}
                                >
                                    Adresse email
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="exemple@onda.ma"
                                    required
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '12px 14px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Rôle */}
                        <div style={{ marginBottom: '30px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '20px',
                                }}
                            >
                                <Shield size={20} color="#2563eb" />

                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#0f172a',
                                    }}
                                >
                                    Accès et rôle
                                </h2>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#334155',
                                    }}
                                >
                                    Rôle
                                </label>

                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '12px 14px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="intervenant">
                                        Intervenant / ATSEP
                                    </option>

                                    <option value="responsable">
                                        Responsable
                                    </option>

                                    <option value="admin">
                                        Administrateur
                                    </option>
                                </select>
                            </div>
                        </div>

                        {/* Statut */}
                        <div
                            style={{
                                padding: '16px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                marginBottom: '30px',
                            }}
                        >
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer',
                                    }}
                                />

                                <span
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#334155',
                                    }}
                                >
                                    Compte actif
                                </span>
                            </label>

                            <p
                                style={{
                                    margin: '8px 0 0 28px',
                                    fontSize: '13px',
                                    color: '#64748b',
                                }}
                            >
                                L'utilisateur pourra se connecter dès la
                                création de son compte.
                            </p>
                        </div>

                        {/* Information mot de passe */}
                        <div
                            style={{
                                padding: '16px',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '10px',
                                marginBottom: '30px',
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '14px',
                                    color: '#1e40af',
                                    lineHeight: '1.6',
                                }}
                            >
                                <strong>Mot de passe :</strong> il sera généré
                                automatiquement par le système lors de la
                                création du compte.
                            </p>
                        </div>

                        {/* Boutons */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => navigate('/users')}
                                disabled={loading}
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: loading
                                        ? 'not-allowed'
                                        : 'pointer',
                                }}
                            >
                                Annuler
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: loading
                                        ? '#94a3b8'
                                        : '#2563eb',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: loading
                                        ? 'not-allowed'
                                        : 'pointer',
                                }}
                            >
                                <UserPlus size={18} />

                                {loading
                                    ? 'Création...'
                                    : 'Créer l’utilisateur'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;