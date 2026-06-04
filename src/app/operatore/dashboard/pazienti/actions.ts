'use server';

import { createClient } from '@/lib/supabase/server';
import {
  leggiNumeroOpzionale,
  leggiTesto,
  leggiTestoOpzionale,
} from '@/lib/form';
import { revalidatePath } from 'next/cache';

type FasciaFarmaco = 'mattina' | 'pranzo' | 'sera';

function calcolaFasciaDaOrario(orario: string): FasciaFarmaco {
  const ora = Number.parseInt(orario.split(':')[0], 10);

  if (ora >= 6 && ora < 12) return 'mattina';
  if (ora >= 12 && ora < 18) return 'pranzo';
  return 'sera';
}

function leggiStepEsercizio(esercizioId: string, formData: FormData) {
  const steps: {
    esercizio_id: string;
    numero_step: number;
    istruzione: string;
  }[] = [];

  let numeroStep = 1;

  while (formData.get(`step_${numeroStep}`)) {
    const istruzione = leggiTesto(formData, `step_${numeroStep}`).trim();

    if (istruzione) {
      steps.push({
        esercizio_id: esercizioId,
        numero_step: numeroStep,
        istruzione,
      });
    }

    numeroStep++;
  }

  return steps;
}

export async function aggiornaPaziente(pazienteId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('pazienti')
    .update({
      nome_completo: leggiTesto(formData, 'nome_completo'),
      eta: leggiNumeroOpzionale(formData, 'eta') || null,
      email: leggiTestoOpzionale(formData, 'email'),
      telefono: leggiTestoOpzionale(formData, 'telefono'),
      indirizzo: leggiTestoOpzionale(formData, 'indirizzo'),
      contatto_emergenza: leggiTestoOpzionale(
        formData,
        'contatto_emergenza'
      ),
    })
    .eq('id', pazienteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/operatore/dashboard/pazienti/${pazienteId}`);
  return { success: true };
}

export async function aggiungiFarmaco(pazienteId: string, formData: FormData) {
  const supabase = await createClient();

  const nome = leggiTesto(formData, 'nome');
  const dosaggio = leggiTesto(formData, 'dosaggio');
  const orario = leggiTesto(formData, 'orario');

  if (!nome || !dosaggio || !orario) {
    return { error: 'Tutti i campi sono obbligatori.' };
  }

  const { error } = await supabase
    .from('farmaci')
    .insert({
      paziente_id: pazienteId,
      nome,
      dosaggio,
      fascia: calcolaFasciaDaOrario(orario),
      orario,
    });

  if (error) {
    return { error: error.message };
  }

  // Aggiorna i dati mostrati nella pagina dopo la modifica.
  revalidatePath(`/operatore/dashboard/pazienti/${pazienteId}`);
  return { success: true };
}

export async function eliminaFarmaco(farmacoId: string, pazienteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('farmaci')
    .delete()
    .eq('id', farmacoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/operatore/dashboard/pazienti/${pazienteId}`);
  return { success: true };
}

export async function creaEsercizio(
  pazienteId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const nome = leggiTesto(formData, 'nome_esercizio');
  const durataMinuti = leggiNumeroOpzionale(formData, 'durata_minuti');
  const frequenza = leggiTestoOpzionale(formData, 'frequenza');

  if (!nome || !durataMinuti) {
    return { error: 'Nome e durata sono obbligatori.' };
  }

  // Prima creo l'esercizio, poi uso il suo id per salvare gli step.
  const { data: esercizio, error: esError } = await supabase
    .from('esercizi')
    .insert({
      paziente_id: pazienteId,
      nome,
      durata_minuti: durataMinuti,
      frequenza,
    })
    .select()
    .single();

  if (esError || !esercizio) {
    return { error: esError?.message || 'Errore nella creazione.' };
  }

  const steps = leggiStepEsercizio(esercizio.id, formData);

  if (steps.length > 0) {
    const { error: stepError } = await supabase
      .from('esercizi_step')
      .insert(steps);

    if (stepError) {
      return { error: 'Esercizio creato ma errore negli step: ' + stepError.message };
    }
  }

  revalidatePath(`/operatore/dashboard/pazienti/${pazienteId}`);
  return { success: true };
}

export async function eliminaEsercizio(esercizioId: string, pazienteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('esercizi')
    .delete()
    .eq('id', esercizioId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/operatore/dashboard/pazienti/${pazienteId}`);
  return { success: true };
}
