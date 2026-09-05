import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "./lib/supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://mano-raksha.onrender.com").replace(/\/$/, "");
const TELEGRAM_BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim();
const MOODS = [
  { score: 1, label: "Very low" },
  { score: 2, label: "Low" },
  { score: 3, label: "Okay" },
  { score: 4, label: "Good" },
  { score: 5, label: "Great" },
];

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousLocalDateKey(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return localDateKey(previous);
}

const CALMING_MUSIC = [
  { id:"calm-1", title:"Quiet Morning", description:"A gentle instrumental track for a few peaceful minutes.", src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id:"calm-2", title:"Peaceful Pause", description:"Soft background music for slowing down and breathing.", src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id:"calm-3", title:"Evening Calm", description:"A relaxed track to accompany a quiet moment.", src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id:"calm-4", title:"Gentle Reflection", description:"Let the music play while you rest or reflect.", src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id:"calm-5", title:"A Little Stillness", description:"A simple musical space for taking a small break.", src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
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

class AppErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false}; }
  static getDerivedStateFromError(){ return {hasError:true}; }
  componentDidCatch(error){ console.error("MANORAKSHA UI error", error); }
  render(){
    if(this.state.hasError){
      return <div className="loading-screen"><div className="brand-symbol">❧</div><h1>MANORAKSHA</h1><p>The AI screen could not be opened safely. Please refresh once and try again.</p><button type="button" className="primary-btn" onClick={()=>window.location.reload()}>Refresh MANORAKSHA</button></div>;
    }
    return this.props.children;
  }
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("user");
  const [screen, setScreen] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [moodEntries, setMoodEntries] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [resources, setResources] = useState([]);
  const [wellnessActivities, setWellnessActivities] = useState([]);
  const [wellnessAssignment, setWellnessAssignment] = useState(null);
  const [livePopup, setLivePopup] = useState(null);
  const [feedback, setFeedback] = useState([]);

  const refresh = async (user = session?.user) => {
    if (!supabase || !user) return;
    const uid = user.id;
    const [p, r, m, c, j, a, n, am, res, wa, was, fb] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("mood_entries").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(90),
      supabase.from("checkins").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(90),
      supabase.from("journal_entries").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(30),
      supabase.from("alerts").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(30),
      supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(30),
      supabase.from("admin_messages").select("*").eq("target_user_id", uid).order("created_at", {ascending:false}).limit(30),
      supabase.from("resources").select("*").eq("published", true).order("created_at", {ascending:false}).limit(50),
      supabase.from("wellness_activities").select("*").eq("active", true).order("created_at", {ascending:true}),
      supabase.from("wellness_assignments").select("*,wellness_activities(*)").eq("user_id", uid).eq("assigned_month", localDateKey()).maybeSingle(),
      supabase.from("feedback_reviews").select("*").eq("user_id", uid).order("created_at", {ascending:false}).limit(30),
    ]);
    setProfile(p.data || { display_name: user.email?.split("@")[0] || "Friend", gender:"other" });
    setRole(r.data?.role || "user");
    setMoodEntries(m.data || []);
    setCheckins(c.data || []);
    setJournalEntries(j.data || []);
    setAlerts(a.data || []);
    setNotifications(n.data || []);
    setAdminMessages(am.data || []);
    setResources(res.data || []);
    setWellnessActivities(wa.data || []);
    setWellnessAssignment(was.data || null);
    setFeedback(fb.data || []);
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
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${uid}`},(payload)=>{
        refresh();
        if(payload.eventType === "INSERT" && payload.new){
          setLivePopup({kind:"notification",title:payload.new.title || "New notification",body:payload.new.body || "You have a new notification."});
        }
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"admin_messages",filter:`target_user_id=eq.${uid}`},(payload)=>{
        refresh();
        if(payload.eventType === "INSERT" && payload.new){
          setLivePopup({kind:"message",title:payload.new.title || "New message from MANORAKSHA",body:payload.new.body || "You have a new message from MANORAKSHA."});
        }
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"resources"},(payload)=>{
        refresh();
        if(payload.eventType === "INSERT" && payload.new?.published){
          setLivePopup({kind:"resource",title:"New resource from MANORAKSHA",body:payload.new.title || "A new supportive resource is available."});
        }
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"wellness_assignments",filter:`user_id=eq.${uid}`},()=>refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const signOut = async () => { await supabase?.auth.signOut(); setScreen("home"); };
  const displayName = profile?.display_name || session?.user?.email?.split("@")[0] || "Friend";
  const gender = profile?.gender || "other";

  if (loading) return <div className="loading-screen"><div className="lotus">❧</div><h1>MANORAKSHA</h1><p>Preparing your safe space…</p></div>;
  if (!supabase) return <ConfigScreen />;
  if (!session) return showAuth ? <AuthScreen mode={authMode} setMode={setAuthMode} onBack={()=>setShowAuth(false)} /> : <PreLogin onEnter={()=>{setAuthMode("login");setShowAuth(true)}} />;
  if (role === "admin" || role === "super_admin" || role === "content_manager") {
    return <AdminGate session={session} role={role} onExit={signOut} />;
  }

  return <div className={`app-shell theme-${gender}`}>
    <header className="topbar">
      <div><div className="eyebrow">MANORAKSHA • मनरक्षा</div><h1>{screenTitle(screen)}</h1></div>
      <button className="circle-btn" onClick={() => setScreen("profile")} aria-label="Profile"><Icon name="menu" /></button>
    </header>
    {livePopup && (
      <button className={`live-popup live-popup-${livePopup.kind}`} onClick={()=>{setLivePopup(null);setScreen(livePopup.kind === "resource" || livePopup.kind === "message" ? "support" : screen);}}>
        <span className="live-popup-icon">{livePopup.kind === "resource" ? "📚" : livePopup.kind === "message" ? "💌" : "🔔"}</span>
        <span className="live-popup-copy"><strong>{livePopup.title}</strong><small>{livePopup.body}</small><em>Tap to open • New</em></span>
        <span className="live-popup-close" onClick={(e)=>{e.stopPropagation();setLivePopup(null)}}>×</span>
      </button>
    )}
    <main className="content page-pad">
      {notice && <div className="notice">{notice}</div>}
      {screen === "home" && <Home profile={profile} moodEntries={moodEntries} onNavigate={setScreen} onSaved={refresh} gender={gender} user={session.user} wellnessActivities={wellnessActivities} wellnessAssignment={wellnessAssignment} onWellnessUpdated={refresh} resources={resources} />}
      {screen === "checkin" && <Checkin profile={profile} gender={gender} onSaved={refresh} onNavigate={setScreen} />}
      {screen === "voice" && <Voice onNavigate={setScreen} />}
      {screen === "monitor" && <Monitor moodEntries={moodEntries} checkins={checkins} alerts={alerts} onNavigate={setScreen} />}
      {screen === "journal" && <Journal entries={journalEntries} onSaved={refresh} />}
      {screen === "report" && <Report moodEntries={moodEntries} checkins={checkins} alerts={alerts} />}
      {screen === "support" && <Support resources={resources} adminMessages={adminMessages} feedback={feedback} onNavigate={setScreen} />}
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

function screenTitle(s){return {home:"Home",checkin:"Daily Check-in",voice:"MANORAKSHA AI",monitor:"Mental Health Monitor",journal:"Daily Journal",report:"Weekly Report",support:"Support & Resources",map:"Localized Support",profile:"Privacy & Profile"}[s]||"Support";}

function PreLogin({onEnter}) {
  return <div className="philosophy-screen">
    <div className="philosophy-orbit" aria-hidden="true"><span>❧</span></div>
    <div className="philosophy-card">
      <div className="eyebrow">MANORAKSHA • मनरक्षा</div>
      <h1>A place where the mind can rest, reflect, and begin again.</h1>
      <p className="philosophy-lead">You don't have to carry everything alone.</p>
      <p>In our traditions, healing was never only about the individual. It was also about family, friendship, nature, conversation, music, movement and belonging.</p>
      <p>MANORAKSHA is built around that simple idea: <strong>listen without judgement, take one small step at a time, and remember that you are not alone.</strong></p>
      <div className="philosophy-quote">मनः शान्तिः<br/><span>May the mind find peace.</span></div>
      <p className="philosophy-close">Your journey does not need to be perfect. It only needs to begin.</p>
      <button className="primary-btn wide" onClick={onEnter}>Enter MANORAKSHA <Icon name="arrow"/></button>
      <p className="disclaimer">A supportive space — not a doctor, therapist, diagnosis, or emergency service.</p>
    </div>
  </div>;
}

function AuthScreen({mode,setMode,onBack}) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [gender,setGender]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{
    if(mode==="signup"){
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name,gender}}});
      if(error)throw error;
      if(!data.session) setError("Account created. Check your email to confirm it, then log in.");
    } else { const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)throw error; }
  }catch(err){setError(err.message||"Authentication failed.");}finally{setBusy(false);}};
  return <div className="auth-screen"><div className="auth-card">
    <button className="back-btn auth-back" onClick={onBack}><Icon name="back"/> Philosophy</button>
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

function Home({profile,moodEntries,onNavigate,onSaved,gender,user,wellnessActivities,wellnessAssignment,onWellnessUpdated,resources}) {
  const today = localDateKey();
  const todayEntry = moodEntries.find(x=>x.created_at?.slice(0,10)===today);
  const score = todayEntry?.score || 3;
  const label = score<=1?"Needs immediate support":score===2?"Needs gentle support":score===3?"Moderate stress":"Doing well";
  const [activityBusy,setActivityBusy]=useState(false);
  const [showMusic,setShowMusic]=useState(false);
  const [localAssignment,setLocalAssignment]=useState(wellnessAssignment);
  useEffect(()=>setLocalAssignment(wellnessAssignment),[wellnessAssignment]);
  useEffect(()=>{
    let cancelled=false;
    const assignDailyActivity=async()=>{
      if(!supabase||!user||localAssignment||!wellnessActivities.length)return;
      const today = localDateKey();
      const yesterday = previousLocalDateKey();

      // Avoid giving the same activity on consecutive days when alternatives exist.
      const {data:yesterdayAssignment}=await supabase
        .from("wellness_assignments")
        .select("activity_id")
        .eq("user_id",user.id)
        .eq("assigned_month",yesterday)
        .maybeSingle();

      const candidates = wellnessActivities.filter(a => a.id !== yesterdayAssignment?.activity_id);
      const pool = candidates.length ? candidates : wellnessActivities;
      const picked = pool[Math.floor(Math.random()*pool.length)];

      const {data,error}=await supabase
        .from("wellness_assignments")
        .insert({user_id:user.id,activity_id:picked.id,assigned_month:today})
        .select("*,wellness_activities(*)")
        .single();

      if(!cancelled && !error)setLocalAssignment(data);
      if(!cancelled && error){
        const {data:existing}=await supabase
          .from("wellness_assignments")
          .select("*,wellness_activities(*)")
          .eq("user_id",user.id)
          .eq("assigned_month",today)
          .maybeSingle();
        if(existing)setLocalAssignment(existing);
      }
    };
    assignDailyActivity();
    return()=>{cancelled=true};
  },[user?.id,wellnessActivities.length,localAssignment]);

  // If the app stays open across midnight, automatically load the new day's activity.
  useEffect(()=>{
    const timer=setInterval(()=>{
      if(localDateKey() !== today){
        setLocalAssignment(null);
        onWellnessUpdated();
      }
    },60000);
    return()=>clearInterval(timer);
  },[today,onWellnessUpdated]);
  const completeActivity=async()=>{
    if(!localAssignment||activityBusy||localAssignment.completed_at)return;
    setActivityBusy(true);
    try{
      const {data,error}=await supabase.from("wellness_assignments").update({completed_at:new Date().toISOString()}).eq("id",localAssignment.id).select("*,wellness_activities(*)").single();
      if(error)throw error;
      setLocalAssignment(data);
      await onWellnessUpdated();
    }catch(e){alert(e.message||"Could not save activity.")}finally{setActivityBusy(false)}
  };
  return <div className="stack">
    <section className="welcome-card"><div><p className="muted">Your private support space</p><h2>Hello, {profile?.display_name||"Friend"} <span>♡</span></h2></div><span className="status-pill">Protected</span></section>
    <section className="card hero-card"><div><div><p className="muted">Today</p><h3>How are you feeling?</h3><p className="hero-sub">One small check-in helps build your personal timeline.</p></div><img src={imgFor(gender,score)} alt="" /></div><button className="primary-btn wide" onClick={()=>onNavigate("checkin")}>{todayEntry?"Update today's check-in":"Start today's check-in"} <Icon name="arrow"/></button></section>
    <section className="card state-card"><div className="state-top"><div><p className="muted">Latest recorded state</p><h3>{label}</h3><small>{todayEntry?`Mood score ${score}/5`:"No check-in recorded today"}</small></div><img className="state-avatar" src={imgFor(gender,score)} alt="" /></div><button className="link-btn" onClick={()=>onNavigate("monitor")}>View real history <Icon name="arrow"/></button></section>
    <section className="card monthly-card">
      <div className="section-head"><div><p className="muted">Your daily small step</p><h3>One gentle activity</h3></div><span className="month-badge">NEW</span></div>
      {localAssignment?.wellness_activities ? <><div className="activity-icon">{activitySymbol(localAssignment.wellness_activities.category)}</div><h4>{localAssignment.wellness_activities.title}</h4><p>{localAssignment.wellness_activities.description}</p><button className={`outline-btn wide ${localAssignment.completed_at?"completed-btn":""}`} onClick={completeActivity} disabled={!!localAssignment.completed_at||activityBusy}>{localAssignment.completed_at?"✓ Completed today":activityBusy?"Saving…":"Mark as completed"}</button></> : <div className="activity-loading">Preparing today's small step…</div>}
      <small className="helper-left">Activities are supportive ideas, not medical prescriptions. Choose what feels safe and manageable.</small>
    </section>
    <section className="card selfcare-card">
      <div className="section-head"><div><p className="muted">Healing & self-care</p><h3>Small things that may help</h3></div><Icon name="leaf"/></div>
      <button className="music-trigger" onClick={()=>setShowMusic(true)} aria-label="Open calming music library">
        <span className="music-trigger-icon">♪</span>
        <span><strong>Calming music</strong><small>Choose from several gentle tracks and play one whenever you need a quiet moment.</small></span>
        <Icon name="arrow" size={22}/>
      </button>
      {resources.filter(r=>["video","exercise"].includes(r.resource_type)).slice(0,3).map(r=><Resource key={r.id} r={r}/>)}
    </section>
    {showMusic&&<MusicLibrary onClose={()=>setShowMusic(false)}/>}
    <div className="quick-grid"><QuickCard icon="mic" label="MANORAKSHA AI" onClick={()=>onNavigate("voice")} /><QuickCard icon="journal" label="Journal" onClick={()=>onNavigate("journal")} /><QuickCard icon="history" label="My monitor" onClick={()=>onNavigate("monitor")} /><QuickCard icon="resource" label="Resources" onClick={()=>onNavigate("support")} /></div>
    <section className="safety-card"><div><strong>Need urgent help?</strong><p>If you are in immediate danger, contact local emergency services or a trusted person.</p></div><button onClick={()=>window.location.href="tel:112"}>112</button></section>
    <UsageTimer startedAt={user?.created_at||profile?.created_at} />
    <p className="privacy-strip"><Icon name="lock" size={17}/><span>Your records are tied to your account and protected by Supabase Row Level Security.</span></p>
  </div>;
}

function MusicLibrary({onClose}){
  const stopOtherTracks=(event)=>{
    document.querySelectorAll(".music-player").forEach(player=>{
      if(player!==event.currentTarget) player.pause();
    });
  };
  return <div className="music-modal-backdrop" role="dialog" aria-modal="true" aria-label="Calming music">
    <div className="music-modal">
      <div className="music-modal-head">
        <div><p className="muted">Healing & self-care</p><h3>Calming music</h3><p className="music-modal-copy">Choose any track that feels comfortable. You can pause or stop whenever you want.</p></div>
        <button className="music-close" onClick={onClose} aria-label="Close calming music">×</button>
      </div>
      <div className="music-list">
        {CALMING_MUSIC.map(track=><article className="music-track" key={track.id}>
          <div className="music-track-top"><span className="music-note">♪</span><div><strong>{track.title}</strong><small>{track.description}</small></div></div>
          <audio className="music-player" controls preload="none" onPlay={stopOtherTracks}>
            <source src={track.src} type="audio/mpeg"/>
            Your browser does not support audio playback.
          </audio>
        </article>)}
      </div>
      <p className="music-footnote">Music is provided as a gentle wellness option, not as medical treatment.</p>
    </div>
  </div>;
}

function activitySymbol(category){return ({connection:"♡",reflection:"✎",movement:"◌",music:"♪",nature:"☼","self-care":"✦"}[category]||"✦")}
function UsageTimer({startedAt}){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
  const start=startedAt?new Date(startedAt).getTime():now;
  const total=Math.max(0,Math.floor((now-start)/1000));
  const days=Math.floor(total/86400),hours=Math.floor((total%86400)/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
  const pad=n=>String(n).padStart(2,"0");
  return <section className="card usage-card"><p className="muted">Your MANORAKSHA journey</p><h3>Time since you began</h3><div className="usage-timer"><span>{days}<small>days</small></span><b>:</b><span>{pad(hours)}<small>hours</small></span><b>:</b><span>{pad(minutes)}<small>minutes</small></span><b>:</b><span>{pad(seconds)}<small>seconds</small></span></div><p>Every day you show up for yourself is a step forward.</p></section>
}

function Checkin({gender,onSaved,onNavigate}) {
  const [score,setScore]=useState(3); const [stress,setStress]=useState(5); const [sleep,setSleep]=useState(7); const [note,setNote]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  const submit=async()=>{setBusy(true);try{
    await save("mood_entries",{user_id:(await supabase.auth.getUser()).data.user.id,score,label:MOODS[score-1]?.label,note,source:"manual"});
    await save("checkins",{user_id:(await supabase.auth.getUser()).data.user.id,stress_score:stress,sleep_hours:sleep,notes:note});
    if(score<=1||stress>=9) await save("alerts",{user_id:(await supabase.auth.getUser()).data.user.id,severity:score<=1?"critical":"high",reason:"High distress/stress reported during check-in.",status:"open"});
    await onSaved();setDone(true);
  }catch(e){alert(e.message)}finally{setBusy(false)}};
  return <div className="stack"><button type="button" className="back-btn" onClick={()=>onNavigate("home")}><Icon name="back"/> Back</button>
    <section className="card form-card"><p className="muted">Private check-in</p><h2>How are you feeling today?</h2><div className="mood-row five">{MOODS.map(m=><button key={m.score} className={`mood-tile ${score===m.score?"selected":""}`} onClick={()=>setScore(m.score)}><img src={imgFor(gender,m.score)} alt="" /><span>{m.score}</span><small>{m.label}</small></button>)}</div>
    <label>Stress level <strong>{stress}/10</strong><input type="range" min="0" max="10" value={stress} onChange={e=>setStress(+e.target.value)}/></label>
    <label>Sleep last night <strong>{sleep}h</strong><input type="range" min="0" max="12" step=".5" value={sleep} onChange={e=>setSleep(+e.target.value)}/></label>
    <label>Anything you want MANORAKSHA to know? <textarea rows="4" value={note} onChange={e=>setNote(e.target.value)} placeholder="You can leave this blank." /></label>
    <button className="primary-btn wide" onClick={submit} disabled={busy}>{busy?"Saving securely…":"Save check-in"}</button>
    {done&&<div className="success"><Icon name="check"/> Saved to your private timeline.</div>}</section>
  </div>;
}

function Voice({onNavigate}) {
  const [text,setText]=useState("");
  const [reply,setReply]=useState("");
  const [listening,setListening]=useState(false);
  const [busy,setBusy]=useState(false);
  const [cameraOn,setCameraOn]=useState(false);
  const [cameraStatus,setCameraStatus]=useState("Starting camera permission…");
  const videoRef=useRef(null);
  const streamRef=useRef(null);
  const rec=useRef(null);

  const stopCamera=()=>{
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    if(videoRef.current) videoRef.current.srcObject=null;
    setCameraOn(false);
  };

  const startCamera=async()=>{
    if(!navigator.mediaDevices?.getUserMedia){
      setCameraStatus("Camera is not supported in this browser.");
      return;
    }
    try{
      setCameraStatus("Requesting camera permission…");
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream; await videoRef.current.play().catch(()=>{});}
      setCameraOn(true);
      setCameraStatus("Camera is on • visual signals are optional");
    }catch(e){
      setCameraOn(false);
      setCameraStatus(e?.name === "NotAllowedError" ? "Camera permission was denied. You can still talk or type." : "Camera could not be started. You can still talk or type.");
    }
  };

  useEffect(()=>{
    startCamera();
    return ()=>{
      streamRef.current?.getTracks().forEach(track=>track.stop());
      if(rec.current) rec.current.stop?.();
    };
  },[]);

  const captureFrame=()=>{
    if(!cameraOn || !videoRef.current || videoRef.current.readyState < 2) return null;
    const video=videoRef.current;
    const canvas=document.createElement("canvas");
    const maxWidth=640;
    const scale=Math.min(1,maxWidth/video.videoWidth||1);
    canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
    canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
    const ctx=canvas.getContext("2d");
    if(!ctx)return null;
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/jpeg",0.62);
  };

  const start=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice recognition is not supported in this browser.");return;}
    if(listening){rec.current?.stop();return;}
    const r=new SR();
    r.lang="en-IN"; r.continuous=false; r.interimResults=true;
    r.onstart=()=>setListening(true);
    r.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;setText(t)};
    r.onerror=()=>setListening(false); r.onend=()=>setListening(false); rec.current=r; r.start();
  };

  const send=async()=>{
    if(!text.trim())return;
    setBusy(true); setReply("");
    try{
      if(!API_BASE)throw new Error("VITE_API_BASE_URL is not configured.");
      const image_data_url=captureFrame();
      const res=await fetch(`${API_BASE}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text.trim(),image_data_url})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.detail||"AI request failed");
      setReply(data.reply||"");
    }catch(e){setReply(`I could not reach MANORAKSHA AI right now. ${e.message}`)}finally{setBusy(false)}
  };

  return <div className="stack">
    <button type="button" className="back-btn" onClick={()=>{stopCamera();onNavigate("home")}}><Icon name="back"/> Back</button>
    <section className="card ai-companion-card">
      <div className="ai-companion-head"><div><p className="muted">Private conversation space</p><h2>MANORAKSHA AI</h2><p className="ai-companion-copy">Talk naturally. Type when you want. The camera can provide optional visual context.</p></div><span className="ai-live-pill">● LIVE</span></div>
      <div className={`ai-camera ai-camera-background ${cameraOn?"camera-active":""}`} aria-hidden="true">
        <video ref={videoRef} autoPlay muted playsInline tabIndex={-1} />
      </div>
      <div className={`mic-orb ${listening?"listening":""}`}><button onClick={start} aria-label={listening?"Stop listening":"Start voice input"}><Icon name="mic" size={40}/></button></div>
      <p className="center muted">{listening?"Listening…":"Tap the microphone to speak"}</p>
      <textarea className="ai-message-input" value={text} onChange={e=>setText(e.target.value)} rows="4" placeholder="Tell MANORAKSHA what is on your mind…" aria-label="Message MANORAKSHA AI" />
      <button className="primary-btn wide" onClick={send} disabled={busy}>{busy?"MANORAKSHA is listening…":"Talk to MANORAKSHA AI"} <Icon name="send"/></button>
      {reply&&<div className="ai-reply"><div className="ai-badge">MANORAKSHA AI</div><p>{reply}</p></div>}
      <div className="ai-privacy-note"><Icon name="lock" size={16}/><span>Camera runs privately in the background while MANORAKSHA AI is open. A temporary frame may be sent with your message for supplementary, non-diagnostic context and is not saved by this website.</span></div>
    </section>
    <p className="disclaimer">Supportive conversation only. MANORAKSHA AI does not diagnose or determine mental health from appearance. If you are in immediate danger, contact local emergency help or a trusted person.</p>
  </div>;
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

function Support({resources,adminMessages,feedback,onNavigate}){
  return <div className="stack">
    <section className="support-intro"><div className="support-heart">❧</div><h2>You are not alone.</h2><p>Choose the next safe step that feels manageable.</p></section>
    <section className="card message-inbox-card"><div className="section-head"><div><p className="muted">From MANORAKSHA support</p><h3>Messages for you</h3></div><span className="message-count">{adminMessages.length}</span></div>{adminMessages.length?adminMessages.map(m=><article className="admin-message" key={m.id}><div className="admin-message-top"><strong>{m.title}</strong><time>{new Date(m.created_at).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</time></div><p>{m.body}</p><div className="message-signature">MANORAKSHA • You don't have to carry everything alone.</div></article>):<div className="message-empty"><span className="message-empty-icon">♡</span><p>No messages yet.</p><small>If a MANORAKSHA support team member sends you a message, it will appear here automatically.</small></div>}</section>
    <section className="card feedback-card"><div className="section-head"><div><p className="muted">Your voice matters</p><h3>Review & feedback</h3></div><span className="feedback-star">★</span></div><FeedbackForm feedback={feedback}/></section>
    <SupportCard icon="person" title="Professional support" text="Find nearby hospitals, clinics and support services." action="Open map" onClick={()=>onNavigate("map")}/>
    <SupportCard icon="sos" title="Emergency SOS" text="For immediate danger, call emergency services." action="112" danger onClick={()=>window.location.href="tel:112"}/>
    <section className="card list-card"><div className="section-head"><div><p className="muted">Admin-published</p><h3>Support resources</h3></div><Icon name="resource"/></div>{resources.length?resources.map(r=><Resource key={r.id} r={r}/>):<p className="empty">No published resources yet. Admin content will appear here automatically.</p>}</section>
  </div>
}

function FeedbackForm({feedback=[]}){
  const [rating,setRating]=useState(0); const [text,setText]=useState(""); const [category,setCategory]=useState("general"); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  const submit=async()=>{
    if(!rating && !text.trim()) return;
    setBusy(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();
      const {error}=await supabase.from("feedback_reviews").insert({user_id:user.id,rating:rating||null,category,message:text.trim()||null});
      if(error) throw error;
      setRating(0);setText("");setDone(true);setTimeout(()=>setDone(false),3500);
    }catch(e){alert(e.message||"Could not submit feedback.");}finally{setBusy(false);}
  };
  return <div className="feedback-form">
    <p className="feedback-prompt">How is MANORAKSHA feeling for you?</p>
    <div className="rating-row" aria-label="Rate MANORAKSHA from 1 to 5">
      {[1,2,3,4,5].map(n=><button key={n} type="button" className={`rating-star ${rating>=n?"selected":""}`} onClick={()=>setRating(n)} aria-label={`${n} star${n>1?"s":""}`}>★</button>)}
    </div>
    <select value={category} onChange={e=>setCategory(e.target.value)}><option value="general">General feedback</option><option value="experience">My experience</option><option value="feature">Feature suggestion</option><option value="support">Support / help</option><option value="bug">Something isn't working</option></select>
    <textarea value={text} onChange={e=>setText(e.target.value)} rows="4" maxLength={1000} placeholder="Tell us what you think, what helped, or what we could improve…"/>
    <button className="primary-btn wide" onClick={submit} disabled={busy || (!rating && !text.trim())}>{busy?"Sending…":"Send review & feedback"}</button>
    {done&&<p className="feedback-success">✓ Thank you. Your feedback was sent to the MANORAKSHA team.</p>}
    {feedback.length>0&&<div className="feedback-history"><small>Your recent feedback</small>{feedback.slice(0,3).map(f=><div className="feedback-history-row" key={f.id}><span>{f.rating?`${"★".repeat(f.rating)}${"☆".repeat(5-f.rating)}`:"Message"}</span><time>{new Date(f.created_at).toLocaleDateString()}</time></div>)}</div>}
  </div>
}

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
 const [stats,setStats]=useState({users:0,moods:0,checkins:0,alerts:0});const [users,setUsers]=useState([]);const [alerts,setAlerts]=useState([]);const [messages,setMessages]=useState([]);const [resources,setResources]=useState([]);const [feedback,setFeedback]=useState([]);const [title,setTitle]=useState("");const [body,setBody]=useState("");const [target,setTarget]=useState("");const [rTitle,setRTitle]=useState("");const [rDesc,setRDesc]=useState("");const [rType,setRType]=useState("article");const [rUrl,setRUrl]=useState("");
 const load=async()=>{const [{count:usersC},{count:moodsC},{count:checksC},{count:alertsC},u,a,msg,res,fb]=await Promise.all([
  supabase.from("profiles").select("*",{count:"exact",head:true}),supabase.from("mood_entries").select("*",{count:"exact",head:true}),supabase.from("checkins").select("*",{count:"exact",head:true}),supabase.from("alerts").select("*",{count:"exact",head:true}).eq("status","open"),
  supabase.from("profiles").select("*").order("created_at",{ascending:false}).limit(100),supabase.from("alerts").select("*,profiles(display_name)").order("created_at",{ascending:false}).limit(100),supabase.from("admin_messages").select("*").order("created_at",{ascending:false}).limit(50),supabase.from("resources").select("*").order("created_at",{ascending:false}).limit(50),supabase.from("feedback_reviews").select("*").order("created_at",{ascending:false}).limit(100)
 ]);
 const feedbackRows=fb.data||[];
 const feedbackUserIds=[...new Set(feedbackRows.map(x=>x.user_id).filter(Boolean))];
 let feedbackProfiles=[];
 if(feedbackUserIds.length){
   const {data:fp,error:fpError}=await supabase.from("profiles").select("id,display_name").in("id",feedbackUserIds);
   if(fpError) console.warn("Could not load feedback profile names",fpError);
   feedbackProfiles=fp||[];
 }
 const profileMap=new Map(feedbackProfiles.map(x=>[x.id,x.display_name]));
 const feedbackWithNames=feedbackRows.map(x=>({...x,profiles:{display_name:profileMap.get(x.user_id)||"User"}}));
 if(fb.error) console.warn("Could not load feedback_reviews",fb.error);
 setStats({users:usersC||0,moods:moodsC||0,checkins:checksC||0,alerts:alertsC||0});setUsers(u.data||[]);setAlerts(a.data||[]);setMessages(msg.data||[]);setResources(res.data||[]);setFeedback(feedbackWithNames)};
 useEffect(()=>{load();const ch=supabase.channel("admin-live").on("postgres_changes",{event:"*",schema:"public",table:"mood_entries"},load).on("postgres_changes",{event:"*",schema:"public",table:"alerts"},load).on("postgres_changes",{event:"*",schema:"public",table:"admin_messages"},load).on("postgres_changes",{event:"*",schema:"public",table:"resources"},load).on("postgres_changes",{event:"*",schema:"public",table:"feedback_reviews"},load).subscribe();return()=>supabase.removeChannel(ch)},[]);
 const send=async()=>{if(!target||!title||!body)return;const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("admin_messages").insert({sender_id:user.id,target_user_id:target,title,body});if(error)alert(error.message);else{setTitle("");setBody("");setTarget("");await load()}};
 const publish=async()=>{if(!rTitle)return;const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("resources").insert({title:rTitle,description:rDesc,resource_type:rType,storage_path:rUrl||null,published:true,created_by:user.id});if(error)alert(error.message);else{setRTitle("");setRDesc("");setRUrl("");await load()}};
 return <main className="admin-content"><div className="admin-badge">Role: {role}</div><section className="admin-stats"><Metric value={stats.users} label="Users"/><Metric value={stats.moods} label="Mood records"/><Metric value={stats.checkins} label="Check-ins"/><Metric value={stats.alerts} label="Open alerts"/></section><section className="admin-grid"><section className="card list-card"><h2>User directory</h2>{users.map(u=><div className="admin-row" key={u.id}><div><strong>{u.display_name||"Unnamed user"}</strong><small>{u.gender||"not specified"} • {u.id.slice(0,8)}…</small></div><span>{new Date(u.created_at).toLocaleDateString()}</span></div>)}</section><section className="card list-card"><h2>Open / recent alerts</h2>{alerts.length?alerts.map(a=><div className="admin-row" key={a.id}><div><strong>{a.severity.toUpperCase()}</strong><small>{a.profiles?.display_name||a.user_id.slice(0,8)}… • {a.reason||"No reason"}</small></div><span>{a.status}</span></div>):<p className="empty">No alerts.</p>}</section></section><section className="admin-grid"><section className="card form-card"><h2>Send message</h2><select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Select user</option>{users.map(u=><option value={u.id} key={u.id}>{u.display_name||u.id.slice(0,8)}</option>)}</select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Message title"/><textarea value={body} onChange={e=>setBody(e.target.value)} rows="4" placeholder="Supportive message"/><button className="primary-btn" onClick={send}>Send to user</button></section><section className="card form-card"><h2>Publish resource</h2><input value={rTitle} onChange={e=>setRTitle(e.target.value)} placeholder="Resource title"/><textarea value={rDesc} onChange={e=>setRDesc(e.target.value)} rows="3" placeholder="Description"/><select value={rType} onChange={e=>setRType(e.target.value)}><option value="article">Article</option><option value="exercise">Exercise</option><option value="video">Video</option><option value="image">Image</option></select><input value={rUrl} onChange={e=>setRUrl(e.target.value)} placeholder="Public URL (optional)"/><button className="primary-btn" onClick={publish}>Publish</button></section></section><section className="card list-card"><h2>Published / managed resources</h2>{resources.map(r=><div className="admin-row" key={r.id}><div><strong>{r.title}</strong><small>{r.resource_type} • {r.published?"published":"draft"}</small></div><span>{new Date(r.created_at).toLocaleDateString()}</span></div>)}</section><section className="card list-card"><h2>Admin messages</h2>{messages.map(m=><div className="admin-row" key={m.id}><div><strong>{m.title}</strong><small>{m.body}</small></div><span>{new Date(m.created_at).toLocaleDateString()}</span></div>)}</section><section className="card list-card feedback-admin-card"><div className="section-head"><div><p className="muted">Live user voice</p><h2>Reviews & feedback</h2></div><span className="message-count">{feedback.length}</span></div>{feedback.length?feedback.map(f=><article className="feedback-admin-row" key={f.id}><div className="feedback-admin-head"><strong>{f.profiles?.display_name||"User"}</strong><span>{f.rating?`${"★".repeat(f.rating)}${"☆".repeat(5-f.rating)}`:"No rating"}</span></div><small>{f.category} • {new Date(f.created_at).toLocaleString()}</small><p>{f.message||"No written comment."}</p></article>):<p className="empty">No feedback yet.</p>}</section><p className="disclaimer">Admin access is enforced by the Supabase role/RLS layer. Do not place service-role, database, OpenAI, or JWT secrets in the frontend.</p></main>;
}

function QuickCard({icon,label,onClick}){return <button type="button" className="quick-card" onClick={onClick}><span className="quick-icon"><Icon name={icon}/></span><span>{label}</span><Icon name="arrow"/></button>}
function NavItem({icon,label,active,onClick}){return <button type="button" className={`nav-item ${active?"active":""}`} onClick={onClick}><Icon name={icon}/><span>{label}</span></button>}
function screenEscape(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
const escapeHtml=screenEscape;

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /></AppErrorBoundary>);
