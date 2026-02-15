'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loginOperatore } from '../actions';
import styles from './login.module.css';

export default function LoginOperatorePage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(formData: FormData) {
        setError(null);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Inserisci un indirizzo email valido.');
            return;
        }
        if (!password || password.length < 6) {
            setError('La password deve essere di almeno 6 caratteri.');
            return;
        }

        setLoading(true);
        const result = await loginOperatore(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className={styles.container}>
                <Link href="/" className="auth-back">
                    ← Torna indietro
                </Link>

                <div className="auth-card">
                    <div className="tabs">
                        <span className="tab active">Accedi</span>
                        <Link href="/operatore/registrati" className="tab">
                            Registrati
                        </Link>
                    </div>

                    <div className="auth-icon">🔒</div>
                    <h1 className="auth-title">Accesso Operatore</h1>
                    <p className="auth-subtitle">Dashboard A.L.I.C.E.</p>

                    {error && (
                        <div className="alert alert-danger">
                            ⚠️ {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">
                                📧 Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                placeholder="operatore@esempio.it"
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
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner spinner-white" /> Accesso...
                                </>
                            ) : (
                                'Accedi'
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
