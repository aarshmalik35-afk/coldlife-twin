-- A.R.C.T.I.C. / ColdLife Twin
-- Patch the existing server-side demo tick so operator interventions are
-- reflected in the simulation instead of being overwritten on the next tick.
-- Safe to re-run: CREATE OR REPLACE FUNCTION is applied to the existing body.

do $patch$
declare
  fn text := pg_get_functiondef('public.run_live_demo_tick()'::regprocedure);
  original text := fn;
begin
  fn := replace(fn, '  v_door text;', '  v_door text;' || E'\n  v_boost_active boolean;\n  v_manual_quarantine boolean;');

  fn := replace(fn, '    v_phase := mod(v_tick, 36);',
    '    v_phase := mod(v_tick, 36);' || E'\n\n    select exists (select 1 from public.shipment_actions a where a.shipment_id = r.id and a.action = ''BOOST_COOLING'' and a.created_at > now() - interval ''10 minutes'') into v_boost_active;\n    select exists (select 1 from public.shipment_actions q where q.shipment_id = r.id and q.action = ''QUARANTINE'' and not exists (select 1 from public.shipment_actions rel where rel.shipment_id = r.id and rel.action = ''RESUME'' and rel.created_at > q.created_at)) into v_manual_quarantine;');

  fn := replace(fn, '      v_driver_score := 94;', '      v_driver_score := greatest(60, least(99, 96 - greatest(0, v_speed - 52) * 0.65 - random() * 5));');
  fn := replace(fn, '      v_driver_score := 87;', '      v_driver_score := greatest(60, least(99, 91 - greatest(0, v_speed - 50) * 0.7 - random() * 7));');
  fn := replace(fn, '      v_driver_score := 76;', '      v_driver_score := greatest(55, least(90, 82 - greatest(0, v_speed - 42) * 0.8 - random() * 8));');
  fn := replace(fn, '      v_driver_score := 91;', '      v_driver_score := greatest(60, least(99, 94 - greatest(0, v_speed - 54) * 0.65 - random() * 6));');

  fn := replace(fn, '    v_risk :=',
    E'    if v_boost_active then\n      v_temp := greatest(2.2, v_temp - 0.35);\n    end if;\n\n    v_risk :=');

  fn := replace(fn, '    v_risk_score :=',
    E'    if v_manual_quarantine then\n      v_risk := ''critical'';\n    end if;\n\n    v_risk_score :=');

  fn := replace(fn,
    '    v_reefer := least(100, greatest(45, 60 + abs(v_temp - 4.5) * 6 + random() * 5));',
    '    v_reefer := least(100, greatest(45, 60 + abs(v_temp - 4.5) * 6 + random() * 5, case when v_boost_active then 90 else 0 end));');

  if fn = original
     or position('v_boost_active boolean' in fn) = 0
     or position('if v_manual_quarantine then' in fn) = 0
     or position('case when v_boost_active then 90' in fn) = 0 then
    raise exception 'Patch validation failed; function not replaced';
  end if;

  execute fn;
end
$patch$;
