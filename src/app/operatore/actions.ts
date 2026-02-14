'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginOperatore(formData: FormData) {
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

    // Dopo il login, verifica che il record operatore esista
    // Se manca (trigger fallito), lo crea via RPC
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: operatore } = await supabase
            .from('operatori')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (!operatore && user.user_metadata?.role === 'operatore') {
            const meta = user.user_metadata;
            await supabase.rpc('crea_profilo_operatore', {
                p_profile_id: user.id,
                p_codice_operatore: meta.codice_operatore || generateCodiceOperatore(),
                p_nome_completo: meta.nome_completo || user.email,
                p_email: user.email,
                p_struttura_sanitaria: meta.struttura_sanitaria || null,
                p_telefono: meta.telefono || null,
            });
        }
    }

    redirect('/operatore/dashboard');
}

export async function registraOperatore(formData: FormData) {
    const supabase = await createClient();

    const nomeCompleto = formData.get('nome_completo') as string;
    const email = formData.get('email') as string;
    const strutturaSanitaria = formData.get('struttura_sanitaria') as string;
    const telefono = formData.get('telefono') as string;
    const password = formData.get('password') as string;
    const confermaPassword = formData.get('conferma_password') as string;

    // Validazione
    if (password !== confermaPassword) {
        return { error: 'Le password non coincidono.' };
    }

    if (password.length < 6) {
        return { error: 'La password deve essere di almeno 6 caratteri.' };
    }

    const codiceOperatore = generateCodiceOperatore();

    // 1. Registra utente — il trigger crea solo la riga in profiles
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'operatore',
                nome_completo: nomeCompleto,
                codice_operatore: codiceOperatore,
                struttura_sanitaria: strutturaSanitaria || null,
                telefono: telefono || null,
            },
        },
    });

    if (authError) {
        return { error: authError.message };
    }

    if (!authData.user) {
        return { error: 'Errore durante la registrazione.' };
    }

    // 2. Crea il record operatore via RPC (bypassa RLS con SECURITY DEFINER)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('crea_profilo_operatore', {
        p_profile_id: authData.user.id,
        p_codice_operatore: codiceOperatore,
        p_nome_completo: nomeCompleto,
        p_email: email,
        p_struttura_sanitaria: strutturaSanitaria || null,
        p_telefono: telefono || null,
    });

    if (rpcError) {
        return { error: 'Errore creazione profilo operatore: ' + rpcError.message };
    }

    const result = rpcResult as { success: boolean; error?: string } | null;
    if (result && !result.success) {
        return { error: 'Errore: ' + result.error };
    }

    // 3. Login per stabilire la sessione
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (loginError) {
        return { error: 'Registrazione completata! Vai alla pagina di login per accedere.' };
    }

    redirect('/operatore/dashboard');
}

export async function logoutOperatore() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/operatore/login');
}

function generateCodiceOperatore(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codice = '';
    for (let i = 0; i < 6; i++) {
        codice += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codice;
}
