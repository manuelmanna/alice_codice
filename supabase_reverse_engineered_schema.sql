-- A.L.I.C.E. - schema Supabase ricostruito dal codice applicativo
-- Incolla questo file nel SQL Editor di Supabase.
-- Non contiene CREATE INDEX. Le chiavi primarie e i vincoli UNIQUE generano
-- comunque indici interni necessari all'integrita' dei dati.

begin;

create extension if not exists pgcrypto;

create schema if not exists app_private;

-- ============================================================
-- ENUM / CHECK DOMAINS
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('operatore', 'paziente');
  end if;

  if not exists (select 1 from pg_type where typname = 'stato_paziente') then
    create type public.stato_paziente as enum ('ok', 'attenzione', 'critico');
  end if;

  if not exists (select 1 from pg_type where typname = 'fascia_farmaco') then
    create type public.fascia_farmaco as enum ('mattina', 'pranzo', 'sera');
  end if;

  if not exists (select 1 from pg_type where typname = 'valore_umore') then
    create type public.valore_umore as enum ('triste', 'normale', 'felice');
  end if;
end $$;

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  email text,
  nome_completo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operatori (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  codice_operatore text not null unique,
  nome_completo text not null,
  email text,
  struttura_sanitaria text,
  telefono text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pazienti (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  operatore_id uuid not null references public.operatori(id) on delete restrict,
  nome_completo text not null,
  email text,
  eta integer check (eta is null or eta between 1 and 149),
  telefono text,
  indirizzo text,
  contatto_emergenza text,
  stato public.stato_paziente not null default 'ok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farmaci (
  id uuid primary key default gen_random_uuid(),
  paziente_id uuid not null references public.pazienti(id) on delete cascade,
  nome text not null,
  dosaggio text not null,
  fascia public.fascia_farmaco not null,
  orario time not null,
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farmaci_log (
  id uuid primary key default gen_random_uuid(),
  farmaco_id uuid not null references public.farmaci(id) on delete cascade,
  paziente_id uuid not null references public.pazienti(id) on delete cascade,
  data date not null default current_date,
  preso boolean not null default false,
  preso_at timestamptz,
  created_at timestamptz not null default now(),
  constraint farmaci_log_un_giorno unique (farmaco_id, data)
);

create table if not exists public.esercizi (
  id uuid primary key default gen_random_uuid(),
  paziente_id uuid not null references public.pazienti(id) on delete cascade,
  nome text not null,
  durata_minuti integer not null check (durata_minuti > 0),
  frequenza text,
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esercizi_step (
  id uuid primary key default gen_random_uuid(),
  esercizio_id uuid not null references public.esercizi(id) on delete cascade,
  numero_step integer not null check (numero_step > 0),
  istruzione text not null,
  created_at timestamptz not null default now(),
  constraint esercizi_step_numero_unico unique (esercizio_id, numero_step)
);

create table if not exists public.esercizi_log (
  id uuid primary key default gen_random_uuid(),
  esercizio_id uuid not null references public.esercizi(id) on delete cascade,
  paziente_id uuid not null references public.pazienti(id) on delete cascade,
  data date not null default current_date,
  completato boolean not null default false,
  completato_at timestamptz,
  created_at timestamptz not null default now(),
  constraint esercizi_log_un_giorno unique (esercizio_id, data)
);

create table if not exists public.umore_log (
  id uuid primary key default gen_random_uuid(),
  paziente_id uuid not null references public.pazienti(id) on delete cascade,
  data date not null default current_date,
  valore public.valore_umore not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint umore_log_un_giorno unique (paziente_id, data)
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function app_private.touch_updated_at();

drop trigger if exists operatori_touch_updated_at on public.operatori;
create trigger operatori_touch_updated_at
before update on public.operatori
for each row execute function app_private.touch_updated_at();

drop trigger if exists pazienti_touch_updated_at on public.pazienti;
create trigger pazienti_touch_updated_at
before update on public.pazienti
for each row execute function app_private.touch_updated_at();

drop trigger if exists farmaci_touch_updated_at on public.farmaci;
create trigger farmaci_touch_updated_at
before update on public.farmaci
for each row execute function app_private.touch_updated_at();

drop trigger if exists esercizi_touch_updated_at on public.esercizi;
create trigger esercizi_touch_updated_at
before update on public.esercizi
for each row execute function app_private.touch_updated_at();

drop trigger if exists umore_log_touch_updated_at on public.umore_log;
create trigger umore_log_touch_updated_at
before update on public.umore_log
for each row execute function app_private.touch_updated_at();

-- ============================================================
-- PRIVATE HELPERS FOR RLS
-- ============================================================

create or replace function app_private.current_operatore_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select o.id
  from public.operatori o
  where o.profile_id = auth.uid()
  limit 1;
$$;

create or replace function app_private.current_paziente_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id
  from public.pazienti p
  where p.profile_id = auth.uid()
  limit 1;
$$;

create or replace function app_private.is_operatore_assigned_to_paziente(p_paziente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.pazienti p
    join public.operatori o on o.id = p.operatore_id
    where p.id = p_paziente_id
      and o.profile_id = auth.uid()
  );
$$;

create or replace function app_private.is_current_paziente(p_paziente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.pazienti p
    where p.id = p_paziente_id
      and p.profile_id = auth.uid()
  );
$$;

create or replace function app_private.can_access_esercizio(p_esercizio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.esercizi e
    where e.id = p_esercizio_id
      and (
        app_private.is_current_paziente(e.paziente_id)
        or app_private.is_operatore_assigned_to_paziente(e.paziente_id)
      )
  );
$$;

grant usage on schema app_private to anon, authenticated;
grant execute on all functions in schema app_private to anon, authenticated;

-- ============================================================
-- AUTH SIGNUP TRIGGER
-- ============================================================

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role public.user_role;
  v_nome text;
  v_operatore_id uuid;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'paziente')::public.user_role;
  v_nome := coalesce(new.raw_user_meta_data->>'nome_completo', new.email, 'Utente');

  insert into public.profiles (id, role, email, nome_completo)
  values (new.id, v_role, new.email, v_nome)
  on conflict (id) do update
  set role = excluded.role,
      email = excluded.email,
      nome_completo = excluded.nome_completo,
      updated_at = now();

  if v_role = 'paziente' then
    v_operatore_id := nullif(new.raw_user_meta_data->>'operatore_id', '')::uuid;

    insert into public.pazienti (
      profile_id,
      operatore_id,
      nome_completo,
      email,
      eta,
      telefono,
      indirizzo,
      contatto_emergenza
    )
    values (
      new.id,
      v_operatore_id,
      v_nome,
      new.email,
      nullif(new.raw_user_meta_data->>'eta', '')::integer,
      nullif(new.raw_user_meta_data->>'telefono', ''),
      nullif(new.raw_user_meta_data->>'indirizzo', ''),
      nullif(new.raw_user_meta_data->>'contatto_emergenza', '')
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_auth_user();

-- RPC usata da src/app/operatore/actions.ts
create or replace function public.crea_profilo_operatore(
  p_profile_id uuid,
  p_codice_operatore text,
  p_nome_completo text,
  p_email text,
  p_struttura_sanitaria text default null,
  p_telefono text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    return jsonb_build_object('success', false, 'error', 'Utente non autorizzato');
  end if;

  insert into public.profiles (id, role, email, nome_completo)
  values (p_profile_id, 'operatore', p_email, p_nome_completo)
  on conflict (id) do update
  set role = 'operatore',
      email = excluded.email,
      nome_completo = excluded.nome_completo,
      updated_at = now();

  insert into public.operatori (
    profile_id,
    codice_operatore,
    nome_completo,
    email,
    struttura_sanitaria,
    telefono
  )
  values (
    p_profile_id,
    upper(p_codice_operatore),
    p_nome_completo,
    p_email,
    p_struttura_sanitaria,
    p_telefono
  )
  on conflict (profile_id) do update
  set nome_completo = excluded.nome_completo,
      email = excluded.email,
      struttura_sanitaria = excluded.struttura_sanitaria,
      telefono = excluded.telefono,
      updated_at = now();

  return jsonb_build_object('success', true);
exception
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.crea_profilo_operatore(uuid, text, text, text, text, text) to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.operatori enable row level security;
alter table public.pazienti enable row level security;
alter table public.farmaci enable row level security;
alter table public.farmaci_log enable row level security;
alter table public.esercizi enable row level security;
alter table public.esercizi_step enable row level security;
alter table public.esercizi_log enable row level security;
alter table public.umore_log enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() is not null and id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() is not null and id = auth.uid())
with check (auth.uid() is not null and id = auth.uid());

-- OPERATORI
-- Serve anche ad anon per il dropdown della registrazione paziente.
drop policy if exists "operatori_select_for_registration_and_users" on public.operatori;
create policy "operatori_select_for_registration_and_users"
on public.operatori for select
to anon, authenticated
using (true);

drop policy if exists "operatori_update_own" on public.operatori;
create policy "operatori_update_own"
on public.operatori for update
to authenticated
using (auth.uid() is not null and profile_id = auth.uid())
with check (auth.uid() is not null and profile_id = auth.uid());

-- PAZIENTI
drop policy if exists "pazienti_select_own_or_assigned" on public.pazienti;
create policy "pazienti_select_own_or_assigned"
on public.pazienti for select
to authenticated
using (
  auth.uid() is not null
  and (
    profile_id = auth.uid()
    or operatore_id = app_private.current_operatore_id()
  )
);

drop policy if exists "pazienti_update_assigned_operator" on public.pazienti;
create policy "pazienti_update_assigned_operator"
on public.pazienti for update
to authenticated
using (
  auth.uid() is not null
  and operatore_id = app_private.current_operatore_id()
)
with check (
  auth.uid() is not null
  and operatore_id = app_private.current_operatore_id()
);

-- FARMACI
drop policy if exists "farmaci_select_patient_or_operator" on public.farmaci;
create policy "farmaci_select_patient_or_operator"
on public.farmaci for select
to authenticated
using (
  auth.uid() is not null
  and (
    app_private.is_current_paziente(paziente_id)
    or app_private.is_operatore_assigned_to_paziente(paziente_id)
  )
);

drop policy if exists "farmaci_insert_assigned_operator" on public.farmaci;
create policy "farmaci_insert_assigned_operator"
on public.farmaci for insert
to authenticated
with check (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
);

drop policy if exists "farmaci_update_assigned_operator" on public.farmaci;
create policy "farmaci_update_assigned_operator"
on public.farmaci for update
to authenticated
using (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
)
with check (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
);

drop policy if exists "farmaci_delete_assigned_operator" on public.farmaci;
create policy "farmaci_delete_assigned_operator"
on public.farmaci for delete
to authenticated
using (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
);

-- FARMACI_LOG
drop policy if exists "farmaci_log_select_patient_or_operator" on public.farmaci_log;
create policy "farmaci_log_select_patient_or_operator"
on public.farmaci_log for select
to authenticated
using (
  auth.uid() is not null
  and (
    app_private.is_current_paziente(paziente_id)
    or app_private.is_operatore_assigned_to_paziente(paziente_id)
  )
);

drop policy if exists "farmaci_log_insert_current_patient" on public.farmaci_log;
create policy "farmaci_log_insert_current_patient"
on public.farmaci_log for insert
to authenticated
with check (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
  and exists (
    select 1
    from public.farmaci f
    where f.id = farmaci_log.farmaco_id
      and f.paziente_id = farmaci_log.paziente_id
  )
);

drop policy if exists "farmaci_log_update_current_patient" on public.farmaci_log;
create policy "farmaci_log_update_current_patient"
on public.farmaci_log for update
to authenticated
using (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
)
with check (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
);

-- ESERCIZI
drop policy if exists "esercizi_select_patient_or_operator" on public.esercizi;
create policy "esercizi_select_patient_or_operator"
on public.esercizi for select
to authenticated
using (
  auth.uid() is not null
  and (
    app_private.is_current_paziente(paziente_id)
    or app_private.is_operatore_assigned_to_paziente(paziente_id)
  )
);

drop policy if exists "esercizi_insert_assigned_operator" on public.esercizi;
create policy "esercizi_insert_assigned_operator"
on public.esercizi for insert
to authenticated
with check (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
);

drop policy if exists "esercizi_update_assigned_operator" on public.esercizi;
create policy "esercizi_update_assigned_operator"
on public.esercizi for update
to authenticated
using (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
)
with check (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
);

drop policy if exists "esercizi_delete_assigned_operator" on public.esercizi;
create policy "esercizi_delete_assigned_operator"
on public.esercizi for delete
to authenticated
using (
  auth.uid() is not null
  and app_private.is_operatore_assigned_to_paziente(paziente_id)
);

-- ESERCIZI_STEP
drop policy if exists "esercizi_step_select_patient_or_operator" on public.esercizi_step;
create policy "esercizi_step_select_patient_or_operator"
on public.esercizi_step for select
to authenticated
using (
  auth.uid() is not null
  and app_private.can_access_esercizio(esercizio_id)
);

drop policy if exists "esercizi_step_insert_assigned_operator" on public.esercizi_step;
create policy "esercizi_step_insert_assigned_operator"
on public.esercizi_step for insert
to authenticated
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.esercizi e
    where e.id = esercizi_step.esercizio_id
      and app_private.is_operatore_assigned_to_paziente(e.paziente_id)
  )
);

drop policy if exists "esercizi_step_update_assigned_operator" on public.esercizi_step;
create policy "esercizi_step_update_assigned_operator"
on public.esercizi_step for update
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.esercizi e
    where e.id = esercizi_step.esercizio_id
      and app_private.is_operatore_assigned_to_paziente(e.paziente_id)
  )
)
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.esercizi e
    where e.id = esercizi_step.esercizio_id
      and app_private.is_operatore_assigned_to_paziente(e.paziente_id)
  )
);

drop policy if exists "esercizi_step_delete_assigned_operator" on public.esercizi_step;
create policy "esercizi_step_delete_assigned_operator"
on public.esercizi_step for delete
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.esercizi e
    where e.id = esercizi_step.esercizio_id
      and app_private.is_operatore_assigned_to_paziente(e.paziente_id)
  )
);

-- ESERCIZI_LOG
drop policy if exists "esercizi_log_select_patient_or_operator" on public.esercizi_log;
create policy "esercizi_log_select_patient_or_operator"
on public.esercizi_log for select
to authenticated
using (
  auth.uid() is not null
  and (
    app_private.is_current_paziente(paziente_id)
    or app_private.is_operatore_assigned_to_paziente(paziente_id)
  )
);

drop policy if exists "esercizi_log_insert_current_patient" on public.esercizi_log;
create policy "esercizi_log_insert_current_patient"
on public.esercizi_log for insert
to authenticated
with check (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
  and exists (
    select 1
    from public.esercizi e
    where e.id = esercizi_log.esercizio_id
      and e.paziente_id = esercizi_log.paziente_id
  )
);

drop policy if exists "esercizi_log_update_current_patient" on public.esercizi_log;
create policy "esercizi_log_update_current_patient"
on public.esercizi_log for update
to authenticated
using (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
)
with check (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
);

-- UMORE_LOG
drop policy if exists "umore_log_select_patient_or_operator" on public.umore_log;
create policy "umore_log_select_patient_or_operator"
on public.umore_log for select
to authenticated
using (
  auth.uid() is not null
  and (
    app_private.is_current_paziente(paziente_id)
    or app_private.is_operatore_assigned_to_paziente(paziente_id)
  )
);

drop policy if exists "umore_log_insert_current_patient" on public.umore_log;
create policy "umore_log_insert_current_patient"
on public.umore_log for insert
to authenticated
with check (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
);

drop policy if exists "umore_log_update_current_patient" on public.umore_log;
create policy "umore_log_update_current_patient"
on public.umore_log for update
to authenticated
using (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
)
with check (
  auth.uid() is not null
  and app_private.is_current_paziente(paziente_id)
);

commit;

-- ============================================================
-- PLACEHOLDER DATA
-- ============================================================
-- Prima crea 1 operatore e 2 pazienti da Authentication > Users.
-- Poi sostituisci gli UUID qui sotto con gli ID reali degli utenti Auth.
-- Esegui questa sezione separatamente dopo lo schema.

/*
begin;

-- UUID da sostituire:
-- 00000000-0000-0000-0000-000000000001 = auth.users.id operatore
-- 00000000-0000-0000-0000-000000000002 = auth.users.id paziente 1
-- 00000000-0000-0000-0000-000000000003 = auth.users.id paziente 2

insert into public.profiles (id, role, email, nome_completo)
values
  ('00000000-0000-0000-0000-000000000001', 'operatore', 'operatore.demo@example.com', 'Dott.ssa Alice Bianchi'),
  ('00000000-0000-0000-0000-000000000002', 'paziente', 'mario.rossi@example.com', 'Mario Rossi'),
  ('00000000-0000-0000-0000-000000000003', 'paziente', 'lucia.verdi@example.com', 'Lucia Verdi')
on conflict (id) do update
set role = excluded.role,
    email = excluded.email,
    nome_completo = excluded.nome_completo,
    updated_at = now();

insert into public.operatori (
  id,
  profile_id,
  codice_operatore,
  nome_completo,
  email,
  struttura_sanitaria,
  telefono
)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'ALICE1',
  'Dott.ssa Alice Bianchi',
  'operatore.demo@example.com',
  'Centro Memoria Demo',
  '+39 011 000000'
)
on conflict (profile_id) do update
set codice_operatore = excluded.codice_operatore,
    nome_completo = excluded.nome_completo,
    email = excluded.email,
    struttura_sanitaria = excluded.struttura_sanitaria,
    telefono = excluded.telefono,
    updated_at = now();

insert into public.pazienti (
  id,
  profile_id,
  operatore_id,
  nome_completo,
  email,
  eta,
  telefono,
  indirizzo,
  contatto_emergenza,
  stato
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Mario Rossi',
    'mario.rossi@example.com',
    78,
    '+39 333 1234567',
    'Via Roma 10, Torino',
    'Sara Rossi - +39 333 7654321',
    'attenzione'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Lucia Verdi',
    'lucia.verdi@example.com',
    74,
    '+39 333 9876543',
    'Corso Italia 24, Torino',
    'Paolo Verdi - +39 333 1112222',
    'ok'
  )
on conflict (profile_id) do update
set operatore_id = excluded.operatore_id,
    nome_completo = excluded.nome_completo,
    email = excluded.email,
    eta = excluded.eta,
    telefono = excluded.telefono,
    indirizzo = excluded.indirizzo,
    contatto_emergenza = excluded.contatto_emergenza,
    stato = excluded.stato,
    updated_at = now();

insert into public.farmaci (id, paziente_id, nome, dosaggio, fascia, orario)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Memantina', '10 mg', 'mattina', '08:00'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Vitamina D', '1000 UI', 'pranzo', '13:00'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Donepezil', '5 mg', 'sera', '20:00')
on conflict (id) do update
set nome = excluded.nome,
    dosaggio = excluded.dosaggio,
    fascia = excluded.fascia,
    orario = excluded.orario,
    attivo = true,
    updated_at = now();

insert into public.esercizi (id, paziente_id, nome, durata_minuti, frequenza)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Alzare le braccia', 5, 'Giornaliero'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Camminata assistita', 10, '3 volte a settimana'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Respirazione guidata', 4, 'Giornaliero')
on conflict (id) do update
set nome = excluded.nome,
    durata_minuti = excluded.durata_minuti,
    frequenza = excluded.frequenza,
    attivo = true,
    updated_at = now();

insert into public.esercizi_step (esercizio_id, numero_step, istruzione)
values
  ('40000000-0000-0000-0000-000000000001', 1, 'Siediti comodo con la schiena appoggiata.'),
  ('40000000-0000-0000-0000-000000000001', 2, 'Alza lentamente entrambe le braccia davanti a te.'),
  ('40000000-0000-0000-0000-000000000001', 3, 'Mantieni la posizione per cinque secondi e poi abbassa le braccia.'),
  ('40000000-0000-0000-0000-000000000002', 1, 'Alzati lentamente con un supporto stabile vicino.'),
  ('40000000-0000-0000-0000-000000000002', 2, 'Cammina per la stanza a passo regolare.'),
  ('40000000-0000-0000-0000-000000000003', 1, 'Inspira lentamente dal naso.'),
  ('40000000-0000-0000-0000-000000000003', 2, 'Espira lentamente dalla bocca.')
on conflict (esercizio_id, numero_step) do update
set istruzione = excluded.istruzione;

insert into public.farmaci_log (farmaco_id, paziente_id, data, preso, preso_at)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', current_date, true, now()),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', current_date, false, null),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', current_date, true, now())
on conflict (farmaco_id, data) do update
set preso = excluded.preso,
    preso_at = excluded.preso_at;

insert into public.esercizi_log (esercizio_id, paziente_id, data, completato, completato_at)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', current_date, true, now()),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', current_date, false, null),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', current_date, true, now())
on conflict (esercizio_id, data) do update
set completato = excluded.completato,
    completato_at = excluded.completato_at;

insert into public.umore_log (paziente_id, data, valore)
values
  ('20000000-0000-0000-0000-000000000001', current_date - 6, 'normale'),
  ('20000000-0000-0000-0000-000000000001', current_date - 5, 'triste'),
  ('20000000-0000-0000-0000-000000000001', current_date - 4, 'normale'),
  ('20000000-0000-0000-0000-000000000001', current_date - 3, 'felice'),
  ('20000000-0000-0000-0000-000000000001', current_date - 2, 'normale'),
  ('20000000-0000-0000-0000-000000000001', current_date - 1, 'triste'),
  ('20000000-0000-0000-0000-000000000001', current_date, 'normale'),
  ('20000000-0000-0000-0000-000000000002', current_date, 'felice')
on conflict (paziente_id, data) do update
set valore = excluded.valore,
    updated_at = now();

commit;
*/
