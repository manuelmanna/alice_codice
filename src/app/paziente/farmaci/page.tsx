'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { dataOggiIso } from '@/lib/date';
import { leggiPazienteCorrenteId } from '@/lib/paziente-client';

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

const fasciaLabels: Record<Farmaco['fascia'], string> = {
  mattina: '🌅 Mattina',
  pranzo: '☀️ Pranzo',
  sera: '🌙 Sera',
};

function raggruppaPerFascia(farmaci: FarmacoConStato[]) {
  return farmaci.reduce<Record<string, FarmacoConStato[]>>((gruppi, farmaco) => {
    if (!gruppi[farmaco.fascia]) {
      gruppi[farmaco.fascia] = [];
    }

    gruppi[farmaco.fascia].push(farmaco);
    return gruppi;
  }, {});
}

export default function FarmaciPage() {
  const [farmaci, setFarmaci] = useState<FarmacoConStato[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const oggi = dataOggiIso();

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
      const farmaciConStato: FarmacoConStato[] = meds.map((farmaco) => {
        const log = logs?.find((item) => item.farmaco_id === farmaco.id);

        return {
          ...farmaco,
          preso: log?.preso || false,
          logId: log?.id || null,
        };
      });

      setFarmaci(farmaciConStato);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function togglePreso(farmaco: FarmacoConStato) {
    const supabase = createClient();
    const oggi = dataOggiIso();
    const pazienteId = await leggiPazienteCorrenteId(supabase);

    if (!pazienteId) return;

    if (farmaco.logId) {
      await supabase
        .from('farmaci_log')
        .update({
          preso: !farmaco.preso,
          preso_at: !farmaco.preso ? new Date().toISOString() : null,
        })
        .eq('id', farmaco.logId);
    } else {
      await supabase.from('farmaci_log').insert({
        farmaco_id: farmaco.id,
        paziente_id: pazienteId,
        data: oggi,
        preso: true,
        preso_at: new Date().toISOString(),
      });
    }

    fetchData();
  }

  const farmaciPerFascia = useMemo(() => raggruppaPerFascia(farmaci), [farmaci]);
  const farmaciPresi = farmaci.filter((farmaco) => farmaco.preso).length;

  if (loading) {
    return (
      <div className="paziente-page theme-paziente" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" /> Caricamento...
      </div>
    );
  }

  return (
    <div className="paziente-page theme-paziente" style={{ background: '#FFF0F6' }}>
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>
        <Link href="/paziente/home" className="auth-back" style={{ marginBottom: '16px', display: 'inline-block' }}>
          ← Torna alla Home
        </Link>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E293B', marginBottom: '4px' }}>
          💊 I Miei Farmaci
        </h1>
        <p style={{ color: '#64748B', marginBottom: '24px' }}>
          Presi oggi: <strong>{farmaciPresi} / {farmaci.length}</strong>
        </p>

        {farmaci.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💊</div>
            <p>Nessun farmaco assegnato.</p>
            <p style={{ fontSize: '14px' }}>Il tuo operatore non ha ancora inserito farmaci.</p>
          </div>
        ) : (
          Object.entries(farmaciPerFascia).map(([fascia, meds]) => (
            <div key={fascia} style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#64748B', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {fasciaLabels[fascia as Farmaco['fascia']] || fascia}
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
