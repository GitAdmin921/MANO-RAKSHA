import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "./lib/supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const MOODS = [
  { score: 1, label: "Very low" },
  { score: 2, label: "Low" },
  { score: 3, label: "Okay" },
  { score: 4, label: "Good" },
  { score: 5, label: "Great" },
];

function imgFor(gender, score = 3) {
  const prefix = gender === "male" ? "male" : "female";
  const suffix = score <= 1 ? "high-distress" : score === 2 ? "sad" : score === 3 ? "okay" : "good";
  return `/assets/${prefix}-${suffix}.png`;
}

function Icon({ name, size = 20 }) {
  const map = { home:"⌂", history:"◷", support:"♡", profile:"◯", menu:"☰", back:"←", mic:"◉",
    journal:"▤", resource:"✦", person:"♙", alert:"⚠", map:"⌖", sos:"SOS", lock:"▣", leaf:"❧",
    arrow:"›", check:"✓", play:"▶", send:"➤", logout:"↪", admin:"◆", bell:"◌" };
  return <span className={`icon icon-${name}`} style={{fontSize:size}} aria-hidden="true">{map[name] || "•"}</span>;
}

async function save(table, payload) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("user");
  const [screen, setScreen] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [moodEntries, setMoodEntries] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [resources, setResources] = useState([]);

  const refresh = async (user = session?.user) => {
    if (!supabase || !user) return;
    const uid = user.id;
    const [p, r, m, c, j, a, n, res] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("mood_entries").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(90),
      supabase.from("checkins").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(90),
      supabase.from("journal_entries").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(30),
      supabase.from("alerts").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(30),
      supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(30),
      supabase.from("resources").select("*").eq("published", true).order("created_at", {ascending:false}).limit(50),
    ]);
    setProfile(p.data || { display_name: user.email?.split("@")[0] || "Friend", gender:"other" });
    setRole(r.data?.role || "user");
    setMoodEntries(m.data || []);
    setCheckins(c.data || []);
    setJournalEntries(j.data || []);
    setAlerts(a.data || []);
    setNotifications(n.data || []);
    setResources(res.data || []);
  };

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({data}) => {
      setSession(data.session);
      if (data.session) await refresh(data.session.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) await refresh(next.user);
      else { setProfile(null); setRole("user"); }
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) return;
    const uid = session.user.id;
    const channel = supabase.channel(`patient-${uid}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"mood_entries",filter:`user_id=eq.${uid}`},()=>refresh())
      .on("postgres_changes",{event:"*",schema:"public",table:"checkins",filter:`user_id=eq.${uid}`},()=>refresh())
      .on("postgres_changes",{event:"*",schema:"public",table:"alerts",filter:`user_id=eq.${uid}`},()=>refresh())
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${uid}`},()=>refresh())
      .on("postgres_changes",{event:"*",schema:"public",table:"resources"},()=>refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const signOut = async () => { await supabase?.auth.signOut(); setScreen("home"); };
  const displayName = profile?.display_name || session?.user?.email?.split("@")[0] || "Friend";
  const gender = profile?.gender || "other";

  if (loading) return <div className="loading-screen"><div className="lotus">❧</div><h1>MANORAKSHA</h1><p>Preparing your safe space…</p></div>;
  if (!supabase) return <ConfigScreen />;
  if (!session) return <AuthScreen mode={authMode} setMode={setAuthMode} />;
  if (role === "admin" || role === "super_admin" || role === "content_manager") {
    return <AdminGate session={session} role={role} onExit={signOut} />;
  }

  return <div className={`app-shell theme-${gender}`}>
    <header className="topbar">
      <div><div className="eyebrow">MANORAKSHA • मनरक्षा</div><h1>{screenTitle(screen)}</h1></div>
      <button className="circle-btn" onClick={() => setScreen("profile")} aria-label="Profile"><Icon name="menu" /></button>
    </header>
    <main className="content page-pad">
      {notice && <div className="notice">{notice}</div>}
      {screen === "home" && <Home profile={profile} moodEntries={moodEntries} onNavigate={setScreen} onSaved={refresh} gender={gender} />}
      {screen === "checkin" && <Checkin profile={profile} gender={gender} onSaved={refresh} onNavigate={setScreen} />}
      {screen === "voice" && <Voice onNavigate={setScreen} />}
      {screen === "monitor" && <Monitor moodEntries={moodEntries} checkins={checkins} alerts={alerts} onNavigate={setScreen} />}
      {screen === "journal" && <Journal entries={journalEntries} onSaved={refresh} />}
      {screen === "report" && <Report moodEntries={moodEntries} checkins={checkins} alerts={alerts} />}
      {screen === "support" && <Support resources={resources} onNavigate={setScreen} />}
      {screen === "map" && <SupportMap />}
      {screen === "profile" && <Profile profile={profile} role={role} onSignOut={signOut} onSaved={refresh} />}
    </main>
    <nav className="bottom-nav">
      <NavItem icon="home" label="Home" active={screen==="home"} onClick={()=>setScreen("home")} />
      <NavItem icon="history" label="Monitor" active={["monitor","report"].includes(screen)} onClick={()=>setScreen("monitor")} />
      <NavItem icon="support" label="Support" active={["support","map","voice"].includes(screen)} onClick={()=>setScreen("support")} />
      <NavItem icon="profile" label="Profile" active={screen==="profile"} onClick={()=>setScreen("profile")} />
    </nav>
  </div>;
}

function screenTitle(s){return {home:"Home",checkin:"Daily Check-in",voice:"Voice Check-in",monitor:"Mental Health Monitor",journal:"Daily Journal",report:"Weekly Report",support:"Support & Resources",map:"Localized Support",profile:"Privacy & Profile"}[s]||"Support";}

function AuthScreen({mode,setMode}) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [gender,setGender]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{
    if(mode==="signup"){
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name,gender}}});
      if(error)throw error;
      if(!data.session) setError("Account created. Check your email to confirm it, then log in.");
    } else { const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)throw error; }
  }catch(err){setError(err.message||"Authentication failed.");}finally{setBusy(false);}};
  return <div className="auth-screen"><div className="auth-card">
    <div className="brand-symbol">❧</div><div className="eyebrow">MANORAKSHA • मनरक्षा</div>
    <h1>{mode==="signup"?"Create your safe space":"Welcome back"}</h1>
    <p className="auth-copy">{mode==="signup"?"A private place to check in, reflect and find support.":"Your support space is ready when you are."}</p>
    <form onSubmit={submit}>
      {mode==="signup"&&<><label>Name<input value={name} onChange={e=>setName(e.target.value)} required /></label><label>How should the app adapt to you?<select value={gender} onChange={e=>setGender(e.target.value)} required><option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Prefer not to say</option></select></label></>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required /></label>
      {error&&<p className="error">{error}</p>}
      <button className="primary-btn wide" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account":"Login"}</button>
    </form>
    <button className="text-btn wide" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"New here? Create an account":"Already have an account? Login"}</button>
    <p className="disclaimer">Your account uses Supabase authentication. MANORAKSHA is a supportive assistant, not a doctor or emergency service.</p>
  </div></div>;
}

function ConfigScreen(){return <div className="loading-screen"><div className="brand-symbol">❧</div><h1>MANORAKSHA</h1><p>Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the Vercel environment variables.</p></div>;}

function Home({profile,moodEntries,onNavigate,onSaved,gender}) {
  const today = new Date().toISOString().slice(0,10);
  const todayEntry = moodEntries.find(x=>x.created_at?.slice(0,10)===today);
  const score = todayEntry?.score || 3;
  const label = score<=1?"Needs immediate support":score===2?"Needs gentle support":score===3?"Moderate stress":"Doing well";
  return <div className="stack">
    <section className="welcome-card"><div><p className="muted">Your private support space</p><h2>Hello, {profile?.display_name||"Friend"} <span>♡</span></h2></div><span className="status-pill">Protected</span></section>
    <section className="card hero-card"><div><div><p className="muted">Today</p><h3>How are you feeling?</h3><p className="hero-sub">One small check-in helps build your personal timeline.</p></div><img src={imgFor(gender,score)} alt="" /></div><button className="primary-btn wide" onClick={()=>onNavigate("checkin")}>{todayEntry?"Update today's check-in":"Start today's check-in"} <Icon name="arrow"/></button></section>
    <section className="card state-card"><div className="state-top"><div><p className="muted">Latest recorded state</p><h3>{label}</h3><small>{todayEntry?`Mood score ${score}/5`:"No check-in recorded today"}</small></div><img className="state-avatar" src={imgFor(gender,score)} alt="" /></div><button className="link-btn" onClick={()=>onNavigate("monitor")}>View real history <Icon name="arrow"/></button></section>
    <div className="quick-grid"><QuickCard icon="mic" label="Voice AI" onClick={()=>onNavigate("voice")} /><QuickCard icon="journal" label="Journal" onClick={()=>onNavigate("journal")} /><QuickCard icon="history" label="My monitor" onClick={()=>onNavigate("monitor")} /><QuickCard icon="resource" label="Resources" onClick={()=>onNavigate("support")} /></div>
    <section className="safety-card"><div><strong>Need urgent help?</strong><p>If you are in immediate danger, contact local emergency services or a trusted person.</p></div><button onClick={()=>window.location.href="tel:112"}>112</button></section>
    <p className="privacy-strip"><Icon name="lock" size={17}/><span>Your records are tied to your account and protected by Supabase Row Level Security.</span></p>
  </div>;
}

function Checkin({gender,onSaved,onNavigate}) {
  const [score,setScore]=useState(3); const [stress,setStress]=useState(5); const [sleep,setSleep]=useState(7); const [note,setNote]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  const submit=async()=>{setBusy(true);try{
    await save("mood_entries",{user_id:(await supabase.auth.getUser()).data.user.id,score,label:MOODS[score-1]?.label,note,source:"manual"});
    await save("checkins",{user_id:(await supabase.auth.getUser()).data.user.id,stress_score:stress,sleep_hours:sleep,notes:note});
    if(score<=1||stress>=9) await save("alerts",{user_id:(await supabase.auth.getUser()).data.user.id,severity:score<=1?"critical":"high",reason:"High distress/stress reported during check-in.",status:"open"});
    await onSaved();setDone(true);
  }catch(e){alert(e.message)}finally{setBusy(false)}};
  return <div className="stack"><button className="back-btn" onClick={()=>onNavigate("home")}><Icon name="back"/> Back</button>
    <section className="card form-card"><p className="muted">Private check-in</p><h2>How are you feeling today?</h2><div className="mood-row five">{MOODS.map(m=><button key={m.score} className={`mood-tile ${score===m.score?"selected":""}`} onClick={()=>setScore(m.score)}><img src={imgFor(gender,m.score)} alt="" /><span>{m.score}</span><small>{m.label}</small></button>)}</div>
    <label>Stress level <strong>{stress}/10</strong><input type="range" min="0" max="10" value={stress} onChange={e=>setStress(+e.target.value)}/></label>
    <label>Sleep last night <strong>{sleep}h</strong><input type="range" min="0" max="12" step=".5" value={sleep} onChange={e=>setSleep(+e.target.value)}/></label>
    <label>Anything you want MANORAKSHA to know? <textarea rows="4" value={note} onChange={e=>setNote(e.target.value)} placeholder="You can leave this blank." /></label>
    <button className="primary-btn wide" onClick={submit} disabled={busy}>{busy?"Saving securely…":"Save check-in"}</button>
    {done&&<div className="success"><Icon name="check"/> Saved to your private timeline.</div>}</section>
  </div>;
}

function Voice({onNavigate}) {
  const [text,setText]=useState("");const [reply,setReply]=useState("");const [listening,setListening]=useState(false);const [busy,setBusy]=useState(false);const rec=useRef(null);
  const start=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("Voice recognition is not supported in this browser.");return;}if(listening){rec.current?.stop();return;}const r=new SR();r.lang="en-IN";r.continuous=false;r.interimResults=true;r.onstart=()=>setListening(true);r.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;setText(t)};r.onerror=()=>setListening(false);r.onend=()=>setListening(false);rec.current=r;r.start();};
  const send=async()=>{if(!text.trim())return;setBusy(true);setReply("");try{if(!API_BASE)throw new Error("VITE_API_BASE_URL is not configured.");const res=await fetch(`${API_BASE}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text.trim()})});const data=await res.json();if(!res.ok)throw new Error(data.detail||"AI request failed");setReply(data.reply||"");}catch(e){setReply(`I could not reach MANORAKSHA AI right now. ${e.message}`)}finally{setBusy(false)}};
  return <div className="stack"><button className="back-btn" onClick={()=>onNavigate("home")}><Icon name="back"/> Back</button><section className="card voice-card"><div className={`mic-orb ${listening?"listening":""}`}><button onClick={start}><Icon name="mic" size={40}/></button></div><p className="center muted">{listening?"Listening…":"Tap the microphone"}</p><h2 className="center">Talk when typing feels difficult.</h2><p className="center helper">Your voice is sent to the MANORAKSHA backend only when you press send.</p><textarea value={text} onChange={e=>setText(e.target.value)} rows="4" placeholder="Or type what you want to say…" /><button className="primary-btn wide" onClick={send} disabled={busy}>{busy?"MANORAKSHA is thinking…":"Send to MANORAKSHA AI"} <Icon name="send"/></button>{reply&&<div className="ai-reply"><div className="ai-badge">MANORAKSHA AI</div><p>{reply}</p></div>}</section><p className="disclaimer">Supportive conversation only. Not a diagnosis, doctor, therapist, or emergency service.</p></div>;
}

function Monitor({moodEntries,checkins,alerts,onNavigate}) {
  const last7=moodEntries.slice(0,7).reverse();const avg=last7.length?(last7.reduce((a,x)=>a+x.score,0)/last7.length).toFixed(1):"—";const open=alerts.filter(a=>a.status==="open").length;
  return <div className="stack"><section className="card report-card"><div className="section-head"><div><p className="muted">Real database records</p><h2>Mood timeline</h2></div><span className="date-chip">{moodEntries.length} entries</span></div><div className="bar-chart">{last7.map((x,i)=><div className="bar-col" key={x.id}><div className="bar" style={{height:`${x.score*28}px`}}/><small>{new Date(x.created_at).toLocaleDateString(undefined,{weekday:"short"}).slice(0,2)}</small></div>)}</div>{!last7.length&&<p className="empty">Your graph will appear after your first check-in.</p>}</section>
  <section className="metric-grid"><Metric value={avg} label="7-entry mood avg"/><Metric value={checkins.length} label="Check-ins"/><Metric value={open} label="Open alerts"/></section>
  <section className="insight-card"><div className="insight-icon">✦</div><div><p className="muted">Interpretation</p><h3>{last7.length?"This is your recorded pattern, not a clinical diagnosis.":"Start checking in to build a longitudinal pattern."}</h3><p>MANORAKSHA should use validated models and human review before any clinical or predictive decision is made.</p></div></section>
  <button className="outline-btn wide" onClick={()=>onNavigate("report")}>Open weekly condition report <Icon name="arrow"/></button></div>;
}

function Metric({value,label}){return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;}

function Journal({entries,onSaved}) {
 const [title,setTitle]=useState("");const [body,setBody]=useState("");const [busy,setBusy]=useState(false);
 const submit=async()=>{if(!body.trim())return;setBusy(true);try{const {data:{user}}=await supabase.auth.getUser();await save("journal_entries",{user_id:user.id,title:title.trim()||"Daily reflection",body:body.trim()});setTitle("");setBody("");await onSaved();}catch(e){alert(e.message)}finally{setBusy(false)}};
 return <div className="stack"><section className="card form-card"><p className="muted">Private journal</p><h2>Write without judgement.</h2><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title (optional)" /><textarea value={body} onChange={e=>setBody(e.target.value)} rows="7" placeholder="What is on your mind?" /><button className="primary-btn wide" onClick={submit} disabled={busy}>{busy?"Saving…":"Save reflection"}</button></section><section className="card list-card"><h3>Previous reflections</h3>{entries.length?entries.map(e=><article className="entry" key={e.id}><div><strong>{e.title}</strong><small>{new Date(e.created_at).toLocaleString()}</small></div><p>{e.body}</p></article>):<p className="empty">No journal entries yet.</p>}</section></div>;
}

function Report({moodEntries,checkins,alerts}){const recent=moodEntries.slice(0,7);const avg=recent.length?(recent.reduce((a,x)=>a+x.score,0)/recent.length).toFixed(1):"—";const stress=checkins.slice(0,7);const sAvg=stress.length?(stress.reduce((a,x)=>a+(x.stress_score??0),0)/stress.length).toFixed(1):"—";return <div className="stack"><section className="card report-card"><p className="muted">Longitudinal summary</p><h2>Your latest report</h2><div className="report-kpis"><Metric value={avg} label="Mood / 5"/><Metric value={sAvg} label="Stress / 10"/><Metric value={alerts.length} label="Alerts"/></div><p className="report-note">This report summarizes recorded app data. It is not a medical assessment and should not be used alone for diagnosis or treatment.</p></section><section className="card list-card"><h3>Recent check-ins</h3>{stress.length?stress.map(x=><div className="timeline-row" key={x.id}><span>{new Date(x.created_at).toLocaleDateString()}</span><strong>Stress {x.stress_score ?? "—"}/10</strong><small>{x.sleep_hours ?? "—"}h sleep</small></div>):<p className="empty">No check-in history yet.</p>}</section></div>}

function Support({resources,onNavigate}){return <div className="stack"><section className="support-intro"><div className="support-heart">❧</div><h2>You are not alone.</h2><p>Choose the next safe step that feels manageable.</p></section><SupportCard icon="person" title="Professional support" text="Find nearby hospitals, clinics and support services." action="Open map" onClick={()=>onNavigate("map")}/><SupportCard icon="sos" title="Emergency SOS" text="For immediate danger, call emergency services." action="112" danger onClick={()=>window.location.href="tel:112"}/><section className="card list-card"><div className="section-head"><div><p className="muted">Admin-published</p><h3>Support resources</h3></div><Icon name="resource"/></div>{resources.length?resources.map(r=><Resource key={r.id} r={r}/>):<p className="empty">No published resources yet. Admin content will appear here automatically.</p>}</section></div>}

function Resource({r}){const url=r.storage_path;if(r.resource_type==="video"&&url)return <a className="resource" href={url} target="_blank" rel="noreferrer"><span className="resource-icon"><Icon name="play"/></span><span><strong>{r.title}</strong><small>{r.description||"Video resource"}</small></span><Icon name="arrow"/></a>;return <article className="resource"><span className="resource-icon"><Icon name={r.resource_type==="image"?"resource":"journal"}/></span><span><strong>{r.title}</strong><small>{r.description||r.resource_type}</small></span></article>}

function SupportCard({icon,title,text,action,onClick,danger}){return <button className={`support-card ${danger?"danger":""}`} onClick={onClick}><span className="support-icon"><Icon name={icon}/></span><span className="support-copy"><strong>{title}</strong><small>{text}</small></span><span className="support-action">{action} <Icon name="arrow" size={16}/></span></button>}

function SupportMap(){
 const mapRef=useRef(null);const mapInst=useRef(null);const [places,setPlaces]=useState([]);const [loc,setLoc]=useState(null);const [status,setStatus]=useState("Tap Locate me to find nearby support.");const locate=()=>{if(!navigator.geolocation){setStatus("Location is not supported.");return;}setStatus("Requesting location…");navigator.geolocation.getCurrentPosition(async p=>{const {latitude,longitude}=p.coords;setLoc([latitude,longitude]);setStatus("Finding nearby support…");try{const q=`[out:json][timeout:15];(nwr(around:5000,${latitude},${longitude})["amenity"~"hospital|clinic|doctors|social_facility"];nwr(around:5000,${latitude},${longitude})["healthcare"];);out center tags;`;const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({data:q})});const d=await r.json();const rows=d.elements.map(x=>({id:x.id,name:x.tags?.name||"Nearby support service",lat:x.lat??x.center?.lat,lon:x.lon??x.center?.lon,type:x.tags?.healthcare||x.tags?.amenity||"support"})).filter(x=>x.lat&&x.lon).slice(0,20);setPlaces(rows);setStatus(`${rows.length} nearby support locations found.`)}catch{setStatus("Could not load nearby locations. Try again.")}},()=>setStatus("Location permission was denied or unavailable."),{enableHighAccuracy:true,timeout:15000,maximumAge:300000})};
 useEffect(()=>{if(!mapRef.current||mapInst.current)return;const m=L.map(mapRef.current).setView([20.5937,78.9629],5);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(m);mapInst.current=m;return()=>m.remove()},[]);
 useEffect(()=>{if(!mapInst.current)return;const m=mapInst.current;m.eachLayer(l=>{if(l instanceof L.Marker) m.removeLayer(l)});if(loc){m.setView(loc,13);L.marker(loc).addTo(m).bindPopup("Your approximate location").openPopup()}places.forEach(p=>L.marker([p.lat,p.lon]).addTo(m).bindPopup(`<b>${escapeHtml(p.name)}</b><br/>${escapeHtml(p.type)}`))},[loc,places]);
 return <div className="stack"><section className="card map-card"><div className="map-toolbar"><div><p className="muted">Location-aware support</p><h3>Nearby help</h3></div><button className="primary-small" onClick={locate}>Locate me</button></div><div ref={mapRef} className="real-map"/><p className="map-status">{status}</p></section>{places.length>0&&<section className="card list-card"><h3>Nearby places</h3>{places.map(p=><div className="local-support-item" key={p.id}><div><strong>{p.name}</strong><small>{p.type}</small></div><a className="small-direction-btn" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}>Directions</a></div>)}</section>}<p className="disclaimer">Map data is provided for finding support locations. Verify availability and services before travelling.</p></div>;
}

function Profile({profile,role,onSignOut,onSaved}){const [name,setName]=useState(profile?.display_name||"");const [gender,setGender]=useState(profile?.gender||"other");const [busy,setBusy]=useState(false);const saveProfile=async()=>{setBusy(true);try{const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("profiles").update({display_name:name.trim(),gender,updated_at:new Date().toISOString()}).eq("id",user.id);if(error)throw error;await onSaved();alert("Profile saved.");}catch(e){alert(e.message)}finally{setBusy(false)}};return <div className="stack"><section className="card profile-hero"><img src={imgFor(gender,3)} className="profile-avatar" alt="" /><div><p className="muted">Account</p><h2>{name||"Friend"}</h2><p>{role}</p></div></section><section className="card form-card"><label>Display name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Visual experience<select value={gender} onChange={e=>setGender(e.target.value)}><option value="female">Female</option><option value="male">Male</option><option value="other">Neutral</option></select></label><button className="primary-btn wide" onClick={saveProfile} disabled={busy}>{busy?"Saving…":"Save profile"}</button></section><section className="card privacy-card"><div className="privacy-row"><Icon name="lock"/><div><strong>Privacy by design</strong><p>Personal tables use user-scoped Row Level Security in the Supabase schema.</p></div></div><div className="privacy-row"><Icon name="bell"/><div><strong>Safety escalation</strong><p>High-stress check-ins can create an alert record for authorized staff workflows.</p></div></div></section><button className="outline-btn wide" onClick={onSignOut}><Icon name="logout"/> Sign out</button></div>}

function AdminGate({session,role,onExit}){return <div className="admin-shell"><header className="admin-top"><div><div className="eyebrow">MANORAKSHA</div><h1>Operations Console</h1></div><button className="outline-btn" onClick={onExit}>Exit</button></header><AdminDashboard role={role} session={session}/></div>}

function AdminDashboard({role}) {
 const [stats,setStats]=useState({users:0,moods:0,checkins:0,alerts:0});const [users,setUsers]=useState([]);const [alerts,setAlerts]=useState([]);const [messages,setMessages]=useState([]);const [resources,setResources]=useState([]);const [title,setTitle]=useState("");const [body,setBody]=useState("");const [target,setTarget]=useState("");const [rTitle,setRTitle]=useState("");const [rDesc,setRDesc]=useState("");const [rType,setRType]=useState("article");const [rUrl,setRUrl]=useState("");
 const load=async()=>{const [{count:usersC},{count:moodsC},{count:checksC},{count:alertsC},u,a,msg,res]=await Promise.all([
  supabase.from("profiles").select("*",{count:"exact",head:true}),supabase.from("mood_entries").select("*",{count:"exact",head:true}),supabase.from("checkins").select("*",{count:"exact",head:true}),supabase.from("alerts").select("*",{count:"exact",head:true}).eq("status","open"),
  supabase.from("profiles").select("*").order("created_at",{ascending:false}).limit(100),supabase.from("alerts").select("*,profiles(display_name)").order("created_at",{ascending:false}).limit(100),supabase.from("admin_messages").select("*").order("created_at",{ascending:false}).limit(50),supabase.from("resources").select("*").order("created_at",{ascending:false}).limit(50)
 ]);setStats({users:usersC||0,moods:moodsC||0,checkins:checksC||0,alerts:alertsC||0});setUsers(u.data||[]);setAlerts(a.data||[]);setMessages(msg.data||[]);setResources(res.data||[])};
 useEffect(()=>{load();const ch=supabase.channel("admin-live").on("postgres_changes",{event:"*",schema:"public",table:"mood_entries"},load).on("postgres_changes",{event:"*",schema:"public",table:"alerts"},load).on("postgres_changes",{event:"*",schema:"public",table:"admin_messages"},load).on("postgres_changes",{event:"*",schema:"public",table:"resources"},load).subscribe();return()=>supabase.removeChannel(ch)},[]);
 const send=async()=>{if(!target||!title||!body)return;const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("admin_messages").insert({sender_id:user.id,target_user_id:target,title,body});if(error)alert(error.message);else{setTitle("");setBody("");setTarget("");await load()}};
 const publish=async()=>{if(!rTitle)return;const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("resources").insert({title:rTitle,description:rDesc,resource_type:rType,storage_path:rUrl||null,published:true,created_by:user.id});if(error)alert(error.message);else{setRTitle("");setRDesc("");setRUrl("");await load()}};
 return <main className="admin-content"><div className="admin-badge">Role: {role}</div><section className="admin-stats"><Metric value={stats.users} label="Users"/><Metric value={stats.moods} label="Mood records"/><Metric value={stats.checkins} label="Check-ins"/><Metric value={stats.alerts} label="Open alerts"/></section><section className="admin-grid"><section className="card list-card"><h2>User directory</h2>{users.map(u=><div className="admin-row" key={u.id}><div><strong>{u.display_name||"Unnamed user"}</strong><small>{u.gender||"not specified"} • {u.id.slice(0,8)}…</small></div><span>{new Date(u.created_at).toLocaleDateString()}</span></div>)}</section><section className="card list-card"><h2>Open / recent alerts</h2>{alerts.length?alerts.map(a=><div className="admin-row" key={a.id}><div><strong>{a.severity.toUpperCase()}</strong><small>{a.profiles?.display_name||a.user_id.slice(0,8)}… • {a.reason||"No reason"}</small></div><span>{a.status}</span></div>):<p className="empty">No alerts.</p>}</section></section><section className="admin-grid"><section className="card form-card"><h2>Send message</h2><select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Select user</option>{users.map(u=><option value={u.id} key={u.id}>{u.display_name||u.id.slice(0,8)}</option>)}</select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Message title"/><textarea value={body} onChange={e=>setBody(e.target.value)} rows="4" placeholder="Supportive message"/><button className="primary-btn" onClick={send}>Send to user</button></section><section className="card form-card"><h2>Publish resource</h2><input value={rTitle} onChange={e=>setRTitle(e.target.value)} placeholder="Resource title"/><textarea value={rDesc} onChange={e=>setRDesc(e.target.value)} rows="3" placeholder="Description"/><select value={rType} onChange={e=>setRType(e.target.value)}><option value="article">Article</option><option value="exercise">Exercise</option><option value="video">Video</option><option value="image">Image</option></select><input value={rUrl} onChange={e=>setRUrl(e.target.value)} placeholder="Public URL (optional)"/><button className="primary-btn" onClick={publish}>Publish</button></section></section><section className="card list-card"><h2>Published / managed resources</h2>{resources.map(r=><div className="admin-row" key={r.id}><div><strong>{r.title}</strong><small>{r.resource_type} • {r.published?"published":"draft"}</small></div><span>{new Date(r.created_at).toLocaleDateString()}</span></div>)}</section><section className="card list-card"><h2>Admin messages</h2>{messages.map(m=><div className="admin-row" key={m.id}><div><strong>{m.title}</strong><small>{m.body}</small></div><span>{new Date(m.created_at).toLocaleDateString()}</span></div>)}</section><p className="disclaimer">Admin access is enforced by the Supabase role/RLS layer. Do not place service-role, database, Gemini, or JWT secrets in the frontend.</p></main>;
}

function QuickCard({icon,label,onClick}){return <button className="quick-card" onClick={onClick}><span className="quick-icon"><Icon name={icon}/></span><span>{label}</span><Icon name="arrow"/></button>}
function NavItem({icon,label,active,onClick}){return <button className={`nav-item ${active?"active":""}`} onClick={onClick}><Icon name={icon}/><span>{label}</span></button>}
function screenEscape(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
const escapeHtml=screenEscape;

createRoot(document.getElementById("root")).render(<App />);
