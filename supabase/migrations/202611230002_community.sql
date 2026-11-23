begin;
alter table public.profiles add column account_photo_path text,add column activated_at timestamptz,add column privacy_version integer,add column terms_version integer;
create table public.legal_documents(id text primary key check(id in ('privacy','terms')),version integer not null default 1 check(version>0),title text not null,body text not null check(length(body) between 100 and 20000),updated_at timestamptz not null default now());
insert into public.legal_documents(id,title,body) values
('privacy','Privacy Policy',E'1. Purpose and controller\nThis class-managed platform collects personal information to maintain the Medical Engineering Year 2 Semester 1 register, coordinate academic activities and verify class membership. Class leadership must publish its approved support contact and responsible data controller before opening registration.\n\n2. Information collected\nWe collect your name, registration number, gender, academic details, verified email, phone, county, town and a required recognition photo. Date of birth and emergency contact details are optional. Provide an emergency contact only after informing them. We also record policy acceptance, membership decisions, corrections, account-closure requests and feedback.\n\n3. Recognition photographs\nA photo is required to activate your portal account and register. During account creation a selected photo is temporarily staged on your device, expires after 48 hours and is uploaded privately after email verification. If you verify on another device, choose your photo again. Photos are not published on public directory pages. Never upload another person’s image without permission.\n\n4. Access and sharing\nAuthorized class administrators can access relevant records. Other students cannot browse your private profile. Public QR verification reveals only name, membership ID, course, academic designation, membership status and verification date. Private emails, phones, residential and emergency information are not shown. Published lecturer contact information must be approved institutional contact information. Feedback is private to you and authorized reviewers.\n\n5. Security\nAuthentication, database row-level policies, private image storage and backend permission checks protect your information. Submitted student records are locked; corrections require approval and an audit trail. Do not share your password or downloaded confidential registers.\n\n6. Retention and deletion\nClass leadership must adopt and communicate an approved retention schedule. You can request access, correction or account deletion through the portal/support. Account deletion requires current-password verification, exact confirmation and administrator review. Approved deletion removes the portal account and linked personal data while retaining minimal pseudonymous accountability entries. Previously downloaded copies, externally managed backups or data retained under applicable obligations are not remotely erased by this action. Support must explain any lawful exception and handle backup expiry under the approved retention schedule.\n\n7. Rights and lawful processing\nUse the approved class support contact for data access, corrections, consent withdrawal, deletion and complaints. Leadership must assess its obligations under applicable Kenyan data protection law, including processor arrangements and any cross-border hosting safeguards. You may also contact the relevant data protection authority. This policy is a configurable operational draft, not a legal compliance certification.\n\n8. Your choices\nReview this policy and the Terms and Conditions before accepting. Account activation and registration require recorded acceptance of the current versions. You can revisit both documents from navigation/footer links. Theme and font preferences are stored only in your browser. Declining means you cannot activate registration; contact leadership to discuss appropriate alternatives.\n\n9. Policy updates\nMaterial updates receive a new version and are available here. Reacceptance is required before new registration or account activation. Contact class leadership for questions.'),
('terms','Terms and Conditions',E'1. Platform purpose\nThe MedEng Y2S1 Class Portal is a class coordination and membership service for KMTC Medical Engineering Year 2 Semester 1. It is not a substitute for official college admission records or college systems.\n\n2. Eligibility and truthful information\nCreate only one account for yourself, use your own email and recognition photo, and submit accurate registration information. Do not impersonate Dev Brian, lecturers, students or administrators. Email verification and policy acceptance are required for account activation.\n\n3. Record integrity\nOfficial student information is locked after submission. Submit a correction request if details are incorrect. Only authorized administrators may approve changes, registration or membership status. Duplicate records, misleading information and attempts to bypass controls may result in rejection or suspension.\n\n4. Membership cards\nA digital card represents class membership only. It is NOT an official KMTC student identification card. Card status is confirmed through live QR verification. Revoked/inactive memberships cannot be represented as valid. Never alter a card or verification result.\n\n5. Academic information\nLecturer/unit information and announcements are provided by authorized class leadership. Verify changes and official academic requirements through approved college channels. The portal does not guarantee schedules will never change.\n\n6. Conduct and feedback\nUse respectful language. Do not submit private medical information, threats, harassment, credentials or another person’s confidential data in feedback. Ratings and comments are private to authorized reviewers and may receive an administrator response.\n\n7. Account security\nProtect your password and use secure devices. Log out on shared gadgets. Report suspected misuse through approved support. Theme and font settings do not change your privileges. You may sign out of this device or all active refresh sessions from account settings; already issued access tokens expire according to the authentication service.\n\n8. Account closure\nA deletion request requires your current password, the exact phrase DELETE MY ACCOUNT, acknowledgment of the consequences and administrator review. It can be cancelled while pending. An authorized administrator cannot approve their own deletion request. Dev Brian’s protected developer account cannot be deleted through this portal. Once approved deletion is completed, access, linked photos and live membership verification cease. This does not remove previously downloaded copies or automatically erase third-party backups.\n\n9. Availability and ownership\nThe platform depends on hosting, authentication and network services and may be temporarily unavailable. Developed and Managed by Dev Brian, System Developer, Platform Manager and Lead System Operator. Official KMTC branding is used only where authorized. Do not misuse class or college marks.\n\n10. Disputes and changes\nContact approved class support about access, inaccuracies or disputes. Leadership must ensure these terms and policies are reviewed for applicable Kenyan requirements before launch. Material amendments are versioned and available in the portal.\n\n11. Acceptance\nScroll through both policies, read the content and explicitly agree. Your acceptance of the current versions is recorded during activation/registration. The scroll gate is a user-interface aid, not proof that a person understood legal content.');
create table public.lecturers(id uuid primary key default gen_random_uuid(),full_name text not null check(length(full_name) between 3 and 120),professional_title text not null default 'Lecturer' check(length(professional_title)<=120),institutional_email text check(institutional_email is null or institutional_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),office text not null default '' check(length(office)<=160),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.teaching_units(id uuid primary key default gen_random_uuid(),code text not null unique check(length(code) between 2 and 30),name text not null check(length(name) between 3 and 160),academic_year text not null check(academic_year ~ '^[0-9]{4}/[0-9]{4}$'),semester integer not null default 1 check(semester=1),description text not null default '' check(length(description)<=2000),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.lecturer_unit_assignments(lecturer_id uuid not null references public.lecturers(id) on delete cascade,unit_id uuid not null references public.teaching_units(id) on delete cascade,created_at timestamptz not null default now(),primary key(lecturer_id,unit_id));
create table public.feedback(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),rating integer not null check(rating between 1 and 5),category text not null check(category in ('General','Interface','Bug report','Academic','Suggestion')),message text not null check(length(message) between 5 and 2000),status text not null default 'open' check(status in ('open','reviewed','resolved')),response text check(length(response)<=2000),responded_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index feedback_user_time on public.feedback(user_id,created_at);
-- Intentionally no Auth FK: completed requests must survive removal of the Auth user.
create table public.account_deletion_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null,reason text not null check(length(reason) between 5 and 1000),status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','processing','completed')),reviewed_by uuid,review_note text,created_at timestamptz not null default now(),reviewed_at timestamptz,completed_at timestamptz);
create unique index one_active_closure on public.account_deletion_requests(user_id) where status in ('pending','approved','processing');
create or replace function public.has_permission(permission text) returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$select exists(select 1 from public.administrator_roles where user_id=auth.uid() and not exists(select 1 from public.account_deletion_requests where user_id=auth.uid() and status in ('approved','processing')) and (role='super_admin' or (role='class_representative' and permission in ('view','approve','announce','report','academic','feedback')) or (role='assistant_representative' and permission in ('view','approve')) or (role='data_officer' and permission in ('view','correct','report'))));$$;
create function public.activate_profile(photo_path text,privacy_ver integer,terms_ver integer,accepted boolean) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();begin
perform 1 from public.profiles where id=uid for update;
if not found or exists(select 1 from public.account_deletion_requests where user_id=uid and status in ('approved','processing')) then raise exception 'Account is closing or unavailable';end if;
if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Verified email required';end if;
if exists(select 1 from public.students where user_id=uid and students.photo_path is not null and students.photo_path is distinct from activate_profile.photo_path) then raise exception 'Your submitted recognition photo is locked';end if;
if accepted is distinct from true or privacy_ver<>(select version from public.legal_documents where id='privacy') or terms_ver<>(select version from public.legal_documents where id='terms') or privacy_ver is null or terms_ver is null then raise exception 'Accept the current Privacy Policy and Terms and Conditions';end if;
if photo_path is null or split_part(photo_path,'/',1)<>uid::text or not exists(select 1 from storage.objects where bucket_id='student-photos' and name=photo_path) then raise exception 'Upload your own recognition photograph';end if;
update public.students set photo_path=activate_profile.photo_path,updated_at=now() where user_id=uid and students.photo_path is null;
update public.profiles set account_photo_path=photo_path,activated_at=now(),privacy_version=privacy_ver,terms_version=terms_ver where id=uid;
perform public.log_action('account_activated',null,null,jsonb_build_object('privacy_version',privacy_ver,'terms_version',terms_ver),'Recognition photo and policy acceptance verified');end$$;
alter function public.submit_registration(jsonb) rename to submit_registration_legacy;
revoke execute on function public.submit_registration_legacy(jsonb) from public,anon,authenticated;
create function public.submit_registration(payload jsonb) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare p public.profiles;v jsonb;begin
select * into p from public.profiles where id=auth.uid() for update;
if exists(select 1 from public.account_deletion_requests where user_id=auth.uid() and status in ('approved','processing')) then raise exception 'Account is closing';end if;
if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verify your email before registration';end if;
if p.activated_at is null or p.account_photo_path is null then raise exception 'Activate your account with a recognition photograph and policy acceptance first';end if;
if p.privacy_version<>(select version from public.legal_documents where id='privacy') or p.terms_version<>(select version from public.legal_documents where id='terms') then raise exception 'Review and accept the updated policies before registering';end if;
v:=payload||jsonb_build_object('photo_path',coalesce(nullif(payload->>'photo_path',''),p.account_photo_path));
return public.submit_registration_legacy(v);end$$;
create function public.save_lecturer(payload jsonb,lecturer_id uuid default null) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare lid uuid;old_value jsonb;begin
if not public.has_permission('academic') then raise exception 'Not authorized';end if;
if lecturer_id is null then insert into public.lecturers(full_name,professional_title,institutional_email,office,active) values(trim(payload->>'full_name'),trim(payload->>'professional_title'),nullif(payload->>'institutional_email',''),trim(payload->>'office'),(payload->>'active')::boolean) returning id into lid;
else select to_jsonb(l) into old_value from public.lecturers l where id=lecturer_id for update;if old_value is null then raise exception 'Lecturer not found';end if;update public.lecturers set full_name=trim(payload->>'full_name'),professional_title=trim(payload->>'professional_title'),institutional_email=nullif(payload->>'institutional_email',''),office=trim(payload->>'office'),active=(payload->>'active')::boolean,updated_at=now() where id=lecturer_id;lid:=lecturer_id;end if;
perform public.log_action('lecturer_saved',null,old_value,payload,'Academic directory management');return lid;end$$;
create function public.save_unit(payload jsonb,unit_id uuid default null) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare tid uuid;old_value jsonb;begin
if not public.has_permission('academic') then raise exception 'Not authorized';end if;
if unit_id is null then insert into public.teaching_units(code,name,academic_year,description) values(upper(trim(payload->>'code')),trim(payload->>'name'),payload->>'academic_year',trim(payload->>'description')) returning id into tid;
else select to_jsonb(t) into old_value from public.teaching_units t where id=unit_id for update;if old_value is null then raise exception 'Unit not found';end if;update public.teaching_units set code=upper(trim(payload->>'code')),name=trim(payload->>'name'),academic_year=payload->>'academic_year',description=trim(payload->>'description'),updated_at=now() where id=unit_id;tid:=unit_id;end if;
perform public.log_action('unit_saved',null,old_value,payload,'Teaching unit management');return tid;end$$;
create function public.assign_unit(lecturer_id uuid,unit_id uuid,assigned boolean) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin if not public.has_permission('academic') then raise exception 'Not authorized';end if;
if assigned then insert into public.lecturer_unit_assignments(lecturer_id,unit_id) values(lecturer_id,unit_id) on conflict do nothing;
else delete from public.lecturer_unit_assignments a where a.lecturer_id=lecturer_id and a.unit_id=unit_id;end if;
perform public.log_action('unit_assignment',null,null,jsonb_build_object('lecturer_id',lecturer_id,'unit_id',unit_id,'assigned',assigned),'Lecturer unit assignment');end$$;
create function public.delete_academic_record(kind text,record_id uuid) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin
if not public.has_permission('academic') then raise exception 'Not authorized';end if;
if kind='lecturer' then delete from public.lecturers where id=record_id;elsif kind='unit' then delete from public.teaching_units where id=record_id;else raise exception 'Invalid academic record';end if;
perform public.log_action('academic_record_deleted',null,null,jsonb_build_object('kind',kind,'record_id',record_id),'Confirmed removal');end$$;
create function public.send_feedback(rating integer,category text,message text) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare fid uuid;begin
perform 1 from public.profiles where id=auth.uid() for share;
if exists(select 1 from public.account_deletion_requests where user_id=auth.uid() and status in ('approved','processing')) then raise exception 'Account is closing';end if;
if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and activated_at is not null) then raise exception 'Activate your account first';end if;
perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
if (select count(*) from public.feedback where user_id=auth.uid() and created_at>now()-interval '24 hours')>=5 then raise exception 'Up to five feedback submissions per day are allowed';end if;
insert into public.feedback(user_id,rating,category,message) values(auth.uid(),rating,category,trim(message)) returning id into fid;return fid;end$$;
create function public.respond_feedback(feedback_id uuid,response text,new_status text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare uid uuid;begin
if not public.has_permission('feedback') then raise exception 'Not authorized';end if;
if response is null or new_status is null or length(trim(response))<3 or new_status not in ('reviewed','resolved') then raise exception 'Enter a response and review status';end if;
update public.feedback set response=trim(response),status=new_status,responded_by=auth.uid(),updated_at=now() where id=feedback_id returning user_id into uid;
if uid is null then raise exception 'Feedback not found';end if;
insert into public.notifications(user_id,message) values(uid,'Your feedback received a response: '||trim(response));
perform public.log_action('feedback_reviewed',null,null,jsonb_build_object('feedback_id',feedback_id,'status',new_status),'Feedback review');end$$;
create function public.save_legal_document(document_id text,body text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
begin if not public.has_permission('settings') then raise exception 'Not authorized';end if;
update public.legal_documents set body=save_legal_document.body,version=version+1,updated_at=now() where id=document_id;
if not found then raise exception 'Policy not found';end if;
perform public.log_action('legal_document_updated',null,null,jsonb_build_object('document',document_id),'Versioned policy publication');end$$;
-- Only the password-checking Edge Function can create a deletion request.
create function public.create_deletion_request(target_user uuid,reason text) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare rid uuid;begin
perform 1 from public.profiles where id=target_user for update;
if not exists(select 1 from public.profiles where id=target_user) then raise exception 'Account not found';end if;
if exists(select 1 from public.administrator_roles where user_id=target_user and is_developer) then raise exception 'Developer account is protected';end if;
if (select count(*) from public.account_deletion_requests where user_id=target_user and created_at>now()-interval '24 hours')>=3 then raise exception 'Maximum three deletion requests per day';end if;
insert into public.account_deletion_requests(user_id,reason) values(target_user,trim(reason)) returning id into rid;
insert into public.notifications(user_id,message) values(target_user,'Your account deletion request has been received. You may cancel it while it is pending.');return rid;end$$;
create function public.cancel_deletion_request(request_id uuid) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin
update public.account_deletion_requests set status='cancelled' where id=request_id and user_id=auth.uid() and status='pending';if not found then raise exception 'Only your pending request can be cancelled';end if;end$$;
create function public.review_deletion_request(request_id uuid,approve boolean,review_note text) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare r public.account_deletion_requests;begin
if not public.has_permission('settings') then raise exception 'Not authorized';end if;
select * into r from public.account_deletion_requests where id=request_id for update;
if not found or r.status<>'pending' then raise exception 'Request is not pending';end if;
if r.user_id=auth.uid() then raise exception 'You cannot review your own deletion';end if;
if exists(select 1 from public.administrator_roles where user_id=r.user_id and is_developer) then raise exception 'Developer account is protected';end if;
if approve is null or review_note is null or length(trim(review_note))<5 or length(review_note)>1000 then raise exception 'Review reason must have at least five characters';end if;
update public.account_deletion_requests set status=case when approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now(),review_note=review_deletion_request.review_note where id=request_id;
perform public.log_action('deletion_request_reviewed',null,null,jsonb_build_object('request_id',request_id,'approved',approve),review_note);
insert into public.notifications(user_id,message) values(r.user_id,'Account deletion request '||case when approve then 'approved; processing will follow.' else 'rejected: '||review_note end);end$$;
-- Atomic portal-data removal. Auth and Storage gateways are handled separately
-- by the Edge Function. Processing state permits safe operational retries.
create function public.prepare_account_deletion(request_id uuid,operator_id uuid) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
#variable_conflict use_variable
declare r public.account_deletion_requests;sid uuid;begin
if not exists(select 1 from public.administrator_roles where user_id=operator_id and role='super_admin') then raise exception 'Not authorized';end if;
perform 1 from public.profiles where id=(select user_id from public.account_deletion_requests where id=request_id) for update;
select * into r from public.account_deletion_requests where id=request_id for update;
if not found or r.status not in ('approved','processing') or r.reviewed_by<>operator_id or r.user_id=operator_id then raise exception 'Approved request and original reviewer required';end if;
if exists(select 1 from public.administrator_roles where user_id=r.user_id and is_developer) then raise exception 'Developer account is protected';end if;
select id into sid from public.students where user_id=r.user_id;
update public.account_deletion_requests set status='processing' where id=request_id;
-- Remove PII snapshots/reasons associated with the erased account, retain
-- minimal action/date/actor linkage for authorized accountability.
update public.audit_logs set student_id=null,previous_value=null,updated_value=null,reason='Personal data removed following approved account closure' where student_id=sid or actor_id=r.user_id;
update public.audit_logs set actor_id=null where actor_id=r.user_id;
delete from public.membership_verifications where card_id in(select id from public.membership_cards where student_id=sid);
delete from public.membership_cards where student_id=sid;
delete from public.correction_requests where student_id=sid;
delete from public.students where id=sid;
update public.feedback set responded_by=null where responded_by=r.user_id;
delete from public.feedback where user_id=r.user_id;
delete from public.notifications where user_id=r.user_id;
update public.announcements set created_by=operator_id where created_by=r.user_id;
update public.correction_requests set reviewed_by=null where reviewed_by=r.user_id;
delete from public.administrator_roles where user_id=r.user_id;
update public.profiles set display_name='',account_photo_path=null,activated_at=null,privacy_version=null,terms_version=null where id=r.user_id;
return r.user_id;end$$;
create function public.complete_account_deletion(request_id uuid,operator_id uuid) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin
if not exists(select 1 from public.administrator_roles where user_id=operator_id and role='super_admin') then raise exception 'Not authorized';end if;
update public.account_deletion_requests set status='completed',reason='Approved account deletion completed',review_note='Reviewed and approved by authorized administrator',completed_at=now() where id=request_id and reviewed_by=operator_id and status='processing' and not exists(select 1 from auth.users where id=user_id);
if not found then raise exception 'Auth account must be deleted before completion';end if;
update public.account_deletion_requests set reason='Historical closure request; personal narrative removed',review_note=null where user_id=(select user_id from public.account_deletion_requests where id=request_id) and id<>request_id;
update public.audit_logs set reason='Reviewed approved account closure',previous_value=null where updated_value->>'request_id'=request_id::text;
insert into public.audit_logs(actor_id,action,reason,updated_value) values(operator_id,'account_deleted','Confirmed, reviewed account deletion',jsonb_build_object('request_id',request_id));end$$;
alter table public.legal_documents enable row level security;
alter table public.lecturers enable row level security;
alter table public.teaching_units enable row level security;
alter table public.lecturer_unit_assignments enable row level security;
alter table public.feedback enable row level security;
alter table public.account_deletion_requests enable row level security;
create policy legal_read on public.legal_documents for select to anon,authenticated using(true);
create policy lecturers_read on public.lecturers for select to authenticated using(true);
create policy units_read on public.teaching_units for select to authenticated using(true);
create policy assignments_read on public.lecturer_unit_assignments for select to authenticated using(true);
create policy feedback_read on public.feedback for select to authenticated using(user_id=auth.uid() or public.has_permission('feedback'));
create policy closure_read on public.account_deletion_requests for select to authenticated using(user_id=auth.uid() or public.has_permission('settings'));
-- Lock the owner row until an upload transaction commits; cleanup locks the same
-- row before removal, so an already-authorized upload cannot outlive preparation.
create function public.can_upload_recognition_photo() returns boolean language plpgsql volatile security definer set search_path=public,extensions,pg_temp as $$begin
perform 1 from public.profiles where id=auth.uid() for share;
return found and not exists(select 1 from public.account_deletion_requests where user_id=auth.uid() and status in ('approved','processing')) and not exists(select 1 from public.students where user_id=auth.uid() and photo_path is not null);
end$$;
create function public.prevent_closing_role() returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin
perform 1 from public.profiles where id=new.user_id for share;
if exists(select 1 from public.account_deletion_requests where user_id=new.user_id and status in ('approved','processing')) then raise exception 'Account is closing';end if;return new;end$$;
revoke execute on function public.prevent_closing_role() from public,anon,authenticated;
create trigger prevent_closing_role before insert or update on public.administrator_roles for each row execute function public.prevent_closing_role();
revoke execute on function public.can_upload_recognition_photo() from public,anon,authenticated;
grant execute on function public.can_upload_recognition_photo() to authenticated;
drop policy photo_insert on storage.objects;
create policy photo_insert on storage.objects for insert to authenticated with check(bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text and array_length(string_to_array(name,'/'),1)=2 and split_part(name,'/',2) ~ '^[0-9a-f-]{36}\.jpg$' and public.can_upload_recognition_photo());
-- Activated recognition photos cannot be removed by their owner while linked.
drop policy unused_photo_delete on storage.objects;
create policy unused_photo_delete on storage.objects for delete to authenticated using(bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.students where photo_path=name) and not exists(select 1 from public.profiles where account_photo_path=name));
revoke all on public.legal_documents,public.lecturers,public.teaching_units,public.lecturer_unit_assignments,public.feedback,public.account_deletion_requests from anon,authenticated;
grant select on public.legal_documents to anon,authenticated;
grant select on public.lecturers,public.teaching_units,public.lecturer_unit_assignments,public.feedback,public.account_deletion_requests to authenticated;
revoke execute on function public.activate_profile(text,integer,integer,boolean),public.submit_registration(jsonb),public.save_lecturer(jsonb,uuid),public.save_unit(jsonb,uuid),public.assign_unit(uuid,uuid,boolean),public.delete_academic_record(text,uuid),public.send_feedback(integer,text,text),public.respond_feedback(uuid,text,text),public.save_legal_document(text,text),public.create_deletion_request(uuid,text),public.cancel_deletion_request(uuid),public.review_deletion_request(uuid,boolean,text),public.prepare_account_deletion(uuid,uuid),public.complete_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.activate_profile(text,integer,integer,boolean),public.submit_registration(jsonb),public.save_lecturer(jsonb,uuid),public.save_unit(jsonb,uuid),public.assign_unit(uuid,uuid,boolean),public.delete_academic_record(text,uuid),public.send_feedback(integer,text,text),public.respond_feedback(uuid,text,text),public.save_legal_document(text,text),public.cancel_deletion_request(uuid),public.review_deletion_request(uuid,boolean,text) to authenticated;
grant execute on function public.create_deletion_request(uuid,text),public.prepare_account_deletion(uuid,uuid),public.complete_account_deletion(uuid,uuid) to service_role;
grant all on public.legal_documents,public.lecturers,public.teaching_units,public.lecturer_unit_assignments,public.feedback,public.account_deletion_requests to service_role;
alter publication supabase_realtime add table public.lecturers,public.teaching_units,public.lecturer_unit_assignments,public.feedback,public.account_deletion_requests,public.legal_documents;
commit;
