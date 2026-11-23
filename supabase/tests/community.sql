-- Isolated staging only. Uses synthetic identities and rolls back every fixture.
begin;
create function pg_temp.must_fail(command text,needle text) returns void language plpgsql as $$begin
begin execute command;exception when others then if position(needle in sqlerrm)>0 then return;end if;raise;end;
raise exception 'FAIL: command unexpectedly succeeded: %',command;end$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','first@example.test',now(),'{"full_name":"First Student"}'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','second@example.test',now(),'{"full_name":"Second Student"}'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','dev@example.test',now(),'{"full_name":"Dev Brian"}'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','rep@example.test',now(),'{"full_name":"Class Rep"}'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','officer@example.test',now(),'{"full_name":"Data Officer"}'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','unconfirmed@example.test',null,'{}'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','reviewer@example.test',now(),'{"full_name":"Independent Reviewer"}');
insert into public.administrator_roles(user_id,role,is_developer) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','super_admin',true),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','class_representative',false),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','data_officer',false),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','super_admin',false);
-- Supabase grants object access separately from its RLS policies.
grant select,insert,delete on storage.objects to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true);
select pg_temp.must_fail($q$select public.submit_registration('{}')$q$,'Activate your account');
select pg_temp.must_fail($q$select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/a.jpg',1,1,true)$q$,'Upload your own');
insert into storage.objects(bucket_id,name) values('student-photos','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg');
select pg_temp.must_fail($q$insert into storage.objects(bucket_id,name) values('student-photos','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/nested/a.jpg')$q$,'row-level security');
select pg_temp.must_fail($q$select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,1,false)$q$,'Accept the current');
select pg_temp.must_fail($q$select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',0,1,true)$q$,'Accept the current');
select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,1,true);
delete from storage.objects where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';
do $$begin if not exists(select 1 from storage.objects where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg') then raise exception 'FAIL: linked photo deleted';end if;end$$;
select public.submit_registration('{"full_name":"First Student","registration_number":"ME/COMM/001","gender":"Male","admission_year":2025,"phone":"+254700000001","county":"Nairobi","town":"Town","declaration":true,"consent":true}');
select pg_temp.must_fail($q$select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/new.jpg',1,1,true)$q$,'locked');
select pg_temp.must_fail($q$insert into storage.objects(bucket_id,name) values('student-photos','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg')$q$,'row-level security');
select pg_temp.must_fail($q$select public.create_deletion_request(auth.uid(),'Want to close my account')$q$,'permission denied');
select pg_temp.must_fail($q$select public.prepare_account_deletion(gen_random_uuid(),auth.uid())$q$,'permission denied');
select pg_temp.must_fail($q$select public.save_lecturer('{}')$q$,'Not authorized');
select public.send_feedback(5,'General','Useful and accessible portal.');
select pg_temp.must_fail($q$select public.send_feedback(6,'General','Invalid rating attempt')$q$,'feedback_rating_check');
select pg_temp.must_fail($q$select public.respond_feedback((select id from public.feedback limit 1),'Fake admin response','resolved')$q$,'Not authorized');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',true);
do $$begin if exists(select 1 from public.feedback) then raise exception 'FAIL: student sees other feedback';end if;end$$;
select pg_temp.must_fail($q$select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,1,true)$q$,'Upload your own');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',true);
select pg_temp.must_fail($q$select public.activate_profile('a/a.jpg',1,1,true)$q$,'Verified email');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',true);
select pg_temp.must_fail($q$select public.save_unit('{}')$q$,'Not authorized');
do $$begin if exists(select 1 from public.feedback) then raise exception 'FAIL: data officer sees restricted feedback';end if;end$$;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',true);
select public.save_lecturer('{"full_name":"Test Lecturer","professional_title":"Lecturer","institutional_email":"lecturer@example.test","office":"Lab 2","active":true}');
select public.save_unit('{"code":"MEE201","name":"Medical Electronics","academic_year":"2026/2027","description":"Test teaching unit"}');
select public.assign_unit((select id from public.lecturers limit 1),(select id from public.teaching_units limit 1),true);
select public.respond_feedback((select id from public.feedback limit 1),'Thanks for your suggestion.','resolved');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true);
do $$begin
if (select count(*) from public.lecturer_unit_assignments)<>1 or (select count(*) from public.lecturers)<>1 then raise exception 'FAIL: students cannot read academic directory';end if;
if not exists(select 1 from public.feedback where response='Thanks for your suggestion.' and status='resolved') then raise exception 'FAIL: response not delivered';end if;
if not exists(select 1 from public.notifications where message like 'Your feedback received a response%') then raise exception 'FAIL: response notification missing';end if;
end$$;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',true);
select public.save_legal_document('terms',(select body from public.legal_documents where id='terms'));
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true);
select pg_temp.must_fail($q$select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,1,true)$q$,'Accept the current');
select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,2,true);
reset role;
set local role service_role;
select pg_temp.must_fail($q$select public.create_deletion_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','Please delete developer account')$q$,'Developer account is protected');
select public.create_deletion_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Please close my unused account');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',true);
select public.cancel_deletion_request((select id from public.account_deletion_requests where status='pending'));
reset role;
set local role service_role;
select public.create_deletion_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Please close my registered account');
select pg_temp.must_fail($q$select public.prepare_account_deletion((select id from public.account_deletion_requests where status='pending'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3')$q$,'Approved request');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',true);
select public.review_deletion_request((select id from public.account_deletion_requests where status='pending'),true,'Confirmed ownership and reviewed erasure.');
select pg_temp.must_fail($q$select public.set_administrator('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','data_officer')$q$,'Account is closing');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true);
select pg_temp.must_fail($q$select public.activate_profile('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,2,true)$q$,'Account is closing');
select pg_temp.must_fail($q$select public.send_feedback(4,'General','Closing race test attempt')$q$,'Account is closing');
reset role;
set local role service_role;
select pg_temp.must_fail($q$select public.prepare_account_deletion((select id from public.account_deletion_requests where status='approved'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7')$q$,'Approved request');
select public.prepare_account_deletion((select id from public.account_deletion_requests where status='approved'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
select pg_temp.must_fail($q$select public.complete_account_deletion((select id from public.account_deletion_requests where status='processing'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3')$q$,'Auth account must be deleted');
-- Reentrant preparation after a failed gateway step.
select public.prepare_account_deletion((select id from public.account_deletion_requests where status='processing'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
reset role;
-- Gateway simulation only: Storage API removes blobs before Auth API deletes user.
delete from storage.objects where split_part(name,'/',1)='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
delete from auth.users where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
set local role service_role;
select public.complete_account_deletion((select id from public.account_deletion_requests where status='processing'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
reset role;
do $$begin
if exists(select 1 from public.students where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') or exists(select 1 from public.feedback where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') or exists(select 1 from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') then raise exception 'FAIL: linked records survived deletion';end if;
if not exists(select 1 from public.account_deletion_requests where status='completed' and reason='Approved account deletion completed') then raise exception 'FAIL: closure receipt missing';end if;
end$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin if (select count(*) from public.legal_documents)<>2 then raise exception 'FAIL: policies not public';end if;end$$;
select pg_temp.must_fail($q$select * from public.feedback$q$,'permission denied');
select pg_temp.must_fail($q$select * from public.lecturers$q$,'permission denied');
select pg_temp.must_fail($q$select * from public.account_deletion_requests$q$,'permission denied');
reset role;
rollback;
