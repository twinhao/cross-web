export const facilityId='11111111-2222-3333-4444-555555555555';
export const today='2026-10-23';
export const clinic={id:facilityId,name:'虛構醫美操作測試院所',hospital_level:'clinic',facility_type:'aesthetic',payment_type:'self_pay',phone:'0200000000',address:'虛構地址',description:'',logo_url:null,hero_banner:null,is_active:true,service_categories:[],business_hours:Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d=>[d,{open:'09:00',close:'18:00',breaks:[{start:'12:00',end:'13:00'}]}])),slot_duration:30,show_schedule:true,online_booking_enabled:true,phone_booking_enabled:true,primary_color:'#1d4ed8',subscription_plan:'pro',subscription_status:'active',subscription_started_at:'2026-01-01T00:00:00Z',subscription_expires_at:'2030-01-01T00:00:00Z',trial_used_at:null,created_at:'2026-01-01T00:00:00Z',updated_at:null};
export const staff=[{id:'staff-1',facility_id:facilityId,name:'林醫師（虛構）',role:'doctor',is_active:true,is_bookable:true,is_public_visible:true,created_at:'2026-01-01T00:00:00Z'},{id:'staff-2',facility_id:facilityId,name:'陳治療師（虛構）',role:'therapist',is_active:true,is_bookable:true,is_public_visible:true,created_at:'2026-01-01T00:00:00Z'}];
export const services=[{id:'consult',facility_id:facilityId,service_name:'醫美諮詢（虛構）',duration_minutes:30,price:500,is_active:true},{id:'laser',facility_id:facilityId,service_name:'雷射療程（虛構）',duration_minutes:60,price:3000,is_active:true}];
export const appointments=Array.from({length:8},(_,i)=>({id:'appointment-'+i,facility_id:facilityId,patient_name:'測試客人'+(i+1),patient_phone:'090000000'+i,staff_id:staff[i%2].id,staff_name:staff[i%2].name,service_id:services[i%2].id,service_name:services[i%2].service_name,duration_minutes:i%2?60:30,appointment_date:today,appointment_time:String(9+Math.floor(i/2)*2).padStart(2,'0')+':00:00',status:['confirmed','checked_in','in_progress','completed'][i%4],booking_method:'phone',queue_number:i+1,notes:'純虛構測試',check_in_time:null}));
export async function setupWorkspace(browser,origin,{width=1440,role='facility_admin'}={}){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[],requests=[],scripts=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().endsWith('.js'))scripts.push(r.url());});
 await page.addInitScript(()=>{localStorage.setItem('access_token','local-fixture');localStorage.setItem('refresh_token','local-refresh');const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-23T08:00:00+08:00']));}static now(){return new RealDate('2026-10-23T08:00:00+08:00').getTime();}};});
 const state={failList:false,failMutation:false,failSlots:false,appointments:structuredClone(appointments),shifts:[],leaves:[]};
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();requests.push({path,method,body:req.postDataJSON?.()});
  const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(path==='/api/v1/auth/me')return json({id:'fixture-user',email:'staff@example.invalid',display_name:'虛構櫃台',roles:[role],is_active:true,facility_id:facilityId,facility:clinic,created_at:'2026-01-01T00:00:00Z'});
  if(path.endsWith('/service-categories'))return json({facility_types:[],payment_types:[]});
  if(path===`/api/v1/medical-facilities/${facilityId}`)return json(clinic);
  if(path.endsWith('/patients'))return json([{id:'patient-1',name:'既有客戶（虛構）',phone:'0900000000',gender:'F',national_id_last4:'6789',is_active:true,appointment_count:2,no_show_count:0,last_visit_date:today}]);
  if(path.endsWith('/staff'))return json(staff);
  if(path.endsWith('/staff/staff-1/services'))return json([{service_id:'consult'}]);
  if(path.endsWith('/staff/staff-2/services'))return json([{service_id:'laser'}]);
  if(path.endsWith('/services'))return json(services);
  if(path.endsWith('/schedules/batch')&&method==='POST')return json({created:[],created_count:req.postDataJSON().items.length,skipped_existing:0,skipped_leave:0,skipped_invalid:0});
  if(path.endsWith('/schedules')){if(state.failSlots)return json({detail:'測試：無法確認排班'},503);if(method==='POST'){const row={...req.postDataJSON(),id:'schedule-new',staff_id:path.split('/').at(-2),staff_name:'林醫師（虛構）',is_available:true};state.shifts.push(row);return json(row);}return json(state.shifts);}
  if(path.endsWith('/staff-leaves'))return json(state.leaves);
  if(path.endsWith('/leaves')&&method==='POST'){const row={...req.postDataJSON(),id:'leave-new',staff_id:path.split('/').at(-2)};state.leaves.push(row);return json(row);}
  if(path.endsWith('/queue')){
    if(state.failQueue)return json({detail:'測試：接待名單暫時無法載入'},503);
    const date=url.searchParams.get('date')??today;
    return json({date,groups:staff.map(person=>{const appointments=state.appointments.filter(a=>a.staff_id===person.id&&a.appointment_date===date);return {staff_id:person.id,staff_name:person.name,current_number:appointments.find(a=>a.status==='in_progress')?.queue_number??null,waiting_count:appointments.filter(a=>a.status==='checked_in'&&!a.queue_deferred).length,appointments};})});
  }
  if(path.endsWith('/queue/call-next')){
    const body=req.postDataJSON(),group=state.appointments.filter(a=>a.appointment_date===body.date&&(a.staff_id??null)===(body.staff_id??null)),current=group.filter(a=>a.status==='in_progress');
    if(body.require_idle&&current.length)return json({detail:'目前仍有服務中的客戶，請先完成服務並重新整理叫號台'},409);
    const next=group.filter(a=>a.status==='checked_in'&&!a.queue_deferred).sort((a,b)=>(a.queue_number??Infinity)-(b.queue_number??Infinity)||a.appointment_time.localeCompare(b.appointment_time))[0];
    if(!next)return json({detail:'目前沒有已報到的民眾可叫號'},409);
    if(body.expected_appointment_id&&next.id!==body.expected_appointment_id)return json({detail:'候診順序已更新，請重新整理後確認下一位客戶'},409);
    current.forEach(a=>a.status='completed');next.status='in_progress';return json({called:next,current_number:next.queue_number});
  }
  if(path.endsWith('/queue-defer')){
    const id=path.split('/').at(-2),a=state.appointments.find(a=>a.id===id),body=req.postDataJSON();
    if(state.failMutation)return json({detail:'測試：此預約已被其他人更新'},409);
    if(a.appointment_date!==today||!(a.status==='checked_in'||body.deferred&&a.status==='in_progress'))return json({detail:'目前狀態無法處理過號或返回，請重新讀取名單'},409);
    if(!!a.queue_deferred===body.deferred)return json(a);
    if(a.status!==body.expected_status)return json({detail:'此客戶的服務狀態已更新，請重新讀取名單後確認'},409);
    Object.assign(a,{queue_deferred:body.deferred,status:'checked_in'});return json(a);
  }
  if(path.endsWith('/check-in')){const id=path.split('/').at(-2),a=state.appointments.find(a=>a.id===id);a.status='checked_in';return json(a);}
  if(path.endsWith('/appointments')){
    if(method==='POST'){const body=req.postDataJSON();const row={...body,...(body.patient_id?{patient_name:'既有客戶（虛構）',patient_phone:'0900000000'}:{}),id:'appointment-created',duration_minutes:body.service_id==='laser'?60:30,status:'confirmed',staff_name:staff.find(s=>s.id===body.staff_id)?.name,service_name:services.find(s=>s.id===body.service_id)?.service_name};state.appointments.push(row);return json(row,201);}
    if(state.failList)return json({detail:'測試：預約資料暫時無法載入'},503);
    const start=url.searchParams.get('start_date')??url.searchParams.get('date')??'0000',end=url.searchParams.get('end_date')??url.searchParams.get('date')??'9999';return json(state.appointments.filter(a=>a.appointment_date>=start&&a.appointment_date<=end));
  }
  if(path.includes('/appointments/')){const id=path.split('/').at(-1),a=state.appointments.find(a=>a.id===id);if(method==='PATCH'){if(state.failMutation)return json({detail:'測試：此預約已被其他人更新'},409);Object.assign(a,req.postDataJSON());}return a?json(a):json({detail:'不存在'},404);}
  return json([]);
 });
 return{page,errors,requests,scripts,state,origin};
}
