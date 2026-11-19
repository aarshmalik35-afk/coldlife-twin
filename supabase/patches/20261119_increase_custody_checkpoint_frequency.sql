-- Increase simulated custody checkpoint frequency.
-- run_live_demo_tick is scheduled once per minute, so this records one
-- verified telemetry checkpoint per shipment per simulation minute.
do $patch$
declare
  fn text := pg_get_functiondef('public.run_live_demo_tick()'::regprocedure);
  old_fragment text := '    if mod(v_tick, 18) = 0 then';
begin
  if position(old_fragment in fn) = 0 then
    raise exception 'Expected custody checkpoint cadence not found; no change applied';
  end if;
  fn := replace(fn, old_fragment, '    if mod(v_tick, 1) = 0 then');
  execute fn;
end
$patch$;
