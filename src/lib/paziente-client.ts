import { createClient } from '@/lib/supabase/client';

type SupabaseBrowserClient = ReturnType<typeof createClient>;

export async function leggiPazienteCorrenteId(
  supabase: SupabaseBrowserClient
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: paziente } = await supabase
    .from('pazienti')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  return paziente?.id ?? null;
}
