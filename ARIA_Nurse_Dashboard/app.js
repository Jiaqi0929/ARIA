'use strict';
const $=id=>document.getElementById(id);
const labels={stable:'Stable',watch:'Watch',urgent:'Urgent Review'};
const initialPatients=[
{id:'P001',name:'Daniel Rahman',age:67,sex:'M',zone:'B',level:2,seat:19,status:'stable',temp:36.4,heart:76,resp:18,posture:'Seated',movement:'Usual movement',confidence:97},
{id:'P002',name:'John Lim',age:58,sex:'M',zone:'A',level:3,seat:2,status:'stable',temp:36.5,heart:80,resp:20,posture:'Seated',movement:'Usual movement',confidence:96},
{id:'P003',name:'Wei Ming Tan',age:72,sex:'M',zone:'A',level:1,seat:1,status:'stable',temp:36.6,heart:78,resp:17,posture:'Seated',movement:'Usual movement',confidence:98},
{id:'P004',name:'Raj Kumar',age:71,sex:'M',zone:'C',level:1,seat:31,status:'stable',temp:36.7,heart:74,resp:18,posture:'Seated',movement:'Usual movement',confidence:95},
{id:'P005',name:'Sarah Lim',age:35,sex:'F',zone:'B',level:2,seat:20,status:'stable',temp:36.5,heart:82,resp:17,posture:'Seated',movement:'Usual movement',confidence:99},
{id:'P006',name:'Nur Aisyah Hassan',age:54,sex:'F',zone:'C',level:2,seat:32,status:'stable',temp:36.6,heart:79,resp:18,posture:'Seated',movement:'Usual movement',confidence:97},
{id:'P007',name:'Priya Nair',age:29,sex:'F',zone:'D',level:3,seat:43,status:'stable',temp:36.4,heart:77,resp:15,posture:'Seated',movement:'Usual movement',confidence:98},
{id:'P008',name:'Grace Wong',age:63,sex:'F',zone:'D',level:3,seat:44,status:'stable',temp:36.5,heart:81,resp:17,posture:'Seated',movement:'Usual movement',confidence:96},
{id:'P009',name:'Amira Abdullah',age:46,sex:'F',zone:'A',level:1,seat:3,status:'stable',temp:36.5,heart:78,resp:16,posture:'Seated',movement:'Usual movement',confidence:97},
{id:'P010',name:'Chloe Chen',age:39,sex:'F',zone:'B',level:2,seat:21,status:'stable',temp:36.6,heart:80,resp:17,posture:'Seated',movement:'Usual movement',confidence:98},
{id:'P011',name:'Arjun Patel',age:61,sex:'M',zone:'C',level:1,seat:33,status:'stable',temp:36.7,heart:75,resp:18,posture:'Seated',movement:'Usual movement',confidence:96},
{id:'P012',name:'Hana Ibrahim',age:52,sex:'F',zone:'D',level:3,seat:45,status:'stable',temp:36.4,heart:79,resp:16,posture:'Seated',movement:'Usual movement',confidence:97}
];
let patients=structuredClone(initialPatients), alerts=[], selected=null, demoRunning=false, simulationTimers=[], toastTimer;
const pin='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const time=()=>new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kuala_Lumpur'});
function getPatient(id){const p=patients.find(p=>p.id===id);if(!p)throw new Error('Unknown patient');return p;}
function ageText(date){const sec=Math.floor((Date.now()-date)/1000);return sec<60?'Just now':Math.floor(sec/60)+' min ago';}
function badge(p){return `<span class="status-badge badge-${p.status}">${labels[p.status]}</span>`;}
function renderPatients(){
const countPill=document.getElementById('patient-count-pill');if(countPill)countPill.textContent=patients.length;
$('patients').innerHTML=patients.map(p=>`<button class="patient-card ${p.status}" data-patient="${p.id}" aria-label="View ${p.name}, ${labels[p.status]}, Level ${p.level}, Zone ${p.zone}, Seat ${p.seat}"><span class="person"><span class="patient-avatar">${p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span><span class="patient-name">${p.name}</span><span class="patient-meta">${p.id} · ${p.age} yrs · ${p.sex}</span></span></span><span><span class="metric-label">Respiration</span><span class="metric-value">${p.resp} <small>/min</small></span><span class="metric-sub ${p.status==='urgent'?'changed':''}">${p.status==='urgent'?'Trend changed':'Radar estimate'}</span></span><span><span class="metric-label">Surface temp.</span><span class="metric-value">${p.temp.toFixed(1)}<small> °C</small></span><span class="metric-sub">Thermal estimate</span></span><span><span class="metric-label">Posture / activity</span><span class="posture">${p.posture}</span><span class="metric-sub ${p.posture==='Slumping'?'changed':''}">${p.movement}</span></span><span class="card-status">${badge(p)}<span class="location-label">${pin}L${p.level} · Zone ${p.zone} · Seat ${p.seat}</span></span></button>`).join('');
['stable','watch','urgent'].forEach(s=>$('count-'+s).textContent=patients.filter(p=>p.status===s).length);
}
function renderAlerts(){
const active=alerts.filter(a=>a.stage!=='completed');$('alert-count').textContent=active.length;
$('alerts').innerHTML=alerts.length?alerts.map(a=>{const p=getPatient(a.patientId);return `<article class="alert-card ${a.stage==='completed'?'resolved':''}"><div class="alert-top"><span class="alert-level">${a.stage==='completed'?'REASSESSMENT COMPLETE':a.videoStage==='watch'?'WATCH':a.videoStage==='urgent'?'URGENT REVIEW':'URGENT REVIEW'}</span><span class="alert-time">${ageText(a.created)}</span></div><h3>${p.name}</h3><p>${a.reason}</p><div class="alert-location">Zone ${p.zone} · Seat ${p.seat} <span> / </span> Level ${p.level}</div><button class="alert-open" data-alert="${a.id}">${a.stage==='completed'?'View patient & location':'View alert & location'}</button>${a.stage!=='new'?`<div class="alert-state">${stageLabel(a.stage)}</div>`:''}</article>`}).join(''):'<div class="empty-alerts">No active alerts.<br>All patients are in view.</div>';
}
function stageLabel(s){return {new:'Awaiting nurse acknowledgement',acknowledged:'Alert acknowledged · reassessment pending',completed:'Reassessment completed'}[s];}
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function seed(){alerts=[];renderPatients();renderAlerts();}

// Three demo floors. Corridors, zone aisles, lift E1 and stairwell S1 form a walkable graph.
const floorLevels=[1,2,3], nurseLevel=1;
let selectedTransfer='lift';
const zoneLayout={A:{x:235,y:30,first:1,top:true},B:{x:625,y:30,first:13,top:true},C:{x:235,y:310,first:25,top:false},D:{x:625,y:310,first:37,top:false}};
const seats=Object.entries(zoneLayout).flatMap(([zone,z])=>Array.from({length:12},(_,i)=>({seat:z.first+i,zone,row:Math.floor(i/4)+1,column:i%4+1,x:z.x+45+(i%4)*90,y:z.top?80+Math.floor(i/4)*55:355+Math.floor(i/4)*55})));
function seatInfo(seat){const s=seats.find(s=>s.seat===seat);if(!s)throw new Error('Seat has no route');return s;}
function shortestRoute(seat,level=1,mode=selectedTransfer){
if(!floorLevels.includes(level))throw new Error('Unknown floor');if(!['lift','stairs'].includes(mode))throw new Error('Unknown transfer route');
const target=seatInfo(seat),nodes={},edges=[];const add=(f,id,x,y)=>nodes[`${f}:${id}`]={floor:f,x,y};const link=(a,b,cost)=>edges.push([a,b,cost??Math.hypot(nodes[a].x-nodes[b].x,nodes[a].y-nodes[b].y)]);
for(const f of floorLevels){add(f,'station',100,265);add(f,'core',200,265);add(f,'liftHall',200,170);add(f,'lift',100,170);add(f,'stairsHall',200,390);add(f,'stairs',100,390);add(f,'west',415,265);add(f,'east',805,265);for(const [a,b]of [['station','core'],['core','liftHall'],['liftHall','lift'],['core','stairsHall'],['stairsHall','stairs'],['core','west'],['west','east']])link(`${f}:${a}`,`${f}:${b}`);
for(const [zone,z]of Object.entries(zoneLayout)){const x=z.x+180;add(f,`${zone}door`,x,z.top?225:310);link(`${f}:${zone==='A'||zone==='C'?'west':'east'}`,`${f}:${zone}door`);let previous=`${zone}door`;for(const row of (z.top?[3,2,1]:[1,2,3])){const y=z.top?80+(row-1)*55+27:355+(row-1)*55-27;const center=`${zone}row${row}`;add(f,center,x,y);link(`${f}:${previous}`,`${f}:${center}`);previous=center;for(const s of seats.filter(s=>s.zone===zone&&s.row===row)){add(f,`aisle${s.seat}`,s.x,y);add(f,`seat${s.seat}`,s.x,s.y);link(`${f}:${center}`,`${f}:aisle${s.seat}`);link(`${f}:aisle${s.seat}`,`${f}:seat${s.seat}`);}}}}
for(let f=1;f<3;f++)link(`${f}:${mode}`,`${f+1}:${mode}`,mode==='lift'?90:180);
const start=`${nurseLevel}:station`,end=`${level}:seat${seat}`,dist=Object.fromEntries(Object.keys(nodes).map(k=>[k,Infinity])),prev={},todo=new Set(Object.keys(nodes));dist[start]=0;while(todo.size){const at=[...todo].sort((a,b)=>dist[a]-dist[b])[0];if(!Number.isFinite(dist[at]))break;todo.delete(at);if(at===end)break;for(const [a,b,cost]of edges){const n=a===at?b:b===at?a:null;if(!n||!todo.has(n))continue;if(dist[at]+cost<dist[n]){dist[n]=dist[at]+cost;prev[n]=at;}}}if(!Number.isFinite(dist[end]))throw new Error('No walkable route');const path=[];for(let at=end;at;at=prev[at])path.unshift(at);const allPoints=path.map(k=>nodes[k]);let walking=0;for(let i=1;i<allPoints.length;i++)if(allPoints[i].floor===allPoints[i-1].floor)walking+=Math.hypot(allPoints[i].x-allPoints[i-1].x,allPoints[i].y-allPoints[i-1].y);
return {nodes:path,points:allPoints.filter(p=>p.floor===level).map(p=>[p.x,p.y]),allPoints,meters:Math.round(walking/20),level,mode,transfer:level!==nurseLevel,row:target.row,column:target.column};
}
function buildMap(p,route){
const seatMarkup=seats.map(s=>{const q=patients.find(q=>q.level===p.level&&q.seat===s.seat),chosen=s.seat===p.seat;const color=q?(q.status==='urgent'?'#d5223c':q.status==='watch'?'#e4a715':'#168453'):'#b8c6d8';return `<g data-map-seat="${s.seat}"><rect x="${s.x-26}" y="${s.y-18}" width="52" height="36" rx="6" fill="${chosen?'#ffe0e7':q?'#f0f6ff':'#f7f9fc'}" stroke="${chosen?'#c51f3a':'#cad7e7'}" stroke-width="${chosen?2.5:1}"/><path d="M${s.x-19} ${s.y+11}h38M${s.x-19} ${s.y+5}v10M${s.x+19} ${s.y+5}v10" stroke="#bccade" stroke-width="1.8"/><text x="${s.x}" y="${s.y+4}" text-anchor="middle" fill="${chosen?'#ad1730':'#526a8d'}" font-size="17" font-weight="700">${s.seat}</text>${q?`<circle cx="${s.x+25}" cy="${s.y-18}" r="5" fill="${color}" stroke="white" stroke-width="2"/>`:''}${chosen?`<circle class="patient-ring" cx="${s.x}" cy="${s.y}" r="30" fill="none" stroke="#d5223c" stroke-width="2"/>`:''}</g>`}).join('');
const transferStart=route.transfer?route.mode:'station',start=route.points[0];
return `<svg viewBox="0 0 1040 535" role="img" aria-label="Level ${p.level}. Route from ${route.transfer?route.mode==='lift'?'Lift E1':'Stairwell S1':'nurse station'} to Zone ${p.zone}, Seat ${p.seat}. 48 seats on this floor."><rect x="10" y="10" width="1020" height="515" rx="15" fill="#f5f8fc" stroke="#dce5f0"/><rect x="185" y="237" width="825" height="57" rx="6" fill="#e5edf8" stroke="none"/><path d="M200 165V395" stroke="#e5edf8" stroke-width="32"/><text x="615" y="285" text-anchor="middle" font-size="12" letter-spacing="2" fill="#758caf">MAIN CORRIDOR</text>${[['station',265,p.level===1?'NURSE STATION':'STAFF STATION'],['lift',170,'LIFT E1'],['stairs',390,'STAIRWELL S1']].map(([id,y,label])=>`<rect x="25" y="${y-30}" width="145" height="60" rx="8" fill="${transferStart===id?'#e2ecff':'#f1f5fb'}" stroke="${transferStart===id?'#7ea6ea':'#cbd9e9'}"/><text x="97" y="${y-12}" text-anchor="middle" font-size="14" fill="#355b93" font-weight="700">${label}</text><text x="97" y="${y+16}" text-anchor="middle" font-size="11" fill="#6f87aa">${transferStart===id?'ROUTE START':'LEVEL '+p.level}</text><path d="M170 ${y}H200" stroke="#c4d5ec" stroke-width="2"/>`).join('')}${Object.entries(zoneLayout).map(([zone,z])=>`<rect x="${z.x}" y="${z.y}" width="360" height="195" rx="9" fill="white" stroke="#c6d5e8" stroke-width="1.5"/><text x="${z.x+14}" y="${z.y+22}" font-size="15" fill="#6981a4" font-weight="700">ZONE ${zone}</text><path d="M${z.x+157} ${z.top?225:310}h46" stroke="white" stroke-width="5"/>`).join('')}<polyline class="route-line" points="${route.points.map(pt=>pt.join(',')).join(' ')}"/><circle cx="${start[0]}" cy="${start[1]}" r="7" fill="#1859e8" stroke="white" stroke-width="3"/>${seatMarkup}</svg>`;
}
function routeDirections(p,r){const transfer=r.mode==='lift'?'Lift E1':'Stairwell S1';const steps=r.transfer?[`From the nurse station on Level ${nurseLevel}, follow the corridor to ${transfer}.`,r.mode==='lift'?`Take Lift E1 to Level ${p.level}. Exit onto Level ${p.level}.`:`Use Stairwell S1 to go up ${p.level-nurseLevel} ${p.level-nurseLevel===1?'floor':'floors'}. Exit on Level ${p.level}.`,`Join the main corridor on Level ${p.level}.`]:[`Leave the nurse station on Level ${nurseLevel}. Enter the main corridor.`];steps.push(`${p.zone==='A'||p.zone==='C'?'At the first zone entrance':'Pass Zones A and C to the second zone entrance'}, turn ${zoneLayout[p.zone].top?'left':'right'} into Zone ${p.zone}.`,`Follow the blue route to Row ${r.row}, Seat ${p.seat}. Confirm ${p.name}'s wristband.`);return steps;}

function activeAlert(p){return alerts.find(a=>a.patientId===p.id&&a.stage!=='completed');}
function renderDialog(){const p=getPatient(selected),a=activeAlert(p),r=shortestRoute(p.seat,p.level);$('dialog-title').textContent=p.name;$('dialog-subtitle').textContent=`${p.id} · ${p.age} years · ${p.sex==='F'?'Female':'Male'} · Level ${p.level}, Zone ${p.zone}, Seat ${p.seat}`;
$('details').innerHTML=`${p.id==='P003'&&p.status==='watch'?'<div class="p003-dialog-photo"><img src="p003-watch.png" alt="P003 Watch reference image"><span>Watch reference</span></div>':p.id==='P003'&&p.status==='urgent'?'<div class="p003-dialog-photo"><img src="p003-fall-down.png" alt="P003 Urgent Review reference image"><span>Fall-down reference</span></div>':''}<div class="detail-status">${badge(p)}</div>${p.status!=='stable'?`<div class="detail-alert ${p.status==='watch'?'watch-detail':''}"><h3>${p.reason}</h3><p>${p.factors}</p></div>`:'<div class="detail-alert watch-detail"><h3>No active concerns</h3></div>'}<div class="detail-metrics"><div class="detail-metric"><span>Heart rate</span><strong>${p.heart} bpm</strong></div><div class="detail-metric"><span>Respiration</span><strong>${p.resp} /min</strong></div><div class="detail-metric"><span>Surface temp.</span><strong>${p.temp.toFixed(1)} °C</strong></div><div class="detail-metric"><span>Posture</span><strong>${p.posture}</strong></div><div class="detail-metric"><span>Movement</span><strong>${p.movement}</strong></div></div><div class="confidence">Patient match<strong>${p.confidence}%</strong><div class="confidence-track"><span style="width:${p.confidence}%"></span></div></div>`;
$('patient-level').textContent=`LEVEL ${p.level}`;$('floor-map').innerHTML=buildMap(p,r);
$('route-transfer').hidden=!r.transfer;$('transfer-lift').setAttribute('aria-pressed',String(selectedTransfer==='lift'));$('transfer-stairs').setAttribute('aria-pressed',String(selectedTransfer==='stairs'));
$('route-summary').innerHTML=`<strong>Level ${p.level} · Zone ${p.zone} · Seat ${p.seat}</strong><span>Approx. ${r.meters} m walking${r.transfer?' · '+(r.mode==='lift'?'Lift E1':'Stairwell S1'):''}</span>`;
$('directions').innerHTML=routeDirections(p,r).map(step=>`<li>${step}</li>`).join('');
$('response-status').textContent=a?stageLabel(a.stage):'Patient location shown';
const actions={new:['Acknowledge Alert','acknowledged'],acknowledged:['Reassessment completed','completed']};
$('response-actions').innerHTML=a?`<button class="primary-button" id="advance-response" data-next="${actions[a.stage][1]}">${actions[a.stage][0]}</button>`:'<button class="secondary-button" id="done-dialog">Close details</button>';
}
function openPatient(id){getPatient(id);selected=id;selectedTransfer='lift';renderDialog();if(!$('patient-dialog').open)$('patient-dialog').showModal();const p=getPatient(id);return {patientId:id,level:p.level,zone:p.zone,seat:p.seat,routeMeters:shortestRoute(p.seat,p.level).meters};}
function advanceResponse(next){if(!selected)throw new Error('Open an active alert first');const p=getPatient(selected),a=activeAlert(p);if(!a)throw new Error('No active alert for this patient');const valid={new:'acknowledged',acknowledged:'completed'};if(valid[a.stage]!==next)throw new Error('Response steps must be completed in order');a.stage=next;if(next==='completed'){p.status='stable';p.posture='Seated';p.movement='Usual movement';p.resp=18;p.temp=36.1;p.reason=undefined;p.factors=undefined;notify(`Reassessment completed for ${p.name}. Demo observations returned to baseline.`);if(p.id==='P002'){$('demo-status').textContent='Workflow complete. Reset to present it again.';demoRunning=false;$('run-demo').disabled=true;$('scenario').disabled=false;}}renderPatients();renderAlerts();renderDialog();return {patientId:p.id,stage:a.stage,status:labels[p.status]};}
function runDemo(scenario=$('scenario').value){
if(!['posture','respiration','temperature'].includes(scenario))throw new Error('Unknown simulated change');
if(demoRunning)throw new Error('Reset the demo before running it again');
demoRunning=true;$('scenario').value=scenario;$('run-demo').disabled=true;$('scenario').disabled=true;
const p=getPatient('P003');
$('demo-status').textContent='Updating P003 for the selected scenario…';
const changes={
posture:{temp:36.8,heart:96,resp:24,posture:'Slumping',movement:'Reduced movement',reason:'Slumping & reduced movement',factors:'The selected posture scenario updates P003 posture, movement, heart-rate and respiration demo values.'},
respiration:{temp:36.6,heart:102,resp:28,posture:'Seated',movement:'Low movement',reason:'Respiration pattern change',factors:'The selected respiration scenario updates P003 respiration and related demo observations.'},
temperature:{temp:37.4,heart:94,resp:23,posture:'Seated',movement:'Low movement',reason:'Rising surface-temperature trend',factors:'The selected temperature scenario updates P003 surface-temperature and related demo observations.'}
};
Object.assign(p,changes[scenario],{status:'watch'});const cctv=document.getElementById('aria-cctv');if(cctv)cctv.dataset.demoScenario=scenario;
alerts=alerts.filter(a=>a.patientId!=='P003');
alerts.unshift({id:'alert-sim-'+Date.now(),patientId:'P003',reason:p.reason,created:Date.now(),stage:'new',videoEvent:false,videoStage:'watch'});
renderPatients();renderAlerts();if(selected==='P003'&&$('patient-dialog').open)renderDialog();
$('demo-status').textContent='P003 updated · Watch · '+p.reason;
notify('P003 updated for the selected '+scenario+' scenario.');
return {patientId:'P003',stage:'watch',scenario};
}
function resetDemo(){simulationTimers.forEach(clearTimeout);simulationTimers=[];patients=structuredClone(initialPatients);demoRunning=false;selected=null;if($('patient-dialog').open)$('patient-dialog').close();$('run-demo').disabled=false;$('scenario').disabled=false;$('demo-status').textContent='Ready when you are.';seed();notify('Demo reset. All response steps are ready to present again.');return {reset:true};}
$('patients').addEventListener('click',e=>{const b=e.target.closest('[data-patient]');if(b)openPatient(b.dataset.patient);});
$('alerts').addEventListener('click',e=>{const b=e.target.closest('[data-alert]');if(b){const a=alerts.find(a=>a.id===b.dataset.alert);openPatient(a.patientId);}});
$('response-actions').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='advance-response')advanceResponse(b.dataset.next);else $('patient-dialog').close();});
$('route-transfer').addEventListener('click',e=>{const b=e.target.closest('[data-transfer]');if(!b||!selected)return;selectedTransfer=b.dataset.transfer;renderDialog();});
$('close-dialog').addEventListener('click',()=>$('patient-dialog').close());$('patient-dialog').addEventListener('click',e=>{if(e.target===$('patient-dialog')){const r=$('patient-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('patient-dialog').close();}});
$('patient-dialog').addEventListener('close',()=>{selected=null;});
$('run-demo').addEventListener('click',()=>{try{runDemo();}catch(e){notify(e.message);}});$('reset').addEventListener('click',resetDemo);
function updateHeaderDateTime(){
 const now=new Date();
 $('header-time').textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Kuala_Lumpur'})+' MYT';
 $('header-time').setAttribute('datetime',now.toISOString());
 $('header-date').textContent=now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kuala_Lumpur'});
}
seed();updateHeaderDateTime();setInterval(updateHeaderDateTime,1000);
setInterval(()=>{patients.forEach(p=>{if(p.status!=='stable')return;const base=initialPatients.find(q=>q.id===p.id);p.resp=base.resp+Math.floor(Math.random()*3)-1;p.temp=Math.round((base.temp+(Math.random()-.5)*.2)*10)/10;});renderPatients();renderAlerts();$('updated').textContent='Updated '+time();if(selected&&$('patient-dialog').open){const p=getPatient(selected);if(p.status==='stable')renderDialog();}},4000);
// Optional browser tool interface uses the same demo state and actions as the visible controls.
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const tools=[
{name:'get_patient_overview',title:'Read ARIA patient overview',description:'Read fictional patient statuses, locations, and response stages in this prototype.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({patients:patients.map(p=>({id:p.id,name:p.name,status:p.status,level:p.level,zone:p.zone,seat:p.seat})),alerts:alerts.map(a=>({patientId:a.patientId,stage:a.stage}))})},
{name:'start_alert_demo',title:'Start simulated ARIA alert',description:'Start a simulated change for John Doe; an urgent alert appears after detection. This does not contact staff.',inputSchema:{type:'object',properties:{scenario:{type:'string',enum:['posture','respiration','temperature']}},required:['scenario'],additionalProperties:false},execute:input=>{if(!input||typeof input.scenario!=='string')throw new Error('scenario is required');return runDemo(input.scenario);}},
{name:'open_patient_location',title:'Open patient location',description:'Open a fictional patient’s details and shortest route from the demo nurse station.',inputSchema:{type:'object',properties:{patientId:{type:'string'}},required:['patientId'],additionalProperties:false},execute:input=>{if(!input||typeof input.patientId!=='string')throw new Error('patientId is required');return openPatient(input.patientId);}},
{name:'advance_alert_response',title:'Advance simulated response',description:'Advance the selected alert through acknowledgement and completed reassessment in order. Completion resets simulated observations.',inputSchema:{type:'object',properties:{stage:{type:'string',enum:['acknowledged','completed']}},required:['stage'],additionalProperties:false},execute:input=>{if(!input||typeof input.stage!=='string')throw new Error('stage is required');return advanceResponse(input.stage);}}
];for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}


/* Video-time demo integration for P003. Playback time is the single source of truth. */
(()=>{
const video=document.getElementById('aria-cctv'); if(!video)return;
const el=id=>document.getElementById(id);
let videoAlertId=null,activeVideoStage='stable';
const originalPatientsById=Object.fromEntries(initialPatients.map(p=>[p.id,structuredClone(p)]));
function fmt(sec){sec=Math.max(0,Math.floor(sec||0));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function updateP003(stage){
 const p=getPatient('P003');
 // Clear any previous video-generated alert, but don't delete unrelated simulation workflow alerts.
 alerts=alerts.filter(a=>!a.videoEvent);
 if(stage==='stable'){
  Object.assign(p,structuredClone(originalPatientsById.P003));
  videoAlertId=null;
  el('p003-mini-status').className='status-badge badge-stable';el('p003-mini-status').textContent='Stable';el('p003-watch-image').hidden=true;el('p003-urgent-image').hidden=true;
  el('p003-observation').textContent='No active concerns';
  el('p003-message').textContent='Patient status is stable during this part of the video.';
 }else{
  const values=stage==='watch'
   ?{status:'watch',heart:92,resp:22,temp:36.7,posture:'Movement change',movement:'Watch event',reason:'Unusual movement detected',factors:'Watch status for P003 at video time 00:04–00:05. Review the patient and continue observing.'}
   :{status:'urgent',heart:108,resp:28,temp:36.9,posture:'Possible fall',movement:'Urgent review',reason:'Possible fall detected',factors:'Urgent Review status for P003 at video time 00:06 onward. Attend to P003 and verify the condition.'};
  Object.assign(p,values);
  el('p003-mini-status').className='status-badge '+(stage==='watch'?'badge-watch':'badge-urgent');
  el('p003-watch-image').hidden=stage!=='watch';
  el('p003-urgent-image').hidden=stage!=='urgent';
  el('p003-mini-status').textContent=stage==='watch'?'Watch':'Urgent Review';
  el('p003-observation').textContent=stage==='watch'?'Unusual movement detected':'Possible patient fall detected';
  el('p003-message').textContent=stage==='watch'?'Watch alert active. Continue observing P003.':'Urgent Review active. Attend to P003 and verify the condition.';
  const reason=stage==='watch'?'Unusual movement detected at video time 00:04.':'Possible fall detected at video time 00:06. Urgent Review required.';
  videoAlertId='video-p003-'+stage;
  alerts.unshift({id:videoAlertId,patientId:'P003',reason,created:Date.now(),stage:'new',videoEvent:true,videoStage:stage});
 }
 el('p003-heart').textContent=p.heart+' bpm';
 el('p003-resp').textContent=p.resp+' /min';
 el('p003-temp').textContent=p.temp.toFixed(1)+' °C';
 // Keep patient card, alert card, profile dialog and summary counters consistent.
 renderPatients();renderAlerts();
 if(selected==='P003'&&el('patient-dialog').open)renderDialog();
 const preview=el('p003-preview');
 preview.hidden=(stage==='stable');
 document.querySelector('.cctv-card').classList.toggle('has-alert',stage!=='stable');
 activeVideoStage=stage;
}
function sync(){
 const t=video.currentTime||0,d=Number.isFinite(video.duration)?video.duration:0;
 el('cctv-clock').textContent=fmt(t)+' / '+(d?fmt(d):'--:--');
 el('cctv-play-state').textContent=video.ended?'Ended · final alert retained':video.paused?(t>0?'Paused · alert retained':'Paused · ready'):'Playing · monitoring';
 // Seeking backward restores the matching interval too: 0–3 stable, 4–5 Watch, 6–end Urgent Review.
 if(video.paused && t===0 && video.dataset.demoScenario){return;}
 const stage=t<4?'stable':t<6?'watch':'urgent';
 if(stage!==activeVideoStage)updateP003(stage);
 if(video.ended)el('cctv-play-state').textContent='Ended · final alert retained';
}
function resetVideoDemo(){
 video.pause();video.currentTime=0;activeVideoStage='urgent';updateP003('stable');
 el('cctv-play-state').textContent='Paused · ready';sync();
}
video.addEventListener('timeupdate',sync);video.addEventListener('seeked',()=>{delete video.dataset.demoScenario;sync();});video.addEventListener('play',()=>{delete video.dataset.demoScenario;sync();});video.addEventListener('pause',sync);video.addEventListener('ended',sync);
el('cctv-restart').addEventListener('click',()=>{resetVideoDemo();video.play().catch(()=>{});});
const originalResetButton=document.getElementById('reset');if(originalResetButton)originalResetButton.addEventListener('click',()=>{resetVideoDemo();});
el('p003-open-details').addEventListener('click',()=>{
 const p=getPatient('P003');
 if(p.status!=='stable')openPatient('P003');
});
updateP003('stable');sync();
})();