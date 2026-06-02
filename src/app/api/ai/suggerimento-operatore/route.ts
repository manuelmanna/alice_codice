import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SuggerimentoRequest {
  eta: number | null;
  stato: string;
  aderenzaFarmaci: number;
  complianceEsercizi: number;
  ultimoUmore: string | null;
  farmaciAttivi: number;
  eserciziAttivi: number;
}

export async function POST(request: NextRequest) {
  // Creo il client Supabase lato server.
  // Qui siamo in una API route, quindi non sto usando il client del browser.
  const supabase = await createClient();

  // Prima controllo chi sta facendo la richiesta.
  // Questa funzione legge la sessione dai cookie di Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se non c'e' un utente loggato, blocco subito la richiesta.
  if (!user) {
    return NextResponse.json({ error: 'Accesso richiesto.' }, { status: 401 });
  }

  // Leggo il profilo per capire se l'utente e' davvero un operatore.
  // Non mi fido solo della pagina frontend, perche' le API vanno protette lato server.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Solo gli operatori possono generare suggerimenti sui pazienti.
  if (profile?.role !== 'operatore') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  // La chiave Groq sta nell'env e NON deve mai stare nel client.
  // Cosi' il browser non vede la API key.
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

  // Prendo i dati che arrivano dal componente React.
  // Sono solo dati sintetici, non mando email, telefono o indirizzo.
  const body = (await request.json()) as SuggerimentoRequest;

  // Prompt di sistema: qui spiego al modello come deve rispondere.
  // Lo tengo molto esplicito perche' il modello usato e' piccolo.
  const systemPrompt = [
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

  // Qui chiamo Groq.
  // Non uso streaming: aspetto tutta la risposta e poi la mando al frontend.
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          // Questo e' il messaggio con i dati reali del paziente.
          // Lo mando in JSON per renderlo facile da leggere anche al modello.
          content: JSON.stringify({
            eta: body.eta,
            stato: body.stato,
            aderenza_farmaci_percento: body.aderenzaFarmaci,
            compliance_esercizi_percento: body.complianceEsercizi,
            ultimo_umore: body.ultimoUmore,
            farmaci_attivi: body.farmaciAttivi,
            esercizi_attivi: body.eserciziAttivi,
          }),
        },
      ],
      temperature: 0.3,
      max_tokens: 180,
    }),
  });

  // Se Groq risponde con errore, lo passo al frontend.
  // Esempio: API key sbagliata, modello non disponibile, ecc.
  if (!res.ok) {
    const upstreamError = await res.text();

    return NextResponse.json(
      {
        error: `Groq ha risposto con errore ${res.status}. ${upstreamError}`,
      },
      { status: res.status }
    );
  }

  // Con streaming disattivato Groq ritorna un normale JSON.
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  // Il testo generato sta in choices[0].message.content, come nelle API stile OpenAI.
  const text = data.choices?.[0]?.message?.content?.trim();

  // Se per qualche motivo il modello non produce testo, ritorno un errore semplice.
  if (!text) {
    return NextResponse.json(
      { error: 'Il modello non ha restituito testo.' },
      { status: 500 }
    );
  }

  // Risposta finale al componente React.
  return NextResponse.json({ text });
}
