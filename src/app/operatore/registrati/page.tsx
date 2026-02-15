'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registraOperatore } from '../actions';
import styles from './registrati.module.css';

export default function RegistrazioneOperatorePage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(formData: FormData) {
        setError(null);
        const nome = formData.get('nome_completo') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const conferma = formData.get('conferma_password') as string;

        if (!nome || nome.trim().length < 2) {
            setError('Inserisci il tuo nome completo.');
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Inserisci un indirizzo email valido.');
            return;
        }
        if (!password || password.length < 6) {
            setError('La password deve essere di almeno 6 caratteri.');
            return;
        }
        if (password !== conferma) {
            setError('Le password non coincidono.');
            return;
        }

        setLoading(true);
        const result = await registraOperatore(formData);
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
                        <Link href="/operatore/login" className="tab">
                            Accedi
                        </Link>
                        <span className="tab active">Registrati</span>
                    </div>

                    <div className="auth-icon">👤</div>
                    <h1 className="auth-title">Registrazione Operatore</h1>
                    <p className="auth-subtitle">Crea il tuo account professionale</p>

                    {error && (
                        <div className="alert alert-danger">
                            ⚠️ {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">
                                Nome Completo <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="nome_completo"
                                className="form-input"
                                placeholder="Mario Rossi"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Email <span className="required">*</span>
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
                            <label className="form-label">Struttura Sanitaria</label>
                            <input
                                type="text"
                                name="struttura_sanitaria"
                                className="form-input"
                                placeholder="Ospedale / Centro / RSA"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Telefono</label>
                            <input
                                type="tel"
                                name="telefono"
                                className="form-input"
                                placeholder="+39 123 456 7890"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Password <span className="required">*</span>
                            </label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-input"
                                    placeholder="Minimo 6 caratteri"
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

                        <div className="form-group">
                            <label className="form-label">
                                Conferma Password <span className="required">*</span>
                            </label>
                            <input
                                type="password"
                                name="conferma_password"
                                className="form-input"
                                placeholder="Ripeti la password"
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner spinner-white" /> Registrazione...
                                </>
                            ) : (
                                'Registrati'
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        🔒 Questo portale è riservato solo per la gestione dei pazienti e
                        potrà essere utilizzato secondo la normativa GDPR.
                    </div>

                    <p className="auth-system-label">
                        Sistema A.L.I.C.E. - Assistenza per la Longevità
                    </p>
                </div>
            </div>
        </div>
    );
}
