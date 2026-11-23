-- Run ONLY in Supabase SQL Editor as database owner after privately inviting
-- and confirming the genuine Dev Brian account through Authentication.
-- Replace the one UUID below. No passwords or browser/service keys belong here.
begin;
do $$
declare developer_uid uuid := 'REPLACE_WITH_VERIFIED_AUTH_USER_UUID';
begin
 if not exists(select 1 from auth.users where id=developer_uid and email_confirmed_at is not null) then
  raise exception 'Developer must be a confirmed, trusted authentication user';
 end if;
 if exists(select 1 from public.administrator_roles where is_developer) then
  raise exception 'A developer identity has already been provisioned';
 end if;
 update public.profiles set display_name='Dev Brian' where id=developer_uid;
 insert into public.administrator_roles(user_id,role,is_developer) values(developer_uid,'super_admin',true)
 on conflict(user_id) do update set role='super_admin',is_developer=true;
 insert into public.audit_logs(actor_id,action,updated_value,reason) values(developer_uid,'developer_provisioned',jsonb_build_object('role','super_admin','verified_developer',true),'Trusted database-owner provisioning');
end $$;
commit;
