import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayoutClient from './DashboardLayoutClient';

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
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)',
                padding: '20px',
            }}>
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: '18px',
                    padding: '40px',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ marginBottom: '8px' }}>Profilo operatore non trovato</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
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
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
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
