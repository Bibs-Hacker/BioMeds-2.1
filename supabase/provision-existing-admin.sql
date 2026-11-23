-- Database-owner recovery / existing-account authorization ONLY.
-- Verify the target identity out of band. No public provisioning route exists.
begin;
do $$
declare target uuid := 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID'; desired_role text := 'data_officer';
begin
 if not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) then raise exception 'Confirmed account required';end if;
 if exists(select 1 from public.administrator_roles where user_id=target and is_developer) then raise exception 'Developer protected';end if;
 insert into public.administrator_roles(user_id,role) values(target,desired_role) on conflict(user_id) do update set role=excluded.role;
 insert into public.audit_logs(action,updated_value,reason) values('administrator_provisioned',jsonb_build_object('user_id',target,'role',desired_role),'Trusted database-owner provisioning');
end $$;
commit;
