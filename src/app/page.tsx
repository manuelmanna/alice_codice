import Link from 'next/link';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logo}>🏥</div>
        <h1 className={styles.title}>A.L.I.C.E.</h1>
        <p className={styles.subtitle}>Assistenza per la Longevità</p>
        <p className={styles.description}>
          Piattaforma di gestione e monitoraggio pazienti anziani
        </p>

        <div className={styles.buttons}>
          <Link href="/operatore/login" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            🔒 Accesso Operatore
          </Link>
          <Link href="/paziente/login" className="btn btn-success btn-lg" style={{ width: '100%' }}>
            👋 Accesso Paziente
          </Link>
        </div>

        <p className={styles.footer}>
          Sistema A.L.I.C.E. - Assistenza per la Longevità Intelligente, Connessa, Empatica
        </p>
      </div>
    </div>
  );
}
