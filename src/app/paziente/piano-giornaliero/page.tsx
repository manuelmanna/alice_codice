'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Attivita {
    id: string;
    ordine: number;
    titolo: string;
    descrizione: string | null;
    orario: string;
    emoji: string | null;
}

interface AttivitaConStato extends Attivita {
    completata: boolean;
    logId: string | null;
}

export default function PianoGiornalieroPage() {
    const [attivita, setAttivita] = useState<AttivitaConStato[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const supabase = createClient();
        const oggi = new Date().toISOString().split('T')[0];

        // Carica attività
        const { data: piano } = await supabase
            .from('piano_giornaliero')
            .select('*')
            .eq('attivo', true)
            .order('ordine');

        // Carica log di oggi
        const { data: logs } = await supabase
            .from('piano_giornaliero_log')
            .select('*')
            .eq('data', oggi);

        if (piano) {
            const withStato: AttivitaConStato[] = piano.map((a) => {
                const log = logs?.find((l) => l.piano_attivita_id === a.id);
                return {
                    ...a,
                    completata: log?.completata || false,
                    logId: log?.id || null,
                };
            });
            setAttivita(withStato);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function toggleCompletamento(att: AttivitaConStato) {
        const supabase = createClient();
        const oggi = new Date().toISOString().split('T')[0];

        // Recupera il paziente_id dall'utente loggato
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: paziente } = await supabase
            .from('pazienti')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (!paziente) return;

        if (att.logId) {
            // Aggiorna il log esistente
            await supabase
                .from('piano_giornaliero_log')
                .update({
                    completata: !att.completata,
                    completata_at: !att.completata ? new Date().toISOString() : null,
                })
                .eq('id', att.logId);
        } else {
            // Crea nuovo log
            await supabase
                .from('piano_giornaliero_log')
                .insert({
                    piano_attivita_id: att.id,
                    paziente_id: paziente.id,
                    data: oggi,
                    completata: true,
                    completata_at: new Date().toISOString(),
                });
        }

        fetchData();
    }

    const completate = attivita.filter((a) => a.completata).length;

    if (loading) {
        return (
            <div className="paziente-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" /> Caricamento...
            </div>
        );
    }

    return (
        <div className="paziente-page" style={{ background: 'var(--paziente-blue-bg)' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto' }}>
                <Link href="/paziente/home" className="auth-back" style={{ marginBottom: '16px', display: 'inline-block' }}>
                    ← Torna alla Home
                </Link>

                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
                    📅 Piano Giornaliero
                </h1>
                <p style={{ color: '#64748B', marginBottom: '24px' }}>
                    Completate: <strong>{completate} / {attivita.length}</strong>
                </p>

                {attivita.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                        <p>Nessuna attività nel piano giornaliero.</p>
                        <p style={{ fontSize: '14px' }}>Il tuo operatore non ha ancora creato il piano.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {attivita.map((att) => (
                            <div key={att.id} className="paziente-list-card">
                                <div className="step-badge">{att.emoji || att.ordine}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                                        {att.titolo}
                                    </div>
                                    {att.descrizione && (
                                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                                            {att.descrizione}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                                        🕐 {att.orario?.slice(0, 5)}
                                    </div>
                                </div>
                                <button
                                    className={`completion-check ${att.completata ? 'done' : ''}`}
                                    onClick={() => toggleCompletamento(att)}
                                    title={att.completata ? 'Segna come non completata' : 'Segna come completata'}
                                >
                                    {att.completata ? '✓' : ''}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
