'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Esercizio {
    id: string;
    nome: string;
    durata_minuti: number;
    frequenza: string | null;
}

interface Step {
    id: string;
    numero_step: number;
    istruzione: string;
}

type View = 'list' | 'exercise' | 'done';

export default function EserciziPage() {
    const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<View>('list');
    const [currentExercise, setCurrentExercise] = useState<Esercizio | null>(null);
    const [steps, setSteps] = useState<Step[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        const supabase = createClient();
        const oggi = new Date().toISOString().split('T')[0];

        const { data: ex } = await supabase
            .from('esercizi')
            .select('*')
            .eq('attivo', true)
            .order('nome');

        const { data: logs } = await supabase
            .from('esercizi_log')
            .select('esercizio_id')
            .eq('data', oggi)
            .eq('completato', true);

        if (ex) setEsercizi(ex);
        if (logs) setCompletedToday(new Set(logs.map((l) => l.esercizio_id)));
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function startExercise(esercizio: Esercizio) {
        const supabase = createClient();
        const { data: stepsData } = await supabase
            .from('esercizi_step')
            .select('*')
            .eq('esercizio_id', esercizio.id)
            .order('numero_step');

        setCurrentExercise(esercizio);
        setSteps(stepsData || []);
        setCurrentStep(0);
        setView('exercise');
    }

    async function completeExercise() {
        if (!currentExercise) return;
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

        await supabase
            .from('esercizi_log')
            .insert({
                esercizio_id: currentExercise.id,
                paziente_id: paziente.id,
                data: oggi,
                completato: true,
                completato_at: new Date().toISOString(),
            });

        setView('done');
        fetchData();
    }

    if (loading) {
        return (
            <div className="paziente-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" /> Caricamento...
            </div>
        );
    }

    // Schermata completamento
    if (view === 'done') {
        return (
            <div className="success-screen" style={{ background: 'var(--paziente-green-light)' }}>
                <div className="success-card">
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Bravo!</h2>
                    <p style={{ color: '#64748B', marginBottom: '24px' }}>
                        Hai completato l&apos;esercizio!
                    </p>
                    <button
                        className="btn btn-paziente btn-lg"
                        style={{ width: '100%' }}
                        onClick={() => { setView('list'); setCurrentExercise(null); }}
                    >
                        💪 Altri Esercizi
                    </button>
                </div>
            </div>
        );
    }

    // Step-by-step view
    if (view === 'exercise' && currentExercise) {
        const step = steps[currentStep];
        const totalSteps = steps.length;

        return (
            <div className="paziente-page" style={{ background: 'var(--paziente-green-light)' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                    <button
                        className="auth-back"
                        onClick={() => { setView('list'); setCurrentExercise(null); }}
                        style={{ marginBottom: '16px', display: 'inline-block', background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', fontWeight: 600 }}
                    >
                        ← Indietro
                    </button>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
                        {currentExercise.nome}
                    </h1>
                    <p style={{ color: '#64748B', marginBottom: '24px' }}>
                        ⏱️ {currentExercise.durata_minuti} minuti
                    </p>

                    {totalSteps === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <p style={{ color: '#64748B', marginBottom: '24px' }}>Nessuno step definito per questo esercizio.</p>
                            <button
                                className="btn btn-paziente btn-lg"
                                style={{ width: '100%' }}
                                onClick={completeExercise}
                            >
                                Fatto ✓
                            </button>
                        </div>
                    ) : step ? (
                        <>
                            <div style={{ background: 'white', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
                                <div style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 600, marginBottom: '16px' }}>
                                    Step {currentStep + 1} / {totalSteps}
                                </div>

                                {/* Progress bar */}
                                <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', marginBottom: '24px' }}>
                                    <div style={{
                                        height: '100%',
                                        background: 'var(--paziente-green)',
                                        borderRadius: '2px',
                                        width: `${((currentStep + 1) / totalSteps) * 100}%`,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>

                                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#1E293B' }}>
                                    {step.istruzione}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                {currentStep > 0 && (
                                    <button
                                        className="btn btn-lg"
                                        style={{ flex: 1, background: 'white', border: '1px solid #E2E8F0' }}
                                        onClick={() => setCurrentStep(currentStep - 1)}
                                    >
                                        ← Indietro
                                    </button>
                                )}
                                {currentStep < totalSteps - 1 ? (
                                    <button
                                        className="btn btn-paziente btn-lg"
                                        style={{ flex: 1 }}
                                        onClick={() => setCurrentStep(currentStep + 1)}
                                    >
                                        Avanti →
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-paziente btn-lg"
                                        style={{ flex: 1 }}
                                        onClick={completeExercise}
                                    >
                                        Fatto ✓
                                    </button>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        );
    }

    // Lista esercizi
    return (
        <div className="paziente-page" style={{ background: 'var(--paziente-green-light)' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto' }}>
                <Link href="/paziente/home" className="auth-back" style={{ marginBottom: '16px', display: 'inline-block' }}>
                    ← Torna alla Home
                </Link>

                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
                    💪 Esercizi Fisici
                </h1>
                <p style={{ color: '#64748B', marginBottom: '24px' }}>
                    I tuoi esercizi di oggi
                </p>

                {esercizi.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏋️</div>
                        <p>Nessun esercizio assegnato.</p>
                        <p style={{ fontSize: '14px' }}>Il tuo operatore non ha ancora creato esercizi.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {esercizi.map((ex) => {
                            const isDone = completedToday.has(ex.id);
                            return (
                                <div key={ex.id} className="paziente-list-card">
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                                            {ex.nome}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                                            ⏱️ {ex.durata_minuti} min
                                            {ex.frequenza && ` · ${ex.frequenza}`}
                                        </div>
                                    </div>
                                    {isDone ? (
                                        <span style={{ color: 'var(--paziente-green)', fontWeight: 700, fontSize: '14px' }}>
                                            ✓ Fatto
                                        </span>
                                    ) : (
                                        <button
                                            className="btn btn-paziente"
                                            style={{ fontSize: '14px', padding: '8px 16px' }}
                                            onClick={() => startExercise(ex)}
                                        >
                                            ▶ Inizia
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
