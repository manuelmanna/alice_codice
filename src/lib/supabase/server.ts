// Crea e restituisce un client Supabase lato server (SSR) configurato per usare
// l'API dei cookie di Next.js (next/headers).
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
    // Ottiene l'oggetto cookieStore attuale
    const cookieStore = await cookies();

    // Crea il client Supabase passando URL e ANON KEY dall'environment.
    // Fornisce un oggetto `cookies`
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // Restituisce tutti i cookie come array; usato da Supabase per leggere la sessione.
                getAll() {
                    return cookieStore.getAll();
                },
                // Imposta più cookie; in Server Components potrebbe fallire la scrittura,
                // quindi si cattura l'errore e si ignora (il proxy Supabase aggiorna la sessione comunque).
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Nei Server Component non sempre si possono scrivere cookie.
                        // Va bene così: il proxy aggiorna la sessione quando serve.
                    }
                },
            },
        }
    );
}
