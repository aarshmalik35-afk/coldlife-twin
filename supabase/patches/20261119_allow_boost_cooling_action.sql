-- Allow the BOOST_COOLING action in the shipment intervention ledger.
alter table public.shipment_actions
  drop constraint if exists shipment_actions_action_check;

alter table public.shipment_actions
  add constraint shipment_actions_action_check
  check (action = any (array[
    'QUARANTINE'::text,
    'PRIORITIZE'::text,
    'RESUME'::text,
    'MARK_DELIVERED'::text,
    'RESET_MONITORING'::text,
    'BOOST_COOLING'::text
  ]));
