-- Schéma initial : comptes, profils enfants, histoires, stockage audio.

-- ---------------------------------------------------------------------------
-- Comptes (un par utilisateur Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'conteur', 'famille')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "accounts: lecture par le propriétaire"
  on public.accounts for select
  using (auth.uid() = id);
-- Aucune écriture côté client : l'offre est mise à jour uniquement par les Edge Functions (service role).

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Profils enfants
-- ---------------------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  age smallint not null check (age between 2 and 12),
  pronoun text not null default 'neutre' check (pronoun in ('il', 'elle', 'neutre')),
  interests text[] not null default '{}' check (cardinality(interests) <= 5),
  companion text check (char_length(companion) <= 60),
  created_at timestamptz not null default now()
);

create index children_user_id_idx on public.children (user_id);

alter table public.children enable row level security;

create policy "children: lecture" on public.children for select using (auth.uid() = user_id);
create policy "children: création" on public.children for insert with check (auth.uid() = user_id);
create policy "children: modification" on public.children for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "children: suppression" on public.children for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Histoires
-- ---------------------------------------------------------------------------
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  child_name text not null,
  theme text not null,
  moral text,
  duration text not null check (duration in ('court', 'moyen', 'long')),
  details text,
  credits smallint not null check (credits > 0),
  status text not null default 'pending'
    check (status in ('pending', 'writing', 'narrating', 'ready', 'failed')),
  error text,
  title text,
  text text,
  audio_path text,
  audio_seconds integer,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stories_user_created_idx on public.stories (user_id, created_at desc);

alter table public.stories enable row level security;

create policy "stories: lecture" on public.stories for select using (auth.uid() = user_id);
create policy "stories: suppression" on public.stories for delete using (auth.uid() = user_id);
create policy "stories: favori" on public.stories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Le client ne peut modifier que le favori ; tout le reste passe par les Edge Functions.
revoke insert, update on public.stories from anon, authenticated;
grant update (is_favorite) on public.stories to authenticated;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stories_touch before update on public.stories
  for each row execute function public.touch_updated_at();
create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Quotas
-- ---------------------------------------------------------------------------

-- Crédits consommés sur la période (les histoires échouées sont remboursées).
create function public.credits_used(p_user uuid, p_period text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(s.credits), 0)::integer
  from public.stories s
  where s.user_id = p_user
    and s.status <> 'failed'
    and (
      p_period = 'lifetime'
      or s.created_at >= (date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
    );
$$;

revoke execute on function public.credits_used(uuid, text) from public, anon, authenticated;

-- Résumé pour l'application (utilisateur courant uniquement).
create function public.my_usage()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'plan', a.plan,
    'plan_expires_at', a.plan_expires_at,
    'month_used', public.credits_used(a.id, 'month'),
    'lifetime_used', public.credits_used(a.id, 'lifetime')
  )
  from public.accounts a
  where a.id = auth.uid();
$$;

revoke execute on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;

-- Réserve atomiquement des crédits et crée l'histoire en attente.
-- Le plafond et la période sont fournis par l'Edge Function (catalog.ts).
create function public.reserve_story(
  p_user uuid,
  p_child uuid,
  p_child_name text,
  p_theme text,
  p_moral text,
  p_duration text,
  p_details text,
  p_credits integer,
  p_limit integer,
  p_period text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- Verrou par utilisateur : sérialise les demandes simultanées.
  perform 1 from public.accounts where id = p_user for update;
  if not found then
    insert into public.accounts (id) values (p_user) on conflict do nothing;
    perform 1 from public.accounts where id = p_user for update;
  end if;

  -- Une génération interrompue (fonction tuée) ne doit pas bloquer de crédits.
  update public.stories
     set status = 'failed', error = 'Génération interrompue'
   where user_id = p_user
     and status in ('pending', 'writing', 'narrating')
     and created_at < now() - interval '10 minutes';

  if public.credits_used(p_user, p_period) + p_credits > p_limit then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.stories (user_id, child_id, child_name, theme, moral, duration, details, credits)
  values (p_user, p_child, p_child_name, p_theme, p_moral, p_duration, p_details, p_credits)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.reserve_story(uuid, uuid, text, text, text, text, text, integer, integer, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stockage audio : bucket privé, un dossier par utilisateur ({user_id}/{story_id}.mp3)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('story-audio', 'story-audio', false)
on conflict (id) do nothing;

create policy "story-audio: lecture par le propriétaire"
  on storage.objects for select
  using (bucket_id = 'story-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "story-audio: suppression par le propriétaire"
  on storage.objects for delete
  using (bucket_id = 'story-audio' and (storage.foldername(name))[1] = auth.uid()::text);
