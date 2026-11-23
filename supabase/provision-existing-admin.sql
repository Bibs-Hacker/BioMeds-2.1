-- Run only as the trusted Supabase database owner after verifying the target
-- UUID belongs to the intended, email-confirmed administrator.
-- The foundation migration must have been applied first.
begin;
do $$
declare
  target uuid := 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID';
  desired_role text := 'super_admin';
begin
  if not exists (
    select 1 from auth.users
    where id = target and email_confirmed_at is not null
  ) then
    raise exception 'A confirmed authentication account is required';
  end if;

  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'Profile is missing; apply the foundation migration first';
  end if;

  if exists (
    select 1 from public.administrator_roles
    where user_id = target and is_developer
  ) then
    raise exception 'The protected developer account cannot be changed';
  end if;

  insert into public.administrator_roles(user_id, role, is_developer)
  values (target, desired_role, false)
  on conflict (user_id) do update
    set role = excluded.role, is_developer = false;

  insert into public.audit_logs(actor_id, action, updated_value, reason)
  values (
    target,
    'administrator_provisioned',
    jsonb_build_object('user_id', target, 'role', desired_role),
    'Trusted database-owner provisioning'
  );
end $$;
commit;
