'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Umore = 'triste' | 'normale' | 'felice';

const moodOptions: { value: Umore; emoji: string; label: string }[] = [
    { value: 'triste', emoji: '😢', label: 'Triste' },
    { value: 'normale', emoji: '😐', label: 'Normale' },
    { value: 'felice', emoji: '😊', label: 'Felice' },
];

export default function UmorePage() {
    const [selected, setSelected] = useState<Umore | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [existingMood, setExistingMood] = useState<Umore | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchMood() {
            const supabase = createClient();
            const oggi = new Date().toISOString().split('T')[0];

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: paziente } = await supabase
                .from('pazienti')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (!paziente) { setLoading(false); return; }

            const { data: log } = await supabase
                .from('umore_log')
                .select('*')
                .eq('paziente_id', paziente.id)
                .eq('data', oggi)
                .single();

            if (log) {
                setExistingMood(log.valore as Umore);
                setSelected(log.valore as Umore);
            }
            setLoading(false);
        }
        fetchMood();
    }, []);

    async function handleSubmit() {
        if (!selected) return;
        setSaving(true);

        const supabase = createClient();
        const oggi = new Date().toISOString().split('T')[0];

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: paziente } = await supabase
            .from('pazienti')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (!paziente) return;

        if (existingMood) {
            // Aggiorna umore esistente
            await supabase
                .from('umore_log')
                .update({ valore: selected })
                .eq('paziente_id', paziente.id)
                .eq('data', oggi);
        } else {
            // Inserisci nuovo umore
            await supabase
                .from('umore_log')
                .insert({
                    paziente_id: paziente.id,
                    data: oggi,
                    valore: selected,
                });
        }

        setSaving(false);
        setSubmitted(true);
    }

    if (loading) {
        return (
            <div className="paziente-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" /> Caricamento...
            </div>
        );
    }

    // Schermata di conferma
    if (submitted) {
        return (
            <div className="success-screen" style={{ background: 'var(--paziente-green-light)' }}>
                <div className="success-card">
                    <div className="success-icon">✓</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Grazie!</h2>
                    <p style={{ color: '#64748B', marginBottom: '24px' }}>
                        Il tuo umore è stato registrato.
                    </p>
                    <Link
                        href="/paziente/home"
                        className="btn btn-paziente btn-lg"
                        style={{ width: '100%' }}
                    >
                        ← Torna alla Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="paziente-page" style={{ background: '#FFF7ED' }}>
            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                <Link href="/paziente/home" className="auth-back" style={{ marginBottom: '16px', display: 'inline-block' }}>
                    ← Torna alla Home
                </Link>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
                        Come ti senti oggi?
                    </h1>
                    <p style={{ color: '#64748B' }}>
                        {existingMood ? 'Puoi cambiare il tuo umore se vuoi.' : 'Seleziona il tuo umore'}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
                    {moodOptions.map((mood) => (
                        <button
                            key={mood.value}
                            className={`mood-card ${selected === mood.value ? 'selected' : ''}`}
                            onClick={() => setSelected(mood.value)}
                        >
                            <div className="mood-emoji">{mood.emoji}</div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{mood.label}</div>
                        </button>
                    ))}
                </div>

                <button
                    className="btn btn-paziente btn-lg"
                    style={{ width: '100%' }}
                    disabled={!selected || saving}
                    onClick={handleSubmit}
                >
                    {saving ? (
                        <>
                            <span className="spinner spinner-white" /> Salvataggio...
                        </>
                    ) : (
                        'Conferma ✓'
                    )}
                </button>
            </div>
        </div>
    );
}
