-- =============================================================================
-- 0013 — Abonnements aux notifications push
--
-- Un utilisateur peut avoir plusieurs abonnements : un par appareil et par
-- navigateur. Le téléphone du chef et l'ordinateur du bureau sont deux entrées
-- distinctes, et c'est voulu.
--
-- `endpoint` est l'adresse fournie par le service de push du navigateur
-- (Apple, Google, Mozilla). Elle identifie l'abonnement de façon unique.
--
-- Migration idempotente.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  endpoint         text not null,
  p256dh           text not null,
  auth             text not null,
  -- Sert à repérer les abonnements muets, à nettoyer un jour.
  created_at       timestamptz not null default now(),
  last_sent_at     timestamptz
);

-- Un même appareil ne s'abonne qu'une fois : le navigateur réutilise son
-- endpoint tant que l'autorisation n'a pas été révoquée.
create unique index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);

create index if not exists push_subscriptions_establishment_idx
  on public.push_subscriptions (establishment_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
--
-- Chacun ne gère que ses propres abonnements. La fonction serveur qui envoie
-- les notifications utilise la clé `service_role`, qui contourne la RLS — c'est
-- pour ça qu'elle ne doit jamais quitter les variables d'environnement Vercel.
-- -----------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_establishment(establishment_id)
  );

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.push_subscriptions from anon;
grant select, insert, delete on public.push_subscriptions to authenticated;
