'use server';

import { leggiTesto, leggiTestoOpzionale } from '@/lib/form';
import { createClient } from '@/lib/supabase/server';

export async function loginPaziente(formData: FormData) {
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

  // Controllo lato server: la UI da sola non basta per proteggere il ruolo.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'paziente') {
      await supabase.auth.signOut();
      return { error: "Questo account non e' registrato come paziente." };
    }
  }

  return { redirect: '/paziente/home' };
}

export async function registraPaziente(formData: FormData) {
  const supabase = await createClient();

  const nomeCompleto = leggiTesto(formData, 'nome_completo');
  const email = leggiTesto(formData, 'email');
  const password = leggiTesto(formData, 'password');
  const confermaPassword = leggiTesto(formData, 'conferma_password');
  const operatoreId = leggiTesto(formData, 'operatore_id');
  const eta = leggiTestoOpzionale(formData, 'eta');
  const telefono = leggiTestoOpzionale(formData, 'telefono');
  const indirizzo = leggiTestoOpzionale(formData, 'indirizzo');
  const contattoEmergenza = leggiTestoOpzionale(
    formData,
    'contatto_emergenza'
  );

  if (!nomeCompleto || !email || !password || !operatoreId) {
    return { error: 'Nome, email, password e operatore sono obbligatori.' };
  }

  if (password !== confermaPassword) {
    return { error: 'Le password non coincidono.' };
  }

  if (password.length < 6) {
    return { error: 'La password deve essere di almeno 6 caratteri.' };
  }

  // I dati extra finiscono nei metadata per il trigger di registrazione.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'paziente',
        nome_completo: nomeCompleto,
        operatore_id: operatoreId,
        eta,
        telefono,
        indirizzo,
        contatto_emergenza: contattoEmergenza,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Errore durante la registrazione.' };
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

  return { redirect: '/paziente/home' };
}

export async function logoutPaziente() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { redirect: '/paziente/login' };
}
