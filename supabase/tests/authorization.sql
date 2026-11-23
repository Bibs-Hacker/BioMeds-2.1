-- Isolated PostgreSQL/Supabase test project only. All fixtures rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000001','student1@example.test',now(),'{"full_name":"Student One","role":"super_admin","is_developer":true}'),
('00000000-0000-4000-8000-000000000002','student2@example.test',now(),'{"full_name":"Student Two"}'),
('00000000-0000-4000-8000-000000000003','dev@example.test',now(),'{"full_name":"Dev Brian"}'),
('00000000-0000-4000-8000-000000000004','data@example.test',now(),'{"full_name":"Data Officer"}'),
('00000000-0000-4000-8000-000000000005','rep@example.test',now(),'{"full_name":"Class Rep"}'),
('00000000-0000-4000-8000-000000000006','assistant@example.test',now(),'{"full_name":"Assistant Rep"}'),
('00000000-0000-4000-8000-000000000007','unverified@example.test',null,'{}');
insert into public.administrator_roles(user_id,role,is_developer) values
('00000000-0000-4000-8000-000000000003','super_admin',true),
('00000000-0000-4000-8000-000000000004','data_officer',false),
('00000000-0000-4000-8000-000000000005','class_representative',false),
('00000000-0000-4000-8000-000000000006','assistant_representative',false);
insert into storage.objects(bucket_id,name) select 'student-photos',id::text||'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg' from auth.users where email_confirmed_at is not null;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.activate_profile(auth.uid()::text||'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,1,true);
do $$declare sid uuid;begin
if public.has_permission('roles') then raise exception 'FAIL: metadata role escalated';end if;
sid:=public.submit_registration('{"full_name":"Student One","registration_number":"me/001","gender":"Male","admission_year":2025,"email":"spoof@example.test","phone":"+254700000001","county":"Nairobi","town":"Town","declaration":true,"consent":true,"registration_status":"approved","membership_status":"active"}');
if not exists(select 1 from public.students where id=sid and registration_number='ME/001' and email='student1@example.test' and registration_status='pending' and membership_status='inactive') then raise exception 'FAIL: registration trusted forged fields';end if;
begin update public.students set full_name='Unauthorized';raise exception 'FAIL: unlocked direct update';exception when insufficient_privilege then null;end;
begin insert into public.administrator_roles(user_id,role) values(auth.uid(),'super_admin');raise exception 'FAIL: role escalation';exception when insufficient_privilege then null;end;
begin perform public.decide_registration(sid,'approved','Student approved self');raise exception 'FAIL: self approval';exception when raise_exception then if sqlerrm<>'Not authorized' then raise;end if;end;
begin perform public.submit_registration('{"full_name":"Student One","registration_number":"ME/002","gender":"Male","admission_year":2025,"phone":"+254700000001","county":"Nairobi","town":"Town","declaration":true,"consent":true}');raise exception 'FAIL: duplicate account';exception when raise_exception then if sqlerrm<>'An account or registration number is already registered' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.activate_profile(auth.uid()::text||'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',1,1,true);
do $$begin
if exists(select 1 from public.students) then raise exception 'FAIL: other student private record visible';end if;
begin perform public.submit_registration('{"full_name":"Student Two","registration_number":"me/001","gender":"Female","admission_year":2025,"phone":"+254700000002","county":"Mombasa","town":"Town","declaration":true,"consent":true}');raise exception 'FAIL: duplicate reg';exception when raise_exception then if sqlerrm<>'An account or registration number is already registered' then raise;end if;end;
perform public.submit_registration('{"full_name":"Student Two","registration_number":"me/002","gender":"Female","admission_year":2025,"phone":"+254700000002","county":"Mombasa","town":"Town","declaration":true,"consent":true}');
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000007',true);
do $$begin begin perform public.submit_registration('{}');raise exception 'FAIL: unconfirmed user registered';exception when raise_exception then if sqlerrm<>'Verify your email before registration' then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$declare sid uuid;token text;answer jsonb;rid uuid;begin
select id into sid from public.students where registration_number='ME/001';
perform public.decide_registration(sid,'approved','Verified class register');
select verification_token into token from public.membership_cards where student_id=sid;
if length(token)<>64 then raise exception 'FAIL: weak token';end if;
answer:=public.verify_membership(token);if answer->>'result'<>'Valid Membership' then raise exception 'FAIL: approved card invalid';end if;
if answer ? 'email' or answer ? 'phone' or answer ? 'id' or answer ? 'user_id' or answer ? 'town' then raise exception 'FAIL: verification private leak';end if;
perform public.set_membership_status(sid,'inactive','Membership deactivated');if public.verify_membership(token)->>'result'<>'Inactive Membership' then raise exception 'FAIL: inactive still valid';end if;
perform public.set_membership_status(sid,'active','Membership reactivated');
perform public.set_membership_status(sid,'revoked','Membership revoked');if public.verify_membership(token)->>'result'<>'Revoked Membership' then raise exception 'FAIL: revoked still valid';end if;
perform public.set_membership_status(sid,'active','Verified reactivation');if public.verify_membership(token)->>'result'<>'Invalid Verification Code' then raise exception 'FAIL: revoked token not rotated';end if;
if public.verify_membership('not-a-token')->>'result'<>'Invalid Verification Code' then raise exception 'FAIL: malformed verification accepted';end if;
begin perform public.set_administrator('00000000-0000-4000-8000-000000000003','data_officer');raise exception 'FAIL: protected developer changed';exception when raise_exception then if sqlerrm<>'Developer account is protected' then raise;end if;end;
perform public.set_administrator('00000000-0000-4000-8000-000000000006','assistant_representative');
rid:=public.save_announcement('{"title":"Test public notice","body":"Public class announcement","category":"General","state":"published","publish_at":"2020-01-01T00:00:00Z","is_public":true}');
perform public.save_announcement('{"title":"Test public notice edited","body":"Edited class announcement","category":"General","state":"published","publish_at":"2020-01-01T00:00:00Z","is_public":true}',rid);
perform public.save_announcement('{"title":"Future public notice","body":"Scheduled announcement","category":"General","state":"published","publish_at":"2099-01-01T00:00:00Z","is_public":true}');
perform public.save_announcement('{"title":"Private class notice","body":"Members only announcement","category":"Academic","state":"published","publish_at":"2020-01-01T00:00:00Z","is_public":false}');
perform public.update_settings('{"registration_open":true,"academic_year":"2026/2027","expected_population":40,"support_email":"support@example.test","class_contact":"Class leadership","privacy_notice":"Test privacy notice for population management."}');
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$declare sid uuid;rid uuid;begin select id into sid from public.students where user_id=auth.uid();
perform public.request_correction(sid,'phone','+254700000099','Incorrect phone entered');
begin perform public.request_correction(sid,'membership_status','active','Unauthorized membership change');raise exception 'FAIL: protected correction field';exception when check_violation then null;end;
select id into rid from public.correction_requests where student_id=sid and field_name='phone';
begin perform public.review_correction(rid,true,'Approve my own correction');raise exception 'FAIL: student correction approval';exception when raise_exception then if sqlerrm<>'Not authorized' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$declare sid uuid;rid uuid;begin
select id into sid from public.students where registration_number='ME/001';
begin perform public.decide_registration(sid,'approved','Data officer approval');raise exception 'FAIL: data officer unauthorized approve';exception when raise_exception then if sqlerrm<>'Not authorized' then raise;end if;end;
select id into rid from public.correction_requests where student_id=sid and field_name='phone';perform public.review_correction(rid,true,'Verified requested correction');
if not exists(select 1 from public.students where id=sid and phone='+254700000099') then raise exception 'FAIL: approved correction not applied';end if;
if exists(select 1 from public.audit_logs) then raise exception 'FAIL: data officer sees restricted audit';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$declare sid uuid;begin
if not public.has_permission('report') or not public.has_permission('announce') or public.has_permission('correct') or public.has_permission('roles') then raise exception 'FAIL: class rep permissions';end if;
select id into sid from public.students where registration_number='ME/002';perform public.decide_registration(sid,'rejected','Not yet verified by class leadership');end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
do $$begin if not public.has_permission('approve') or public.has_permission('report') or public.has_permission('announce') then raise exception 'FAIL: assistant role permissions';end if;begin perform public.report_register(0);raise exception 'FAIL: assistant unauthorized report';exception when raise_exception then if sqlerrm<>'Not authorized' then raise;end if;end;end$$;
reset role;
do $$begin
if not exists(select 1 from public.audit_logs where action='record_correction' and actor_id='00000000-0000-4000-8000-000000000004' and previous_value->>'phone'='+254700000001' and updated_value->>'phone'='+254700000099') then raise exception 'FAIL: correction audit missing';end if;
begin update public.administrator_roles set role='data_officer',is_developer=false where is_developer;raise exception 'FAIL: developer trigger allows mutation';exception when raise_exception then if sqlerrm not like 'The developer identity is protected%' then raise;end if;end;
end$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
begin perform count(*) from public.students;raise exception 'FAIL: public private directory';exception when insufficient_privilege then null;end;
begin perform count(*) from public.membership_cards;raise exception 'FAIL: public token enumeration';exception when insufficient_privilege then null;end;
if (select count(*) from public.announcements)<>1 then raise exception 'FAIL: private/future notices exposed';end if;
if not(public.developer_profile()->>'verified')::boolean then raise exception 'FAIL: developer badge provisioning';end if;
end$$;
reset role;
rollback;
