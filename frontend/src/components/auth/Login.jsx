import React, {
    useState,
    useRef,
    useCallback,
    useEffect
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    Loader2,
    ShieldCheck,
    GripVertical,
    AlertCircle,
    Wrench,
    Activity,
    BarChart3
} from 'lucide-react';

import './Login.css';


const REMEMBER_KEY = 'gmao_remembered_email';

const MIN_RIGHT = 30;
const MAX_RIGHT = 60;


const Login = () => {

    /* ============================================================
       ÉTATS
       ============================================================ */

    const [email, setEmail] = useState(() => {
        try {
            return localStorage.getItem(REMEMBER_KEY) || '';
        } catch {
            return '';
        }
    });

    const [password, setPassword] = useState('');

    const [remember, setRemember] = useState(() => {
        try {
            return Boolean(
                localStorage.getItem(REMEMBER_KEY)
            );
        } catch {
            return false;
        }
    });

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    const [rightWidth, setRightWidth] = useState(42);


    /* ============================================================
       REDIMENSIONNEMENT DES PANNEAUX
       ============================================================ */

    const isResizing = useRef(false);
    const cleanupRef = useRef(null);


    const { login } = useAuth();
    const navigate = useNavigate();


    /* Nettoyage du resize */
    useEffect(() => {
        return () => {
            cleanupRef.current?.();
        };
    }, []);


    /* ============================================================
       SOURIS — REDIMENSIONNEMENT
       ============================================================ */

    const handleMouseDown = useCallback((e) => {

        e.preventDefault();

        isResizing.current = true;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';


        const handleMouseMove = (moveEvent) => {

            if (!isResizing.current) {
                return;
            }

            const containerWidth = window.innerWidth;

            const next =
                ((containerWidth - moveEvent.clientX) /
                    containerWidth) *
                100;


            if (
                next >= MIN_RIGHT &&
                next <= MAX_RIGHT
            ) {
                setRightWidth(next);
            }
        };


        const handleMouseUp = () => {

            isResizing.current = false;

            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            window.removeEventListener(
                'mousemove',
                handleMouseMove
            );

            window.removeEventListener(
                'mouseup',
                handleMouseUp
            );

            cleanupRef.current = null;
        };


        cleanupRef.current = handleMouseUp;


        window.addEventListener(
            'mousemove',
            handleMouseMove
        );

        window.addEventListener(
            'mouseup',
            handleMouseUp
        );

    }, []);


    /* ============================================================
       CLAVIER — REDIMENSIONNEMENT
       ============================================================ */

    const handleResizerKeyDown = useCallback((e) => {

        if (e.key === 'ArrowLeft') {

            e.preventDefault();

            setRightWidth((width) =>
                Math.min(
                    MAX_RIGHT,
                    width + 2
                )
            );

        } else if (e.key === 'ArrowRight') {

            e.preventDefault();

            setRightWidth((width) =>
                Math.max(
                    MIN_RIGHT,
                    width - 2
                )
            );
        }

    }, []);


    /* ============================================================
       CONNEXION
       ============================================================ */

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (loading) {
            return;
        }


        setError('');
        setLoading(true);


        try {

            const result = await login(
                email,
                password
            );


            if (result?.success) {

                const user = result.user;


                if (user) {

                    localStorage.setItem(
                        'user_id',
                        user.id
                    );

                    localStorage.setItem(
                        'user_name',
                        user.name
                    );

                    localStorage.setItem(
                        'user_role',
                        user.role
                    );

                    localStorage.setItem(
                        'user_email',
                        user.email
                    );


                    if (user.group) {

                        localStorage.setItem(
                            'user_group_id',
                            user.group.id
                        );

                        localStorage.setItem(
                            'user_group_name',
                            user.group.name
                        );

                    } else {

                        localStorage.setItem(
                            'user_group_id',
                            ''
                        );

                        localStorage.setItem(
                            'user_group_name',
                            'Non assigné'
                        );
                    }
                }


                /* Remember me */

                if (remember) {

                    localStorage.setItem(
                        REMEMBER_KEY,
                        email
                    );

                } else {

                    localStorage.removeItem(
                        REMEMBER_KEY
                    );
                }


                navigate('/dashboard');

                return;
            }


            setError(
                result?.message ||
                'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.'
            );

        } catch (err) {

            console.error(
                'Erreur connexion :',
                err
            );

            setError(
                'Connexion au serveur impossible. Veuillez réessayer dans un instant.'
            );

        } finally {

            setLoading(false);
        }
    };


    /* ============================================================
       RENDU
       ============================================================ */

    return (

        <div className="login-screen">


            {/* ====================================================
                PANNEAU GAUCHE
               ==================================================== */}

            <section
                className="left-panel"
                style={{
                    width: `${100 - rightWidth}%`
                }}
            >

                <div
                    className="panel-overlay"
                    aria-hidden="true"
                />

                <div
                    className="panel-grid"
                    aria-hidden="true"
                />


                <div className="panel-content">

                    <div className="badge-tag">
                        <ShieldCheck size={14} />
                        <span>Environnement sécurisé</span>
                    </div>


                    <h1 className="system-title">
                        GMAO <span className="title-accent">CNS</span>
                    </h1>


                    <p className="system-desc">

                        Plateforme de Gestion de Maintenance
                        Assistée par Ordinateur dédiée aux
                        équipements de navigation aérienne.

                    </p>


                    <ul className="feature-list">

                        <li>

                            <span className="feature-icon">
                                <Wrench size={15} />
                            </span>

                            <span>
                                Maintenance préventive & corrective
                            </span>

                        </li>


                        <li>

                            <span className="feature-icon">
                                <Activity size={15} />
                            </span>

                            <span>
                                Suivi des équipements CNS
                            </span>

                        </li>


                        <li>

                            <span className="feature-icon">
                                <BarChart3 size={15} />
                            </span>

                            <span>
                                Indicateurs de performance
                            </span>

                        </li>

                    </ul>


                   
                </div>

            </section>


            {/* ====================================================
                SÉPARATEUR
               ==================================================== */}

            <div
                className="resizer-bar"
                role="separator"
                aria-orientation="vertical"
                aria-label="Redimensionner les panneaux"
                aria-valuenow={Math.round(rightWidth)}
                aria-valuemin={MIN_RIGHT}
                aria-valuemax={MAX_RIGHT}
                tabIndex={0}
                onMouseDown={handleMouseDown}
                onKeyDown={handleResizerKeyDown}
            >

                <span className="resizer-handle">
                    <GripVertical size={14} />
                </span>

            </div>


            {/* ====================================================
                PANNEAU DROIT
               ==================================================== */}

            <section
                className="right-panel"
                style={{
                    width: `${rightWidth}%`
                }}
            >

                <div className="login-container">


                    {/* =================================================
                        LOGO ONDA
                       ================================================= */}

                    <div className="login-brand">

                        <img
                            src="/onda-logo.jpeg"
                            alt="Logo ONDA"
                            className="onda-brand-logo"
                        />

                    </div>


                    {/* =================================================
                        TITRE
                       ================================================= */}

                    <div className="login-heading">

                        <h2>
                            Authentification
                        </h2>

                        <p>
                            Connectez-vous pour accéder à la
                            plateforme GMAO CNS
                        </p>

                    </div>


                    {/* =================================================
                        ERREUR
                       ================================================= */}

                    {error && (

                        <div
                            className="form-alert"
                            role="alert"
                        >

                            <AlertCircle size={16} />

                            <span>
                                {error}
                            </span>

                        </div>

                    )}


                    {/* =================================================
                        FORMULAIRE
                       ================================================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="credentials-form"
                        noValidate
                    >


                        {/* EMAIL */}

                        <div className="form-group">

                            <label htmlFor="email">
                                Adresse e-mail
                            </label>


                            <div className="input-field">

                                <Mail
                                    size={18}
                                    className="field-icon"
                                />


                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="username"
                                    placeholder="votre.email@onda.ma"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                    required
                                />

                            </div>

                        </div>


                        {/* MOT DE PASSE */}

                        <div className="form-group">

                            <label htmlFor="password">
                                Mot de passe
                            </label>


                            <div className="input-field">

                                <Lock
                                    size={18}
                                    className="field-icon"
                                />


                                <input
                                    id="password"
                                    name="password"
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    autoComplete="current-password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                />


                                <button
                                    type="button"
                                    className="visibility-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (value) => !value
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? 'Masquer le mot de passe'
                                            : 'Afficher le mot de passe'
                                    }
                                >

                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}

                                </button>

                            </div>

                        </div>


                        {/* REMEMBER ME */}

                        <div className="form-options">

                            <label className="checkbox-field">

                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) =>
                                        setRemember(
                                            e.target.checked
                                        )
                                    }
                                />

                                <span>
                                    Se souvenir de moi
                                </span>

                            </label>

                        </div>


                        {/* BOUTON */}

                        <button
                            type="submit"
                            className="submit-action-btn"
                            disabled={loading}
                        >

                            {loading ? (

                                <>
                                    <Loader2
                                        size={18}
                                        className="spinner"
                                    />

                                    <span>
                                        Connexion...
                                    </span>
                                </>

                            ) : (

                                <>
                                    <LogIn size={18} />

                                    <span>
                                        Se connecter
                                    </span>
                                </>

                            )}

                        </button>

                    </form>


                    {/* =================================================
                        SÉCURITÉ
                       ================================================= */}

                    <div className="login-security">

                        <ShieldCheck size={15} />

                        <span>
                            Accès sécurisé — GMAO CNS
                        </span>

                    </div>


                    {/* VERSION */}

                    <div className="login-version">
                        GMAO CNS · v1.0
                    </div>

                </div>

            </section>

        </div>
    );
};


export default Login;