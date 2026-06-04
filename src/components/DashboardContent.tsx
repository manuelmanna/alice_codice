'use client';

import { useMemo, useState } from 'react';
import styles from '../app/operatore/dashboard/dashboard.module.css';
import type { PazienteConMetriche } from '../app/operatore/dashboard/page';
import PatientCard from './PatientCard';

type Filtro = 'tutti' | 'critico' | 'attenzione' | 'ok';

const FILTRI: Filtro[] = ['tutti', 'critico', 'attenzione', 'ok'];

function getFiltroLabel(filtro: Filtro) {
  if (filtro === 'tutti') return 'Tutti';

  return filtro.charAt(0).toUpperCase() + filtro.slice(1);
}

export default function DashboardContent({
  pazienti,
}: {
  pazienti: PazienteConMetriche[];
}) {
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [ricerca, setRicerca] = useState('');

  const contatori = useMemo(() => ({
    critico: pazienti.filter((paziente) => paziente.stato === 'critico').length,
    attenzione: pazienti.filter((paziente) => paziente.stato === 'attenzione').length,
    ok: pazienti.filter((paziente) => paziente.stato === 'ok').length,
  }), [pazienti]);

  const pazientiFiltrati = useMemo(() => {
    const ricercaNormalizzata = ricerca.toLowerCase();

    return pazienti.filter((paziente) => {
      const matchFiltro = filtro === 'tutti' || paziente.stato === filtro;
      const matchRicerca = paziente.nome_completo
        .toLowerCase()
        .includes(ricercaNormalizzata);

      return matchFiltro && matchRicerca;
    });
  }, [pazienti, filtro, ricerca]);

  return (
    <>
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
          {FILTRI.map((filtroCorrente) => (
            <button
              key={filtroCorrente}
              className={`filter-btn ${filtro === filtroCorrente ? 'active' : ''}`}
              onClick={() => setFiltro(filtroCorrente)}
            >
              {getFiltroLabel(filtroCorrente)}
            </button>
          ))}
        </div>
      </div>

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
