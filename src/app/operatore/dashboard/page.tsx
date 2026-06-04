import DashboardContent from '@/components/DashboardContent';
import { dataOggiIso } from '@/lib/date';
import { calcolaPercentuale } from '@/lib/metriche';
import { createClient } from '@/lib/supabase/server';

export interface PazienteConMetriche {
  id: string;
  nome_completo: string;
  eta: number | null;
  stato: string;
  aderenza_farmaci: number;
  punteggio_cognitivo: number;
  compliance_esercizi: number;
  ultimo_accesso: string | null;
}

const PUNTEGGIO_UMORE: Record<string, number> = {
  felice: 90,
  normale: 65,
  triste: 30,
};

function calcolaPunteggioCognitivo(
  ultimoUmore: { valore: string }[] | null
) {
  if (!ultimoUmore || ultimoUmore.length === 0) return 0;

  return PUNTEGGIO_UMORE[ultimoUmore[0].valore] || 50;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: operatore } = await supabase
    .from('operatori')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!operatore) return null;

  const { data: pazienti } = await supabase
    .from('pazienti')
    .select('*')
    .eq('operatore_id', operatore.id)
    .order('nome_completo');

  const oggi = dataOggiIso();

  const pazientiConMetriche: PazienteConMetriche[] = await Promise.all(
    (pazienti || []).map(async (paziente) => {
      // Queste query sono indipendenti, quindi le faccio partire insieme.
      const [
        { data: farmaciAttivi },
        { data: farmaciPresi },
        { data: eserciziAttivi },
        { data: eserciziCompletati },
        { data: ultimoUmore },
      ] = await Promise.all([
        supabase
          .from('farmaci')
          .select('id')
          .eq('paziente_id', paziente.id)
          .eq('attivo', true),
        supabase
          .from('farmaci_log')
          .select('id')
          .eq('paziente_id', paziente.id)
          .eq('data', oggi)
          .eq('preso', true),
        supabase
          .from('esercizi')
          .select('id')
          .eq('paziente_id', paziente.id)
          .eq('attivo', true),
        supabase
          .from('esercizi_log')
          .select('id')
          .eq('paziente_id', paziente.id)
          .eq('data', oggi)
          .eq('completato', true),
        supabase
          .from('umore_log')
          .select('valore')
          .eq('paziente_id', paziente.id)
          .order('data', { ascending: false })
          .limit(1),
      ]);

      return {
        id: paziente.id,
        nome_completo: paziente.nome_completo,
        eta: paziente.eta,
        stato: paziente.stato,
        aderenza_farmaci: calcolaPercentuale(
          farmaciPresi?.length || 0,
          farmaciAttivi?.length || 0
        ),
        punteggio_cognitivo: calcolaPunteggioCognitivo(ultimoUmore),
        compliance_esercizi: calcolaPercentuale(
          eserciziCompletati?.length || 0,
          eserciziAttivi?.length || 0
        ),
        ultimo_accesso: paziente.updated_at,
      };
    })
  );

  return <DashboardContent pazienti={pazientiConMetriche} />;
}
