import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { } from "react-leaflet";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://manoraksha-1.onrender.com";

const moods = [
  { label: "Awful", emoji: "😞", value: 1 },
  { label: "Low", emoji: "😕", value: 2 },
  { label: "Okay", emoji: "🙂", value: 3 },
  { label: "Good", emoji: "😊", value: 4 },
];

const weekly = [2, 3, 4, 3, 2, 4, 4];

function Icon({ name, size = 22 }) {
  const icons = {
    home: "⌂", history: "◷", support: "♡", profile: "◯", menu: "☰", back: "←",
    mic: "♩", journal: "▤", resource: "✦", person: "♙", alert: "⚠", map: "⌖",
    sos: "SOS", lock: "▣", leaf: "❧", arrow: "›", check: "✓", play: "▶", save: "▾",
  };
  return <span className={`icon icon-${name}`} style={{ fontSize: size }} aria-hidden="true">{icons[name] || "•"}</span>;
}

function App() {
  const [screen, setScreen] = useState("onboarding");
  const [mood, setMood] = useState(3);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [journal, setJournal] = useState("");
  const [savedJournal, setSavedJournal] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  const moodLabel = moods.find((m) => m.value === mood)?.label || "Okay";
  const currentState = mood <= 2 ? "Needs gentle support" : mood === 3 ? "Moderate stress" : "Doing well";

  useEffect(() => {
    return () => recognitionRef.current?.stop?.();
  }, []);

  async function sendToAI(text = message) {
    const clean = text.trim();
    if (!clean) {
      setError("Please tell me a little about how you are feeling.");
      return;
    }
    setLoading(true);
    setError("");
    setReply("");
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Server error (${response.status})`);
      setReply(data.reply || "I received your message, but no reply was returned.");
    } catch (err) {
      console.error(err);
      setError(`Could not connect to MANORAKSHA AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported by this browser. You can use the text check-in instead.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setListening(true); setError(""); };
    recognition.onresult = (event) => {
      let finalText = "";
      let liveText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        liveText += t;
        if (event.results[i].isFinal) finalText += t;
      }
      setTranscript(liveText);
      if (finalText.trim()) setMessage(finalText.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      setError(`Voice check-in could not start: ${event.error}`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  function openVoice() {
    setTranscript("");
    setError("");
    setScreen("voice");
  }

  function navTo(next) {
    setError("");
    setScreen(next);
  }

  const chart = useMemo(() => weekly.map((value, i) => ({ value, day: ["M", "T", "W", "T", "F", "S", "S"][i] })), []);

  if (screen === "onboarding") {
    return <div className="app-shell"><div className="onboarding page-pad">
      <div className="brand-mark">♡</div>
      <div className="hero-illustration" aria-hidden="true"><div className="person person-a"/><div className="person person-b"/><div className="arm"/></div>
      <div className="onboarding-copy">
        <h1>You matter.<br/>We are here for you.</h1>
        <p>A safe space to talk, heal and get support.</p>
      </div>
      <button className="primary-btn wide" onClick={() => navTo("home")}>Get Started <Icon name="arrow" size={22}/></button>
      <p className="tiny-note"><Icon name="lock" size={14}/> Your conversations are handled with care.</p>
    </div></div>;
  }

  return <div className="app-shell">
    <header className="topbar">
      <div><div className="eyebrow">MANORAKSHA</div><h1>{screenTitle(screen)}</h1></div>
      <button className="circle-btn" onClick={() => navTo("profile")} aria-label="Open profile"><Icon name="menu" size={22}/></button>
    </header>

    <main className="content page-pad">
      {screen === "home" && <Home mood={mood} setMood={setMood} moodLabel={moodLabel} currentState={currentState} onVoice={openVoice} onNavigate={navTo} />}
      {screen === "voice" && <VoiceScreen listening={listening} transcript={transcript} message={message} setMessage={setMessage} reply={reply} loading={loading} error={error} onVoice={startVoice} onSend={() => sendToAI()} onBack={() => navTo("home")} />}
      {screen === "monitor" && <Monitor chart={chart} mood={mood} onNavigate={navTo} />}
      {screen === "alert" && <AlertScreen onNavigate={navTo} />}
      {screen === "support" && <Support onNavigate={navTo} />}
      {screen === "map" && <SupportMap onNavigate={navTo} />}
      {screen === "journal" && <Journal journal={journal} setJournal={setJournal} saved={savedJournal} onSave={() => { setSavedJournal(true); setTimeout(() => setSavedJournal(false), 2500); }} />}
      {screen === "report" && <Report chart={chart} onNavigate={navTo} />}
      {screen === "profile" && <Profile onNavigate={navTo} />}
    </main>

    <nav className="bottom-nav" aria-label="Main navigation">
      <NavItem icon="home" label="Home" active={screen === "home"} onClick={() => navTo("home")} />
      <NavItem icon="history" label="History" active={screen === "monitor" || screen === "report"} onClick={() => navTo("monitor")} />
      <NavItem icon="support" label="Support" active={screen === "support" || screen === "map"} onClick={() => navTo("support")} />
      <NavItem icon="profile" label="Profile" active={screen === "profile"} onClick={() => navTo("profile")} />
    </nav>
  </div>;
}

function screenTitle(screen) {
  const titles = { home: "Home", voice: "Voice Check-in", monitor: "Mental Health Monitor", alert: "Distress Alert", support: "Support & Resources", map: "Localized Support", journal: "Daily Journal", report: "Weekly Report", profile: "Privacy & Profile" };
  return titles[screen] || "Support";
}

function Home({ mood, setMood, moodLabel, currentState, onVoice, onNavigate }) {
  return <div className="stack">
    <section className="welcome-card">
      <div><p className="muted">Good evening</p><h2>Hello, Asha <span>♡</span></h2></div>
      <div className="status-pill">Safe space</div>
    </section>

    <section className="card mood-card">
      <div className="section-head"><div><p className="muted">Daily check-in</p><h3>How are you feeling today?</h3></div><span className="date-chip">Today</span></div>
      <div className="mood-row">{moods.map((item) => <button key={item.value} className={`mood-btn ${mood === item.value ? "selected" : ""}`} onClick={() => setMood(item.value)}><span>{item.emoji}</span><small>{item.label}</small></button>)}</div>
    </section>

    <section className="card state-card" onClick={() => onNavigate("monitor")}>
      <div className="state-top"><div><p className="muted">Your current state</p><h3>{currentState}</h3></div><span className="trend">↗</span></div>
      <div className="sparkline"><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
      <div className="state-bottom"><span>Based on your check-ins</span><button onClick={(e) => { e.stopPropagation(); onNavigate("monitor"); }}>View details <Icon name="arrow" size={18}/></button></div>
    </section>

    <div className="quick-grid">
      <QuickCard icon="journal" label="Daily Journal" onClick={() => onNavigate("journal")} />
      <QuickCard icon="mic" label="Voice Check-in" featured onClick={onVoice} />
      <QuickCard icon="leaf" label="Resources" onClick={() => onNavigate("support")} />
      <QuickCard icon="person" label="Talk to Someone" onClick={() => onNavigate("support")} />
    </div>

    <section className="soft-banner"><div className="soft-icon">✦</div><div><strong>Need a little help right now?</strong><p>Try a grounding exercise or talk to someone you trust.</p></div><button onClick={() => onNavigate("alert")}><Icon name="arrow"/></button></section>

    <section className="privacy-strip"><Icon name="lock" size={20}/><span><strong>Your space is private.</strong> You stay in control of your data.</span></section>
  </div>;
}

function QuickCard({ icon, label, onClick, featured }) { return <button className={`quick-card ${featured ? "featured" : ""}`} onClick={onClick}><span className="quick-icon"><Icon name={icon} size={24}/></span><span>{label}</span><Icon name="arrow" size={18}/></button>; }
function NavItem({ icon, label, active, onClick }) { return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}><Icon name={icon} size={22}/><span>{label}</span></button>; }

function VoiceScreen({ listening, transcript, message, setMessage, reply, loading, error, onVoice, onSend, onBack }) {
  return <div className="stack voice-screen">
    <button className="back-btn" onClick={onBack}><Icon name="back"/> Back</button>
    <section className="voice-hero card">
      <div className={`mic-orb ${listening ? "listening" : ""}`}><button onClick={onVoice} aria-label="Start voice check-in"><Icon name="mic" size={42}/></button></div>
      <p className="muted center">{listening ? "Listening…" : "Tap to speak"}</p>
      <h2 className="center">How are you feeling<br/>right now?</h2>
      <div className={`wave ${listening ? "active" : ""}`}>{Array.from({ length: 19 }).map((_, i) => <i key={i} style={{ "--h": `${12 + ((i * 17) % 38)}px` }}/>)}</div>
      <p className="listen-label">{listening ? "I'm listening. Take your time." : "Your words stay focused on your support session."}</p>
    </section>
    <section className="card text-checkin">
      <div className="section-head"><div><p className="muted">Text check-in</p><h3>Want to type instead?</h3></div></div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell me what is on your mind…" rows={4}/>
      {transcript && <div className="transcript"><span>Voice captured</span><p>{transcript}</p></div>}
      <button className="primary-btn wide" onClick={onSend} disabled={loading}>{loading ? "MANORAKSHA is thinking…" : "Send to MANORAKSHA AI"}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    {reply && <section className="ai-reply card"><div className="ai-badge">MANORAKSHA AI</div><p>{reply}</p></section>}
    <p className="disclaimer">MANORAKSHA is a supportive conversation assistant, not a doctor or emergency service.</p>
  </div>;
}

function Monitor({ chart, mood, onNavigate }) {
  const average = (chart.reduce((a, b) => a + b.value, 0) / chart.length).toFixed(1);
  return <div className="stack">
    <section className="card report-card"><div className="section-head"><div><p className="muted">Your mental health overview</p><h2>This week</h2></div><span className="date-chip">7 days⌄</span></div><div className="bar-chart">{chart.map((item, i) => <div className="bar-col" key={i}><div className="bar" style={{ height: `${item.value * 22}px` }}/><small>{item.day}</small></div>)}</div></section>
    <section className="insight-card"><div className="insight-icon">✦</div><div><p className="muted">Insights</p><h3>You have shown moments of calm and recovery.</h3><p>Keep checking in. Small patterns can help you understand what support feels useful.</p></div></section>
    <section className="card risk-card"><div><p className="muted">Current risk level</p><h2>{mood <= 2 ? "Moderate" : "Low"}</h2><p>This is a prototype indicator based on your recent check-in, not a clinical diagnosis.</p></div><div className="risk-ring">{average}</div></section>
    <button className="outline-btn wide" onClick={() => onNavigate("report")}>View weekly condition report <Icon name="arrow"/></button>
  </div>;
}

function AlertScreen({ onNavigate }) { return <div className="stack"><section className="alert-card card"><div className="alert-icon"><Icon name="alert" size={34}/></div><p className="muted">Support check</p><h2>High stress detected</h2><p>We noticed signs that you may be having a difficult moment. You don't have to handle it alone.</p><div className="alert-actions"><button className="primary-btn wide" onClick={() => onNavigate("support")}>Talk to a counsellor</button><button className="outline-btn wide" onClick={() => alert("Grounding exercise: look around and name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.")}>Use grounding tools</button><button className="text-btn" onClick={() => onNavigate("home")}>Not now</button></div></section><p className="disclaimer">If you are in immediate danger or think you may hurt yourself, contact local emergency services or a trusted person now.</p></div>; }

function Support({ onNavigate }) { return <div className="stack"><section className="support-intro"><div className="support-heart">♡</div><h2>You are not alone.</h2><p>We are here to help you find the next safe step.</p></section><SupportCard icon="person" title="Talk to Professional" text="Find a counsellor or mental-health professional." action="Find support" onClick={() => onNavigate("map")} /><SupportCard icon="map" title="Nearest Help Center" text="Explore nearby support locations." action="Open map" onClick={() => onNavigate("map")} /><SupportCard icon="sos" title="Emergency SOS" text="For immediate danger, contact emergency services." danger action="Call 112" onClick={() => window.location.href = "tel:112"} /><SupportCard icon="resource" title="Self Help Resources" text="Grounding, breathing and calming exercises." action="Explore" onClick={() => alert("Try: slow breathing for 60 seconds, drink some water, sit somewhere safe, and contact someone you trust.")} /><button className="outline-btn wide" onClick={() => onNavigate("profile")}><Icon name="lock"/> Privacy & ethical commitment</button></div>; }
function SupportCard({ icon, title, text, action, onClick, danger }) { return <button className={`support-card ${danger ? "danger" : ""}`} onClick={onClick}><span className="support-icon"><Icon name={icon} size={24}/></span><span className="support-copy"><strong>{title}</strong><small>{text}</small></span><span className="support-action">{action} <Icon name="arrow" size={18}/></span></button>; }

function SupportMap({ onNavigate }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState(
    "Tap Locate me to find support near you."
  );
  const [locating, setLocating] = useState(false);

  // -----------------------------------------
  // Get nearby support locations
  // -----------------------------------------
  async function findNearbySupport(lat, lon) {
    try {
      setStatus("Finding nearby support locations…");

      const query = `
        [out:json][timeout:20];
        (
          nwr(around:5000,${lat},${lon})["amenity"~"hospital|clinic|doctors|social_facility"];
          nwr(around:5000,${lat},${lon})["healthcare"];
          nwr(around:5000,${lat},${lon})["name"~"counselling|counseling|mental|psychiatric|psychology|wellness",i];
        );
        out center tags;
      `;

      const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            data: query,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Support search failed");
      }

      const data = await response.json();

      const results = data.elements
        .map((item) => {
          const latValue = item.lat ?? item.center?.lat;
          const lonValue = item.lon ?? item.center?.lon;

          if (!latValue || !lonValue) {
            return null;
          }

          return {
            id: item.id,
            name:
              item.tags?.name ||
              item.tags?.official_name ||
              "Nearby support centre",
            lat: latValue,
            lon: lonValue,
            type:
              item.tags?.healthcare ||
              item.tags?.amenity ||
              "Support service",
          };
        })
        .filter(Boolean)
        .slice(0, 20);

      setPlaces(results);

      if (results.length === 0) {
        setStatus("No nearby support locations found.");
      } else {
        setStatus(`${results.length} nearby support locations found.`);
      }

      return results;
    } catch (error) {
      console.error("Support search error:", error);
      setStatus("Could not load nearby support locations.");
      return [];
    }
  }

  // -----------------------------------------
  // Device location
  // -----------------------------------------
  function locateMe() {
    if (!navigator.geolocation) {
      setStatus("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    setStatus("Requesting your location…");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setLocation({
          lat,
          lon,
        });

        await findNearbySupport(lat, lon);

        setLocating(false);
      },
      (error) => {
        console.error("Location error:", error);

        setLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setStatus(
            "Location permission denied. Please allow location access."
          );
        } else if (error.code === error.TIMEOUT) {
          setStatus("Location request timed out. Please try again.");
        } else {
          setStatus("Unable to get your current location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  }

  // -----------------------------------------
  // Create map
  // -----------------------------------------
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapRef.current).setView(
      [20.5937, 78.9629],
      5
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // -----------------------------------------
  // Update markers
  // -----------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !location) {
      return;
    }

    // Remove previous markers
    markersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });

    markersRef.current = [];

    // Move map to user
    map.setView(
      [location.lat, location.lon],
      14
    );

    // User marker
    const userIcon = L.divIcon({
      className: "user-location-marker",
      html: '<div class="user-location-dot"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const userMarker = L.marker(
      [location.lat, location.lon],
      {
        icon: userIcon,
      }
    )
      .addTo(map)
      .bindPopup("<strong>You are here</strong>");

    markersRef.current.push(userMarker);

    // Support markers
    places.forEach((place) => {
      const marker = L.marker([
        place.lat,
        place.lon,
      ])
        .addTo(map)
        .bindPopup(`
          <strong>${escapeHtml(place.name)}</strong>
          <br />
          <small>${escapeHtml(place.type)}</small>
        `);

      markersRef.current.push(marker);
    });
  }, [location, places]);

  // -----------------------------------------
  // Google Maps directions
  // -----------------------------------------
  function openDirections(place) {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${place.lat},${place.lon}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="stack">

      {/* REAL OPENSTREETMAP */}
      <section className="card map-card">

        <div
          ref={mapRef}
          className="real-map"
          aria-label="Nearby support map"
        />

        <div className="map-location">

          <span className="support-icon">
            <Icon name="map" />
          </span>

          <div>
            <strong>Localized Support</strong>
            <p>{status}</p>
          </div>

          <button
            onClick={locateMe}
            disabled={locating}
          >
            {locating ? "Locating…" : "Locate me"}
          </button>

        </div>

      </section>

      {/* SUPPORT LIST */}
      {places.length > 0 && (
        <section className="card">

          <div className="section-head">
            <div>
              <p className="muted">Nearby</p>
              <h3>Support locations</h3>
            </div>
          </div>

          <div className="support-list">

            {places.slice(0, 8).map((place) => (
              <div
                className="local-support-item"
                key={`${place.id}-${place.lat}-${place.lon}`}
              >

                <div className="local-support-info">

                  <span className="support-icon">
                    <Icon name="person" size={20} />
                  </span>

                  <div>
                    <strong>{place.name}</strong>
                    <small>
                      {place.type || "Health & support service"}
                    </small>
                  </div>

                </div>

                <button
                  className="small-direction-btn"
                  onClick={() => openDirections(place)}
                >
                  Directions
                </button>

              </div>
            ))}

          </div>

        </section>
      )}

      {/* BACK */}
      <button
        className="back-link"
        onClick={() => onNavigate("support")}
      >
        <Icon name="back" /> Back to support
      </button>

    </div>
  );
}

function Journal({ journal, setJournal, saved, onSave }) { return <div className="stack"><section className="card journal-card"><p className="muted">Daily reflection</p><h2>How was your day?</h2><textarea value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Write your thoughts…" rows={9}/><div className="journal-tools"><button>🙂 Add mood</button><button>⌘ Tag</button></div><button className="primary-btn wide" onClick={onSave} disabled={!journal.trim()}><Icon name="save"/> {saved ? "Entry saved" : "Save entry"}</button></section><p className="disclaimer">Journal content is for your personal reflection in this prototype.</p></div>; }

function Report({ chart, onNavigate }) { return <div className="stack"><section className="card report-card"><p className="muted">Weekly report</p><h2>12 May – 18 May</h2><div className="bar-chart tall">{chart.map((item, i) => <div className="bar-col" key={i}><div className="bar" style={{ height: `${item.value * 34}px` }}/><small>{item.day}</small></div>)}</div><div className="report-summary"><strong>Summary</strong><p>You were calm and positive on most of the days. Keep using check-ins to notice what helps you feel supported.</p></div></section><button className="outline-btn wide" onClick={() => onNavigate("monitor")}><Icon name="back"/> Back to monitor</button></div>; }

function Profile({ onNavigate }) { return <div className="stack"><section className="profile-hero card"><div className="avatar">A</div><div><p className="muted">Your space</p><h2>Asha</h2><p>Private • Support-focused</p></div></section><section className="card privacy-card"><div className="privacy-row"><Icon name="lock" size={26}/><div><strong>Your data is private and secure.</strong><p>Use this prototype without sharing sensitive information you don't need to share.</p></div></div><div className="privacy-row"><Icon name="profile" size={26}/><div><strong>You own your data.</strong><p>Your choices should remain under your control.</p></div></div><div className="privacy-row"><span className="heart-icon">♡</span><div><strong>We care. We respect. We don't judge.</strong><p>MANORAKSHA is designed as a supportive space.</p></div></div></section><section className="card"><h3>Prototype controls</h3><button className="setting-row" onClick={() => onNavigate("home")}>Return to dashboard <Icon name="arrow"/></button><button className="setting-row" onClick={() => onNavigate("support")}>Support & resources <Icon name="arrow"/></button></section><p className="footer-tag">Safe Space. Real Support. Stronger You. ♡</p></div>; }

createRoot(document.getElementById("root")).render(<App />);
