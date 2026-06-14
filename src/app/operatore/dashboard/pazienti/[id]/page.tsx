import PazienteDettaglio from '@/components/PazienteDettaglio';
import { dataIsoGiorniFa, dataOggiIso } from '@/lib/date';
import { calcolaPercentuale } from '@/lib/metriche';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>; //parametri dopo il punto interrogativo nell’URL /operatore/dashboard/pazienti/123?tab=gestisci
} //Sono tipizzati come Promise perché nelle versioni recenti di Next.js questi valori possono essere asincroni e vanno letti con await.

function contaValoriVeri( //conta quante righe hanno un determinato campo “vero”.
  rows: Record<string, unknown>[] | null, //array di oggetti generici
  campo: string //nome della proprietà da controllare, ad esempio "preso" oppure "completato".
) {
  return rows?.filter((row) => row[campo]).length || 0; //Se rows è null, non va in errore e restituisce 0
}

function creaStoricoSettimana(
  rows: Record<string, unknown>[] | null,
  campoCompletato: string
) {
  const perData = new Map<string, { completati: number; totale: number }>();

  for (const row of rows || []) {
    const data = row.data as string;
    const valori = perData.get(data) || { completati: 0, totale: 0 };

    valori.totale++;
    if (row[campoCompletato]) valori.completati++;

    perData.set(data, valori);
  }

  return Array.from(perData.entries()).map(([data, valori]) => ({
    data,
    completatiCount: valori.completati,
    totaleCount: valori.totale,
  }));
}

export default async function PazienteDettaglioPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  const { data: operatore } = await supabase
    .from('operatori')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!operatore) return notFound();

  const { data: paziente } = await supabase
    .from('pazienti')
    .select('*')
    .eq('id', id)
    .eq('operatore_id', operatore.id)
    .single();

  if (!paziente) return notFound();

  const oggi = dataOggiIso();
  const setteGiorniFa = dataIsoGiorniFa(7);

  // Tutte queste query leggono dati indipendenti dello stesso paziente.
  const [
    { data: farmaci },
    { data: esercizi },
    { data: farmaciLog },
    { data: eserciziLog },
    { data: umoreLog },
    { data: farmaciLogSettimanaRaw },
    { data: eserciziLogSettimanaRaw },
  ] = await Promise.all([
    supabase
      .from('farmaci')
      .select('*')
      .eq('paziente_id', id)
      .eq('attivo', true)
      .order('orario'),
    supabase
      .from('esercizi')
      .select('*, esercizi_step (id, numero_step, istruzione)')
      .eq('paziente_id', id)
      .eq('attivo', true)
      .order('created_at'),
    supabase
      .from('farmaci_log')
      .select('*')
      .eq('paziente_id', id)
      .eq('data', oggi),
    supabase
      .from('esercizi_log')
      .select('*')
      .eq('paziente_id', id)
      .eq('data', oggi),
    supabase
      .from('umore_log')
      .select('*')
      .eq('paziente_id', id)
      .gte('data', setteGiorniFa)
      .order('data'),
    supabase
      .from('farmaci_log')
      .select('data, preso')
      .eq('paziente_id', id)
      .gte('data', setteGiorniFa)
      .order('data'),
    supabase
      .from('esercizi_log')
      .select('data, completato')
      .eq('paziente_id', id)
      .gte('data', setteGiorniFa)
      .order('data'),
  ]);

  const aderenzaFarmaci = calcolaPercentuale(
    contaValoriVeri(farmaciLog, 'preso'),
    farmaci?.length || 0
  );
  const complianceEsercizi = calcolaPercentuale(
    contaValoriVeri(eserciziLog, 'completato'),
    esercizi?.length || 0
  );

  const farmaciLogSettimana = creaStoricoSettimana(
    farmaciLogSettimanaRaw,
    'preso'
  ).map((giorno) => ({
    data: giorno.data,
    presiCount: giorno.completatiCount,
    totaleCount: giorno.totaleCount,
  }));

  const eserciziLogSettimana = creaStoricoSettimana(
    eserciziLogSettimanaRaw,
    'completato'
  );

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
