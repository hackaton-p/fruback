const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { Workbook } = require('exceljs');
const { createApplication } = require('../dist/application');
const { AuthService } = require('../dist/modules/auth/infrastructure/auth.service');
const { PackingStore } = require('../dist/shared/application/packing.store');
const { RoleName } = require('../dist/modules/auth/domain/enums');
const { isoWeek, weekDates } = require('../dist/shared/domain/dates');

describe('Packing MVP HTTP integration', { concurrency: false }, () => {
 let app, api, store, managerToken, plannerToken, shiftToken, outsiderToken, managerCookie;
 const planParameters={cratesPerWorkerHour:5.9,maxWorkers:300,shiftHours:10,maxOvertimeHours:2,startTime:'17:00',efficiencyFactor:0.8,volumeTolerancePercent:5};
 let plantId, otherPlantId, fruitId, planId, dayId, workdayId, attendance, initialSnapshot;
 const suffix = Date.now();
 const password = 'Packing-test-password-2026';
 const week = isoWeek(require('../dist/shared/domain/dates').nextPlanningMonday(new Date()));
 const date = weekDates(week.year, week.week)[0];
 const startedAt = `${date}T17:00:00-05:00`;
 const origin = process.env.BETTER_AUTH_URL;
 const authHeaders = token => ({ Authorization: `Bearer ${token}` });
 async function login(email) {
  const result=await api.post('/api/auth/sign-in/email').set('Origin',origin).send({email,password}).expect(200);
  assert.equal(typeof result.body.token,'string');
  return result;
 }
 async function workbook(headers, rows) {
  const book=new Workbook(); const sheet=book.addWorksheet('Projection'); sheet.addRow(headers); for(const row of rows) sheet.addRow(row);
  return Buffer.from(await book.xlsx.writeBuffer());
 }
 async function upload(type, bytes, status=201) {
  return api.post('/api/projections/import').set(authHeaders(plannerToken)).field('plantId',String(plantId)).field('fruitId',String(fruitId)).field('year',String(week.year)).field('week',String(week.week)).field('type',type).attach('file',bytes,'projection.xlsx').expect(status);
 }
 before(async () => {
  assert.ok(process.env.DB_NAME?.endsWith('_test'),'Use an isolated _test database');
  ({app}=await createApplication()); await app.init(); api=request(app.getHttpServer()); store=app.get(PackingStore);
  const parameters={cratesPerWorkerHour:'5.9',maxWorkers:300,shiftHours:'10',maxOvertimeHours:'2',startTime:'17:00',efficiencyFactor:'0.8',volumeTolerancePercent:'5'};
  plantId=(await store.save('plants',{name:`HTTP plant ${suffix}`,...parameters,configurationCompletedAt:new Date()})).id;
  otherPlantId=(await store.save('plants',{name:`Other HTTP plant ${suffix}`,...parameters,configurationCompletedAt:new Date()})).id;
  fruitId=(await store.find('fruits'))[0].id;
  const auth=app.get(AuthService);
  await auth.createUser({name:'Manager',email:`manager-${suffix}@example.test`,password,role:RoleName.DEPUTY_MANAGER});
  const manager=await login(`manager-${suffix}@example.test`);managerToken=manager.body.token;managerCookie=manager.headers['set-cookie'];
 },{timeout:30000});
 after(async () => {await app?.close();});
 it('serves Scalar and documents business plus authentication endpoints',async()=>{
  await api.get('/api').expect(200);
  const docs=await api.get('/docs').expect(200);assert.match(docs.text,/scalar/i);
  const spec=(await api.get('/openapi.json').expect(200)).body;
  for(const path of ['/api/plans','/api/plans/{id}/approve','/api/workdays/{id}/records','/api/dashboard','/api/auth/sign-in/email']) assert.ok(spec.paths[path],path);
  assert.ok(!spec.paths['/api/auth/sign-up/email']);
  assert.ok(spec.components.schemas.CreatePlanDto);
 });
 it('rejects unauthenticated access and public signup',async()=>{
  await api.get('/api/plants').expect(401);
  await api.post('/api/auth/sign-up/email').send({name:'Intruder',email:'intruder@example.test',password}).expect(404);
 });
 it('provisions scoped users through the deputy manager',async()=>{
  for(const [label,role,scope] of [['planner',RoleName.PLANNER,plantId],['shift',RoleName.SHIFT_MANAGER,plantId],['outsider',RoleName.PLANNER,otherPlantId]]) {
   const result=await api.post('/api/users').set(authHeaders(managerToken)).send({name:label,email:`${label}-${suffix}@example.test`,password,role,plantId:scope}).expect(201);
   assert.equal(result.body.plantId,scope);assert.equal(result.body.passwordHash,undefined);
  }
  plannerToken=(await login(`planner-${suffix}@example.test`)).body.token;
  shiftToken=(await login(`shift-${suffix}@example.test`)).body.token;
  outsiderToken=(await login(`outsider-${suffix}@example.test`)).body.token;
  const profile=(await api.get('/api/users/me').set(authHeaders(plannerToken)).expect(200)).body;assert.equal(profile.role,RoleName.PLANNER);
 });
 it('enforces roles, plant isolation, cookie origins and DTO validation',async()=>{
  await api.get(`/api/plants/${plantId}`).set(authHeaders(outsiderToken)).expect(403);
  await api.patch(`/api/plants/${plantId}`).set(authHeaders(plannerToken)).send({maxWorkers:999}).expect(403);
  await api.post('/api/users').set(authHeaders(plannerToken)).send({}).expect(403);
  await api.patch(`/api/plants/${plantId}`).set('Cookie',managerCookie).send({maxWorkers:300}).expect(403);
  await api.patch(`/api/plants/${plantId}`).set('Cookie',managerCookie).set('Origin',origin).send({maxWorkers:300}).expect(200);
  await api.patch(`/api/plants/${plantId}`).set(authHeaders(managerToken)).send({maxWorkers:null}).expect(400);
  await api.patch(`/api/plants/${plantId}`).set(authHeaders(managerToken)).send({unexpected:true}).expect(400);
  await api.get('/api/plans?limit=1000').set(authHeaders(managerToken)).expect(400);
 });
 it('validates complete spreadsheets and imports immutable harvest and commercial projections',async()=>{
  const bad=await workbook(['date','quantity'],[[date,13000],['2020-01-01',1]]);await upload('COSECHA',bad,400);
  const empty=(await api.get(`/api/projections?plantId=${plantId}&fruitId=${fruitId}&year=${week.year}&week=${week.week}`).set(authHeaders(plannerToken)).expect(200)).body;assert.equal(empty.length,0);
  await api.post('/api/projections/import').set(authHeaders(plannerToken)).field('plantId',String(plantId)).field('fruitId',String(fruitId)).field('year',String(week.year)).field('week',String(week.week)).field('type','COSECHA').field('unit','TONNES').attach('file',await workbook(['date','quantity'],[[date,13000]]),'projection.xlsx').expect(400);
  const harvest=await workbook(['date','quantity'],weekDates(week.year,week.week).slice(0,5).map((day,index)=>[day,index===0?13000:0]));await upload('COSECHA',harvest);await upload('COSECHA',harvest,409);
  await upload('COMERCIAL',await workbook(['customerName','country','quantity'],[[`Customer ${suffix}`,'Peru',15400]]));
 });
 it('simulates without saving, applies, rejects and reapplies an official plan',async()=>{
  const input={plantId,fruitId,...week,harvestScenario:'PROYECTADA',parameters:planParameters};
  await api.post('/api/plans/simulate').set(authHeaders(plannerToken)).send({...input,parameters:undefined}).expect(400);
  const modified=(await api.post('/api/plans/simulate').set(authHeaders(plannerToken)).send({...input,parameters:{...planParameters,efficiencyFactor:0.85}}).expect(200)).body;assert.equal(modified.hasModifiedParameters,true);assert.equal(modified.parameterChanges.length,1);
  const simulation=(await api.post('/api/plans/simulate').set(authHeaders(plannerToken)).send(input).expect(200)).body;assert.equal(simulation.days[0].workers,276);
  const before=(await api.get(`/api/plans?plantId=${plantId}`).set(authHeaders(plannerToken)).expect(200)).body;assert.equal(before.total,0);
  let plan=(await api.post('/api/plans').set(authHeaders(plannerToken)).send(input).expect(201)).body;planId=plan.id;assert.equal(plan.days[0].alerts[0].type,'PLANIFICACION');assert.equal(plan.hasModifiedParameters,false);assert.equal(plan.parameterChanges.length,0);
  await api.post(`/api/plans/${planId}/submit`).set(authHeaders(plannerToken)).expect(200);
  await api.post(`/api/plans/${planId}/reject`).set(authHeaders(managerToken)).send({comment:' '}).expect(400);
  await api.post(`/api/plans/${planId}/reject`).set(authHeaders(managerToken)).send({comment:'Please review'}).expect(200);
  plan=(await api.patch(`/api/plans/${planId}`).set(authHeaders(plannerToken)).send(input).expect(200)).body;assert.equal(plan.id,planId);assert.equal(plan.status,'BORRADOR');dayId=plan.days[0].id;initialSnapshot=plan.parametersSnapshot;
  attendance=plan.days[0].areas.map(a=>({areaId:a.areaId,arrivedWorkers:a.plannedWorkers,startingWorkers:a.plannedWorkers}));
 });
 it('serializes duplicate submissions and freezes approved targets and snapshots',async()=>{
  const results=await Promise.all([api.post(`/api/plans/${planId}/submit`).set(authHeaders(plannerToken)),api.post(`/api/plans/${planId}/submit`).set(authHeaders(plannerToken))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  await api.post(`/api/plans/${planId}/approve`).set(authHeaders(plannerToken)).expect(403);
  const pending=(await api.get(`/api/plans?plantId=${plantId}&status=PENDIENTE`).set(authHeaders(managerToken)).expect(200)).body;assert.equal(pending.statusCounts.PENDIENTE,1);
  await api.post(`/api/plans/${planId}/approve`).set(authHeaders(managerToken)).expect(200);
  const approved=(await api.get(`/api/plans?plantId=${plantId}&status=PENDIENTE`).set(authHeaders(managerToken)).expect(200)).body;assert.equal(approved.statusCounts.PENDIENTE,0);assert.equal(approved.statusCounts.APROBADO,1);
  await api.post(`/api/plans/${planId}/approve`).set(authHeaders(managerToken)).expect(409);
  await api.post('/api/plans').set(authHeaders(plannerToken)).send({plantId,fruitId,...week,harvestScenario:'PLUS_10'}).expect(400);
  const alternative=(await api.post('/api/plans').set(authHeaders(plannerToken)).send({plantId,fruitId,...week,harvestScenario:'+10',parameters:planParameters}).expect(201)).body;
  assert.notEqual(alternative.id,planId);
  await api.delete(`/api/plans/${alternative.id}`).set(authHeaders(plannerToken)).expect(204);
  await api.get(`/api/plans/${alternative.id}`).set(authHeaders(plannerToken)).expect(404);
  await api.patch(`/api/plans/${planId}`).set(authHeaders(plannerToken)).send({plantId,fruitId,...week,harvestScenario:'+10',parameters:planParameters}).expect(409);
  await api.patch(`/api/plants/${plantId}`).set(authHeaders(managerToken)).send({cratesPerWorkerHour:9}).expect(200);
  const plan=(await api.get(`/api/plans/${planId}`).set(authHeaders(plannerToken)).expect(200)).body;assert.deepEqual(plan.parametersSnapshot,initialSnapshot);
  await api.get(`/api/plans/${planId}`).set(authHeaders(outsiderToken)).expect(403);
 });
 it('estimates attendance without saving and preserves arrived and starting staff',async()=>{
  const estimated=(await api.get(`/api/workdays/estimate?planDayId=${dayId}&workers=186`).set(authHeaders(shiftToken)).expect(200)).body;
  assert.ok(Math.abs(estimated.estimatedHours-14.807)<0.01);assert.equal(estimated.riskOfExtraShift,true);
  const invalid=attendance.map((a,i)=>i===0?{...a,startingWorkers:a.arrivedWorkers+1}:a);
  await api.post('/api/workdays').set(authHeaders(shiftToken)).send({planDayId:dayId,startedAt,attendance:invalid}).expect(400);
  attendance=attendance.map(a=>({...a,startingWorkers:Math.floor(a.startingWorkers*0.65)}));
  const input={planDayId:dayId,startedAt,attendance};
  const results=await Promise.all([api.post('/api/workdays').set(authHeaders(shiftToken)).send(input),api.post('/api/workdays').set(authHeaders(shiftToken)).send(input)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);const opened=results.find(r=>r.status===201).body;workdayId=opened.id;
  assert.ok(Number(opened.initialEstimatedHours)>14);assert.equal(Number(opened.expectedDailyCrates),13000);
 });
 it('records all event types and uses accumulated person-hours after staff changes',async()=>{
  const at=hours=>new Date(new Date(startedAt).getTime()+hours*3600000).toISOString();
  const post=body=>api.post(`/api/workdays/${workdayId}/records`).set(authHeaders(shiftToken)).send(body);
  const initialWorkers=attendance.reduce((sum,a)=>sum+a.startingWorkers,0);
  const progress={type:'AVANCE',recordedAt:at(2),cumulativeReceivedCrates:15000,cumulativeProcessedCrates:2000};
  const record=(await post(progress).expect(201)).body;
  assert.equal(record.alerts.length,2);assert.ok(Number(record.estimatedHours)>7);
  await post({...progress,recordedAt:at(1)}).expect(400);
  await post({...progress,cumulativeProcessedCrates:1000}).expect(400);
  await post({type:'PERSONAL',recordedAt:at(2),areaId:attendance[0].areaId,staffChange:-100000}).expect(400);
  await post({type:'PERSONAL',recordedAt:at(2),areaId:attendance[0].areaId,staffChange:0}).expect(400);
  await post({type:'PERSONAL',recordedAt:at(2),areaId:attendance[0].areaId,staffChange:5,cumulativeProcessedCrates:5000}).expect(400);
  await post({type:'AVANCE',recordedAt:at(2),cumulativeReceivedCrates:15000}).expect(400);
  const staff=(await post({type:'PERSONAL',recordedAt:at(2),areaId:attendance[0].areaId,staffChange:5}).expect(201)).body;
  assert.equal(staff.presentWorkers,initialWorkers+5);assert.ok(Number(staff.estimatedHours)<Number(record.estimatedHours));
  const volume=(await post({type:'VOLUMEN',recordedAt:at(2),expectedDailyCrates:16000}).expect(201)).body;
  assert.ok(Number(volume.estimatedHours)>Number(staff.estimatedHours));assert.equal(volume.alerts[0].type,'VOLUMEN_ENTRANTE');
  await post({type:'VOLUMEN',recordedAt:at(2),expectedDailyCrates:10000}).expect(400);
  const last=(await post({...progress,recordedAt:at(3),cumulativeProcessedCrates:6000}).expect(201)).body;
  assert.ok(Math.abs(last.metrics.productivity-6000/(initialWorkers*2+(initialWorkers+5)))<0.0001);
  const details=(await api.get(`/api/workdays/${workdayId}`).set(authHeaders(shiftToken)).expect(200)).body;
  assert.equal(details.progress.length,4);assert.equal(details.attendance[0].arrivedWorkers,attendance[0].arrivedWorkers);
  assert.equal(details.attendance[0].startingWorkers,attendance[0].startingWorkers);
  assert.equal(Number(details.progress[0].estimatedHours),Number(record.estimatedHours));
 });
 it('adjusts hours only and closes workday and plan with a negative difference',async()=>{
  await api.patch(`/api/plan-days/${dayId}/hours`).set(authHeaders(shiftToken)).send({adjustedHours:16,reason:'PERSONAL_PRESENTE',targetCrates:20000}).expect(400);
  const day=(await api.patch(`/api/plan-days/${dayId}/hours`).set(authHeaders(shiftToken)).send({adjustedHours:16,reason:'PERSONAL_PRESENTE'}).expect(200)).body;assert.equal(Number(day.targetCrates),13000);
  const result=(await api.post(`/api/workdays/${workdayId}/close`).set(authHeaders(shiftToken)).send({workedHours:12,receivedCrates:15000,processedCrates:11000,discardedCrates:100,looseKg:1000,fixedKg:89200}).expect(200)).body;
  assert.equal(Number(result.difference),-2000);assert.equal(result.targetMet,false);
  const plan=(await api.get(`/api/plans/${planId}`).set(authHeaders(managerToken)).expect(200)).body;assert.equal(plan.status,'EN_EJECUCION');
  await api.patch(`/api/plan-days/${dayId}/hours`).set(authHeaders(shiftToken)).send({adjustedHours:17,reason:'PERSONAL_PRESENTE'}).expect(409);
 });
 it('returns scoped dashboard, alerts, details, catalogs and paginated lists',async()=>{
  const report=(await api.get(`/api/dashboard?plantId=${plantId}&year=${week.year}&week=${week.week}`).set(authHeaders(managerToken)).expect(200)).body;
  assert.equal(report.days.length,5);assert.equal(Number(report.kpis.processedCrates),11000);assert.equal(report.kpis.overtimeDays,1);assert.equal(report.kpis.closedDays,1);assert.equal(report.insights.length,3);assert.equal(report.references[0].productivity,9);
  await api.get(`/api/dashboard?plantId=${plantId}&year=${week.year}&week=${week.week}`).set(authHeaders(outsiderToken)).expect(403);
  const alerts=(await api.get(`/api/alerts?plantId=${plantId}&date=${date}`).set(authHeaders(shiftToken)).expect(200)).body;assert.ok(alerts.total>=3);
  await api.get(`/api/workdays/${workdayId}`).set(authHeaders(outsiderToken)).expect(403);
  const details=(await api.get(`/api/workdays/${workdayId}`).set(authHeaders(shiftToken)).expect(200)).body;assert.equal(details.progress.length,4);
  for(const path of ['/api/workdays','/api/customers','/api/fruits','/api/areas','/api/users','/api/plants']) await api.get(path).set(authHeaders(managerToken)).expect(200);
 });
 it('revokes sessions on logout',async()=>{
  await api.post('/api/auth/sign-out').set(authHeaders(outsiderToken)).set('Origin',origin).send({}).expect(200);
  await api.get('/api/users/me').set(authHeaders(outsiderToken)).expect(401);
 });
});
