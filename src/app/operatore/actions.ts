'use server';

import { leggiTesto, leggiTestoOpzionale } from '@/lib/form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const CODICE_OPERATORE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODICE_OPERATORE_LENGTH = 6;

export async function loginOperatore(formData: FormData) {
  const supabase = await createClient();

  const email = leggiTesto(formData, 'email');
  const password = leggiTesto(formData, 'password');

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Il ruolo vero viene letto dalla tabella profiles, non dalla pagina.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profile?.role !== 'operatore') {
      await supabase.auth.signOut();
      return { error: "Questo account non e' registrato come operatore." };
    }
  }

  // Se il trigger non ha creato il record operatore, provo a ricrearlo via RPC.
  if (authUser) {
    const { data: operatore } = await supabase
      .from('operatori')
      .select('id')
      .eq('profile_id', authUser.id)
      .single();

    if (!operatore && authUser.user_metadata?.role === 'operatore') {
      const meta = authUser.user_metadata;

      await supabase.rpc('crea_profilo_operatore', {
        p_profile_id: authUser.id,
        p_codice_operatore:
          meta.codice_operatore || generateCodiceOperatore(),
        p_nome_completo: meta.nome_completo || authUser.email,
        p_email: authUser.email,
        p_struttura_sanitaria: meta.struttura_sanitaria || null,
        p_telefono: meta.telefono || null,
      });
    }
  }

  redirect('/operatore/dashboard');
}

export async function registraOperatore(formData: FormData) {
  const supabase = await createClient();

  const nomeCompleto = leggiTesto(formData, 'nome_completo');
  const email = leggiTesto(formData, 'email');
  const strutturaSanitaria = leggiTestoOpzionale(
    formData,
    'struttura_sanitaria'
  );
  const telefono = leggiTestoOpzionale(formData, 'telefono');
  const password = leggiTesto(formData, 'password');
  const confermaPassword = leggiTesto(formData, 'conferma_password');

  if (password !== confermaPassword) {
    return { error: 'Le password non coincidono.' };
  }

  if (password.length < 6) {
    return { error: 'La password deve essere di almeno 6 caratteri.' };
  }

  const codiceOperatore = generateCodiceOperatore();

  // Auth crea l'utente; il database completa il profilo con trigger/RPC.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'operatore',
        nome_completo: nomeCompleto,
        codice_operatore: codiceOperatore,
        struttura_sanitaria: strutturaSanitaria,
        telefono,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Errore durante la registrazione.' };
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'crea_profilo_operatore',
    {
      p_profile_id: authData.user.id,
      p_codice_operatore: codiceOperatore,
      p_nome_completo: nomeCompleto,
      p_email: email,
      p_struttura_sanitaria: strutturaSanitaria,
      p_telefono: telefono,
    }
  );

  if (rpcError) {
    return { error: 'Errore creazione profilo operatore: ' + rpcError.message };
  }

  const result = rpcResult as { success: boolean; error?: string } | null;

  if (result && !result.success) {
    return { error: 'Errore: ' + result.error };
  }

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    return {
      error: 'Registrazione completata! Vai alla pagina di login per accedere.',
    };
  }

  redirect('/operatore/dashboard');
}

export async function logoutOperatore() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/operatore/login');
}

function generateCodiceOperatore(): string {
  let codice = '';

  for (let i = 0; i < CODICE_OPERATORE_LENGTH; i++) {
    const randomIndex = Math.floor(
      Math.random() * CODICE_OPERATORE_CHARS.length
    );
    codice += CODICE_OPERATORE_CHARS.charAt(randomIndex);
  }

  return codice;
}
