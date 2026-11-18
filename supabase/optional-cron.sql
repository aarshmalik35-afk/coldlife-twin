
-- ColdLife Twin: server-side simulation scheduler
-- Run this once in Supabase SQL Editor.

create extension if not exists pg_cron with schema pg_catalog;

-- Remove any previous ColdLife scheduler.
do $$
declare
  job record;
begin
  for job in
    select jobid
    from cron.job
    where jobname = 'coldlife-live-demo'
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

-- Run the simulation once every minute, independent of browser sessions.
select cron.schedule(
  'coldlife-live-demo',
  '* * * * *',
  $$select public.run_live_demo_tick();$$
);

-- Verify the scheduler.
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'coldlife-live-demo';
