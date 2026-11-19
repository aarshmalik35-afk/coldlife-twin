-- A.R.C.T.I.C. / ColdLife Twin
-- Backend reliability pass: index foreign keys flagged by Supabase,
-- remove duplicate permissive demo-read policies, and enable Realtime
-- publication for the operational tables consumed by the dashboard.
-- Safe to re-run.

begin;

create index if not exists idx_alerts_vehicle_created
  on public.alerts (vehicle_id, created_at desc);
create index if not exists idx_driver_behavior_vehicle_recorded
  on public.driver_behavior_snapshots (vehicle_id, recorded_at desc);
create index if not exists idx_scenarios_shipment
  on public.scenarios (shipment_id);
create index if not exists idx_shipments_destination_storage
  on public.shipments (destination_storage_id);
create index if not exists idx_shipments_origin_storage
  on public.shipments (origin_storage_id);
create index if not exists idx_simulation_ticks_scenario_created
  on public.simulation_ticks (scenario_id, created_at desc);
create index if not exists idx_telemetry_vehicle_recorded
  on public.telemetry (vehicle_id, recorded_at desc);

-- Keep the canonical "Public demo read" policy and remove duplicate policies
-- which granted the exact same SELECT access.
drop policy if exists "public read custody events" on public.custody_events;
drop policy if exists "public read driver behavior" on public.driver_behavior_snapshots;
drop policy if exists "public read vehicle health" on public.vehicle_health_snapshots;

-- Enable database change feeds for the live dashboard. This is idempotent and
-- leaves existing publication members untouched.
do $$
declare
  t text;
begin
  foreach t in array array[
    'shipments',
    'vehicles',
    'telemetry',
    'alerts',
    'risk_history',
    'custody_events',
    'demo_live_state'
  ] loop
    if to_regclass(format('public.%I', t)) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

commit;
