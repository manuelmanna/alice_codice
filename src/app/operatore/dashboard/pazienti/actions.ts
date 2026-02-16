'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================
// AGGIORNA DATI PAZIENTE
// ============================================================

export async function aggiornaPaziente(pazienteId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('pazienti')
    .update({
      nome_completo: formData.get('nome_completo') as string,
      eta: parseInt(formData.get('eta') as string) || null,
      email: formData.get('email') as string || null,
      telefono: formData.get('telefono') as string || null,
      indirizzo: formData.get('indirizzo') as string || null,
      contatto_emergenza: formData.get('contatto_emergenza') as string || null,
    })
    .eq('id', pazienteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/operatore/dashboard/pazienti/${pazienteId}`);
  return { success: true };
}

// ============================================================
// FARMACI
// ============================================================

export async function aggiungiFarmaco(pazienteId: string, formData: FormData) {
  const supabase = await createClient();

  const nome = formData.get('nome') as string;
  const dosaggio = formData.get('dosaggio') as string;
  const orario = formData.get('orario') as string;

  if (!nome || !dosaggio || !orario) {
    return { error: 'Tutti i campi sono obbligatori.' };
  }

  // Auto-compute fascia from orario
  const ora = parseInt(orario.split(':')[0], 10);
  let fascia = 'sera';
  if (ora >= 6 && ora < 12) fascia = 'mattina';
  else if (ora >= 12 && ora < 18) fascia = 'pranzo';

  const { error } = await supabase
    .from('farmaci')
    .insert({
      paziente_id: pazienteId,
      nome,
      dosaggio,
      fascia,
      orario,
    });

  if (error) {
    return { error: error.message };
  }

  // Svuota la cache e aggiorna i dati della pagina del paziente per mostrare le modifiche
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

// ============================================================
// ESERCIZI
// ============================================================

export async function creaEsercizio(
  pazienteId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const nome = formData.get('nome_esercizio') as string;
  const durataMinuti = parseInt(formData.get('durata_minuti') as string);
  const frequenza = formData.get('frequenza') as string;

  if (!nome || !durataMinuti) {
    return { error: 'Nome e durata sono obbligatori.' };
  }

  // 1. Crea l'esercizio
  const { data: esercizio, error: esError } = await supabase
    .from('esercizi')
    .insert({
      paziente_id: pazienteId,
      nome,
      durata_minuti: durataMinuti,
      frequenza: frequenza || null,
    })
    .select()
    .single();

  if (esError || !esercizio) {
    return { error: esError?.message || 'Errore nella creazione.' };
  }

  // 2. Crea gli step (li recupera dal formData con chiavi step_1, step_2, ecc.)
  const steps: { esercizio_id: string; numero_step: number; istruzione: string }[] = [];
  let i = 1;
  while (formData.get(`step_${i}`)) {
    const istruzione = formData.get(`step_${i}`) as string;
    if (istruzione.trim()) {
      steps.push({
        esercizio_id: esercizio.id,
        numero_step: i,
        istruzione: istruzione.trim(),
      });
    }
    i++;
  }

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
