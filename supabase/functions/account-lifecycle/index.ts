import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.119.2';
Deno.serve(async(req:Request)=>{
 const origin=Deno.env.get('APP_URL');
 const headers={'Access-Control-Allow-Origin':origin||'https://invalid.local','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const send=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(!origin)return send({error:'Account service has not been configured.'},503);
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return send({error:'Origin not permitted.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return send({error:'Method not allowed.'},405);
 const authorization=req.headers.get('Authorization');if(!authorization)return send({error:'Sign in required.'},401);
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return send({error:'Session is invalid.'},401);
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try{
 const body=await req.json();
 if(body.action==='request'){
  if(body.confirmation!=='DELETE MY ACCOUNT'||body.acknowledged!==true||typeof body.password!=='string'||body.password.length>1024||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>1000||!user.email)return send({error:'Password, exact confirmation, acknowledgment and reason are required.'},400);
  const {data:role,error:roleError}=await userClient.from('administrator_roles').select('is_developer').eq('user_id',user.id).maybeSingle();if(roleError)return send({error:'Unable to verify account protections.'},503);if(role?.is_developer)return send({error:'Developer account is protected.'},403);
  // Dedicated nonpersisting client: a successful check never replaces the current
  // user's browser session. Never log or store the submitted password.
  const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:check,error}=await verifier.auth.signInWithPassword({email:user.email,password:body.password});
  if(error||check.user?.id!==user.id)return send({error:'Current-password verification failed.'},401);
  await verifier.auth.signOut({scope:'local'});
  const {data,error:e}=await admin.rpc('create_deletion_request',{target_user:user.id,reason:body.reason.trim()});
  if(e)return send({error:'Request could not be created. Check for an existing active request or wait before retrying.'},400);
  return send({success:true,request_id:data});
 }
 if(body.action==='execute'){
  if(body.confirmation!=='DELETE APPROVED ACCOUNT'||typeof body.request_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.request_id))return send({error:'Exact execution confirmation and valid request are required.'},400);
  const {data:allowed,error:pe}=await userClient.rpc('has_permission',{permission:'settings'});if(pe||!allowed)return send({error:'Not authorized.'},403);
  const {data:target,error:prepare}=await admin.rpc('prepare_account_deletion',{request_id:body.request_id,operator_id:user.id});
  if(prepare||!target)return send({error:'An approved request and its original reviewer are required. Developer/self-deletion is blocked.'},403);
  // Ban before gateway cleanup. Profile activation/roles were already removed
  // atomically; no new private uploads or protected mutations are permitted.
  const {data:targetAccount,error:lookup}=await admin.auth.admin.getUserById(target);
  if(lookup && lookup.status!==404)return send({error:'Account lookup failed. Request remains Processing for a safe retry.'},500);
  if(targetAccount?.user){const {error:ban}=await admin.auth.admin.updateUserById(target,{ban_duration:'876000h'});if(ban)return send({error:'Account access suspension failed. Retry the Processing request.'},500);}
  // Bounded recursive cleanup also handles old V1 uploads with nested names.
  // If a gateway timeout occurs, the Processing request is safely retryable.
  async function cleanFolder(prefix:string,depth=0):Promise<void>{
   if(depth>20)throw new Error('Photo folder depth exceeds safe cleanup limit.');
   for(let round=0;round<25;round++){
    const {data:files,error:listError}=await admin.storage.from('student-photos').list(prefix,{limit:1000,offset:0});
    if(listError)throw listError;if(!files?.length)return;
    for(const folder of files.filter(f=>!f.id))await cleanFolder(`${prefix}/${folder.name}`,depth+1);
    const paths=files.filter(f=>f.id).map(f=>`${prefix}/${f.name}`);
    for(let i=0;i<paths.length;i+=100){const {error:remove}=await admin.storage.from('student-photos').remove(paths.slice(i,i+100));if(remove)throw remove;}
   }
   throw new Error('Cleanup batch limit reached.');
  }
  try{await cleanFolder(target);}catch{return send({error:'Photo cleanup incomplete. Request remains Processing; retry or ask the operator to reconcile Storage.'},500);}
  if(targetAccount?.user){const {error:removeUser}=await admin.auth.admin.deleteUser(target);if(removeUser)return send({error:'Authentication deletion failed. Request remains Processing for a safe retry.'},500);}
  const {error:done}=await admin.rpc('complete_account_deletion',{request_id:body.request_id,operator_id:user.id});
  if(done)return send({error:'Final confirmation failed. Retry the Processing request.'},500);
  return send({success:true});
 }
 return send({error:'Unknown account action.'},400);
 }catch{return send({error:'Unable to process account request.'},400);}
});
