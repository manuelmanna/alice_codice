'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logoutPaziente } from '../actions';
import styles from './home.module.css';

const cards = [
    { href: '/paziente/umore', emoji: '😊', title: 'Come Mi Sento', color: 'icon-orange' },
    { href: '/paziente/esercizi', emoji: '💪', title: 'Esercizi Fisici', color: 'icon-green' },
    { href: '/paziente/farmaci', emoji: '💊', title: 'I Miei Farmaci', color: 'icon-pink' },
];

export default function HomePazientePage() {
    const router = useRouter();

    async function handleLogout() {
        const result = await logoutPaziente();
        if (result?.redirect) {
            router.push(result.redirect);
        }
    }

    return (
        <div className="paziente-page" style={{ position: 'relative' }}>
            <form onSubmit={async (e) => { e.preventDefault(); await handleLogout(); }}>
                <button type="submit" className={styles.logoutBtn}>
                    🚪 Esci
                </button>
            </form>

            <div className={styles.header}>
                <h1 className={styles.greeting}>Ciao! 👋</h1>
                <p className={styles.subtitle}>Cosa vuoi fare oggi?</p>
            </div>

            <div className="paziente-home-grid">
                {cards.map((card) => (
                    <Link key={card.href} href={card.href} className="home-card">
                        <div className={`home-card-icon ${card.color}`}>
                            {card.emoji}
                        </div>
                        <div className="home-card-title">{card.title}</div>
                    </Link>
                ))}
            </div>

            <p className="auth-system-label" style={{ textAlign: 'center', marginTop: '40px' }}>
                Sistema A.L.I.C.E. - Assistenza per la Longevità
            </p>
        </div>
    );
}
