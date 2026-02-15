'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logoutOperatore } from '../app/operatore/actions';
import styles from '../app/operatore/dashboard/dashboard.module.css';

interface Operatore {
    id: string;
    nome_completo: string;
    codice_operatore: string;
    struttura_sanitaria?: string;
}

export default function DashboardLayoutClient({
    children,
    operatore,
}: {
    children: React.ReactNode;
    operatore: Operatore;
}) {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const router = useRouter();

    return (
        <div className={styles.layoutWrapper}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <span
                        className={styles.headerLogo}
                        onClick={() => router.push('/operatore/dashboard')}
                        style={{ cursor: 'pointer' }}
                    >
                        🏥
                    </span>
                    <div>
                        <h1 className={styles.headerTitle}>Dashboard Operatore</h1>
                        <p className={styles.headerSubtitle}>
                            {operatore.nome_completo} · Codice: <strong>{operatore.codice_operatore}</strong>
                        </p>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="btn btn-outline btn-sm"
                    >
                        🚪 Esci
                    </button>
                </div>
            </header>

            {/* Area contenuto */}
            <main className={styles.main}>
                {children}
            </main>

            {/* Modal conferma logout */}
            {showLogoutModal && (
                <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
                        <h2 className="modal-title" style={{ justifyContent: 'center', marginBottom: '8px' }}>
                            Conferma <span style={{ color: 'var(--danger)' }}>Logout</span>
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                            Sei sicuro di voler uscire dalla dashboard operatore?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="btn btn-outline"
                            >
                                Annulla
                            </button>
                            <form action={logoutOperatore}>
                                <button type="submit" className="btn btn-danger">
                                    Esci
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
