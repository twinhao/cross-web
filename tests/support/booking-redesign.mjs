export const clinicId='11111111-2222-3333-4444-555555555555';
export const bookingPath='/booking/'+clinicId;
export const date='2030-03-04';
export async function bookingFixture(browser,origin,{width=1440,dark=false,authenticated=true,role="patient"}={}){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],requests=[];
 page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(30000);
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({authenticated,dark})=>{localStorage.setItem('theme',dark?'dark':'light');if(authenticated)localStorage.setItem('access_token','booking-fixture');},{authenticated,dark});
 const state={failSlots:false,closed:false,failPatients:false,conflict:false,failPost:false,posts:[],slotReads:0,patientReads:0,holdPost:null,booking:null};
 const service={id:'laser',name:'醫美諮詢與雷射療程（虛構）',description:'由專業人員了解你的需求，再安排合適的服務。',price:0,show_price:false,duration_minutes:60,category:'諮詢與療程'};
 const patient={id:'patient-a',name:'虛構預約人',relation:'self',gender:'F',birth_date:'1990-01-01',phone:'0900000000',identifier_type:'national_id',identifier_value:'A000000000',identifier_last4:'0000',is_active:true};
 const user={id:'fixture-user',email:'member@example.invalid',display_name:'虛構會員',phone_number:'0900000000',created_at:'2026-01-01T00:00:00Z',roles:[role],is_active:true};
 const booking={id:'appointment-a',booking_number:'BK-FIXTURE',status:'confirmed',clinic:{name:'虛構國際預約測試院所',address:'虛構地址，僅供驗收',phone:'0200000000'},service:{name:service.name,duration_minutes:60},doctor:{name:'虛構醫師',title:'醫師'},appointment_datetime:'2030-03-04T09:00:00+08:00',patient_name:patient.name,queue_number:7};
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/\/$/,''),method=req.method();requests.push({path,method});
  const json=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)});
  if(path==='/api/v1/auth/me')return json(user);
  if(path==='/api/v1/member/patients'){state.patientReads++;return json(state.failPatients?{detail:'虛構載入失敗'}:[patient],state.failPatients?500:200);}
  if(path==='/api/v1/member/appointments')return json([]);
  if(path==='/api/v1/member/profile')return json(user);
  if(path.endsWith('/config'))return json({id:clinicId,clinic_name:'虛構國際預約測試院所',logo:'/cross-icon.png',primary_color:'#1d4ed8',online_booking_enabled:true,payment_type:'self_pay',address:'虛構地址，僅供驗收',phone:'0200000000'});
  if(path.endsWith('/services'))return json([service,{...service,id:'consult',name:'初次諮詢（虛構）',show_price:true,price:500,duration_minutes:30}]);
  if(path.endsWith('/doctors'))return json([{id:'staff-a',name:'虛構醫師',title:'皮膚專科與醫美諮詢'},{id:'staff-b',name:'虛構治療師（長姓名測試）',title:'醫美療程與照護'}]);
  if(path.endsWith('/slots')){state.slotReads++;return json(state.failSlots?{detail:'虛構讀取失敗'}:[{date,dayOfWeek:'一',dayNumber:4,isToday:false,isAvailable:!state.closed,slots:[{id:'slot-1',time:'09:00',period:'morning',isAvailable:!state.closed},{id:'slot-2',time:'14:00',period:'afternoon',isAvailable:true}]},{date:'2030-03-05',dayOfWeek:'二',dayNumber:5,isToday:false,isAvailable:false,slots:[]}],state.failSlots?500:200);}
  if(path.endsWith('/appointments')&&method==='POST'){const body=req.postDataJSON();state.posts.push(body);if(state.holdPost)await state.holdPost;if(state.conflict)return json({detail:'虛構時段衝突'},409);if(state.failPost)return json({detail:'虛構送出失敗'},500);state.booking={...booking,appointment_datetime:`${body.appointment_date}T${body.appointment_time}:00+08:00`};return json(state.booking,201);}
  if(path==='/api/v1/booking/appointments/appointment-a')return json(state.booking??booking);
  if(path==='/api/track-view')return route.fulfill({status:204});
  return json([]);
 });
 return {page,state,errors,requests,service,patient,user};
}
export async function chooseService(page,origin,path=bookingPath){await page.goto(origin+path);await page.getByRole('button',{name:/醫美諮詢與雷射療程/}).click();await page.getByRole('button',{name:'選擇預約時間',exact:true}).click();await page.getByRole('heading',{name:'日期與時段',exact:true}).waitFor();}
export async function chooseTime(page){await page.locator(`[data-value="${date}"][role="button"]`).click();await page.getByRole('button',{name:'09:00',exact:true}).click();await page.getByRole('button',{name:'確認預約資料',exact:true}).click();await page.getByRole('heading',{name:'確認預約資料',exact:true}).waitFor();}
