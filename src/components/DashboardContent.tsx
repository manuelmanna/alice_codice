'use client';

import { useState, useMemo } from 'react';
import styles from '../app/operatore/dashboard/dashboard.module.css';
import type { PazienteConMetriche } from '../app/operatore/dashboard/page';

type Filtro = 'tutti' | 'critico' | 'attenzione' | 'ok';

import PatientCard from './PatientCard';

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
                    {pazientiFiltrati.map((paziente) => (
                        <PatientCard key={paziente.id} paziente={paziente} />
                    ))}
                </div>
            )}
        </>
    );
}
