'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';
import type { PazienteConMetriche } from './page';

type Filtro = 'tutti' | 'critico' | 'attenzione' | 'ok';

function getStatusEmoji(stato: string) {
    switch (stato) {
        case 'critico': return '😡';
        case 'attenzione': return '😐';
        case 'ok': return '😊';
        default: return '😊';
    }
}

function getMetricClass(value: number) {
    if (value < 50) return styles.metricLow;
    if (value < 75) return styles.metricMedium;
    return styles.metricHigh;
}

function formatUltimoAccesso(ts: string | null): string {
    if (!ts) return 'Mai';
    const diff = Date.now() - new Date(ts).getTime();
    const minuti = Math.floor(diff / 60000);
    if (minuti < 60) return `${minuti} min fa`;
    const ore = Math.floor(minuti / 60);
    if (ore < 24) return `${ore} ore fa`;
    const giorni = Math.floor(ore / 24);
    return `${giorni} giorni fa`;
}

export default function DashboardContent({
    pazienti,
}: {
    pazienti: PazienteConMetriche[];
}) {
    const [filtro, setFiltro] = useState<Filtro>('tutti');
    const [ricerca, setRicerca] = useState('');

    // Contatori per stato
    const contatori = useMemo(() => ({
        critico: pazienti.filter(p => p.stato === 'critico').length,
        attenzione: pazienti.filter(p => p.stato === 'attenzione').length,
        ok: pazienti.filter(p => p.stato === 'ok').length,
    }), [pazienti]);

    // Filtra pazienti
    const pazientiFiltrati = useMemo(() => {
        return pazienti.filter(p => {
            const matchFiltro = filtro === 'tutti' || p.stato === filtro;
            const matchRicerca = p.nome_completo.toLowerCase().includes(ricerca.toLowerCase());
            return matchFiltro && matchRicerca;
        });
    }, [pazienti, filtro, ricerca]);

    return (
        <>
            {/* Header con contatori */}
            <div className={styles.dashboardHeader}>
                <h2>Monitoraggio pazienti · {pazienti.length} pazienti totali</h2>
                <div className={styles.statusCounters}>
                    <span className={`${styles.statusCounter} ${styles.counterCritico}`}>
                        🔴 {contatori.critico} Critici
                    </span>
                    <span className={`${styles.statusCounter} ${styles.counterAttenzione}`}>
                        🟡 {contatori.attenzione} Attenzione
                    </span>
                    <span className={`${styles.statusCounter} ${styles.counterOk}`}>
                        🟢 {contatori.ok} OK
                    </span>
                </div>
            </div>

            {/* Toolbar: ricerca + filtri */}
            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <div className="search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Cerca paziente per nome..."
                            value={ricerca}
                            onChange={(e) => setRicerca(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-bar">
                    {(['tutti', 'critico', 'attenzione', 'ok'] as Filtro[]).map((f) => (
                        <button
                            key={f}
                            className={`filter-btn ${filtro === f ? 'active' : ''}`}
                            onClick={() => setFiltro(f)}
                        >
                            {f === 'tutti' ? 'Tutti' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Griglia pazienti */}
            {pazientiFiltrati.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>👤</div>
                    <div className={styles.emptyTitle}>
                        {pazienti.length === 0
                            ? 'Nessun paziente collegato'
                            : 'Nessun paziente trovato'}
                    </div>
                    <p>
                        {pazienti.length === 0
                            ? 'I pazienti si collegheranno usando il tuo codice operatore.'
                            : 'Prova a modificare i filtri o la ricerca.'}
                    </p>
                </div>
            ) : (
                <div className={styles.patientsGrid}>
                    {pazientiFiltrati.map((paziente) => {
                        const cardStatusClass =
                            paziente.stato === 'critico' ? styles.patientCardCritico :
                                paziente.stato === 'attenzione' ? styles.patientCardAttenzione :
                                    styles.patientCardOk;

                        return (
                            <div
                                key={paziente.id}
                                className={`${styles.patientCard} ${cardStatusClass}`}
                            >
                                <div className={styles.cardTop}>
                                    <div className={styles.cardPatientInfo}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span className={`badge badge-${paziente.stato}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                                                {paziente.stato}
                                            </span>
                                            <span className={styles.cardLastActive}>
                                                {formatUltimoAccesso(paziente.ultimo_accesso)}
                                            </span>
                                        </div>
                                        <div className={styles.cardPatientName}>
                                            {paziente.nome_completo} {getStatusEmoji(paziente.stato)}
                                        </div>
                                        <div className={styles.cardPatientAge}>
                                            {paziente.eta ? `${paziente.eta} anni` : 'Età non specificata'}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.cardMetrics}>
                                    <div className={styles.cardMetricRow}>
                                        <span className={styles.cardMetricLabel}>Aderenza Farmaci</span>
                                        <span className={`${styles.cardMetricValue} ${getMetricClass(paziente.aderenza_farmaci)}`}>
                                            {paziente.aderenza_farmaci}%
                                        </span>
                                    </div>
                                    <div className={styles.cardMetricRow}>
                                        <span className={styles.cardMetricLabel}>Punteggio Cognitivo</span>
                                        <span className={`${styles.cardMetricValue} ${getMetricClass(paziente.punteggio_cognitivo)}`}>
                                            {paziente.punteggio_cognitivo}/100
                                        </span>
                                    </div>
                                    <div className={styles.cardMetricRow}>
                                        <span className={styles.cardMetricLabel}>Compliance Esercizi</span>
                                        <span className={`${styles.cardMetricValue} ${getMetricClass(paziente.compliance_esercizi)}`}>
                                            {paziente.compliance_esercizi}%
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.cardActions}>
                                    <Link
                                        href={`/operatore/dashboard/pazienti/${paziente.id}`}
                                        className={`${styles.cardActionBtn} ${styles.cardBtnDettagli}`}
                                    >
                                        📊 Dettagli
                                    </Link>
                                    <Link
                                        href={`/operatore/dashboard/pazienti/${paziente.id}?tab=gestisci`}
                                        className={`${styles.cardActionBtn} ${styles.cardBtnGestisci}`}
                                    >
                                        ⚙️ Gestisci
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
