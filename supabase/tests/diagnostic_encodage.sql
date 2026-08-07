-- =============================================================================
-- Diagnostic d'encodage — lecture seule, ne modifie rien.
--
-- Montre, pour chaque nom suspect : le texte actuel, ce que donnerait une
-- réparation, et ce que donnerait une double réparation (au cas où le texte
-- aurait été abîmé deux fois).
-- =============================================================================

create or replace function pg_temp.repair(p text)
  returns text language plpgsql immutable as $$
begin
  return convert_from(convert_to(p, 'MACINTOSH'), 'UTF8');
exception when others then return p;
end $$;

select
  name                                   as actuel,
  pg_temp.repair(name)                   as une_passe,
  pg_temp.repair(pg_temp.repair(name))   as deux_passes,
  category                               as categorie_actuelle,
  pg_temp.repair(category)               as categorie_reparee,
  -- Les points de code du premier caractère non ASCII, pour identifier
  -- précisément la nature de l'abîmage.
  (select string_agg(to_hex(ascii(c)), ' ')
     from unnest(string_to_array(name, null)) c
    where ascii(c) > 127)                as codes_non_ascii
from public.products
where name ~ '[^ -~À-ÿ]' or name ~ '[√≈¬ÂÃ]' or category ~ '[√≈¬ÂÃ]'
order by name
limit 15;
