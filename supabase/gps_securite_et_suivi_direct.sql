-- GPS : (1) un livreur ne peut mettre a jour que SA position ; (2) le suivi en direct recoit l'identifiant du livreur.
-- Deja applique sur la base (migration gps_securite_et_suivi_direct) ; garde ici pour memoire.

create or replace function public.update_rider_location(p_rider_id uuid, p_lat double precision, p_lng double precision)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then return false; end if;
  -- le jeton de session (en-tete x-mego-token) doit etre celui de ce livreur
  if p_rider_id is distinct from public.session_rider_id() then return false; end if;
  update public.riders set latitude = p_lat, longitude = p_lng, location_updated_at = now() where id = p_rider_id;
  return found;
end $function$;

-- get_order_status : ajoute 'rider_id' (seulement pendant la course) pour que le client suive le livreur en direct.
-- Voir la fonction en base pour le corps complet.
