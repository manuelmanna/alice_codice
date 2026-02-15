import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PazienteDettaglio from '@/components/PazienteDettaglio';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}

export default async function PazienteDettaglioPage({ params, searchParams }: Props) {
    const { id } = await params;
    const { tab } = await searchParams;
    const supabase = await createClient();

    // Verifica che l'operatore possa accedere a questo paziente
    const { data: { user } } = await supabase.auth.getUser();
    const { data: operatore } = await supabase
        .from('operatori')
        .select('id')
        .eq('profile_id', user!.id)
        .single();

    if (!operatore) return notFound();

    // Recupera paziente
    const { data: paziente } = await supabase
        .from('pazienti')
        .select('*')
        .eq('id', id)
        .eq('operatore_id', operatore.id)
        .single();

    if (!paziente) return notFound();

    // Date helpers
    const oggi = new Date().toISOString().split('T')[0];
    const setteGiorniFa = new Date();
    setteGiorniFa.setDate(setteGiorniFa.getDate() - 7);
    const setteGiorniFaStr = setteGiorniFa.toISOString().split('T')[0];

    // Esegui tutte le query in parallelo per massime prestazioni
    const [
        { data: farmaci },
        { data: esercizi },
        { data: farmaciLog },
        { data: eserciziLog },
        { data: umoreLog },
        { data: farmaciLogSettimanaRaw },
        { data: eserciziLogSettimanaRaw },
    ] = await Promise.all([
        // Farmaci attivi
        supabase
            .from('farmaci')
            .select('*')
            .eq('paziente_id', id)
            .eq('attivo', true)
            .order('orario'),
        // Esercizi con step
        supabase
            .from('esercizi')
            .select(`*, esercizi_step (id, numero_step, istruzione)`)
            .eq('paziente_id', id)
            .eq('attivo', true)
            .order('created_at'),
        // Farmaci log di oggi (per metriche)
        supabase
            .from('farmaci_log')
            .select('*')
            .eq('paziente_id', id)
            .eq('data', oggi),
        // Esercizi log di oggi (per metriche)
        supabase
            .from('esercizi_log')
            .select('*')
            .eq('paziente_id', id)
            .eq('data', oggi),
        // Umore ultimi 7 giorni
        supabase
            .from('umore_log')
            .select('*')
            .eq('paziente_id', id)
            .gte('data', setteGiorniFaStr)
            .order('data'),
        // Farmaci log ultimi 7 giorni (per storico)
        supabase
            .from('farmaci_log')
            .select('data, preso')
            .eq('paziente_id', id)
            .gte('data', setteGiorniFaStr)
            .order('data'),
        // Esercizi log ultimi 7 giorni (per storico)
        supabase
            .from('esercizi_log')
            .select('data, completato')
            .eq('paziente_id', id)
            .gte('data', setteGiorniFaStr)
            .order('data'),
    ]);

    // Calcoli metriche
    const totFarmaci = farmaci?.length || 0;
    const farmaciPresiOggi = farmaciLog?.filter((f: Record<string, unknown>) => f.preso).length || 0;
    const aderenzaFarmaci = totFarmaci > 0 ? Math.round((farmaciPresiOggi / totFarmaci) * 100) : 100;

    const totEsercizi = esercizi?.length || 0;
    const eserciziCompletatiOggi = eserciziLog?.filter((e: Record<string, unknown>) => e.completato).length || 0;
    const complianceEsercizi = totEsercizi > 0 ? Math.round((eserciziCompletatiOggi / totEsercizi) * 100) : 100;

    // Aggrega farmaci log per giorno
    const farmaciByDate = new Map<string, { presi: number; totale: number }>();
    (farmaciLogSettimanaRaw || []).forEach((row: Record<string, unknown>) => {
        const d = row.data as string;
        const entry = farmaciByDate.get(d) || { presi: 0, totale: 0 };
        entry.totale++;
        if (row.preso) entry.presi++;
        farmaciByDate.set(d, entry);
    });
    const farmaciLogSettimana = Array.from(farmaciByDate.entries()).map(([data, v]) => ({
        data,
        presiCount: v.presi,
        totaleCount: v.totale,
    }));

    // Aggrega esercizi log per giorno
    const eserciziByDate = new Map<string, { completati: number; totale: number }>();
    (eserciziLogSettimanaRaw || []).forEach((row: Record<string, unknown>) => {
        const d = row.data as string;
        const entry = eserciziByDate.get(d) || { completati: 0, totale: 0 };
        entry.totale++;
        if (row.completato) entry.completati++;
        eserciziByDate.set(d, entry);
    });
    const eserciziLogSettimana = Array.from(eserciziByDate.entries()).map(([data, v]) => ({
        data,
        completatiCount: v.completati,
        totaleCount: v.totale,
    }));

    return (
        <PazienteDettaglio
            paziente={paziente}
            farmaci={farmaci || []}
            esercizi={esercizi || []}
            metriche={{
                aderenzaFarmaci,
                complianceEsercizi,
                umoreLog: umoreLog || [],
                farmaciLogSettimana,
                eserciziLogSettimana,
            }}
            tab={tab === 'gestisci' ? 'gestisci' : 'dettagli'}
        />
    );
}

