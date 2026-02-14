import Link from 'next/link';
import styles from './dashboard.module.css';
import type { PazienteConMetriche } from './page';

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

interface PatientCardProps {
    paziente: PazienteConMetriche;
}

export default function PatientCard({ paziente }: PatientCardProps) {
    const cardStatusClass =
        paziente.stato === 'critico' ? styles.patientCardCritico :
            paziente.stato === 'attenzione' ? styles.patientCardAttenzione :
                styles.patientCardOk;

    return (
        <div className={`${styles.patientCard} ${cardStatusClass}`}>
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
}
