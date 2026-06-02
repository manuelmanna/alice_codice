import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayoutClient from '@/components/DashboardLayoutClient';
import styles from './dashboard.module.css';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/operatore/login');
    }

    // Recupera dati operatore
    const { data: operatore } = await supabase
        .from('operatori')
        .select('*')
        .eq('profile_id', user.id)
        .single();

    // Se non esiste il record operatore, mostra un messaggio
    // (non redirige al login per evitare loop)
    if (!operatore) {
        return (
            <div className={styles.missingProfilePage}>
                <div className={styles.missingProfileCard}>
                    <div className={styles.missingProfileIcon}>⚠️</div>
                    <h2 className={styles.missingProfileTitle}>Profilo operatore non trovato</h2>
                    <p className={styles.missingProfileDescription}>
                        Il tuo account è stato creato ma il profilo operatore non è stato configurato correttamente.
                        Contatta l&apos;amministratore o riprova la registrazione.
                    </p>
                    <form action={async () => {
                        'use server';
                        const { createClient } = await import('@/lib/supabase/server');
                        const supabase = await createClient();
                        await supabase.auth.signOut();
                        redirect('/operatore/registrati');
                    }}>
                        <button type="submit" className="btn btn-primary btn-lg btn-full">
                            🔄 Disconnetti e riprova
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayoutClient operatore={operatore}>
            {children}
        </DashboardLayoutClient>
    );
}
