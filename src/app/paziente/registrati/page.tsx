'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registraPaziente } from '../actions';
import { createClient } from '@/lib/supabase/client';
import styles from './registrati.module.css';

interface Operatore {
    id: string;
    nome_completo: string;
    codice_operatore: string;
    struttura_sanitaria: string | null;
}

export default function RegistrazionePazientePage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [operatori, setOperatori] = useState<Operatore[]>([]);
    const [loadingOperatori, setLoadingOperatori] = useState(true);

    // Carica la lista operatori per il dropdown
    useEffect(() => {
        async function fetchOperatori() {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('operatori')
                .select('id, nome_completo, codice_operatore, struttura_sanitaria')
                .order('nome_completo');

            if (data) {
                setOperatori(data);
            }
            if (error) {
                console.error('Errore caricamento operatori:', error);
            }
            setLoadingOperatori(false);
        }
        fetchOperatori();
    }, []);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        if (!formData.get('operatore_id')) {
            setError('Devi selezionare un operatore.');
            setLoading(false);
            return;
        }

        const result = await registraPaziente(formData);
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
                        <Link href="/paziente/login" className="tab">
                            Accedi
                        </Link>
                        <span className="tab active">Registrati</span>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '48px', marginBottom: '8px' }}>👤</div>
                    <h1 className="auth-title">Registrazione Paziente</h1>
                    <p className="auth-subtitle">Crea il tuo account</p>

                    {error && (
                        <div className="alert alert-danger">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={async (e) => { e.preventDefault(); await handleSubmit(new FormData(e.currentTarget)); }} className="auth-form">
                        {/* Selezione operatore */}
                        <div className="form-group">
                            <label className="form-label">
                                🏥 Il tuo Operatore <span className="required">*</span>
                            </label>
                            {loadingOperatori ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                    <span className="spinner" /> Caricamento operatori...
                                </div>
                            ) : (
                                <select
                                    name="operatore_id"
                                    className="form-select"
                                    required
                                    defaultValue=""
                                >
                                    <option value="" disabled>
                                        Seleziona il tuo operatore...
                                    </option>
                                    {operatori.map((op) => (
                                        <option key={op.id} value={op.id}>
                                            {op.nome_completo}
                                            {op.struttura_sanitaria ? ` — ${op.struttura_sanitaria}` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <span className="form-hint">
                                Seleziona l&apos;operatore sanitario che ti segue
                            </span>
                        </div>

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
                                placeholder="paziente@esempio.it"
                                required
                            />
                        </div>

                        <div className="form-row">
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
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Età</label>
                                <input
                                    type="number"
                                    name="eta"
                                    className="form-input"
                                    placeholder="Es. 75"
                                    min={1}
                                    max={149}
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
                        </div>

                        <div className="form-group">
                            <label className="form-label">Indirizzo</label>
                            <input
                                type="text"
                                name="indirizzo"
                                className="form-input"
                                placeholder="Via Roma 10, Milano"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Contatto Emergenza</label>
                            <input
                                type="text"
                                name="contatto_emergenza"
                                className="form-input"
                                placeholder="Es. Sara Romano - +39 333 1086795"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-paziente btn-lg"
                            disabled={loading || loadingOperatori}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner spinner-white" /> Registrazione...
                                </>
                            ) : (
                                'Registrati ✓'
                            )}
                        </button>
                    </form>

                    <div className="auth-footer" style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}>
                        💡 Dopo la registrazione potrai accedere a tutte le funzionalità dell&apos;app:
                        piano giornaliero, esercizi, farmaci e molto altro.
                    </div>

                    <p className="auth-system-label">
                        Sistema A.L.I.C.E. - Assistenza per la Longevità
                    </p>
                </div>
            </div>
        </div>
    );
}
