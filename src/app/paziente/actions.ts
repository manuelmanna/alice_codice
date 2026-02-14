'use server';

import { createClient } from '@/lib/supabase/server';

export async function loginPaziente(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    // Verifica che l'utente abbia il ruolo paziente
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'paziente') {
            await supabase.auth.signOut();
            return { error: 'Questo account non è registrato come paziente.' };
        }
    }

    return { redirect: '/paziente/home' };
}

export async function registraPaziente(formData: FormData) {
    const supabase = await createClient();

    const nomeCompleto = formData.get('nome_completo') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confermaPassword = formData.get('conferma_password') as string;
    const operatoreId = formData.get('operatore_id') as string;
    const eta = formData.get('eta') as string;
    const telefono = formData.get('telefono') as string;
    const indirizzo = formData.get('indirizzo') as string;
    const contattoEmergenza = formData.get('contatto_emergenza') as string;

    // Validazione
    if (!nomeCompleto || !email || !password || !operatoreId) {
        return { error: 'Nome, email, password e operatore sono obbligatori.' };
    }

    if (password !== confermaPassword) {
        return { error: 'Le password non coincidono.' };
    }

    if (password.length < 6) {
        return { error: 'La password deve essere di almeno 6 caratteri.' };
    }

    // 1. Registra utente — il trigger crea profilo + record paziente
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'paziente',
                nome_completo: nomeCompleto,
                operatore_id: operatoreId,
                eta: eta || null,
                telefono: telefono || null,
                indirizzo: indirizzo || null,
                contatto_emergenza: contattoEmergenza || null,
            },
        },
    });

    if (authError) {
        return { error: authError.message };
    }

    if (!authData.user) {
        return { error: 'Errore durante la registrazione.' };
    }

    // 2. Login per stabilire la sessione
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (loginError) {
        return { error: 'Registrazione completata! Vai alla pagina di login per accedere.' };
    }

    return { redirect: '/paziente/home' };
}

export async function logoutPaziente() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { redirect: '/paziente/login' };
}
