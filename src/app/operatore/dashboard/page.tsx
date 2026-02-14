import { createClient } from '@/lib/supabase/server';
import DashboardContent from './DashboardContent';

// Tipo per i dati paziente con metriche calcolate
export interface PazienteConMetriche {
    id: string;
    nome_completo: string;
    eta: number | null;
    stato: string;
    // Metriche calcolate
    aderenza_farmaci: number;
    punteggio_cognitivo: number;
    compliance_esercizi: number;
    ultimo_accesso: string | null;
}

export default async function DashboardPage() {
    const supabase = await createClient();

    // Recupera l'operatore corrente
    const { data: { user } } = await supabase.auth.getUser();
    const { data: operatore } = await supabase
        .from('operatori')
        .select('id')
        .eq('profile_id', user!.id)
        .single();

    if (!operatore) return null;

    // Recupera tutti i pazienti dell'operatore
    const { data: pazienti } = await supabase
        .from('pazienti')
        .select('*')
        .eq('operatore_id', operatore.id)
        .order('nome_completo');

    const oggi = new Date().toISOString().split('T')[0];

    // Calcola metriche per ogni paziente
    const pazientiConMetriche: PazienteConMetriche[] = await Promise.all(
        (pazienti || []).map(async (paziente) => {
            // Aderenza farmaci: farmaci presi oggi / farmaci totali attivi × 100
            const { data: farmaciAttivi } = await supabase
                .from('farmaci')
                .select('id')
                .eq('paziente_id', paziente.id)
                .eq('attivo', true);

            const { data: farmaciPresi } = await supabase
                .from('farmaci_log')
                .select('id')
                .eq('paziente_id', paziente.id)
                .eq('data', oggi)
                .eq('preso', true);

            const totFarmaci = farmaciAttivi?.length || 0;
            const aderenzaFarmaci = totFarmaci > 0
                ? Math.round(((farmaciPresi?.length || 0) / totFarmaci) * 100)
                : 100;

            // Compliance esercizi: esercizi completati oggi / esercizi attivi × 100
            const { data: eserciziAttivi } = await supabase
                .from('esercizi')
                .select('id')
                .eq('paziente_id', paziente.id)
                .eq('attivo', true);

            const { data: eserciziCompletati } = await supabase
                .from('esercizi_log')
                .select('id')
                .eq('paziente_id', paziente.id)
                .eq('data', oggi)
                .eq('completato', true);

            const totEsercizi = eserciziAttivi?.length || 0;
            const complianceEsercizi = totEsercizi > 0
                ? Math.round(((eserciziCompletati?.length || 0) / totEsercizi) * 100)
                : 100;

            // Punteggio cognitivo: ultimo umore convertito
            const { data: ultimoUmore } = await supabase
                .from('umore_log')
                .select('valore')
                .eq('paziente_id', paziente.id)
                .order('data', { ascending: false })
                .limit(1);

            let punteggioCognitivo = 0;
            if (ultimoUmore && ultimoUmore.length > 0) {
                const map: Record<string, number> = { felice: 90, normale: 65, triste: 30 };
                punteggioCognitivo = map[ultimoUmore[0].valore] || 50;
            }

            return {
                id: paziente.id,
                nome_completo: paziente.nome_completo,
                eta: paziente.eta,
                stato: paziente.stato,
                aderenza_farmaci: aderenzaFarmaci,
                punteggio_cognitivo: punteggioCognitivo,
                compliance_esercizi: complianceEsercizi,
                ultimo_accesso: paziente.updated_at,
            };
        })
    );

    return <DashboardContent pazienti={pazientiConMetriche} />;
}
