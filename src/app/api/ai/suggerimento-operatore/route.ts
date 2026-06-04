import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SuggerimentoRequest {
  eta: number | null;
  stato: string;
  aderenzaFarmaci: number;
  complianceEsercizi: number;
  ultimoUmore: string | null;
  farmaciAttivi: number;
  eserciziAttivi: number;
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
}

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = [
  'Sei un assistente per una dashboard di monitoraggio pazienti.',
  'Scrivi SOLO per l\'operatore sanitario, non parlare mai al paziente.',
  'Il lettore e\' sempre un operatore: usa "verifica", "monitora", "valuta", "contatta", non usare "mantieni", "prosegui", "consulta" o imperativi rivolti al paziente.',
  'Non scrivere prefissi come "Per l\'operatore:" o "Suggerimento:".',
  'Parla del paziente in terza persona, oppure parla dell\'azione dell\'operatore.',
  'Obiettivo: aiutare l\'operatore a decidere la prossima micro-azione pratica.',
  'Usa italiano naturale, semplice e asciutto.',
  'Non fare diagnosi. Non prescrivere farmaci o terapie. Non dire "consulta il medico".',
  'Non lodare genericamente la routine. Non ripetere tutti i numeri ricevuti.',
  'Evita espressioni tecniche come "prossimo accesso"; usa "prossimo controllo" o "nei prossimi giorni".',
  'Non inventare dati, cause, sintomi o rischi non presenti.',
  'Se i valori sono buoni, suggerisci solo monitoraggio leggero e conferma della continuita\'.',
  'Se aderenza farmaci o esercizi e\' sotto 75, verifica quali ostacoli pratici potrebbero spiegare la bassa aderenza.',
  'Non scrivere mai che la bassa aderenza crea ostacoli: sono gli ostacoli che possono causare bassa aderenza.',
  'Se umore e\' triste o stato e\' attenzione/critico, suggerisci contatto breve o controllo prioritario.',
  'Output obbligatorio: una sola frase, massimo 28 parole, concreta, senza elenco.',
  'Esempio buono: "Quadro stabile: controlla nei prossimi giorni se umore e routine restano regolari."',
  'Esempio buono: "Verifica se durata, istruzioni poco chiare o orario scomodo spiegano la bassa aderenza agli esercizi."',
  'Esempio cattivo: "Mantieni il piano attuale."',
  'Esempio cattivo: "Per l\'operatore: monitora al prossimo accesso."',
  'Esempio cattivo: "Verifica se la bassa aderenza crea ostacoli o difficolta\'."',
].join(' ');

function creaMessaggioPaziente(body: SuggerimentoRequest) {
  // Invio solo dati sintetici: niente email, telefono o indirizzo.
  return JSON.stringify({
    eta: body.eta,
    stato: body.stato,
    aderenza_farmaci_percento: body.aderenzaFarmaci,
    compliance_esercizi_percento: body.complianceEsercizi,
    ultimo_umore: body.ultimoUmore,
    farmaci_attivi: body.farmaciAttivi,
    esercizi_attivi: body.eserciziAttivi,
  });
}

function leggiTestoGroq(data: GroqResponse) {
  return data.choices?.[0]?.message?.content?.trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Accesso richiesto.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'operatore') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY non configurata.' },
      { status: 500 }
    );
  }

  if (!model) {
    return NextResponse.json(
      { error: 'GROQ_MODEL non configurato.' },
      { status: 500 }
    );
  }

  const body = (await request.json()) as SuggerimentoRequest;

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: creaMessaggioPaziente(body) },
      ],
      temperature: 0.3,
      max_tokens: 180,
    }),
  });

  if (!res.ok) {
    const upstreamError = await res.text();

    return NextResponse.json(
      {
        error: `Groq ha risposto con errore ${res.status}. ${upstreamError}`,
      },
      { status: res.status }
    );
  }

  const data = (await res.json()) as GroqResponse;
  const text = leggiTestoGroq(data);

  if (!text) {
    return NextResponse.json(
      { error: 'Il modello non ha restituito testo.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ text });
}
