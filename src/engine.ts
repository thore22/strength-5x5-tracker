import { initialLift, type LiftState, type Session, type SessionLift, type Settings, type State } from './model';
const round=(n:number,step:number)=>Number((Math.round(n/step)*step).toFixed(6));
export function warmups(weight:number,settings:Settings):SessionLift['warmups']{
 const {barWeight:bar,plateIncrement:step}=settings;
 if(weight<=bar||bar<=0||step<=0)return [];
 const result:SessionLift['warmups']=[];
 for(const [load,reps] of [[bar,5],[weight*.4,5],[weight*.6,3],[weight*.8,2]]){
  const w=bar+round(Math.max(0,load-bar),step);
  if(w<weight&&!result.some(x=>x.weight===w))result.push({weight:w,reps,done:false,skipped:false});
 }
 return result;
}
export function outcome(lift:SessionLift):'success'|'failure'|'skipped'{
 if(lift.skipped||lift.sets.some(s=>s.reps===null)||lift.sets.some(s=>s.weight!==lift.prescribedWeight))return 'skipped';
 return lift.sets.every(s=>s.reps!>=lift.prescription.minReps)?'success':'failure';
}
export function progress(previous:LiftState,lift:SessionLift,step:number):{state:LiftState;outcome:ReturnType<typeof outcome>;deload:boolean}{
 const result=outcome(lift),r=lift.prescription.rule;
 const state={...previous};let deload=false;
 if(result==='skipped')return {state,outcome:result,deload};
 if(r.mode==='manual')return {state:{...state,failures:0,successes:0,failureWeight:null,suggestion:null},outcome:result,deload};
 if(r.mode==='double'){
  state.suggestion=result==='success'&&lift.sets.every(s=>s.reps!>=lift.prescription.maxReps)?Math.max(0,lift.prescribedWeight+(lift.exercise.equipment==='assisted bodyweight'?-r.increment:r.increment)):null;
  return {state,outcome:result,deload};
 }
 if(result==='success'){
  state.failures=0;state.failureWeight=null;state.successes=previous.successes+1;
  state.weight=lift.prescribedWeight;
  if(state.successes>=r.frequency){state.weight=Math.max(0,state.weight+(lift.exercise.equipment==='assisted bodyweight'?-r.increment:r.increment));state.successes=0;}
 }else{
  state.successes=0;state.weight=lift.prescribedWeight;
  state.failures=previous.failureWeight===lift.prescribedWeight?previous.failures+1:1;state.failureWeight=lift.prescribedWeight;
  if(state.failures>=r.failuresBeforeDeload){
   state.weight=round(lift.prescribedWeight*(lift.exercise.equipment==='assisted bodyweight'?1+r.deloadPercent/100:1-r.deloadPercent/100),step);
   state.failures=0;state.failureWeight=null;deload=true;
  }
 }
 return {state,outcome:result,deload};
}
export function startSession(s:State,template:'A'|'B',now=new Date().toISOString()):void{
 if(s.active)throw new Error('Resume or discard your unfinished workout before starting another.');
 if(!s.templates[template].length)throw new Error('Add at least one exercise to this workout first.');
 s.active={id:crypto.randomUUID(),template,startedAt:now,completedAt:null,paused:false,notes:'',lifts:s.templates[template].map(p=>{
  const exercise=s.exercises.find(e=>e.id===p.exerciseId);if(!exercise)throw new Error('Unknown exercise in template.');
  const weight=s.progression[p.exerciseId]?.weight??0;
  return {exercise:structuredClone(exercise),prescription:structuredClone(p),prescribedWeight:weight,skipped:false,sets:Array.from({length:p.sets},()=>({weight,reps:null})),warmups:p.core&&exercise.equipment==='barbell'?warmups(weight,s.settings):[]};
 })};s.timerEnd=null;
}
export function finishSession(s:State,now=new Date().toISOString()):Session{
 const active=s.active;if(!active)throw new Error('No active workout to finish.');
 if(s.history.some(h=>h.id===active.id))throw new Error('This workout has already been completed.');
 const record=structuredClone(active);record.completedAt=now;record.paused=false;
 for(const lift of record.lifts){const result=progress(s.progression[lift.exercise.id]??initialLift(lift.prescribedWeight),lift,s.settings.plateIncrement);s.progression[lift.exercise.id]=result.state;lift.outcome=result.outcome;lift.deload=result.deload;}
 s.history.push(record);s.active=null;s.timerEnd=null;s.next=record.template==='A'?'B':'A';s.workoutsSinceBackup++;
 return record;
}
export function discardSession(s:State):void{s.active=null;s.timerEnd=null;}
export function remainingSeconds(end:number|null,now=Date.now()):number{return end===null?0:Math.max(0,Math.ceil((end-now)/1000));}
