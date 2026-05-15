"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Wifi, Zap, Clock, Users, MapPin, Star, Moon, ChevronRight, RefreshCw, Send, X, CheckCircle, AlertCircle, Loader2, Navigation, BookOpen, VolumeX, Volume2, Calendar, Bell, Timer, Share2, Heart, Coffee, Zap as ZapIcon, TrendingUp, Info } from "lucide-react";

const API = "http://localhost:4000/api";

const PERSONAS = [
  { id: "solo", emoji: "🎧", label: "Solo focus", desc: "Need silence & concentration", color: "#818cf8" },
  { id: "group", emoji: "👥", label: "Group work", desc: "Collaborative space needed", color: "#34d399" },
  { id: "night", emoji: "🌙", label: "Late night", desc: "Open past midnight", color: "#f472b6" },
  { id: "quick", emoji: "⚡", label: "Quick session", desc: "Nearest available spot", color: "#fbbf24" },
];

const CROWD: Record<string, any> = {
  EMPTY:    { color: "#4ade80", bg: "rgba(74,222,128,0.1)",   label: "Empty",    emoji: "🟢", advice: "Perfect time to go!", pct: 5 },
  QUIET:    { color: "#86efac", bg: "rgba(134,239,172,0.1)",  label: "Quiet",    emoji: "🟢", advice: "Great conditions now", pct: 30 },
  MODERATE: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   label: "Moderate", emoji: "🟡", advice: "Seats still available", pct: 55 },
  BUSY:     { color: "#f97316", bg: "rgba(249,115,22,0.1)",   label: "Busy",     emoji: "🟠", advice: "Getting crowded", pct: 80 },
  FULL:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",    label: "Full",     emoji: "🔴", advice: "Try a backup spot", pct: 98 },
  UNKNOWN:  { color: "#6b7280", bg: "rgba(107,114,128,0.08)", label: "Unknown",  emoji: "⚪", advice: "No recent data", pct: 0 },
};

const NOISE_LABELS: Record<string, string> = {
  SILENT: "Library-quiet 🤫",
  QUIET: "Library-quiet 🤫", 
  MODERATE: "Coffee shop hum ☕",
  LIVELY: "Can take calls 📞",
};

const CAT_EMOJI: Record<string, string> = {
  NLB_LIBRARY:"📚",UNIVERSITY_LIBRARY:"🎓",COMMUNITY_CENTER:"🏛️",
  CAFE:"☕",COWORKING:"💼",MCDONALDS_24H:"🍔",OTHER:"📍"
};

const QUICK_PROMPTS = [
  "Quiet spot near me now",
  "24/7 with power sockets open now",
  "Free group study room tonight",
  "Least crowded library near Yishun",
  "Study spots near NUS open now",
  "Best cafe for solo studying",
];

const EXAM_TIPS = [
  "Book NLB study rooms 2-3 days ahead during exam season",
  "CPL and Jurong Regional Library open till 9pm on weekdays",
  "McDonald's 24h spots are great for late-night cramming",
  "NUS and SMU libraries are open to public during off-peak hours",
  "Bishan CC study corner is free and rarely crowded",
];

function isOpenNow(openingHours: any[]): { open: boolean; closesIn?: number; opensIn?: number; closeTime?: string } {
  if (!openingHours || openingHours.length === 0) return { open: true };
  const now = new Date();
  const sgTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
  const dow = sgTime.getDay();
  const currentMins = sgTime.getHours() * 60 + sgTime.getMinutes();
  const todayHours = openingHours.find((h: any) => h.dayOfWeek === dow);
  if (!todayHours || todayHours.isClosed) return { open: false };
  const [openH, openM] = todayHours.openTime.split(":").map(Number);
  const [closeH, closeM] = todayHours.closeTime.split(":").map(Number);
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  if (currentMins >= openMins && currentMins < closeMins) {
    const closesIn = closeMins - currentMins;
    return { open: true, closesIn, closeTime: todayHours.closeTime };
  }
  if (currentMins < openMins) {
    return { open: false, opensIn: openMins - currentMins };
  }
  return { open: false };
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function App() {
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [persona, setPersona] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<any[]>([
    { role: "assistant", text: "Hey! 👋 I'm your study companion. Tell me where you are or what you need — I'll find the perfect spot right now. No stress!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"recommend" | "all">("recommend");
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filter24h, setFilter24h] = useState(false);
  const [filterFree, setFilterFree] = useState(false);
  const [filterWifi, setFilterWifi] = useState(false);
  const [filterGroup, setFilterGroup] = useState(false);
  const [checkedIn, setCheckedIn] = useState<string | null>(null);
  const [checkinTimer, setCheckinTimer] = useState(0);
  const [studyTimer, setStudyTimer] = useState(0);
  const [studyTimerActive, setStudyTimerActive] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [tipIdx] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const s = localStorage.getItem("persona");
    if (s) setPersona(s);
    const f = localStorage.getItem("favourites");
    if (f) setFavourites(new Set(JSON.parse(f)));
    fetchSpots();
    // Auto-request location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  // Study timer
  useEffect(() => {
    if (studyTimerActive) {
      timerRef.current = setInterval(() => setStudyTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [studyTimerActive]);

  // Checkin countdown
  useEffect(() => {
    if (checkedIn) {
      setCheckinTimer(90 * 60);
      const interval = setInterval(() => {
        setCheckinTimer(t => {
          if (t <= 1) { setCheckedIn(null); clearInterval(interval); return 0; }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [checkedIn]);

  async function fetchSpots() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/spots?limit=50`);
      const data = await res.json();
      setSpots(data.spots || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function pickPersona(id: string) { setPersona(id); localStorage.setItem("persona", id); }

  function toggleFav(id: string) {
    setFavourites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("favourites", JSON.stringify([...next]));
      return next;
    });
  }

  function score(s: any): number {
    let n = 0;
    const c = s.occupancy?.crowdLevel || "UNKNOWN";
    const cs: any = { EMPTY: 50, QUIET: 40, MODERATE: 25, BUSY: 10, FULL: 0, UNKNOWN: 20 };
    n += cs[c] || 20;
    if (persona === "solo" && (s.noiseLevel === "QUIET" || s.noiseLevel === "SILENT")) n += 25;
    if (persona === "group" && s.groupStudy) n += 25;
    if (persona === "night" && s.is24Hours) n += 30;
    if (persona === "quick" && s.isFree) n += 15;
    if (s.hasWifi) n += 8; if (s.hasPowerSockets) n += 8;
    if (s.isAirCon) n += 5; if (s.isVerified) n += 5;
    const status = isOpenNow(s.openingHours);
    if (status.open && status.closesIn && status.closesIn < 60) n -= 20;
    if (!status.open && !s.is24Hours) n -= 50;
    if (favourites.has(s.id)) n += 15;
    return n;
  }

  const filtered = spots
    .filter(s => {
      if (filterOpenNow && !s.is24Hours) {
        const status = isOpenNow(s.openingHours);
        if (!status.open) return false;
      }
      if (filter24h && !s.is24Hours) return false;
      if (filterFree && !s.isFree) return false;
      if (filterWifi && !s.hasWifi) return false;
      if (filterGroup && !s.groupStudy) return false;
      if (!activeSearch) return true;
      const q = activeSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.nearestMrt?.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
    })
    .sort((a, b) => score(b) - score(a));

  const best = filtered[0];
  const backups = filtered.slice(1, 4);
  const favSpots = filtered.filter(s => favourites.has(s.id));

  async function sendChat(msg?: string) {
    const m = msg || chatInput;
    if (!m.trim() || chatLoading) return;
    setChatInput("");
    setChatMsgs(p => [...p, { role: "user", text: m }, { role: "assistant", text: "" }]);
    setChatLoading(true);
    let r = "";
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m, lat: userLocation?.lat, lng: userLocation?.lng }),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6); if (d === "[DONE]") break;
          try {
            const p = JSON.parse(d);
            if (p.text) { r += p.text; setChatMsgs(prev => prev.map((x, i) => i === prev.length - 1 ? { ...x, text: r } : x)); }
            if (p.spots) setChatMsgs(prev => prev.map((x, i) => i === prev.length - 1 ? { ...x, spots: p.spots } : x));
          } catch {}
        }
      }
    } catch { setChatMsgs(p => p.map((x, i) => i === p.length - 1 ? { ...x, text: "Sorry, couldn't connect. Try again!" } : x)); }
    finally { setChatLoading(false); }
  }

  function reportCrowd(id: string, level: string) {
    setReported(p => new Set([...p, id]));
    setSpots(p => p.map(s => s.id === id ? { ...s, occupancy: { occupancyPct: CROWD[level].pct, crowdLevel: level, updatedAt: new Date().toISOString() } } : s));
  }

  function checkIn(spotId: string) {
    setCheckedIn(spotId);
    reportCrowd(spotId, "MODERATE");
  }

  function shareSpot(spot: any) {
    const text = `📚 Studying at ${spot.name} — ${spot.address}. Check StudySpotSG for live crowd info!`;
    if (navigator.share) { navigator.share({ title: "StudySpotSG", text, url: window.location.href }); }
    else { navigator.clipboard.writeText(text); alert("Spot info copied to clipboard!"); }
  }

  const hr = new Date().getHours();
  const greeting = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : hr < 22 ? "Good evening" : "Studying late?";
  const examSeason = (new Date().getMonth() === 4 || new Date().getMonth() === 10);
  const formatTimer = (s: number) => `${Math.floor(s/3600).toString().padStart(2,"0")}:${Math.floor((s%3600)/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  return (<>
    <style>{CSS}</style>
    <div className="app">
      <div className="ambient" /><div className="noise" />

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-in">
          <div className="logo">
            <span style={{ fontSize: 22 }}>📚</span>
            <div>
              <div className="logo-n">StudySpot<em>SG</em></div>
              <div className="logo-s">Singapore's study companion</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {userLocation
              ? <div className="loc-on"><Navigation size={11} />Near me on</div>
              : <button className="loc-btn" onClick={() => navigator.geolocation.getCurrentPosition(p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }))}><Navigation size={11} />Near me</button>
            }
          </div>
        </div>
      </header>

      {/* STUDY TIMER BAR */}
      {(studyTimerActive || studyTimer > 0) && (
        <div className="timer-bar">
          <Timer size={13} />
          <span className="timer-val">{formatTimer(studyTimer)}</span>
          <span className="timer-lbl">{studyTimer > 0 && studyTimer % 2700 < 10 && studyTimer > 0 ? "⚠️ Take a break!" : "Study session"}</span>
          <button className="timer-btn" onClick={() => setStudyTimerActive(a => !a)}>
            {studyTimerActive ? "Pause" : "Resume"}
          </button>
          <button className="timer-btn red" onClick={() => { setStudyTimer(0); setStudyTimerActive(false); }}>Reset</button>
        </div>
      )}

      {/* CHECK-IN BAR */}
      {checkedIn && (
        <div className="checkin-bar">
          <CheckCircle size={13} />
          <span>Checked in at <strong>{spots.find(s => s.id === checkedIn)?.name}</strong></span>
          <span className="checkin-timer">Auto-expires in {formatMins(checkinTimer)}</span>
          <button className="checkin-x" onClick={() => setCheckedIn(null)}><X size={12} /></button>
        </div>
      )}

      <section className="hero">
        <div className="greeting">{greeting} 👋</div>
        <h1 className="h1">Where should you<br /><span>study right now?</span></h1>

        {examSeason && (
          <div className="exam-bar">
            📅 Exam season — spots fill up fast. Book NLB rooms 2-3 days ahead!
          </div>
        )}

        {showTip && (
          <div className="tip-bar">
            <Info size={12} />
            <span>{EXAM_TIPS[tipIdx]}</span>
            <button onClick={() => setShowTip(false)}><X size={11} /></button>
          </div>
        )}

        {/* SEARCH */}
        <div className="srch-box">
          <Search size={15} className="srch-ico" />
          <input className="srch-in" placeholder="Search by name, MRT, area..." value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setActiveSearch(query)} />
          {query && <button className="srch-x" onClick={() => { setQuery(""); setActiveSearch(""); }}><X size={13} /></button>}
          <button className="srch-btn" onClick={() => setActiveSearch(query)}>Search</button>
        </div>

        {/* PERSONA */}
        {!persona ? (
          <div>
            <div className="p-label">How do you study? Pick one for smarter recommendations:</div>
            <div className="p-grid">
              {PERSONAS.map(p => (
                <button key={p.id} className="p-card" onClick={() => pickPersona(p.id)} style={{ "--pc": p.color } as any}>
                  <div className="p-emoji">{p.emoji}</div>
                  <div className="p-name">{p.label}</div>
                  <div className="p-desc">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-active">
            <span>{PERSONAS.find(p => p.id === persona)?.emoji} {PERSONAS.find(p => p.id === persona)?.label} mode</span>
            <button onClick={() => { setPersona(null); localStorage.removeItem("persona"); }}>Change</button>
          </div>
        )}
      </section>

      {/* FILTERS */}
      <div className="filters-row">
        <FilterChip label="Open now" active={filterOpenNow} onClick={() => setFilterOpenNow(f => !f)} icon="🟢" />
        <FilterChip label="24/7" active={filter24h} onClick={() => setFilter24h(f => !f)} icon="🌙" />
        <FilterChip label="Free" active={filterFree} onClick={() => setFilterFree(f => !f)} icon="⭐" />
        <FilterChip label="WiFi" active={filterWifi} onClick={() => setFilterWifi(f => !f)} icon="📶" />
        <FilterChip label="Group" active={filterGroup} onClick={() => setFilterGroup(f => !f)} icon="👥" />
      </div>

      {/* VIEW TOGGLE */}
      <div className="vtog">
        <button className={`vbtn${view === "recommend" ? " on" : ""}`} onClick={() => setView("recommend")}>✨ Best for you</button>
        <button className={`vbtn${view === "all" ? " on" : ""}`} onClick={() => setView("all")}>All ({filtered.length})</button>
        {favSpots.length > 0 && <button className={`vbtn`} onClick={() => setView("recommend")}><Heart size={12} /> {favSpots.length}</button>}
        <button className="rfsh" onClick={fetchSpots} title="Refresh"><RefreshCw size={13} /></button>
      </div>

      <main className="main">
        {loading ? (
          <div className="ld"><div className="ld-spin" /><p>Finding the best spots for you...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 48 }}>😔</div>
            <h3>No spots match your filters</h3>
            <p>Try removing some filters or expanding your search</p>
            <button className="btn-p" onClick={() => { setFilterOpenNow(false); setFilter24h(false); setFilterFree(false); setFilterWifi(false); setFilterGroup(false); }}>Clear filters</button>
          </div>
        ) : view === "recommend" ? (
          <>
            {/* FAVOURITES */}
            {favSpots.length > 0 && (
              <div className="sec">
                <div className="sec-lbl">❤️ Your saved spots</div>
                <div className="bk-grid">
                  {favSpots.slice(0, 3).map(s => <BkCard key={s.id} spot={s} onSelect={setSelectedSpot} />)}
                </div>
              </div>
            )}

            {/* BEST SPOT */}
            {best && (
              <div className="sec">
                <div className="sec-lbl">⭐ Best match right now</div>
                <BestCard spot={best} onSelect={setSelectedSpot} onReport={reportCrowd}
                  reported={reported.has(best.id)} onCheckIn={checkIn}
                  isCheckedIn={checkedIn === best.id} onFav={toggleFav}
                  isFav={favourites.has(best.id)} onShare={shareSpot}
                  onStartTimer={() => { setStudyTimer(0); setStudyTimerActive(true); }} />
              </div>
            )}

            {/* BACKUPS */}
            {backups.length > 0 && (
              <div className="sec">
                <div className="sec-lbl">🔄 Backup options nearby</div>
                <div className="bk-grid">
                  {backups.map(s => <BkCard key={s.id} spot={s} onSelect={setSelectedSpot} />)}
                </div>
              </div>
            )}

            {/* STUDY TIMER PROMO */}
            {!studyTimerActive && studyTimer === 0 && (
              <div className="sec">
                <div className="feature-card" onClick={() => { setStudyTimerActive(true); }}>
                  <div className="feature-icon">⏱️</div>
                  <div>
                    <div className="feature-title">Study session timer</div>
                    <div className="feature-desc">Track your focus time. Get reminded to take breaks every 45 min.</div>
                  </div>
                  <ChevronRight size={16} style={{ color: "#475569", flexShrink: 0 }} />
                </div>
              </div>
            )}

            {/* AI PROMPTS */}
            <div className="sec">
              <div className="sec-lbl">💬 Ask the AI assistant</div>
              <div className="qp">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} className="qp-chip" onClick={() => { setChatOpen(true); setTimeout(() => sendChat(p), 100); }}>
                    {p}<ChevronRight size={11} />
                  </button>
                ))}
              </div>
            </div>

            {/* EXAM TIPS */}
            <div className="sec">
              <div className="sec-lbl">📖 Study tips for Singapore students</div>
              <div className="tips-grid">
                {EXAM_TIPS.map((tip, i) => (
                  <div key={i} className="tip-card">
                    <span className="tip-num">{i + 1}</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="sec">
            <div className="slist">
              {filtered.map(s => (
                <ListItem key={s.id} spot={s} onSelect={setSelectedSpot}
                  onReport={reportCrowd} reported={reported.has(s.id)}
                  isFav={favourites.has(s.id)} onFav={toggleFav} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL */}
      {selectedSpot && (
        <Modal spot={selectedSpot} onClose={() => setSelectedSpot(null)}
          onReport={reportCrowd} reported={reported.has(selectedSpot.id)}
          isFav={favourites.has(selectedSpot.id)} onFav={toggleFav}
          onCheckIn={checkIn} isCheckedIn={checkedIn === selectedSpot.id}
          onShare={shareSpot} onStartTimer={() => { setStudyTimer(0); setStudyTimerActive(true); }} />
      )}

      {/* CHAT FAB */}
      <button className="fab" onClick={() => setChatOpen(!chatOpen)}>
        {chatOpen ? <X size={20} /> : <><span>💬</span><span className="fab-lbl">Ask AI</span></>}
      </button>

      {/* CHATBOT */}
      {chatOpen && (
        <div className="chat">
          <div className="chat-hdr">
            <div className="chat-av">✨</div>
            <div className="chat-ht">
              <div className="chat-ti">Study Spot AI</div>
              <div className="chat-su">Powered by Claude · Knows all SG spots</div>
            </div>
            <button className="chat-cl" onClick={() => setChatOpen(false)}><X size={15} /></button>
          </div>
          <div className="chat-msgs">
            {chatMsgs.map((m, i) => (
              <div key={i} className={`cmsg ${m.role}`}>
                {m.role === "assistant" && <div className="cmsg-av">✨</div>}
                <div className="cmsg-b">
                  {m.text ? <p>{m.text}</p> : <div className="dots"><span /><span /><span /></div>}
                  {m.spots?.length > 0 && (
                    <div className="msg-spots">
                      {m.spots.slice(0, 3).map((s: any) => (
                        <button key={s.id} className="spot-pill" onClick={() => { setSelectedSpot(s); setChatOpen(false); }}>
                          {CAT_EMOJI[s.category]} {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-sugg">
            {QUICK_PROMPTS.slice(0, 3).map(p => (
              <button key={p} className="sugg" onClick={() => sendChat(p)}>{p}</button>
            ))}
          </div>
          <div className="chat-inp-row">
            <input className="chat-inp" value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Where should I study tonight?" disabled={chatLoading} />
            <button className="chat-send" onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading}>
              {chatLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  </>);
}

function FilterChip({ label, active, onClick, icon }: any) {
  return (
    <button className={`fchip${active ? " on" : ""}`} onClick={onClick}>
      {icon} {label}
    </button>
  );
}

function BestCard({ spot, onSelect, onReport, reported, onCheckIn, isCheckedIn, onFav, isFav, onShare, onStartTimer }: any) {
  const c = CROWD[spot.occupancy?.crowdLevel || "UNKNOWN"];
  const status = isOpenNow(spot.openingHours);
  const [showRep, setShowRep] = useState(false);

  return (
    <div className="best" style={{ borderColor: c.color + "40" }}>
      <div className="best-top">
        <div className="crowd-pill" style={{ background: c.bg, borderColor: c.color + "40" }}>
          <div className="cdot" style={{ background: c.color }} />
          <span style={{ color: c.color, fontWeight: 700 }}>{c.label}</span>
          <span className="cadv">{c.advice}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className={`fav-btn${isFav ? " on" : ""}`} onClick={() => onFav(spot.id)}>
            <Heart size={14} fill={isFav ? "currentColor" : "none"} />
          </button>
          <span style={{ fontSize: 22 }}>{CAT_EMOJI[spot.category]}</span>
        </div>
      </div>

      {/* Open status */}
      <div className="open-status">
        {spot.is24Hours ? (
          <span className="open-badge open">🟢 Open 24 hours</span>
        ) : status.open ? (
          <span className={`open-badge ${status.closesIn && status.closesIn < 90 ? "closing" : "open"}`}>
            🟢 Open · {status.closesIn && status.closesIn < 90 ? `⚠️ Closes in ${formatMins(status.closesIn)}` : `Closes at ${status.closeTime}`}
          </span>
        ) : (
          <span className="open-badge closed">
            🔴 Closed{status.opensIn ? ` · Opens in ${formatMins(status.opensIn)}` : ""}
          </span>
        )}
      </div>

      <h2 className="best-nm">{spot.name}</h2>
      <p className="best-addr">{spot.address}</p>
      {spot.nearestMrt && <div className="best-mrt">🚇 {spot.nearestMrt} · {spot.mrtWalkMins} min walk</div>}

      <div className="amen">
        {spot.hasWifi && <Chip icon={<Wifi size={11} />} label="WiFi" />}
        {spot.hasPowerSockets && <Chip icon={<Zap size={11} />} label="Power" />}
        {spot.is24Hours && <Chip icon={<Moon size={11} />} label="24/7" />}
        {spot.isFree && <Chip icon={<Star size={11} />} label="Free" />}
        {spot.isAirCon && <Chip icon={<span style={{ fontSize: 11 }}>❄️</span>} label="Air-con" />}
        <Chip icon={null} label={NOISE_LABELS[spot.noiseLevel] || spot.noiseLevel} />
        {spot.groupStudy && <Chip icon={<Users size={11} />} label="Group OK" />}
      </div>

      {spot.requiresBooking && (
        <div className="bk-notice">
          <BookOpen size={11} /> Booking required
          {spot.bookingUrl && <a href={spot.bookingUrl} target="_blank" rel="noopener noreferrer"> — Book on NLB →</a>}
        </div>
      )}

      <div className="best-acts">
        <button className="btn-p" onClick={() => onSelect(spot)}>View details <ChevronRight size={13} /></button>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`} target="_blank" rel="noopener noreferrer" className="btn-s">
          <MapPin size={12} />Directions
        </a>
        {!isCheckedIn
          ? <button className="btn-g" onClick={() => onCheckIn(spot.id)}>📍 I'm here</button>
          : <span className="rep-ok"><CheckCircle size={11} />Checked in!</span>
        }
        <button className="btn-g" onClick={() => onShare(spot)}><Share2 size={12} /></button>
        <button className="btn-g" onClick={onStartTimer}><Timer size={12} />Timer</button>
      </div>

      {!reported
        ? <button className="update-crowd-btn" onClick={() => setShowRep(!showRep)}>📊 Update crowd status</button>
        : <div className="rep-ok" style={{ padding: "8px 0" }}><CheckCircle size={11} />Thanks for the update!</div>
      }
      {showRep && !reported && <RepPanel onReport={(l: string) => { onReport(spot.id, l); setShowRep(false); }} />}
    </div>
  );
}

function BkCard({ spot, onSelect }: any) {
  const c = CROWD[spot.occupancy?.crowdLevel || "UNKNOWN"];
  const status = isOpenNow(spot.openingHours);
  return (
    <button className="bk" onClick={() => onSelect(spot)}>
      <div className="bk-top">
        <span style={{ fontSize: 18 }}>{CAT_EMOJI[spot.category]}</span>
        <div className="bk-c" style={{ color: c.color, background: c.bg }}>{c.emoji} {c.label}</div>
      </div>
      <div className="bk-nm">{spot.name}</div>
      {spot.nearestMrt && <div className="bk-mrt">🚇 {spot.nearestMrt}</div>}
      <div style={{ fontSize: 10, marginBottom: 6 }}>
        {spot.is24Hours ? <span style={{ color: "#4ade80" }}>🟢 24/7</span>
          : status.open ? <span style={{ color: "#4ade80" }}>🟢 Open</span>
            : <span style={{ color: "#ef4444" }}>🔴 Closed</span>}
      </div>
      <div className="bk-chips">
        {spot.hasWifi && <span>WiFi</span>}
        {spot.hasPowerSockets && <span>⚡</span>}
        {spot.isFree && <span>Free</span>}
      </div>
    </button>
  );
}

function ListItem({ spot, onSelect, onReport, reported, isFav, onFav }: any) {
  const c = CROWD[spot.occupancy?.crowdLevel || "UNKNOWN"];
  const status = isOpenNow(spot.openingHours);
  const [showRep, setShowRep] = useState(false);
  return (
    <div className="li">
      <div className="li-main" onClick={() => onSelect(spot)}>
        <div className="li-l">
          <div className="li-bar" style={{ background: c.color }} />
          <div>
            <div className="li-cat">{CAT_EMOJI[spot.category]} {spot.category.replace(/_/g, " ")}</div>
            <div className="li-nm">{spot.name}</div>
            <div className="li-meta">
              {spot.nearestMrt && <span>🚇 {spot.nearestMrt} · {spot.mrtWalkMins}min</span>}
              <span style={{ color: spot.is24Hours || status.open ? "#4ade80" : "#ef4444", marginLeft: 6 }}>
                {spot.is24Hours ? "24/7" : status.open ? `Open til ${status.closeTime}` : "Closed"}
              </span>
            </div>
          </div>
        </div>
        <div className="li-r">
          <div className="li-cb" style={{ color: c.color, background: c.bg }}>{c.label}</div>
          <div className="li-ics">
            {spot.hasWifi && <Wifi size={10} />}
            {spot.hasPowerSockets && <Zap size={10} />}
            {spot.is24Hours && <Moon size={10} />}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className={`fav-btn sm${isFav ? " on" : ""}`} onClick={e => { e.stopPropagation(); onFav(spot.id); }}>
              <Heart size={11} fill={isFav ? "currentColor" : "none"} />
            </button>
            <ChevronRight size={13} style={{ color: "#334155" }} />
          </div>
        </div>
      </div>
      {!reported
        ? <button className="li-rep" onClick={() => setShowRep(!showRep)}>Update crowd status</button>
        : <span className="li-ok"><CheckCircle size={10} />Reported, thanks!</span>
      }
      {showRep && !reported && <RepPanel onReport={(l: string) => { onReport(spot.id, l); setShowRep(false); }} />}
    </div>
  );
}

function Modal({ spot, onClose, onReport, reported, isFav, onFav, onCheckIn, isCheckedIn, onShare, onStartTimer }: any) {
  const c = CROWD[spot.occupancy?.crowdLevel || "UNKNOWN"];
  const status = isOpenNow(spot.openingHours);
  const [showRep, setShowRep] = useState(false);

  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <button className="modal-x" onClick={onClose}><X size={17} /></button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`fav-btn${isFav ? " on" : ""}`} onClick={() => onFav(spot.id)} style={{ width: 36, height: 36 }}>
              <Heart size={15} fill={isFav ? "currentColor" : "none"} />
            </button>
            <button className="modal-x" onClick={() => onShare(spot)}><Share2 size={15} /></button>
          </div>
        </div>

        <div className="modal-crowd" style={{ background: c.bg, borderColor: c.color + "40" }}>
          <div className="cdot lg" style={{ background: c.color }} />
          <div>
            <div style={{ color: c.color, fontWeight: 700, fontSize: 15 }}>{c.label}</div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>{c.advice}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            {spot.is24Hours ? <span className="open-badge open">Open 24h</span>
              : status.open
                ? <span className={`open-badge ${status.closesIn && status.closesIn < 90 ? "closing" : "open"}`}>
                    Open{status.closesIn && status.closesIn < 90 ? ` · Closes in ${formatMins(status.closesIn)}` : ` til ${status.closeTime}`}
                  </span>
                : <span className="open-badge closed">Closed{status.opensIn ? ` · Opens in ${formatMins(status.opensIn)}` : ""}</span>
            }
          </div>
        </div>

        <div className="modal-cat">{CAT_EMOJI[spot.category]} {spot.category.replace(/_/g, " ")}</div>
        <h2 className="modal-nm">{spot.name}</h2>
        <p className="modal-addr">{spot.address}</p>
        {spot.nearestMrt && <div className="modal-mrt">🚇 {spot.nearestMrt} · {spot.mrtWalkMins} min walk</div>}

        <div className="modal-stl">Amenities</div>
        <div className="modal-amen">
          {[
            { a: spot.hasWifi, i: <Wifi size={13} />, l: "Free WiFi" },
            { a: spot.hasPowerSockets, i: <Zap size={13} />, l: "Power sockets" },
            { a: spot.isAirCon, i: <span>❄️</span>, l: "Air-conditioned" },
            { a: spot.is24Hours, i: <Clock size={13} />, l: "Open 24 hours" },
            { a: spot.isFree, i: <Star size={13} />, l: "Free to use" },
            { a: spot.groupStudy, i: <Users size={13} />, l: "Group study" },
            { a: spot.soloStudy, i: <BookOpen size={13} />, l: "Solo study" },
            { a: spot.noiseLevel === "QUIET" || spot.noiseLevel === "SILENT", i: <VolumeX size={13} />, l: NOISE_LABELS[spot.noiseLevel] || spot.noiseLevel },
          ].map((x, i) => (
            <div key={i} className={`ma ${x.a ? "yes" : "no"}`}>
              {x.i}<span>{x.l}</span>
              {x.a ? <CheckCircle size={11} className="mck" /> : <X size={11} className="mcx" />}
            </div>
          ))}
        </div>

        {spot.totalSeats && <div className="modal-seats">🪑 Approximately <strong>{spot.totalSeats} seats</strong> total</div>}

        {spot.requiresBooking && (
          <div className="modal-bk">
            <AlertCircle size={13} />
            <div>
              <div style={{ fontWeight: 600 }}>Booking required</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Reserve a spot before visiting on NLB eServices</div>
            </div>
          </div>
        )}

        <div className="modal-actions-row">
          {!isCheckedIn
            ? <button className="btn-g" onClick={() => { onCheckIn(spot.id); onClose(); }}>📍 I'm heading here</button>
            : <span className="rep-ok"><CheckCircle size={11} />Checked in!</span>
          }
          <button className="btn-g" onClick={onStartTimer}><Timer size={12} />Start timer</button>
        </div>

        {!reported
          ? <button className="modal-rep" onClick={() => setShowRep(!showRep)}>📊 Update crowd status</button>
          : <div className="modal-ok"><CheckCircle size={13} />Crowd status updated — thank you!</div>
        }
        {showRep && !reported && <RepPanel onReport={(l: string) => { onReport(spot.id, l); setShowRep(false); }} />}

        <div className="modal-acts">
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
            target="_blank" rel="noopener noreferrer" className="btn-p full">
            <MapPin size={13} />Get directions
          </a>
          {spot.requiresBooking && spot.bookingUrl && (
            <a href={spot.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-s full">
              <Calendar size={13} />Book on NLB
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function RepPanel({ onReport }: { onReport: (l: string) => void }) {
  return (
    <div className="rep-panel">
      <div className="rep-lbl">How crowded is it right now?</div>
      <div className="rep-opts">
        {["EMPTY", "QUIET", "MODERATE", "BUSY", "FULL"].map(l => (
          <button key={l} className="rep-btn" style={{ borderColor: CROWD[l].color + "60", color: CROWD[l].color }} onClick={() => onReport(l)}>
            {CROWD[l].emoji} {CROWD[l].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: any; label: string }) {
  return <div className="chip-sm">{icon}<span>{label}</span></div>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#060a12;font-family:'Inter',-apple-system,sans-serif;color:#e2e8f0;min-height:100vh;overflow-x:hidden;}
.app{position:relative;max-width:680px;margin:0 auto;padding:0 16px 120px;}
.ambient{position:fixed;top:-300px;left:50%;transform:translateX(-50%);width:900px;height:600px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(79,70,229,0.08) 0%,rgba(139,92,246,0.04) 40%,transparent 70%);pointer-events:none;z-index:0;}
.noise{position:fixed;inset:0;opacity:0.02;pointer-events:none;z-index:0;}
.hdr{position:sticky;top:0;z-index:40;background:rgba(6,10,18,0.9);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.05);margin:0 -16px;}
.hdr-in{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;max-width:680px;margin:0 auto;}
.logo{display:flex;align-items:center;gap:10px;}
.logo-n{font-size:17px;font-weight:700;letter-spacing:-0.5px;}.logo-n em{color:#818cf8;font-style:normal;}
.logo-s{font-size:10px;color:#475569;}
.loc-btn{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:#818cf8;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:20px;padding:6px 12px;cursor:pointer;font-family:'Inter',sans-serif;}
.loc-on{display:flex;align-items:center;gap:5px;font-size:12px;color:#4ade80;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);border-radius:20px;padding:6px 12px;}
.timer-bar{background:rgba(99,102,241,0.15);border-bottom:1px solid rgba(99,102,241,0.3);padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:12px;color:#a5b4fc;margin:0 -16px;position:sticky;top:53px;z-index:39;}
.timer-val{font-family:monospace;font-size:15px;font-weight:700;color:white;}
.timer-lbl{flex:1;color:#94a3b8;}
.timer-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(99,102,241,0.4);background:rgba(99,102,241,0.2);color:#a5b4fc;font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;}
.timer-btn.red{border-color:rgba(239,68,68,0.4);background:rgba(239,68,68,0.15);color:#fca5a5;}
.checkin-bar{background:rgba(74,222,128,0.1);border-bottom:1px solid rgba(74,222,128,0.2);padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:12px;color:#86efac;margin:0 -16px;}
.checkin-timer{margin-left:auto;font-size:11px;color:#4ade80;}
.checkin-x{background:none;border:none;color:#64748b;cursor:pointer;display:flex;}
.hero{padding:24px 0 16px;position:relative;z-index:1;}
.greeting{font-size:13px;color:#64748b;font-weight:500;margin-bottom:8px;}
.h1{font-size:26px;font-weight:700;letter-spacing:-0.8px;line-height:1.25;margin-bottom:16px;}
.h1 span{background:linear-gradient(135deg,#818cf8,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.exam-bar{background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:10px 14px;font-size:12px;color:#fbbf24;margin-bottom:10px;}
.tip-bar{display:flex;align-items:center;gap:8px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:10px;padding:8px 12px;font-size:12px;color:#94a3b8;margin-bottom:14px;}
.tip-bar span{flex:1;}
.tip-bar button{background:none;border:none;color:#64748b;cursor:pointer;display:flex;}
.srch-box{display:flex;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:4px 4px 4px 14px;gap:10px;margin-bottom:16px;transition:border-color 0.2s;}
.srch-box:focus-within{border-color:rgba(99,102,241,0.5);background:rgba(255,255,255,0.06);}
.srch-ico{color:#475569;flex-shrink:0;}
.srch-in{flex:1;background:none;border:none;outline:none;font-size:14px;color:#e2e8f0;font-family:'Inter',sans-serif;}
.srch-in::placeholder{color:#475569;}
.srch-x{background:none;border:none;color:#64748b;cursor:pointer;display:flex;padding:4px;}
.srch-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:white;font-size:13px;font-weight:600;padding:9px 18px;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;}
.p-label{font-size:13px;color:#64748b;margin-bottom:10px;}
.p-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}
.p-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 8px;cursor:pointer;text-align:center;transition:all 0.2s;font-family:'Inter',sans-serif;}
.p-card:hover{background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);transform:translateY(-1px);}
.p-emoji{font-size:22px;margin-bottom:6px;}
.p-name{font-size:11px;font-weight:600;color:#e2e8f0;margin-bottom:3px;}
.p-desc{font-size:10px;color:#64748b;line-height:1.3;}
.p-active{display:flex;align-items:center;justify-content:space-between;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:10px 14px;font-size:13px;font-weight:500;color:#a5b4fc;margin-bottom:14px;}
.p-active button{background:none;border:none;color:#64748b;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;}
.filters-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px;padding-bottom:4px;}
.filters-row::-webkit-scrollbar{display:none;}
.fchip{padding:7px 13px;border-radius:999px;font-size:12px;font-weight:500;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#64748b;cursor:pointer;white-space:nowrap;font-family:'Inter',sans-serif;transition:all 0.2s;}
.fchip.on{background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.4);color:#a5b4fc;}
.vtog{display:flex;align-items:center;gap:8px;margin-bottom:18px;}
.vbtn{padding:8px 16px;border-radius:999px;font-size:13px;font-weight:500;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#64748b;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;display:flex;align-items:center;gap:5px;}
.vbtn.on{background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.4);color:#a5b4fc;}
.rfsh{margin-left:auto;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#64748b;cursor:pointer;}
.main{position:relative;z-index:1;}
.sec{margin-bottom:24px;}
.sec-lbl{font-size:11px;font-weight:600;letter-spacing:0.5px;color:#475569;text-transform:uppercase;margin-bottom:10px;}
.ld{text-align:center;padding:60px 20px;color:#475569;}
.ld-spin{width:32px;height:32px;border:2px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;}
@keyframes spin{to{transform:rotate(360deg);}}
.empty{text-align:center;padding:60px 20px;color:#475569;}
.empty h3{font-size:16px;color:#64748b;margin:12px 0 8px;}
.empty p{font-size:13px;margin-bottom:20px;}
.best{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:20px;}
.best-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.crowd-pill{display:flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;border:1px solid;font-size:13px;}
.cdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;animation:pd 2s infinite;}
.cdot.lg{width:12px;height:12px;}
@keyframes pd{0%,100%{opacity:1;}50%{opacity:0.5;}}
.cadv{font-size:11px;color:#94a3b8;}
.open-status{margin-bottom:12px;}
.open-badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;}
.open-badge.open{background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);}
.open-badge.closing{background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.2);}
.open-badge.closed{background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);}
.best-nm{font-size:20px;font-weight:700;letter-spacing:-0.5px;margin-bottom:6px;}
.best-addr{font-size:13px;color:#64748b;margin-bottom:8px;}
.best-mrt{font-size:12px;color:#94a3b8;margin-bottom:12px;}
.amen{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.chip-sm{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:500;color:#94a3b8;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);padding:5px 10px;border-radius:999px;}
.bk-notice{display:flex;align-items:center;gap:6px;font-size:12px;color:#fbbf24;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:8px 12px;margin-bottom:12px;}
.bk-notice a{color:#fbbf24;text-decoration:underline;margin-left:4px;}
.best-acts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}
.update-crowd-btn{width:100%;padding:10px;font-size:12px;color:#64748b;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;margin-top:4px;}
.update-crowd-btn:hover{color:#94a3b8;border-color:rgba(255,255,255,0.12);}
.fav-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#64748b;cursor:pointer;transition:all 0.2s;}
.fav-btn.on{color:#f472b6;border-color:rgba(244,114,182,0.3);background:rgba(244,114,182,0.1);}
.fav-btn.sm{width:26px;height:26px;}
.feature-card{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px;cursor:pointer;transition:all 0.2s;}
.feature-card:hover{background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.25);}
.feature-icon{font-size:28px;flex-shrink:0;}
.feature-title{font-size:14px;font-weight:600;color:#e2e8f0;margin-bottom:3px;}
.feature-desc{font-size:12px;color:#64748b;line-height:1.4;}
.bk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.bk{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:14px;text-align:left;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;}
.bk:hover{background:rgba(255,255,255,0.06);border-color:rgba(99,102,241,0.3);transform:translateY(-1px);}
.bk-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.bk-c{font-size:10px;font-weight:600;padding:3px 7px;border-radius:999px;}
.bk-nm{font-size:12px;font-weight:600;color:#e2e8f0;margin-bottom:4px;line-height:1.3;}
.bk-mrt{font-size:10px;color:#64748b;margin-bottom:4px;}
.bk-chips{display:flex;flex-wrap:wrap;gap:3px;}
.bk-chips span{font-size:10px;color:#64748b;background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:999px;}
.qp{display:flex;flex-direction:column;gap:8px;}
.qp-chip{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:13px 16px;font-size:13px;color:#94a3b8;cursor:pointer;font-family:'Inter',sans-serif;text-align:left;transition:all 0.2s;}
.qp-chip:hover{background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.3);color:#c7d2fe;}
.tips-grid{display:flex;flex-direction:column;gap:8px;}
.tip-card{display:flex;align-items:flex-start;gap:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;}
.tip-num{width:20px;height:20px;border-radius:50%;background:rgba(99,102,241,0.2);color:#818cf8;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.tip-card span:last-child{font-size:12px;color:#64748b;line-height:1.5;}
.slist{display:flex;flex-direction:column;gap:8px;}
.li{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;}
.li-main{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;transition:background 0.2s;}
.li-main:hover{background:rgba(255,255,255,0.04);}
.li-l{display:flex;align-items:center;gap:12px;}
.li-bar{width:4px;height:40px;border-radius:999px;flex-shrink:0;}
.li-cat{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px;}
.li-nm{font-size:14px;font-weight:600;color:#e2e8f0;margin-bottom:3px;}
.li-meta{font-size:11px;color:#64748b;display:flex;align-items:center;}
.li-r{display:flex;flex-direction:column;align-items:flex-end;gap:6px;}
.li-cb{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap;}
.li-ics{display:flex;gap:5px;color:#475569;}
.li-rep{width:100%;padding:9px;font-size:11px;color:#475569;background:rgba(255,255,255,0.02);border:none;border-top:1px solid rgba(255,255,255,0.05);cursor:pointer;font-family:'Inter',sans-serif;}
.li-rep:hover{color:#94a3b8;}
.li-ok{display:flex;align-items:center;justify-content:center;gap:5px;padding:9px;font-size:11px;color:#4ade80;border-top:1px solid rgba(255,255,255,0.05);}
.rep-panel{padding:12px 16px;border-top:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.2);}
.rep-lbl{font-size:11px;color:#64748b;margin-bottom:10px;}
.rep-opts{display:flex;gap:6px;flex-wrap:wrap;}
.rep-btn{padding:6px 12px;border-radius:999px;border:1px solid;background:transparent;font-size:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
.rep-ok{display:flex;align-items:center;gap:5px;font-size:12px;color:#4ade80;}
.btn-p{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'Inter',sans-serif;}
.btn-p.full{width:100%;justify-content:center;}
.btn-s{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#94a3b8;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;font-family:'Inter',sans-serif;}
.btn-s.full{width:100%;justify-content:center;}
.btn-g{display:inline-flex;align-items:center;gap:5px;background:none;border:1px solid rgba(255,255,255,0.08);color:#64748b;border-radius:10px;padding:10px 14px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;}
.btn-g:hover{border-color:rgba(255,255,255,0.15);color:#94a3b8;}
.ov{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:flex-end;justify-content:center;animation:fi 0.2s ease;}
@keyframes fi{from{opacity:0;}to{opacity:1;}}
.modal{background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;position:relative;animation:su 0.3s ease;}
@keyframes su{from{transform:translateY(40px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.modal-x{background:rgba(255,255,255,0.08);border:none;color:#94a3b8;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.modal-crowd{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;border:1px solid;margin-bottom:14px;}
.modal-cat{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;}
.modal-nm{font-size:20px;font-weight:700;letter-spacing:-0.5px;margin-bottom:6px;}
.modal-addr{font-size:13px;color:#64748b;margin-bottom:8px;}
.modal-mrt{font-size:13px;color:#94a3b8;margin-bottom:18px;}
.modal-stl{font-size:11px;font-weight:600;letter-spacing:0.5px;color:#475569;text-transform:uppercase;margin-bottom:10px;}
.modal-amen{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
.ma{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;font-size:12px;border:1px solid;}
.ma.yes{background:rgba(74,222,128,0.05);border-color:rgba(74,222,128,0.15);color:#86efac;}
.ma.no{background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.06);color:#334155;}
.mck{color:#4ade80;margin-left:auto;}.mcx{color:#334155;margin-left:auto;}
.modal-seats{font-size:13px;color:#94a3b8;margin-bottom:14px;display:flex;align-items:center;gap:6px;}
.modal-bk{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#fbbf24;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:12px 14px;margin-bottom:14px;}
.modal-actions-row{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;}
.modal-rep{width:100%;padding:12px;font-size:13px;color:#64748b;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;cursor:pointer;font-family:'Inter',sans-serif;margin-bottom:10px;}
.modal-ok{display:flex;align-items:center;gap:8px;color:#4ade80;font-size:13px;padding:10px;margin-bottom:10px;}
.modal-acts{display:flex;flex-direction:column;gap:8px;margin-top:14px;}
.fab{position:fixed;bottom:24px;right:20px;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:999px;padding:14px 20px;color:white;cursor:pointer;font-size:20px;box-shadow:0 8px 24px rgba(99,102,241,0.4);z-index:50;transition:all 0.2s;}
.fab:hover{transform:scale(1.05);}
.fab-lbl{font-size:14px;font-weight:600;font-family:'Inter',sans-serif;}
.chat{position:fixed;bottom:86px;right:16px;left:16px;max-width:420px;margin:0 auto;background:#0d1526;border:1px solid rgba(255,255,255,0.1);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,0.7);z-index:50;display:flex;flex-direction:column;max-height:70vh;overflow:hidden;animation:su 0.25s ease;}
@media(min-width:480px){.chat{left:auto;width:380px;}}
.chat-hdr{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:16px;display:flex;align-items:center;gap:12px;}
.chat-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.chat-ht{flex:1;}
.chat-ti{font-size:14px;font-weight:700;}
.chat-su{font-size:11px;opacity:0.7;}
.chat-cl{background:rgba(255,255,255,0.15);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;}
.cmsg{display:flex;gap:8px;}
.cmsg.user{flex-direction:row-reverse;}
.cmsg-av{width:26px;height:26px;border-radius:50%;background:rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:2px;}
.cmsg-b{max-width:85%;}
.cmsg-b p{font-size:13px;line-height:1.55;padding:10px 13px;border-radius:14px;}
.cmsg.user .cmsg-b p{background:rgba(99,102,241,0.25);border:1px solid rgba(99,102,241,0.3);color:#c7d2fe;border-bottom-right-radius:4px;}
.cmsg.assistant .cmsg-b p{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#cbd5e1;border-bottom-left-radius:4px;}
.msg-spots{display:flex;flex-direction:column;gap:6px;margin-top:8px;}
.spot-pill{display:flex;align-items:center;gap:6px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:8px 12px;font-size:12px;color:#a5b4fc;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;}
.dots{display:flex;gap:4px;padding:12px 14px;}
.dots span{width:6px;height:6px;border-radius:50%;background:#6366f1;animation:tb 1.2s infinite;}
.dots span:nth-child(2){animation-delay:0.2s;}.dots span:nth-child(3){animation-delay:0.4s;}
@keyframes tb{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
.chat-sugg{padding:8px 12px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;border-top:1px solid rgba(255,255,255,0.06);}
.sugg{padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:11px;color:#64748b;cursor:pointer;white-space:nowrap;font-family:'Inter',sans-serif;}
.chat-inp-row{padding:12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;}
.chat-inp{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 13px;font-size:13px;color:white;outline:none;font-family:'Inter',sans-serif;}
.chat-inp::placeholder{color:#475569;}
.chat-send{background:#6366f1;border:none;border-radius:10px;width:40px;display:flex;align-items:center;justify-content:center;color:white;cursor:pointer;}
.chat-send:disabled{opacity:0.4;cursor:not-allowed;}
.spin{animation:spin 0.8s linear infinite;}
@media(max-width:480px){.h1{font-size:22px;}.p-grid{grid-template-columns:repeat(2,1fr);}.bk-grid{grid-template-columns:repeat(2,1fr);}.modal-amen{grid-template-columns:1fr;}}
`;
