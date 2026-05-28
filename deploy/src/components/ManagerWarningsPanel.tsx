import React, { useState, useMemo, useEffect, useRef } from "react";
import { TourSchedule, ManagerNotice, UserSession, DailyActivityReport } from "../types";
import { INITIAL_PRODUCTS, INITIAL_LEADERS } from "../data";
import { 
  AlertTriangle, AlertCircle, Plus, Trash2, Megaphone, CheckCircle2, 
  MapPin, Bell, Calendar, ShieldAlert, Sparkles, Send, Info,
  Volume2, VolumeX, FileText, ClipboardList
} from "lucide-react";

interface ManagerWarningsPanelProps {
  schedules: TourSchedule[];
  notices: ManagerNotice[];
  onAddNotice: (notice: ManagerNotice) => void;
  onDeleteNotice: (id: string) => void;
  session: UserSession;
  dailyReports?: DailyActivityReport[];
  onDeleteDailyReport?: (id: string) => void;
}

export default function ManagerWarningsPanel({
  schedules,
  notices,
  onAddNotice,
  onDeleteNotice,
  session,
  dailyReports = [],
  onDeleteDailyReport = () => {}
}: ManagerWarningsPanelProps) {
  // Bulletin form state
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [noticePriority, setNoticePriority] = useState<"low" | "medium" | "high">("medium");
  const [noticeUnit, setNoticeUnit] = useState("TODAS");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  
  // Tab/Section Selector for Left Column
  const [managerActiveSection, setManagerActiveSection] = useState<"notices" | "daily_reports" | "conflicts">("notices");

  // Audio Notification configuration
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("manager_warnings_sound_enabled");
      return stored !== "false"; // Default is true
    } catch {
      return true;
    }
  });

  // Track soundEnabled changes in localStorage
  useEffect(() => {
    try {
      localStorage.setItem("manager_warnings_sound_enabled", String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  // Audio Alert synthesizer utilizing the safe HTML5 Web Audio API
  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq: number, startTime: number, duration: number, volume: number = 0.12) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // Play premium chime cadence sequence: E5 -> A5 -> E6 
      playTone(660, 0, 0.22, 0.12);
      playTone(880, 0.10, 0.22, 0.15);
      playTone(1318.51, 0.20, 0.40, 0.18);
    } catch (e) {
      console.warn("Som automático bloqueado ou falhou:", e);
    }
  };

  // Auto sound notifier trigger whenever a high-priority notice is published
  const highPriorityNotices = useMemo(() => notices.filter(n => n.priority === "high"), [notices]);
  const highPriorityCountRef = useRef<number>(-1);

  useEffect(() => {
    // Initial mount skip to prevent playing sound on older stored notifications
    if (highPriorityCountRef.current === -1) {
      highPriorityCountRef.current = highPriorityNotices.length;
      return;
    }

    if (highPriorityNotices.length > highPriorityCountRef.current) {
      if (soundEnabled) {
        playAlertSound();
      }
    }

    highPriorityCountRef.current = highPriorityNotices.length;
  }, [highPriorityNotices, soundEnabled]);

  // Filter today's activity reports
  const dailyReportsToday = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return dailyReports.filter(r => r.date === todayStr);
  }, [dailyReports]);

  // Audio trigger on receiving new daily activity reports
  const dailyReportsLength = dailyReports.length;
  const initialDailyReportsCountRef = useRef<number>(-1);

  useEffect(() => {
    if (initialDailyReportsCountRef.current === -1) {
      initialDailyReportsCountRef.current = dailyReportsLength;
      return;
    }

    if (dailyReportsLength > initialDailyReportsCountRef.current) {
      if (soundEnabled) {
        playAlertSound();
      }
    }
    initialDailyReportsCountRef.current = dailyReportsLength;
  }, [dailyReportsLength, soundEnabled]);

  const units = ["TODAS", "LAPA", "PRN", "Vila Prudente", "SGA"];

  // 1. Generate Automatic Warnings / Conflict Detections based on current schedules
  const systemWarnings = useMemo(() => {
    const alerts: { id: string; type: "clash" | "capacity" | "date"; message: string; tourDetails: TourSchedule }[] = [];

    // Map to find duplicate guide allocations (clash)
    const activeSchedules = schedules.filter(s => s.status === "scheduled");

    activeSchedules.forEach((current, idx) => {
      // Guide clash: check other tours with same date, hour and guide of the same status
      const clashed = activeSchedules.find((other, otherIdx) => 
        otherIdx !== idx && 
        other.guide === current.guide && 
        other.date === current.date && 
        other.time === current.time
      );

      if (clashed) {
        // Only push one clash alert per pair to maintain neat logs
        if (current.id < clashed.id) {
          alerts.push({
            id: `clash-${current.id}-${clashed.id}`,
            type: "clash",
            message: `CONFLITO DE GUIA: O Líder/Guia "${current.guide}" foi escalado para dois tours simultâneos no dia ${current.date} às ${current.time} [Tours: "${current.title}" (${current.unit}) e "${clashed.title}" (${clashed.unit})].`,
            tourDetails: current
          });
        }
      }

      // Capacity warnings: check if visitors count is greater than 30 (safety limit warning)
      if (current.participants > 30) {
        alerts.push({
          id: `cap-${current.id}`,
          type: "capacity",
          message: `CAPACIDADE EXCEDIDA: O tour "${current.title}" (${current.unit}) liderado por "${current.guide}" no dia ${current.date} conta com ${current.participants} participantes, o que excede a recomendação máxima de 30 visitantes por guia.`,
          tourDetails: current
        });
      }
    });

    return alerts;
  }, [schedules]);

  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!noticeTitle.trim()) {
      setFormError("Informe o título do aviso.");
      return;
    }
    if (!noticeContent.trim()) {
      setFormError("Descreva o conteúdo do comunicado.");
      return;
    }

    const createdNotice: ManagerNotice = {
      id: "notice-" + Date.now(),
      title: noticeTitle.trim(),
      content: noticeContent.trim(),
      date: new Date().toISOString().split("T")[0],
      createdBy: session.nome,
      priority: noticePriority,
      affectedUnit: noticeUnit
    };

    onAddNotice(createdNotice);
    setNoticeTitle("");
    setNoticeContent("");
    setNoticePriority("medium");
    setFormSuccess("Aviso publicado e transmitido com sucesso!");

    setTimeout(() => {
      setFormSuccess("");
    }, 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION BANNER FOR MANAGER WARNINGS COCKPIT */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 md:p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-2xs">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Megaphone className="w-64 h-64 -mr-12 -mt-12 text-white" />
        </div>
        <div className="space-y-1 relative z-10 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="p-1 px-2.5 rounded-full bg-amber-500 font-mono font-bold text-[9.5px] text-slate-950 uppercase tracking-widest leading-none">
              Gestor Central
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <h3 className="text-base font-black uppercase tracking-tight font-sans">
            Painel de Comunicação e Avisos
          </h3>
          <p className="text-[11px] text-slate-350 max-w-xl font-normal">
            Supervisão em tempo real de agendas enviadas por colaboradores de todas as unidades e transmissão de avisos e comunicados na rede.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center shrink-0 z-10">
          {/* Som do Painel Control Widget */}
          <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition p-2.5 px-3 rounded-xl border border-white/5">
            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) {
                  setTimeout(() => playAlertSound(), 50);
                }
              }}
              type="button"
              className="text-white hover:text-amber-450 transition cursor-pointer flex items-center justify-center p-1 bg-white/5 hover:bg-white/10 rounded-lg"
              title={soundEnabled ? "Desativar alerta para mudas" : "Ativar alerta de som"}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <div className="text-left shrink-0">
              <span className="text-[8px] text-slate-400 block uppercase font-black tracking-wider leading-none">
                Sons de Prioridade Alta
              </span>
              <span className={`text-[10px] font-mono font-extrabold block ${soundEnabled ? "text-emerald-400" : "text-slate-400"}`}>
                {soundEnabled ? "Habilitados" : "Mudos / Desligado"}
              </span>
            </div>
            
            {/* Test sound alert button */}
            <button
              onClick={playAlertSound}
              type="button"
              className="ml-1 px-2 py-0.5 bg-slate-100 hover:bg-white text-slate-900 hover:text-indigo-600 rounded text-[9.5px] font-serif font-extrabold transition cursor-pointer"
              title="Testar som de prioridade"
            >
              Testar
            </button>
          </div>

          <div className="bg-white/10 p-3 px-4 rounded-xl border border-white/5 text-center">
            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Avisos Emitidos</span>
            <span className="text-xl font-mono font-extrabold text-indigo-400">{notices.length}</span>
          </div>
        </div>
      </div>
       {/* SEÇÃO DE ENVIOS DE ATIVIDADES DE HOJE (AVISO DO GESTOR) */}
      {dailyReportsToday.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-850 dark:text-emerald-400 p-4 rounded-xl flex items-start gap-3 text-left animate-in hover:bg-emerald-500/15 transition-all">
          <Bell className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-left space-y-0.5">
            <h5 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              🔔 Novas Atividades Diárias Recebidas Hoje!
            </h5>
            <p className="text-[11px] leading-relaxed font-semibold text-slate-800 dark:text-slate-300">
              Os seguintes colaboradores já enviaram o relatório diário das suas unidades hoje:{" "}
              {dailyReportsToday.map((r, idx) => (
                <span key={r.id} className="font-bold underline text-emerald-900 dark:text-emerald-250">
                  {r.collaboratorName} ({r.unit}){idx < dailyReportsToday.length - 1 ? ", " : "."}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: MULTI-TAB COCKPIT SUPERVISOR */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-3xs space-y-4">
          
          {/* Segmented Controller Tab Switches */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full border border-slate-200/65 dark:border-slate-800 gap-1 sm:gap-1.5">
            <button
              onClick={() => setManagerActiveSection("notices")}
              className={`flex-1 py-2 text-[10.5px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                managerActiveSection === "notices"
                  ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              Avisos ({notices.length})
            </button>

            <button
              onClick={() => setManagerActiveSection("daily_reports")}
              className={`flex-1 py-2 text-[10.5px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                managerActiveSection === "daily_reports"
                  ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Retornos ({dailyReports.length})
              {dailyReportsToday.length > 0 && (
                <span className="ml-1 bg-emerald-500 text-white text-[8px] px-1.5 rounded-full font-mono animate-pulse">
                  +{dailyReportsToday.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setManagerActiveSection("conflicts")}
              className={`flex-1 py-2 text-[10.5px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                managerActiveSection === "conflicts"
                  ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Conflitos ({systemWarnings.length})
            </button>
          </div>

          {/* TAB CONTENT: NOTICES */}
          {managerActiveSection === "notices" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                  Comunicados Ativos na Rede
                </h4>
              </div>

              {notices.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-550 text-center py-12 italic max-w-xs mx-auto">
                  Nenhum comunicado cadastrado na rede neste momento. Escreva um comunicado no formulário ao lado para transmitir à rede de colaboradores.
                </p>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {notices.map((notice) => (
                    <div 
                      key={notice.id}
                      className="p-3.5 bg-slate-50/60 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl flex items-start justify-between gap-4 transition hover:bg-slate-100/40 text-left cursor-default shadow-3xs"
                    >
                      <div className="space-y-1.5 grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                            notice.priority === "high" 
                              ? "bg-rose-100 text-rose-700" 
                              : notice.priority === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-teal-105 text-teal-700 dark:bg-teal-950 dark:text-teal-400"
                          }`}>
                            {notice.priority}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {notice.title}
                          </h5>
                        </div>
                        <p className="text-[11px] text-slate-650 dark:text-slate-300 leading-relaxed font-sans font-medium whitespace-pre-line">
                          {notice.content}
                        </p>
                        <div className="text-[8.5px] text-slate-400 font-mono">
                          <span>Destino: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{notice.affectedUnit}</strong></span>
                          <span className="mx-1 py-0.5 select-none">•</span>
                          <span>Enviado em: {notice.date}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteNotice(notice.id)}
                        className="p-1 px-2.5 border border-transparent hover:border-rose-150 dark:hover:border-rose-900 bg-rose-50/50 dark:bg-rose-955/20 text-rose-605 dark:text-rose-400 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0 text-[10px] font-bold flex items-center gap-0.5"
                        title="Apagar comunicado permanentemente"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: DAILY REPORTS */}
          {managerActiveSection === "daily_reports" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                  Relatórios de Atividades Diárias Coletados
                </h4>
              </div>

              {dailyReports.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-550 text-center py-12 italic max-w-xs mx-auto">
                  Nenhum relatório diário recebido das unidades ainda. Os relatórios enviados pelos colaboradores aparecerão listados aqui em tempo real.
                </p>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {dailyReports.map((report) => (
                    <div 
                      key={report.id}
                      className="p-3.5 bg-slate-50/60 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl flex items-start justify-between gap-4 transition hover:bg-slate-100/40 text-left cursor-default shadow-3xs"
                    >
                      <div className="space-y-1.5 grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="p-0.5 px-1.5 bg-emerald-100 dark:bg-emerald-955 text-emerald-800 dark:text-emerald-400 font-mono text-[8.5px] font-black uppercase tracking-wider rounded-sm animate-pulse">
                            {report.unit}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {report.collaboratorName}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-550 font-mono ml-auto">
                            📅 {report.date.split("-").reverse().join("/")} às {report.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-650 dark:text-slate-300 leading-relaxed font-sans font-medium whitespace-pre-line">
                          {report.activities}
                        </p>
                      </div>

                      {/* Explicit Delete Button for report logs */}
                      <button
                        onClick={() => onDeleteDailyReport(report.id)}
                        className="p-1 px-2.5 border border-transparent hover:border-rose-150 dark:hover:border-rose-900 bg-rose-50/50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0 text-[10px] font-bold flex items-center gap-0.5"
                        title="Apagar reporte de atividade permanentemente"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: CONFLICTS / CRITICAL WARNINGS */}
          {managerActiveSection === "conflicts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">
                  Auditor de Escalas e Conflitos de Agendamento
                </h4>
              </div>

              {systemWarnings.length === 0 ? (
                <div className="p-8 text-center bg-teal-500/5 border border-teal-500/10 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-705 dark:text-slate-300 font-bold">
                    Tudo Excelente na Operação!
                  </p>
                  <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto">
                    Nenhum conflito de horário/líder detectado e todas as capacidades respeitam os limites operacionais recomendados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {systemWarnings.map((warn) => (
                    <div 
                      key={warn.id}
                      className="p-3.5 bg-rose-500/5 dark:bg-rose-955/10 border border-rose-150 dark:border-rose-900/40 rounded-xl flex items-start gap-3.5 text-left"
                    >
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-1 grow">
                        <span className="p-0.5 px-2 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-455 font-mono text-[8px] font-black uppercase tracking-wider rounded-sm">
                          {warn.type === "clash" ? "CONFLITO DE GUIA" : "LIMITE EXCEDIDO"}
                        </span>
                        <p className="text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                          {warn.message}
                        </p>
                        <div className="text-[8.5px] text-slate-400 font-mono">
                          Tour Relacionado: <strong className="text-slate-650 dark:text-slate-350 font-bold">"{warn.tourDetails.title}" ({warn.tourDetails.unit})</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: PUBLISH NOTICE FORM */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider font-sans">
              Transmitir Novo Comunicado
            </h4>
          </div>

          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-550 shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          {formSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p>{formSuccess}</p>
            </div>
          )}

          <form onSubmit={handlePublishNotice} className="space-y-4 text-left">
            
            {/* Title */}
            <div className="space-y-1">
              <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-extrabold uppercase tracking-wider font-sans">
                Título do Comunicado
              </label>
              <input
                type="text"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-bold"
                placeholder="Ex: Treinamento de Guias ou AVISO DE MANUTENÇÃO"
              />
            </div>

            {/* Target Unit */}
            <div className="space-y-1">
              <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-extrabold uppercase tracking-wider font-sans">
                Unidade Destino
              </label>
              <select
                value={noticeUnit}
                onChange={(e) => setNoticeUnit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-bold cursor-pointer"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u === "TODAS" ? "📢 Todas as Unidades" : `📍 Unidade ${u}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority level */}
            <div className="space-y-1">
              <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-extrabold uppercase tracking-wider font-sans mb-1.5">
                Nível de Prioridade
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as const).map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setNoticePriority(prio)}
                    className={`py-1.5 text-[10.5px] font-bold rounded-lg border transition cursor-pointer text-center ${
                      noticePriority === prio
                        ? prio === "high"
                          ? "bg-rose-50 border-rose-500 text-rose-700"
                          : prio === "medium"
                          ? "bg-amber-50 border-amber-500 text-amber-750"
                          : "bg-teal-50 border-teal-500 text-teal-700"
                        : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {prio === "high" ? "🚨 Alta" : prio === "medium" ? "⚠️ Média" : "💡 Geral"}
                  </button>
                ))}
              </div>
            </div>

            {/* Content text */}
            <div className="space-y-1">
              <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-extrabold uppercase tracking-wider font-sans">
                Conteúdo do Comunicado
              </label>
              <textarea
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-medium leading-relaxed font-sans"
                placeholder="Detalhes importantes a serem transmitidos ao painel de avisos dos colaboradores..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" /> Transmitir para Colaboradores
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}
