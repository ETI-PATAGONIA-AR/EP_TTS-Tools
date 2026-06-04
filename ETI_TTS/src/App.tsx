import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, Download, Plus, Trash2, Mic2, Info, VolumeX, Sparkles, Save, X
} from "lucide-react";
import { VOICE_OPTIONS } from "./data";
import { VoiceName, Speaker, HistoryItem } from "./types";

function genId() { return `s${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
function fmt(sec: number) {
  if (isNaN(sec)) return "00:00";
  return `${Math.floor(sec / 60).toString().padStart(2, "0")}:${Math.floor(sec % 60).toString().padStart(2, "0")}`;
}

interface Scene {
  id: string;
  name: string;
  text: string;
  speakers: Speaker[];
}

const DEFAULT_SPEAKERS: Speaker[] = [
  { id: genId(), label: "Speaker A", voice: "Charon", pitch: "+0st", rate: "+0%" },
  { id: genId(), label: "Speaker B", voice: "Kore", pitch: "+0st", rate: "+0%" },
];

export default function App() {
  const [tab, setTab] = useState<"editor" | "history">("editor");
  const [speakers, setSpeakers] = useState<Speaker[]>(DEFAULT_SPEAKERS);

  // Scenes
  const initScene = (id: string, name: string, overrides = {}): Scene => ({
    id, name, text: "",
    speakers: DEFAULT_SPEAKERS.map((s) => ({ ...s, id: genId() })),
    ...overrides,
  });

  const migrateSpeaker = (sp: any): Speaker => ({
    id: sp.id || genId(),
    label: sp.label || "Speaker",
    voice: sp.voice || "Kore",
    pitch: sp.pitch || "+0st",
    rate: sp.rate || "+0%",
  });

  const [scenes, setScenes] = useState<Scene[]>(() => {
    try {
      const s = localStorage.getItem("ep_tts_scenes");
      if (s) {
        const p: any[] = JSON.parse(s);
        if (p.length) return p.map((sc: any) => initScene(sc.id, sc.name, {
          ...sc,
          speakers: (sc.speakers || []).map(migrateSpeaker),
        }));
      }
    } catch {}
    return [initScene("scene-1", "Escena 1")];
  });
  const [activeSceneId, setActiveSceneId] = useState<string>(scenes[0]?.id || "scene-1");

  const activeScene = scenes.find((s) => s.id === activeSceneId);
  const sceneText = activeScene?.text || "";

  // Restore speakers from active scene on mount
  useEffect(() => {
    const sc = scenes.find((s) => s.id === activeSceneId);
    if (sc) setSpeakers(sc.speakers);
  }, []);

  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Persist scenes
  const persistScenes = useCallback((s: Scene[]) => {
    setScenes(s);
    localStorage.setItem("ep_tts_scenes", JSON.stringify(s));
  }, []);

  const updateSceneText = useCallback((text: string) => {
    setScenes((prev) => {
      const next = prev.map((s) => (s.id === activeSceneId ? { ...s, text } : s));
      localStorage.setItem("ep_tts_scenes", JSON.stringify(next));
      return next;
    });
  }, [activeSceneId]);

  // Voice profiles
  interface VoiceProfile { name: string; speakers: Speaker[]; }
  const [profiles, setProfiles] = useState<VoiceProfile[]>(() => {
    try {
      const p = localStorage.getItem("ep_tts_profiles");
      return p ? JSON.parse(p) : [];
    } catch { return []; }
  });
  const saveProfile = () => {
    const name = prompt("Nombre del perfil de voces:");
    if (!name) return;
    const updated = [...profiles.filter((p) => p.name !== name), { name, speakers }];
    setProfiles(updated);
    localStorage.setItem("ep_tts_profiles", JSON.stringify(updated));
  };
  const loadProfile = (name: string) => {
    const p = profiles.find((p) => p.name === name);
    if (p) setSpeakers(p.speakers.map((s) => ({ ...s, id: genId() })));
  };
  const deleteProfile = (name: string, e: any) => {
    e.stopPropagation();
    const updated = profiles.filter((p) => p.name !== name);
    setProfiles(updated);
    localStorage.setItem("ep_tts_profiles", JSON.stringify(updated));
  };

  // Auto-save speakers to active scene
  useEffect(() => {
    setScenes((prev) => {
      const next = prev.map((s) =>
        s.id === activeSceneId ? { ...s, speakers } : s
      );
      localStorage.setItem("ep_tts_scenes", JSON.stringify(next));
      return next;
    });
  }, [activeSceneId, speakers]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ep_tts_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHistory = (h: HistoryItem[]) => {
    setHistory(h);
    localStorage.setItem("ep_tts_history", JSON.stringify(h));
  };

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setPlayingId(null); setCurrentTime(0); };
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);

  const togglePlay = (item: HistoryItem) => {
    if (!audioRef.current) return;
    if (playingId === item.id && isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.src = item.audioSrc;
      audioRef.current.playbackRate = speed;
      setPlayingId(item.id);
      setCurrentTime(0);
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (v: number) => {
    if (audioRef.current) { audioRef.current.currentTime = v; setCurrentTime(v); }
  };

  // Speaker management
  const addSpeaker = () => {
    const next = String.fromCharCode(65 + speakers.length);
    setSpeakers([...speakers, { id: genId(), label: `Speaker ${next}`, voice: "Kore", pitch: "+0st", rate: "+0%" }]);
  };
  const removeSpeaker = (id: string) => {
    if (speakers.length <= 1) return;
    setSpeakers(speakers.filter((s) => s.id !== id));
  };
  const updateSpeaker = (id: string, field: keyof Speaker, value: string) => {
    setSpeakers(speakers.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // Insert speaker prefix at cursor or end
  const insertSpeaker = (label: string) => {
    const ta = textAreaRef.current;
    if (!ta) return;
    const prefix = `${label}: `;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = sceneText.slice(0, start);
    const after = sceneText.slice(end);
    let insertion = prefix;
    if (before.length > 0 && !before.endsWith("\n")) insertion = "\n" + prefix;
    const newText = before + insertion + after;
    updateSceneText(newText);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + insertion.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // Scenes
  const addScene = () => {
    const n = scenes.length + 1;
    const scene = initScene(`scene-${Date.now()}`, `Escena ${n}`);
    persistScenes([...scenes, scene]);
    setActiveSceneId(scene.id);
  };

  const switchScene = (id: string) => {
    const raw = localStorage.getItem("ep_tts_scenes") || "[]";
    let saved: Scene[];
    try { saved = JSON.parse(raw); } catch { saved = scenes; }
    saved = saved.map((s: Scene) =>
      s.id === activeSceneId ? { ...s, speakers } : s
    );
    localStorage.setItem("ep_tts_scenes", JSON.stringify(saved));
    setScenes(saved);

    const next = saved.find((s) => s.id === id);
    if (next) setSpeakers(next.speakers);
    setActiveSceneId(id);
  };

  const deleteScene = (id: string, e: any) => {
    e.stopPropagation();
    if (scenes.length <= 1) return;
    const filtered = scenes.filter((s) => s.id !== id);
    persistScenes(filtered);
    if (activeSceneId === id) setActiveSceneId(filtered[0]?.id || "");
  };

  const renameScene = (id: string, name: string) => {
    setScenes((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, name } : s));
      localStorage.setItem("ep_tts_scenes", JSON.stringify(next));
      return next;
    });
  };

  const newProject = () => {
    const fresh = initScene(`scene-${Date.now()}`, "Escena 1");
    persistScenes([fresh]);
    setActiveSceneId(fresh.id);
    setSpeakers(fresh.speakers);
    setSpeed(1.0);
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setPlayingId(null);
    setCurrentTime(0);
    setError(null);
  };

  const clearHistory = () => {
    if (!window.confirm("¿Borrar todo el historial?")) return;
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setPlayingId(null);
    saveHistory([]);
  };

  const deleteItem = (id: string, e: any) => {
    e.stopPropagation();
    if (playingId === id && audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setPlayingId(null);
    saveHistory(history.filter((h) => h.id !== id));
  };

  const download = (item: HistoryItem) => {
    const link = document.createElement("a");
    link.href = item.audioSrc;
    link.download = `EP_TTS_${item.id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isConversation = /Speaker\s+[A-Z]:/i.test(sceneText);

  const generate = async () => {
    if (!sceneText.trim()) return;
    setGenerating(true);
    setError(null);
    setGenStep("Iniciando edge-tts...");

    try {
      setTimeout(() => setGenStep("Analizando interlocutores..."), 800);
      setTimeout(() => setGenStep("Generando audio con voces neurales..."), 1800);
      setTimeout(() => setGenStep("Procesando audio final..."), 3000);

      const body = isConversation
        ? { mode: "conversation", text: sceneText, speakers }
        : { mode: "single", text: sceneText, voice: speakers[0]?.voice || "Kore", pitch: speakers[0]?.pitch || "+0st", rate: speakers[0]?.rate || "+0%" };

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !data.audioSrc) throw new Error("Sin audio");

      const item: HistoryItem = {
        id: `tts-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        text: sceneText.substring(0, 200),
        audioSrc: data.audioSrc,
        genre: isConversation ? "Diálogo" : "Voz única",
      };

      saveHistory([item, ...history]);

      setTimeout(() => {
        togglePlay(item);
        setTab("history");
        setGenerating(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Error al generar");
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* HEADER */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/Logo_ETI.png" alt="ETI Patagonia" className="h-10 w-auto" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-900/50 text-emerald-300 border border-emerald-500/20">ETI Patagonia</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">v3.1 EP_TTS TOOLS</span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">EP_TTS <span className="text-slate-400 font-light font-mono">| Síntesis de Voz</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400 bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 align-middle animate-ping" />
              edge-tts Neural
            </span>
            <button onClick={newProject} className="flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 px-2 py-1.5 rounded border border-rose-500/30 transition-colors cursor-pointer">
              <Sparkles className="h-3.5 w-3.5" /> Nuevo Proyecto
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: SPEAKER CONFIG */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Interlocutores</h2>
              <button onClick={addSpeaker} className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20 transition-colors cursor-pointer">
                <Plus className="h-3 w-3" /> Agregar
              </button>
            </div>
            {/* Profiles */}
            <div className="flex items-center gap-1 mb-3">
              <select
                value=""
                onChange={(e) => { if (e.target.value) loadProfile(e.target.value); }}
                className="flex-1 text-[10px] font-mono bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">--- Cargar perfil ---</option>
                {profiles.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <button onClick={saveProfile} className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap">
                <Save className="h-3 w-3 inline mr-0.5" />Perfil
              </button>
              {profiles.length > 0 && (
                <button onClick={(e) => { const last = profiles[profiles.length - 1]; deleteProfile(last.name, e); }} className="text-[10px] font-mono text-rose-400 hover:text-rose-300 bg-rose-950/30 px-1.5 py-1 rounded border border-rose-500/20 transition-colors cursor-pointer">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {speakers.map((spk, i) => (
                <div key={spk.id} className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-500">#{i + 1}</span>
                    {speakers.length > 1 && (
                      <button onClick={() => removeSpeaker(spk.id)} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                  <input
                    className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-1.5"
                    value={spk.label}
                    onChange={(e) => updateSpeaker(spk.id, "label", e.target.value)}
                    placeholder="Speaker A"
                  />
                  <select
                    value={spk.voice}
                    onChange={(e) => updateSpeaker(spk.id, "voice", e.target.value as VoiceName)}
                    className="w-full text-[11px] font-mono bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer mb-2"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                  <div className="border-t border-slate-800/40 pt-2 space-y-2">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 mb-0.5">Tono</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-slate-600 w-8">Grave</span>
                        <input type="range" min="-6" max="6" step="1" value={parseInt(spk.pitch)} onChange={(e) => updateSpeaker(spk.id, "pitch", `${e.target.value}st`)} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                        <span className="text-[9px] font-mono text-slate-600 w-8 text-right">Agudo</span>
                        <span className="text-[10px] font-mono text-emerald-400 w-10 text-center">{spk.pitch}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 mb-0.5">Velocidad</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-slate-600 w-8">Lento</span>
                        <input type="range" min="-50" max="50" step="5" value={parseInt(spk.rate)} onChange={(e) => { const v = parseInt(e.target.value); updateSpeaker(spk.id, "rate", `${v >= 0 ? '+' : ''}${v}%`); }} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                        <span className="text-[9px] font-mono text-slate-600 w-8 text-right">Rápido</span>
                        <span className="text-[10px] font-mono text-emerald-400 w-10 text-center">{spk.rate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: EDITOR + HISTORY */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex border-b border-slate-900 bg-slate-950 rounded-xl p-1 gap-1 border border-slate-800/50">
            <button onClick={() => setTab("editor")} className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${tab === "editor" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-slate-200"}`}>Editor</button>
            <button onClick={() => setTab("history")} className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all relative cursor-pointer ${tab === "history" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-slate-200"}`}>
              Historial
              {history.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />}
            </button>
          </div>

          {/* EDITOR */}
          {tab === "editor" && (
            <div className="flex flex-col gap-3 flex-1 min-h-[420px]">
              {/* Scene Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800/50 overflow-x-auto">
                {scenes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => switchScene(s.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-mono transition-all whitespace-nowrap cursor-pointer ${
                      activeSceneId === s.id
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                    }`}
                  >
                    <span contentEditable={activeSceneId === s.id} suppressContentEditableWarning
                      onBlur={(e) => renameScene(s.id, e.currentTarget.textContent || s.name)}
                      className="outline-none"
                    >{s.name}</span>
                    {scenes.length > 1 && (
                      <span onClick={(e) => deleteScene(s.id, e)} className="text-slate-600 hover:text-rose-400 ml-1"><X className="h-3 w-3" /></span>
                    )}
                  </button>
                ))}
                <button onClick={addScene} className="px-2 py-1.5 text-emerald-400 hover:text-emerald-300 text-sm cursor-pointer" title="Nueva escena"><Plus className="h-4 w-4" /></button>
              </div>

              {/* Speaker Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {speakers.map((spk) => (
                  <button
                    key={spk.id}
                    onClick={() => insertSpeaker(spk.label)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold border transition-all cursor-pointer bg-slate-950 hover:bg-slate-900 border-slate-700/60 text-slate-300 hover:text-white hover:border-emerald-500/40"
                  >
                    {spk.label}
                  </button>
                ))}
                <span className="text-[10px] font-mono text-slate-600 ml-1">inserta prefijo</span>
              </div>

              {/* Text area */}
              <div className="flex-1 flex flex-col bg-slate-900/25 border border-slate-800/70 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">
                    Guión {isConversation ? "(Conversación)" : "(Voz única)"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {sceneText.length} caracteres
                  </span>
                </div>
                <textarea
                  ref={textAreaRef}
                  className="flex-1 w-full min-h-[280px] text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none"
                  value={sceneText}
                  onChange={(e) => updateSceneText(e.target.value)}
                  placeholder="Hacé clic en Speaker A, Speaker B, etc. para insertar el prefijo, o escribí directamente:
Speaker A: Hola, ¿cómo estás?
Speaker B: Muy bien, gracias."
                />

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/40">
                  <div className="flex gap-2 text-[10px] font-mono text-slate-500">
                    <span className="bg-slate-900/60 px-2 py-1 rounded">[PAUSA]</span>
                    <span className="bg-slate-900/60 px-2 py-1 rounded">{activeScene?.name}</span>
                  </div>
                  <button
                    onClick={generate}
                    disabled={generating || !sceneText.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {generating ? "Generando..." : <><Play className="h-3.5 w-3.5 fill-current" /> Sintetizar</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {tab === "history" && (
            <div className="flex flex-col gap-3 flex-1 min-h-[420px]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Audios Generados</h3>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1 px-2 py-1 rounded bg-rose-950/20 border border-rose-500/10 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" /> Limpiar Todo
                  </button>
                )}
              </div>
              <div className="flex-1 bg-slate-900/25 border border-slate-800/70 rounded-2xl p-4">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                    <VolumeX className="h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400">No hay audios todavía. Escribí un guión y genera tu primer audio.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {history.map((item) => {
                      const active = playingId === item.id;
                      return (
                        <div key={item.id} onClick={() => togglePlay(item)} className={`p-3 rounded-xl border transition-all flex items-center gap-3 bg-slate-950 hover:bg-slate-900/50 cursor-pointer ${active ? "border-emerald-500/40" : "border-slate-800/80"}`}>
                          <button onClick={(e) => { e.stopPropagation(); togglePlay(item); }} className={`h-9 w-9 min-w-[36px] rounded-full border flex items-center justify-center transition-all cursor-pointer ${active ? "bg-emerald-950 border-emerald-500 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                            {active && isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                              {item.timestamp}
                              {item.genre && <><span className="text-slate-600">|</span><span className="text-emerald-400">{item.genre}</span></>}
                            </div>
                            <p className="text-xs text-white truncate">{item.text}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); download(item); }} className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer" title="Descargar"><Download className="h-3.5 w-3.5" /></button>
                            <button onClick={(e) => deleteItem(item.id, e)} className="p-1.5 rounded bg-slate-900 hover:bg-rose-950 border border-slate-800 text-slate-400 hover:text-rose-400 transition-all cursor-pointer" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* PLAYER */}
      <footer className="w-full bg-slate-900 border-t border-slate-800 p-4 sticky bottom-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-center">
          <div className="w-full md:w-5/12 flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>{isPlaying ? "▶" : "⏸"} {fmt(currentTime)} / {fmt(duration)}</span>
            <input type="range" min={0} max={duration || 100} value={currentTime} onChange={(e) => handleSeek(parseFloat(e.target.value))} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          </div>
          <div className="w-full md:w-7/12 flex items-center justify-between gap-3">
            <button onClick={() => { const last = history.find((h) => h.id === playingId) || history[0]; if (last) togglePlay(last); }} disabled={history.length === 0} className="h-9 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer">
              {isPlaying ? <><Pause className="h-3.5 w-3.5 fill-current" /> Pausar</> : <><Play className="h-3.5 w-3.5 fill-current" /> Reproducir</>}
            </button>
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((r) => (
                <button key={r} onClick={() => setSpeed(r)} className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${speed === r ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}>{r.toFixed(2)}x</button>
              ))}
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
              {playingId ? history.find((h) => h.id === playingId)?.text : "Sin reproducción"}
            </span>
          </div>
        </div>
      </footer>

      {/* LOADING */}
      {generating && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="relative h-16 w-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 border-r-teal-500 animate-spin" />
              <Mic2 className="h-6 w-6 text-emerald-400 absolute inset-0 m-auto" />
            </div>
            <p className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800/60">{genStep}</p>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="fixed bottom-24 right-6 z-50 bg-rose-950 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl shadow-2xl max-w-sm flex items-start gap-2">
          <Info className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-rose-300">{error}</p>
            <button onClick={() => setError(null)} className="text-[10px] font-mono bg-rose-900/60 border border-rose-500/30 text-rose-100 px-2 py-0.5 rounded mt-1.5 cursor-pointer">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
