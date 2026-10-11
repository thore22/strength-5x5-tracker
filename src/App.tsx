import { useEffect, useRef, useState } from 'react';
import { loadState, saveState } from './storage';
import type { State } from './model';
import Program from './components/Program';
import Workout from './components/Workout';
export default function App(){
 const [data,setData]=useState<State|null>(null),[page,setPage]=useState('Workout'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const current=useRef<{state:State;revision:number}|null>(null),locked=useRef(false);
 useEffect(()=>{loadState().then(x=>{current.current=x;setData(x.state);}).catch(e=>setError(String(e)));},[]);
 async function change(fn:(s:State)=>void){if(locked.current||!current.current)return;locked.current=true;setBusy(true);try{const s=structuredClone(current.current.state);fn(s);const revision=await saveState(s,current.current.revision);current.current={state:s,revision};setData(s);setError('');}catch(e){setError(String(e));}finally{locked.current=false;setBusy(false);}}
 return <div className="shell"><header><span className="brand">STRENGTH <b>5×5</b></span><small>YOUR TRAINING. YOUR PACE.</small></header>{error&&<p role="alert">{error}</p>}{!data?<p>Opening your training log…</p>:<main><p className="eyebrow">{page==='Workout'?'READY WHEN YOU ARE':page.toUpperCase()}</p><h1>{page==='Workout'?`Workout ${data.next}`:page}</h1>{page==='Workout'&&<Workout data={data} change={change} busy={busy}/>}{page==='Program'&&<Program data={data} change={change} busy={busy}/ >}{page==='Progress'&&<article><h2>Your story starts here</h2><p>Completed workouts will appear in your training log.</p></article>}{page==='Settings'&&<article><h2>Local by design</h2><p>Training data lives on this device in IndexedDB. Export backups regularly.</p><label>Bar weight<input type="number" value={data.settings.barWeight} onChange={e=>change(s=>{s.settings.barWeight=Number(e.target.value);})}/></label></article>}</main>}<nav aria-label="Main navigation">{['Workout','Program','Progress','Settings'].map(p=><button aria-current={page===p?'page':undefined} key={p} onClick={()=>setPage(p)}>{p}</button>)}</nav></div>;
}
