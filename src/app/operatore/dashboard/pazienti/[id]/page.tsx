import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PazienteDettaglio from './PazienteDettaglio';

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

    // Recupera farmaci del paziente
    const { data: farmaci } = await supabase
        .from('farmaci')
        .select('*')
        .eq('paziente_id', id)
        .eq('attivo', true)
        .order('orario');

    // Recupera esercizi con step
    const { data: esercizi } = await supabase
        .from('esercizi')
        .select(`
      *,
      esercizi_step (
        id,
        numero_step,
        istruzione
      )
    `)
        .eq('paziente_id', id)
        .eq('attivo', true)
        .order('created_at');

    // Recupera metriche
    const oggi = new Date().toISOString().split('T')[0];

    const { data: farmaciLog } = await supabase
        .from('farmaci_log')
        .select('*')
        .eq('paziente_id', id)
        .eq('data', oggi);

    const { data: eserciziLog } = await supabase
        .from('esercizi_log')
        .select('*')
        .eq('paziente_id', id)
        .eq('data', oggi);

    // Umore ultimi 7 giorni
    const setteGiorniFa = new Date();
    setteGiorniFa.setDate(setteGiorniFa.getDate() - 7);
    const { data: umoreLog } = await supabase
        .from('umore_log')
        .select('*')
        .eq('paziente_id', id)
        .gte('data', setteGiorniFa.toISOString().split('T')[0])
        .order('data');

    // Attività recenti (ultimi log)
    const { data: attivitaRecenti } = await supabase
        .from('farmaci_log')
        .select('*, farmaci(nome)')
        .eq('paziente_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

    // Calcoli metriche
    const totFarmaci = farmaci?.length || 0;
    const farmaciPresiOggi = farmaciLog?.filter(f => f.preso).length || 0;
    const aderenzaFarmaci = totFarmaci > 0 ? Math.round((farmaciPresiOggi / totFarmaci) * 100) : 100;

    const totEsercizi = esercizi?.length || 0;
    const eserciziCompletatiOggi = eserciziLog?.filter(e => e.completato).length || 0;
    const complianceEsercizi = totEsercizi > 0 ? Math.round((eserciziCompletatiOggi / totEsercizi) * 100) : 100;

    return (
        <PazienteDettaglio
            paziente={paziente}
            farmaci={farmaci || []}
            esercizi={esercizi || []}
            metriche={{
                aderenzaFarmaci,
                complianceEsercizi,
                umoreLog: umoreLog || [],
                attivitaRecenti: attivitaRecenti || [],
            }}
            tab={tab === 'gestisci' ? 'gestisci' : 'dettagli'}
        />
    );
}
