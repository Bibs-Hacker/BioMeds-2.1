begin;
create extension if not exists pgcrypto;

-- Bootstrap safely supports a project where the earlier setup created only a
-- temporary administrator_roles table. Existing Auth users receive profiles
-- before the administrator foreign key is normalized.
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
insert into public.profiles(id, display_name)
select id, coalesce(raw_user_meta_data->>'full_name', '')
from auth.users
on conflict (id) do nothing;

create table if not exists public.administrator_roles(
  user_id uuid primary key,
  role text not null,
  is_developer boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.administrator_roles add column if not exists role text;
alter table public.administrator_roles add column if not exists is_developer boolean not null default false;
alter table public.administrator_roles add column if not exists created_at timestamptz not null default now();

-- Replace any temporary role checks/FK with the canonical application schema.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.administrator_roles'::regclass
      and contype in ('c','f')
  loop
    execute format('alter table public.administrator_roles drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.administrator_roles
  alter column role set not null,
  add constraint administrator_roles_role_check
    check(role in ('super_admin','class_representative','assistant_representative','data_officer')),
  add constraint administrator_roles_developer_check
    check(not is_developer or role='super_admin'),
  add constraint administrator_roles_user_id_fkey
    foreign key(user_id) references public.profiles(id) on delete cascade;

-- The earlier setup used the label 'admin'. In this application the matching
-- full-administrator permission level is named 'super_admin'.
update public.administrator_roles set role='super_admin' where role='admin';
create unique index if not exists only_one_developer
  on public.administrator_roles(is_developer) where is_developer;
create table public.registration_settings(id boolean primary key default true check(id),registration_open boolean not null default true,academic_year text not null default '2026/2027' check(academic_year ~ '^[0-9]{4}/[0-9]{4}$'),expected_population integer check(expected_population>0),support_email text not null default '' check(support_email='' or support_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),class_contact text not null default '' check(length(class_contact)<=160),logo_path text,developer_bio text not null default 'Original System Developer, Platform Manager and Lead System Operator for the MedEng Y2S1 Class Portal.',developer_photo_path text,privacy_notice text not null default 'Your information is used for class registration, verification, membership and academic coordination. Authorized class administrators can access your record. Public verification displays your name, membership ID, course, academic designation and membership status only. Contact class leadership for data access, correction, retention and privacy enquiries.',updated_at timestamptz not null default now());
insert into public.registration_settings(id) values(true);
create table public.students(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.profiles(id),full_name text not null check(length(full_name) between 3 and 120),registration_number text not null unique check(registration_number ~ '^[A-Z0-9/._-]{3,50}$'),gender text not null check(gender in ('Male','Female','Other','Prefer not to say')),date_of_birth date check(date_of_birth<=current_date),photo_path text,admission_year integer not null check(admission_year between 2000 and extract(year from current_date)::integer+1),email text not null check(email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),phone text not null check(phone ~ '^\+?[0-9 ()-]{7,20}$'),county text not null check(length(county) between 2 and 80),town text not null check(length(town) between 2 and 120),emergency_name text check(length(emergency_name)<=120),emergency_relationship text check(length(emergency_relationship)<=80),emergency_phone text check(emergency_phone is null or emergency_phone ~ '^\+?[0-9 ()-]{7,20}$'),institution text not null default 'KMTC' check(institution='KMTC'),course text not null default 'Medical Engineering' check(course='Medical Engineering'),academic_level integer not null default 2 check(academic_level=2),semester integer not null default 1 check(semester=1),academic_year text not null,registration_status text not null default 'pending' check(registration_status in ('pending','approved','rejected')),membership_status text not null default 'inactive' check(membership_status in ('active','inactive','suspended','revoked')),membership_id text not null unique default ('ME-Y2S1-'||upper(encode(gen_random_bytes(8),'hex'))),consent_at timestamptz not null default now(),consent_notice text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(registration_status='approved' or membership_status<>'active'));
create index students_filters on public.students(registration_status,gender,county,admission_year);
create index students_created on public.students(created_at);
create table public.membership_cards(id uuid primary key default gen_random_uuid(),student_id uuid not null unique references public.students(id),verification_token text not null unique default encode(gen_random_bytes(32),'hex'),issued_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.membership_verifications(id uuid primary key default gen_random_uuid(),card_id uuid not null references public.membership_cards(id),verified_at timestamptz not null default now());
create index verifications_time on public.membership_verifications(verified_at);
create table public.correction_requests(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id),field_name text not null check(field_name in ('full_name','registration_number','gender','date_of_birth','admission_year','email','phone','county','town','emergency_name','emergency_relationship','emergency_phone')),previous_value text,requested_value text not null check(length(requested_value)<=160),reason text not null check(length(reason) between 5 and 1000),status text not null default 'pending' check(status in ('pending','approved','rejected')),reviewed_by uuid references public.profiles(id),review_note text,created_at timestamptz not null default now(),reviewed_at timestamptz);
create unique index one_pending_correction on public.correction_requests(student_id,field_name) where status='pending';
create table public.announcements(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 3 and 160),body text not null check(length(body) between 3 and 10000),category text not null check(category in ('General','Academic','Registration','Meetings','Important Notices')),is_public boolean not null default false,state text not null default 'draft' check(state in ('draft','published','archived')),publish_at timestamptz not null default now(),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),student_id uuid references public.students(id),action text not null,previous_value jsonb,updated_value jsonb,reason text not null,created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),message text not null,read_at timestamptz,created_at timestamptz not null default now());
create index notifications_owner on public.notifications(user_id,created_at);
create index corrections_status on public.correction_requests(status,created_at);
create index audit_time on public.audit_logs(created_at);
create function public.on_auth_user() returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));return new;end$$;
create trigger create_profile after insert on auth.users for each row execute function public.on_auth_user();
create function public.has_permission(permission text) returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$select exists(select 1 from public.administrator_roles where user_id=auth.uid() and (role='super_admin' or (role='class_representative' and permission in ('view','approve','announce','report')) or (role='assistant_representative' and permission in ('view','approve')) or (role='data_officer' and permission in ('view','correct','report'))));$$;
create function public.protect_developer() returns trigger language plpgsql set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin if old.is_developer then raise exception 'The developer identity is protected; use the documented break-glass database-owner procedure.';end if;return case when tg_op='DELETE' then old else new end;end$$;
create trigger protected_developer before update or delete on public.administrator_roles for each row execute function public.protect_developer();
create function public.log_action(action text,student_id uuid,old_data jsonb,new_data jsonb,reason text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin insert into public.audit_logs(actor_id,student_id,action,previous_value,updated_value,reason) values(auth.uid(),student_id,action,old_data,new_data,reason);end$$;
create function public.submit_registration(payload jsonb) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare sid uuid; settings public.registration_settings; verified_email text;begin
if auth.uid() is null then raise exception 'Sign in first';end if;
select email into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;if verified_email is null then raise exception 'Verify your email before registration';end if;
select * into settings from public.registration_settings where id=true for share;if not settings.registration_open then raise exception 'Registration is closed';end if;
if payload->>'declaration'<>'true' or payload->>'consent'<>'true' or not(payload ? 'consent') or not(payload ? 'declaration') then raise exception 'Accuracy declaration and consent are required';end if;
if nullif(payload->>'photo_path','') is not null and (split_part(payload->>'photo_path','/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='student-photos' and name=payload->>'photo_path')) then raise exception 'Invalid photo';end if;
insert into public.students(user_id,full_name,registration_number,gender,date_of_birth,photo_path,admission_year,email,phone,county,town,emergency_name,emergency_relationship,emergency_phone,academic_year,consent_notice) values(auth.uid(),trim(payload->>'full_name'),upper(trim(payload->>'registration_number')),payload->>'gender',nullif(payload->>'date_of_birth','')::date,nullif(payload->>'photo_path',''),(payload->>'admission_year')::integer,verified_email,trim(payload->>'phone'),trim(payload->>'county'),trim(payload->>'town'),nullif(payload->>'emergency_name',''),nullif(payload->>'emergency_relationship',''),nullif(payload->>'emergency_phone',''),settings.academic_year,settings.privacy_notice) returning id into sid;
perform public.log_action('registration_submitted',sid,null,jsonb_build_object('status','pending'),'Student submitted with consent');return sid;
exception when unique_violation then raise exception 'An account or registration number is already registered';end$$;
create function public.decide_registration(student_id uuid,decision text,reason text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare s public.students;begin
if not public.has_permission('approve') then raise exception 'Not authorized';end if;if decision not in ('approved','rejected') or length(trim(reason))<5 then raise exception 'A decision and reason are required';end if;
select * into s from public.students where id=student_id for update;if not found then raise exception 'Student not found';end if;
update public.students set registration_status=decision,membership_status=case when decision='approved' then 'active' else 'revoked' end,updated_at=now() where id=student_id;
if decision='approved' then insert into public.membership_cards(student_id) values(student_id) on conflict on constraint membership_cards_student_id_key do update set verification_token=encode(gen_random_bytes(32),'hex'),updated_at=now();end if;
perform public.log_action('registration_'||decision,student_id,jsonb_build_object('registration_status',s.registration_status,'membership_status',s.membership_status),jsonb_build_object('registration_status',decision,'membership_status',case when decision='approved' then 'active' else 'revoked' end),reason);
insert into public.notifications(user_id,message) values(s.user_id,'Your registration was '||decision||'. '||reason);end$$;
create function public.set_membership_status(student_id uuid,new_status text,reason text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare s public.students;begin
if not public.has_permission('approve') then raise exception 'Not authorized';end if;if new_status not in ('active','inactive','suspended','revoked') or length(trim(reason))<5 then raise exception 'Invalid status or reason';end if;
select * into s from public.students where id=student_id for update;if not found or s.registration_status<>'approved' then raise exception 'Only approved registrations have manageable memberships';end if;
update public.students set membership_status=new_status,updated_at=now() where id=student_id;
if new_status='active' and s.membership_status='revoked' then update public.membership_cards set verification_token=encode(gen_random_bytes(32),'hex'),updated_at=now() where membership_cards.student_id=set_membership_status.student_id;end if;
perform public.log_action('membership_status',student_id,to_jsonb(s.membership_status),to_jsonb(new_status),reason);insert into public.notifications(user_id,message) values(s.user_id,'Membership status changed to '||new_status||'. '||reason);end$$;
create function public.request_correction(student_id uuid,field_name text,requested_value text,reason text) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare s public.students;rid uuid;begin
select * into s from public.students where id=student_id and user_id=auth.uid();if not found then raise exception 'Student record not found';end if;
insert into public.correction_requests(student_id,field_name,previous_value,requested_value,reason) values(student_id,field_name,to_jsonb(s)->>field_name,trim(requested_value),trim(reason)) returning id into rid;return rid;end$$;
create function public.review_correction(request_id uuid,approve boolean,review_note text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare r public.correction_requests;s public.students;v text;cast_type text;begin
if not public.has_permission('correct') then raise exception 'Not authorized';end if;if length(trim(review_note))<5 then raise exception 'Review reason must have at least five characters';end if;
select * into r from public.correction_requests where id=request_id for update;if not found or r.status<>'pending' then raise exception 'Request is not pending';end if;
select * into s from public.students where id=r.student_id for update;
if approve then
if (to_jsonb(s)->>r.field_name) is distinct from r.previous_value then raise exception 'Record changed since this request; reject it and ask for a fresh request';end if;
v:=r.requested_value;if r.field_name='registration_number' then v:=upper(v);end if;
cast_type:=case when r.field_name='admission_year' then 'integer' when r.field_name='date_of_birth' then 'date' else 'text' end;
execute format('update public.students set %I=nullif($1,'''')::%s,updated_at=now() where id=$2',r.field_name,cast_type) using v,r.student_id;
perform public.log_action('record_correction',r.student_id,jsonb_build_object(r.field_name,r.previous_value),jsonb_build_object(r.field_name,v),review_note||' | Student reason: '||r.reason);
end if;
update public.correction_requests set status=case when approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),review_note=review_correction.review_note,reviewed_at=now() where id=request_id;
perform public.log_action('correction_review',r.student_id,jsonb_build_object('status',r.status),jsonb_build_object('status',case when approve then 'approved' else 'rejected' end),review_note);
insert into public.notifications(user_id,message) values(s.user_id,'Correction request for '||replace(r.field_name,'_',' ')||' was '||case when approve then 'approved' else 'rejected' end||'. '||review_note);end$$;
create function public.verify_membership(token text) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare c public.membership_cards;s public.students;result text;begin
if token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('result','Invalid Verification Code');end if;
select * into c from public.membership_cards where verification_token=token;if not found then return jsonb_build_object('result','Invalid Verification Code');end if;
select * into s from public.students where id=c.student_id;
result:=case when s.membership_status='revoked' or s.registration_status='rejected' then 'Revoked Membership' when s.membership_status='active' and s.registration_status='approved' then 'Valid Membership' else 'Inactive Membership' end;
-- At most one anonymous verification timestamp per card/minute.
perform pg_advisory_xact_lock(hashtext(c.id::text));
if not exists(select 1 from public.membership_verifications where card_id=c.id and verified_at>now()-interval '1 minute') then insert into public.membership_verifications(card_id) values(c.id);end if;
return jsonb_build_object('result',result,'student_name',s.full_name,'membership_id',s.membership_id,'course',s.course,'academic_designation','Year 2 Semester 1','membership_status',s.membership_status,'verification_date',now());end$$;
create function public.developer_profile() returns jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$select jsonb_build_object('display_name','Dev Brian','verified',true,'title','System Developer & Manager','position','Lead System Operator','role','Super Administrator','created_at',p.created_at,'biography',s.developer_bio,'photo_path',s.developer_photo_path) from public.profiles p join public.administrator_roles r on r.user_id=p.id and r.is_developer cross join public.registration_settings s where s.id=true;$$;
create function public.set_administrator(target_user uuid,new_role text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare old_role text;begin
if not public.has_permission('roles') then raise exception 'Not authorized';end if;
if exists(select 1 from public.administrator_roles where user_id=target_user and is_developer) then raise exception 'Developer account is protected';end if;
if target_user=auth.uid() then raise exception 'Do not alter your own administrator role';end if;
select role into old_role from public.administrator_roles where user_id=target_user;
if new_role is null then delete from public.administrator_roles where user_id=target_user;else insert into public.administrator_roles(user_id,role) values(target_user,new_role) on conflict(user_id) do update set role=excluded.role;end if;
perform public.log_action('administrator_role',null,to_jsonb(old_role),jsonb_build_object('target_user',target_user,'role',new_role),'Super administrator role management');end$$;
create function public.administrator_directory() returns table(user_id uuid,display_name text,role text,is_developer boolean,created_at timestamptz) language sql stable security definer set search_path=public,extensions,pg_temp as $$select r.user_id,case when r.is_developer then 'Dev Brian' else p.display_name end,r.role,r.is_developer,r.created_at from public.administrator_roles r join public.profiles p on p.id=r.user_id where public.has_permission('view');$$;
create function public.save_announcement(payload jsonb,announcement_id uuid default null) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare aid uuid;old_data jsonb;begin
if not public.has_permission('announce') then raise exception 'Not authorized';end if;
if announcement_id is null then insert into public.announcements(title,body,category,is_public,state,publish_at,created_by) values(trim(payload->>'title'),trim(payload->>'body'),payload->>'category',(payload->>'is_public')::boolean,payload->>'state',(payload->>'publish_at')::timestamptz,auth.uid()) returning id into aid;
else select to_jsonb(a) into old_data from public.announcements a where id=announcement_id for update; if old_data is null then raise exception 'Announcement not found';end if;
update public.announcements set title=trim(payload->>'title'),body=trim(payload->>'body'),category=payload->>'category',is_public=(payload->>'is_public')::boolean,state=payload->>'state',publish_at=(payload->>'publish_at')::timestamptz,updated_at=now() where id=announcement_id;aid:=announcement_id;end if;
perform public.log_action('announcement_saved',null,old_data,payload,'Announcement management');return aid;end$$;
create function public.delete_announcement(announcement_id uuid) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare old_data jsonb;begin
if not public.has_permission('announce') then raise exception 'Not authorized';end if;select to_jsonb(a) into old_data from public.announcements a where id=announcement_id;delete from public.announcements where id=announcement_id;perform public.log_action('announcement_deleted',null,old_data,null,'Announcement removed');end$$;
create function public.update_settings(payload jsonb) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare old_data jsonb;begin
if not public.has_permission('settings') then raise exception 'Not authorized';end if;select to_jsonb(s) into old_data from public.registration_settings s where id=true for update;
update public.registration_settings set registration_open=(payload->>'registration_open')::boolean,academic_year=payload->>'academic_year',expected_population=nullif(payload->>'expected_population','')::integer,support_email=coalesce(payload->>'support_email',''),class_contact=coalesce(payload->>'class_contact',''),logo_path=nullif(payload->>'logo_path',''),developer_bio=coalesce(payload->>'developer_bio',developer_bio),developer_photo_path=nullif(payload->>'developer_photo_path',''),privacy_notice=payload->>'privacy_notice',updated_at=now() where id=true;
perform public.log_action('settings_updated',null,old_data,payload,'System settings management');end$$;
create function public.mark_notifications_read() returns void language sql security definer set search_path=public,extensions,pg_temp as $$update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null;$$;
create function public.report_register(page_offset integer default 0) returns setof public.students language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin
if not public.has_permission('report') then raise exception 'Not authorized';end if;
if page_offset<0 then raise exception 'Invalid report page';end if;
return query select * from public.students order by created_at desc,id offset page_offset limit 500;
end$$;
grant execute on function public.report_register(integer) to authenticated;
-- No browser may insert, update or delete official records. RPCs are the only write path.
alter table public.profiles enable row level security;
alter table public.administrator_roles enable row level security;
alter table public.registration_settings enable row level security;
alter table public.students enable row level security;
alter table public.membership_cards enable row level security;
alter table public.membership_verifications enable row level security;
alter table public.correction_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.has_permission('roles'));
create policy roles_read on public.administrator_roles for select to authenticated using(user_id=auth.uid() or public.has_permission('roles'));
create policy settings_read on public.registration_settings for select to anon,authenticated using(true);
create policy student_read on public.students for select to authenticated using(user_id=auth.uid() or public.has_permission('view'));
create policy cards_read on public.membership_cards for select to authenticated using(public.has_permission('view') or exists(select 1 from public.students s where s.id=student_id and s.user_id=auth.uid() and s.registration_status='approved' and s.membership_status='active'));
create policy corrections_read on public.correction_requests for select to authenticated using(public.has_permission('correct') or exists(select 1 from public.students s where s.id=student_id and s.user_id=auth.uid()));
create policy announcements_read on public.announcements for select to anon,authenticated using(public.has_permission('announce') or (state='published' and publish_at<=now() and (is_public or auth.uid() is not null)));
create policy audit_read on public.audit_logs for select to authenticated using(public.has_permission('audit'));
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
revoke all on all tables in schema public from anon,authenticated;
grant select on public.registration_settings,public.announcements to anon;
grant select on public.profiles,public.administrator_roles,public.registration_settings,public.students,public.membership_cards,public.correction_requests,public.announcements,public.audit_logs,public.notifications to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.has_permission(text),public.verify_membership(text),public.developer_profile() to anon,authenticated;
grant execute on function public.report_register(integer) to authenticated;
grant execute on function public.submit_registration(jsonb),public.decide_registration(uuid,text,text),public.set_membership_status(uuid,text,text),public.request_correction(uuid,text,text,text),public.review_correction(uuid,boolean,text),public.set_administrator(uuid,text),public.administrator_directory(),public.save_announcement(jsonb,uuid),public.delete_announcement(uuid),public.update_settings(jsonb),public.mark_notifications_read() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-photos','student-photos',false,5242880,array['image/jpeg','image/png','image/webp']),('branding','branding',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy photo_read on storage.objects for select to authenticated using(bucket_id='student-photos' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_permission('view')));
create policy photo_insert on storage.objects for insert to authenticated with check(bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.students where user_id=auth.uid()));
create policy unused_photo_delete on storage.objects for delete to authenticated using(bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.students where photo_path=name));
create policy branding_write on storage.objects for insert to authenticated with check(bucket_id='branding' and public.has_permission('settings'));
-- Realtime transports rows through their SELECT policies; no private public broadcasts.
alter publication supabase_realtime add table public.students,public.correction_requests,public.announcements,public.notifications,public.registration_settings,public.membership_cards,public.audit_logs;
commit;
