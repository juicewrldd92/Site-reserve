-- =============================================================================
-- Test d'isolation RLS — à coller tel quel dans le SQL editor de Supabase.
--
-- Vérifie qu'un utilisateur de l'organisation A ne peut ni lire ni écrire les
-- données de l'organisation B, et qu'un membre rattaché à un seul
-- établissement ne voit pas les autres.
--
-- Le script se termine par un ROLLBACK : il ne laisse RIEN derrière lui.
-- Succès = « TOUS LES TESTS RLS PASSENT ». Échec = une exception explicite.
-- =============================================================================

begin;

-- --- Utilisateurs fictifs ----------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'marco@test.local', crypt('motdepasse', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email"}'::jsonb, '{"full_name":"Marco"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'sofia@test.local', crypt('motdepasse', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email"}'::jsonb, '{"full_name":"Sofia"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'lea@test.local', crypt('motdepasse', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email"}'::jsonb, '{"full_name":"Léa"}'::jsonb);

select set_config('test.marco', (select id::text from auth.users where email = 'marco@test.local'), true),
       set_config('test.sofia', (select id::text from auth.users where email = 'sofia@test.local'), true),
       set_config('test.lea',   (select id::text from auth.users where email = 'lea@test.local'), true);

-- Helper : devenir un utilisateur donné.
create or replace function pg_temp.act_as(p_user text)
  returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text,
    true
  );
end;
$$;

-- --- Marco monte son organisation -------------------------------------------
select pg_temp.act_as(current_setting('test.marco'));

select set_config('test.org_marco', org_id::text, true),
       set_config('test.est_marco', establishment_id::text, true)
  from public.create_organization_with_establishment(
    'Chez Marco', 'Chez Marco — Lyon 1er', 'Trattoria', array['Frigo', 'Cave']
  );

do $$
begin
  if (select count(*) from public.organizations) <> 1 then
    raise exception 'Marco devrait voir exactement 1 organisation, il en voit %',
      (select count(*) from public.organizations);
  end if;
  if (select role from public.memberships where user_id = auth.uid()) <> 'owner' then
    raise exception 'Marco devrait être owner de son organisation';
  end if;
end;
$$;

-- Deuxième établissement, pour tester le cloisonnement par établissement.
insert into public.establishments (org_id, name)
values (current_setting('test.org_marco')::uuid, 'Chez Marco — Croix-Rousse');

select set_config('test.est_marco_2', id::text, true)
  from public.establishments
 where name = 'Chez Marco — Croix-Rousse';

-- --- Sofia monte la sienne, de son côté --------------------------------------
select pg_temp.act_as(current_setting('test.sofia'));

select set_config('test.org_sofia', org_id::text, true)
  from public.create_organization_with_establishment('Chez Sofia', 'Chez Sofia — Paris 11e');

-- TEST 1 — Sofia ne voit rien de chez Marco.
do $$
begin
  if exists (select 1 from public.organizations where id = current_setting('test.org_marco')::uuid) then
    raise exception 'FUITE : Sofia lit l''organisation de Marco';
  end if;
  if exists (select 1 from public.establishments where org_id = current_setting('test.org_marco')::uuid) then
    raise exception 'FUITE : Sofia lit les établissements de Marco';
  end if;
  if exists (select 1 from public.memberships where org_id = current_setting('test.org_marco')::uuid) then
    raise exception 'FUITE : Sofia lit les membres de Marco';
  end if;
  if exists (select 1 from public.profiles where id = current_setting('test.marco')::uuid) then
    raise exception 'FUITE : Sofia lit le profil de Marco';
  end if;
end;
$$;

-- TEST 2 — Sofia ne peut pas modifier ni supprimer chez Marco.
do $$
declare v_touched int;
begin
  update public.organizations set name = 'Piraté'
   where id = current_setting('test.org_marco')::uuid;
  get diagnostics v_touched = row_count;
  if v_touched <> 0 then
    raise exception 'FUITE : Sofia a modifié % organisation(s) de Marco', v_touched;
  end if;

  delete from public.establishments
   where id = current_setting('test.est_marco')::uuid;
  get diagnostics v_touched = row_count;
  if v_touched <> 0 then
    raise exception 'FUITE : Sofia a supprimé % établissement(s) de Marco', v_touched;
  end if;
end;
$$;

-- TEST 3 — Sofia ne peut pas s'ajouter à l'organisation de Marco.
do $$
begin
  begin
    insert into public.memberships (org_id, user_id, role)
    values (current_setting('test.org_marco')::uuid, auth.uid(), 'owner');
    raise exception 'FUITE : Sofia s''est ajoutée comme membre chez Marco';
  exception
    when insufficient_privilege then null;  -- comportement attendu
  end;

  begin
    insert into public.establishments (org_id, name)
    values (current_setting('test.org_marco')::uuid, 'Établissement pirate');
    raise exception 'FUITE : Sofia a créé un établissement chez Marco';
  exception
    when insufficient_privilege then null;  -- comportement attendu
  end;
end;
$$;

-- --- Marco embauche Léa, rattachée au seul premier établissement -------------
select pg_temp.act_as(current_setting('test.marco'));

insert into public.memberships (org_id, user_id, role, establishment_id)
values (
  current_setting('test.org_marco')::uuid,
  current_setting('test.lea')::uuid,
  'staff',
  current_setting('test.est_marco')::uuid
);

-- TEST 4 — Léa ne voit que son établissement.
select pg_temp.act_as(current_setting('test.lea'));

do $$
begin
  if (select count(*) from public.establishments) <> 1 then
    raise exception 'Léa devrait voir 1 établissement, elle en voit %',
      (select count(*) from public.establishments);
  end if;
  if not exists (select 1 from public.establishments where id = current_setting('test.est_marco')::uuid) then
    raise exception 'Léa ne voit pas l''établissement auquel elle est rattachée';
  end if;
  if exists (select 1 from public.establishments where id = current_setting('test.est_marco_2')::uuid) then
    raise exception 'FUITE : Léa voit un établissement auquel elle n''est pas rattachée';
  end if;
end;
$$;

-- TEST 5 — Le staff ne crée pas d'établissement et ne se promeut pas.
do $$
begin
  begin
    insert into public.establishments (org_id, name)
    values (current_setting('test.org_marco')::uuid, 'Ma propre boutique');
    raise exception 'FUITE : le staff a créé un établissement';
  exception
    when insufficient_privilege then null;  -- comportement attendu
  end;
end;
$$;

do $$
declare v_touched int;
begin
  update public.memberships set role = 'owner' where user_id = auth.uid();
  get diagnostics v_touched = row_count;
  if v_touched <> 0 then
    raise exception 'FUITE : le staff s''est promu owner';
  end if;
end;
$$;

-- TEST 6 — Un visiteur non connecté ne voit rien.
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', null, true);

do $$
begin
  begin
    perform 1 from public.organizations;
    raise exception 'FUITE : le rôle anon accède aux organisations';
  exception
    when insufficient_privilege then null;  -- comportement attendu
  end;
end;
$$;

reset role;

select '✅ TOUS LES TESTS RLS PASSENT' as resultat;

rollback;
