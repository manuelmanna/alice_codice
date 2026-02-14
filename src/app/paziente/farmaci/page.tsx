'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Farmaco {
    id: string;
    nome: string;
    dosaggio: string;
    fascia: 'mattina' | 'pranzo' | 'sera';
    orario: string;
}

interface FarmacoConStato extends Farmaco {
    preso: boolean;
    logId: string | null;
}

const fasciaLabels: Record<string, string> = {
    mattina: '🌅 Mattina',
    pranzo: '☀️ Pranzo',
    sera: '🌙 Sera',
};

export default function FarmaciPage() {
    const [farmaci, setFarmaci] = useState<FarmacoConStato[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const supabase = createClient();
        const oggi = new Date().toISOString().split('T')[0];

        const { data: meds } = await supabase
            .from('farmaci')
            .select('*')
            .eq('attivo', true)
            .order('orario');

        const { data: logs } = await supabase
            .from('farmaci_log')
            .select('*')
            .eq('data', oggi);

        if (meds) {
            const withStato: FarmacoConStato[] = meds.map((f) => {
                const log = logs?.find((l) => l.farmaco_id === f.id);
                return {
                    ...f,
                    preso: log?.preso || false,
                    logId: log?.id || null,
                };
            });
            setFarmaci(withStato);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function togglePreso(farmaco: FarmacoConStato) {
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

        if (farmaco.logId) {
            await supabase
                .from('farmaci_log')
                .update({
                    preso: !farmaco.preso,
                    preso_at: !farmaco.preso ? new Date().toISOString() : null,
                })
                .eq('id', farmaco.logId);
        } else {
            await supabase
                .from('farmaci_log')
                .insert({
                    farmaco_id: farmaco.id,
                    paziente_id: paziente.id,
                    data: oggi,
                    preso: true,
                    preso_at: new Date().toISOString(),
                });
        }

        fetchData();
    }

    // Raggruppa farmaci per fascia oraria
    const perFascia = farmaci.reduce<Record<string, FarmacoConStato[]>>((acc, f) => {
        if (!acc[f.fascia]) acc[f.fascia] = [];
        acc[f.fascia].push(f);
        return acc;
    }, {});

    const presi = farmaci.filter((f) => f.preso).length;

    if (loading) {
        return (
            <div className="paziente-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" /> Caricamento...
            </div>
        );
    }

    return (
        <div className="paziente-page" style={{ background: '#FFF0F6' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto' }}>
                <Link href="/paziente/home" className="auth-back" style={{ marginBottom: '16px', display: 'inline-block' }}>
                    ← Torna alla Home
                </Link>

                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
                    💊 I Miei Farmaci
                </h1>
                <p style={{ color: '#64748B', marginBottom: '24px' }}>
                    Presi oggi: <strong>{presi} / {farmaci.length}</strong>
                </p>

                {farmaci.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>💊</div>
                        <p>Nessun farmaco assegnato.</p>
                        <p style={{ fontSize: '14px' }}>Il tuo operatore non ha ancora inserito farmaci.</p>
                    </div>
                ) : (
                    Object.entries(perFascia).map(([fascia, meds]) => (
                        <div key={fascia} style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#64748B', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {fasciaLabels[fascia] || fascia}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {meds.map((farmaco) => (
                                    <div key={farmaco.id} className="paziente-list-card" style={{ opacity: farmaco.preso ? 0.7 : 1 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B', textDecoration: farmaco.preso ? 'line-through' : 'none' }}>
                                                {farmaco.nome}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                                                {farmaco.dosaggio} · 🕐 {farmaco.orario?.slice(0, 5)}
                                            </div>
                                        </div>
                                        <button
                                            className={`btn ${farmaco.preso ? '' : 'btn-paziente'}`}
                                            style={{
                                                fontSize: '14px',
                                                padding: '8px 16px',
                                                background: farmaco.preso ? 'var(--paziente-green-light)' : undefined,
                                                color: farmaco.preso ? 'var(--paziente-green)' : undefined,
                                                fontWeight: 700,
                                            }}
                                            onClick={() => togglePreso(farmaco)}
                                        >
                                            {farmaco.preso ? '✓ Preso!' : 'Preso'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
