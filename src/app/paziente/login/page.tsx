'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginPaziente } from '../actions';
import styles from './login.module.css';

export default function LoginPazientePage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);
        const result = await loginPaziente(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else if (result?.redirect) {
            router.push(result.redirect);
        }
    }

    return (
        <div className="paziente-auth-page">
            <div className={styles.container}>
                <Link href="/" className="auth-back">
                    ← Indietro
                </Link>

                <div className="auth-card">
                    <div className="tabs">
                        <span className="tab active">Accedi</span>
                        <Link href="/paziente/registrati" className="tab">
                            Registrati
                        </Link>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '48px', marginBottom: '8px' }}>👋</div>
                    <h1 className="auth-title">Benvenuto!</h1>
                    <p className="auth-subtitle">Inserisci i tuoi dati</p>

                    {error && (
                        <div className="alert alert-danger">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={async (e) => { e.preventDefault(); await handleSubmit(new FormData(e.currentTarget)); }} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">
                                📧 Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                placeholder="nome@esempio.it"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                🔑 Password
                            </label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className={styles.togglePassword}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-paziente btn-lg"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner spinner-white" /> Accesso...
                                </>
                            ) : (
                                'Entra ✓'
                            )}
                        </button>
                    </form>

                    <p className="auth-system-label">
                        Sistema A.L.I.C.E. - Assistenza per la Longevità
                    </p>
                </div>
            </div>
        </div>
    );
}
