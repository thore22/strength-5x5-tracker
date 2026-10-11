import { describe,it,expect } from 'vitest';
import { freshState } from './defaults';
import { discardSession,finishSession,outcome,progress,remainingSeconds,startSession,warmups } from './engine';
import { initialLift } from './model';
function attempt(reps=5){const s=freshState();startSession(s,'A');const l=s.active!.lifts[0];l.sets.forEach(x=>{x.reps=reps;});return l;}
describe('progression',()=>{
 it('successful 5×5 increases the next target',()=>expect(progress(initialLift(),attempt(),2.5).state.weight).toBe(22.5));
 it('missing reps repeats weight and three same-load failures deload',()=>{let s=initialLift(100);const l=attempt(4);l.prescribedWeight=100;l.sets.forEach(x=>{x.weight=100;});for(let i=0;i<2;i++){s=progress(s,l,2.5).state;expect(s.weight).toBe(100);}const r=progress(s,l,2.5);expect(r.state.weight).toBe(90);expect(r.state.failures).toBe(0);expect(r.deload).toBe(true);});
 it('success resets failure and success counters reset on failure',()=>{const x=initialLift();x.failures=2;x.failureWeight=20;x.successes=1;const l=attempt();l.prescription.rule.frequency=3;expect(progress(x,l,2.5).state.failures).toBe(0);expect(progress(x,attempt(4),2.5).state.successes).toBe(0);});
 it.each([1,2,3] as const)('frequency %s requires that many successes',frequency=>{let s=initialLift();const l=attempt();l.prescription.rule.frequency=frequency;for(let i=0;i<frequency;i++){s=progress(s,l,2.5).state;expect(s.weight).toBe(i===frequency-1?22.5:20);}});
 it('new load starts a separate failure streak',()=>{const x=initialLift(20);x.failures=2;x.failureWeight=22.5;expect(progress(x,attempt(4),2.5).state.failures).toBe(1);});
 it('manual mode does not change weight',()=>{const l=attempt();l.prescription.rule.mode='manual';expect(progress(initialLift(),l,2.5).state.weight).toBe(20);});
 it('double progression suggests only at range maximum',()=>{const l=attempt(10);l.prescription.rule.mode='double';l.prescription.maxReps=10;const r=progress(initialLift(),l,2.5);expect(r.state.weight).toBe(20);expect(r.state.suggestion).toBe(22.5);l.sets[0].reps=9;expect(progress(initialLift(),l,2.5).state.suggestion).toBeNull();});
 it('assistance suggestions decrease assistance',()=>{const l=attempt(10);l.exercise.equipment='assisted bodyweight';l.prescription.rule.mode='double';l.prescription.maxReps=10;expect(progress(initialLift(),l,2.5).state.suggestion).toBe(17.5);});
 it('skips, pending sets and changed loads never create failures',()=>{const l=attempt(4);l.skipped=true;expect(outcome(l)).toBe('skipped');l.skipped=false;l.sets[0].reps=null;expect(outcome(l)).toBe('skipped');l.sets[0].reps=4;l.sets[0].weight=10;expect(outcome(l)).toBe('skipped');});
 it('squats share A/B progression and deadlift uses 1×5 +5',()=>{const s=freshState();startSession(s,'A');s.active!.lifts[0].sets.forEach(x=>{x.reps=5;});finishSession(s);startSession(s,'B');expect(s.active!.lifts[0].prescribedWeight).toBe(22.5);const l=s.active!.lifts[2];expect(l.sets).toHaveLength(1);l.sets[0].reps=5;finishSession(s);expect(s.progression.deadlift.weight).toBe(25);});
 it('discard does not advance or affect progression, finish is not duplicated',()=>{const s=freshState();const p=structuredClone(s.progression);startSession(s,'A');discardSession(s);expect(s.next).toBe('A');expect(s.progression).toEqual(p);startSession(s,'A');finishSession(s);expect(()=>finishSession(s)).toThrow();expect(s.history).toHaveLength(1);});
 it('template edits cannot change active or historical snapshots',()=>{const s=freshState();startSession(s,'A');s.templates.A[0].minReps=3;s.templates.A=[];expect(s.active!.lifts[0].prescription.minReps).toBe(5);finishSession(s);expect(s.history[0].lifts[0].exercise.name).toBe('Barbell Back Squat');});
 it('warmups omit redundant/invalid loads and respect plates',()=>{const settings=freshState().settings;expect(warmups(20,settings)).toEqual([]);const w=warmups(100,settings);expect(w.map(x=>x.weight)).toEqual([20,40,60,80]);expect(w.every(x=>x.weight>=20&&x.weight<100&&(x.weight-20)%2.5===0)).toBe(true);});
 it('rest timer uses actual elapsed time',()=>{expect(remainingSeconds(100000,99500)).toBe(1);expect(remainingSeconds(100000,110000)).toBe(0);});
});
