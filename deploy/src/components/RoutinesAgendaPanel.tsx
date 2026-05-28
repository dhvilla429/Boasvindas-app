import React, { useState, useMemo, useEffect, useRef } from "react";
import { TourSchedule, ManagerNotice, UserSession, CollaboratorMessage, SurveySubmission, DailyActivityReport } from "../types";
import { INITIAL_PRODUCTS, INITIAL_LEADERS } from "../data";
import { 
  Calendar, Clock, Plus, Edit2, Trash2, Users, MapPin, Play,
  AlertTriangle, CheckCircle2, XCircle, Info, ChevronLeft, 
  ChevronRight, Sparkles, Filter, Check, ListFilter, AlertCircle, FileText, FileDown,
  MessageSquare, Send, Mail, MailOpen, Bell, Volume2, VolumeX, Settings, Music, Eye, EyeOff,
  History, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";

interface RoutinesAgendaPanelProps {
  schedules: TourSchedule[];
  submissions?: SurveySubmission[];
  onAddSchedule: (schedule: TourSchedule) => void;
  onUpdateSchedule: (schedule: TourSchedule) => void;
  onDeleteSchedule: (id: string) => void;
  notices: ManagerNotice[];
  session: UserSession;
  collaboratorMessages: CollaboratorMessage[];
  onAddCollaboratorMessage: (msg: CollaboratorMessage) => void;
  onDeleteCollaboratorMessage: (id: string) => void;
  onToggleReadCollaboratorMessage: (id: string) => void;
  products?: string[];
  leaders?: string[];
  onRedirectToForm?: (prefill: Partial<SurveySubmission>) => void;
  dailyReports?: DailyActivityReport[];
  onAddDailyReport?: (report: DailyActivityReport) => void;
  onDeleteDailyReport?: (id: string) => void;
  onAddLeader?: (lead: string) => void;
  onDeleteLeader?: (lead: string) => void;
}

export default function RoutinesAgendaPanel({
  schedules,
  submissions = [],
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  notices,
  session,
  collaboratorMessages,
  onAddCollaboratorMessage,
  onDeleteCollaboratorMessage,
  onToggleReadCollaboratorMessage,
  products = INITIAL_PRODUCTS,
  leaders = INITIAL_LEADERS,
  onRedirectToForm,
  dailyReports = [],
  onAddDailyReport = () => {},
  onDeleteDailyReport = () => {},
  onAddLeader = () => {},
  onDeleteLeader = () => {}
}: RoutinesAgendaPanelProps) {
  const getUnitLabel = (u: string) => {
    const normalized = (u || "").trim().toUpperCase();
    if (normalized === "PRN") return "PRN (Parnamirim)";
    if (normalized === "SGA") return "SGA (São Gonçalo)";
    if (normalized === "LAPA") return "LAPA (Sede SP)";
    if (normalized === "VILA PRUDENTE") return "Vila Prudente";
    return u;
  };

  // Quick Confirmation Modal State
  const [completionTour, setCompletionTour] = useState<TourSchedule | null>(null);

  // Calendar Navigate States
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Active Selected Day inside month grid
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    return new Date().getDate();
  });

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [guideFilter, setGuideFilter] = useState<string>("TODOS");
  const [productFilter, setProductFilter] = useState<string>("TODOS");

  // Booking Form Fields
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TourSchedule | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formGuide, setFormGuide] = useState("");
  const [useCustomGuide, setUseCustomGuide] = useState(false);
  const [customGuideName, setCustomGuideName] = useState("");
  const [formParticipants, setFormParticipants] = useState<number>(15);
  const [formProduct, setFormProduct] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<"scheduled" | "completed" | "cancelled">("scheduled");
  const [formUnit, setFormUnit] = useState("LAPA");
  const [formError, setFormError] = useState("");
  
  // Customizable override parameters per individual tour
  const [formReminderMinutesOverride, setFormReminderMinutesOverride] = useState<number | undefined>(undefined);
  const [formReminderSoundTypeOverride, setFormReminderSoundTypeOverride] = useState<string | undefined>(undefined);
  const [formReminderSoundEnabledOverride, setFormReminderSoundEnabledOverride] = useState<boolean | undefined>(undefined);
  const [formReminderVisualEnabledOverride, setFormReminderVisualEnabledOverride] = useState<boolean | undefined>(undefined);

  // Collaborator message board state fields
  const [msgSubject, setMsgSubject] = useState("");
  const [msgContent, setMsgContent] = useState("");
  const [msgPriority, setMsgPriority] = useState<"low" | "medium" | "high">("medium");
  const [isPosting, setIsPosting] = useState(false);
  const [msgFeedback, setMsgFeedback] = useState("");

  // Daily activity report state fields
  const [dailyReportDate, setDailyReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyReportActivities, setDailyReportActivities] = useState("");
  const [dailyReportFeedback, setDailyReportFeedback] = useState("");

  // States specific to Jaciana Melo's administrative dashboard
  const [adminTasks, setAdminTasks] = useState<Array<{ 
    id: string; 
    text: string; 
    status: "pendente" | "andamento" | "concluído"; 
    category: string; 
    targetGuide?: string; 
    dateCreated: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem("jaciana_admin_tasks_v2");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { id: "jt-1", text: "Organizar a agenda geral de tours e dividir as levas do fluxo PRN", status: "concluído", category: "Rotina", dateCreated: "2026-05-27" },
      { id: "jt-2", text: "Assessorar Rafaela Alessandra no gerenciamento de conflitos de horário", status: "andamento", category: "Assessoria", targetGuide: "Rafaela Alessandra", dateCreated: "2026-05-27" },
      { id: "jt-3", text: "Monitorar desempenho em tempo real dos tours conduzidos por Vinicius Lima", status: "pendente", category: "Assessoria", targetGuide: "Vinicius Lima", dateCreated: "2026-05-27" },
      { id: "jt-4", text: "Desenvolver e submeter o Relatório Operacional Diário de Fluxo no PRN", status: "andamento", category: "Relatório", dateCreated: "2026-05-27" },
      { id: "jt-5", text: "Identificar gargalos na captação de satisfação de clientes insatisfeitos", status: "concluído", category: "Qualidade", dateCreated: "2026-05-27" }
    ];
  });

  const [actionCounter, setActionCounter] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("jaciana_action_counter");
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {}
    return 0;
  });

  const [newTaskText, setNewTaskText] = useState("");
  const [expandedTourMonitorId, setExpandedTourMonitorId] = useState<string | null>(null);
  const [monitorStatusFilter, setMonitorStatusFilter] = useState<string>("TODOS");
  const [selectedTourForLogs, setSelectedTourForLogs] = useState<TourSchedule | null>(null);
  const [newTaskCategory, setNewTaskCategory] = useState("Rotina");
  const [newTaskGuide, setNewTaskGuide] = useState("");
  const [activeTaskFilter, setActiveTaskFilter] = useState<"TODAS" | "pendente" | "andamento" | "concluído">("TODAS");

  // Automated Conductor Roster Management State variables (SIA)
  const [conductorStatuses, setConductorStatuses] = useState<{
    name: string;
    unit: string;
    status: "active" | "leave" | "absent";
    phone?: string;
    regime?: "5x2" | "6x1" | "12x36" | "custom";
    workingDays?: number[]; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
    preferredShift?: "morning" | "afternoon" | "full" | "night";
  }[]>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_conductor_roster_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(c => {
            const unit = c.unit || "PRN";
            const regime = c.regime || (unit === "LAPA" ? "5x2" : unit === "Vila Prudente" ? "6x1" : "12x36");
            const preferredShift = c.preferredShift || (unit === "LAPA" ? "full" : unit === "Vila Prudente" ? "morning" : "afternoon");
            const workingDays = c.workingDays || (regime === "5x2" ? [1,2,3,4,5] : regime === "6x1" ? [1,2,3,4,5,6] : [0,2,4,6]);
            return {
              ...c,
              unit,
              regime,
              preferredShift,
              workingDays,
              status: c.status || "active"
            };
          }).filter(c => c.name.toLowerCase() !== "congo oficial");
        }
      }
    } catch (e) {}
    // Pre-populated default guides aligned with their active units & native schedules
    return [
      { name: "Carlos Menezes", unit: "LAPA", status: "active", regime: "5x2", preferredShift: "full", workingDays: [1, 2, 3, 4, 5], phone: "(11) 98765-4321" },
      { name: "Fabiana Rosa", unit: "Vila Prudente", status: "active", regime: "6x1", preferredShift: "morning", workingDays: [1, 2, 3, 4, 5, 6], phone: "(11) 97654-3210" },
      { name: "Rafaela Alessandra", unit: "PRN", status: "active", regime: "12x36", preferredShift: "afternoon", workingDays: [0, 2, 4, 6], phone: "(84) 99823-1122" },
      { name: "Vinicius Lima", unit: "PRN", status: "active", regime: "12x36", preferredShift: "afternoon", workingDays: [1, 3, 5], phone: "(84) 99765-4321" },
      { name: "Roberto Santos", unit: "SGA", status: "active", regime: "custom", preferredShift: "afternoon", workingDays: [1, 3, 5, 6], phone: "(84) 99654-1234" }
    ];
  });

  const [newConductorName, setNewConductorName] = useState("");
  const [newConductorPhone, setNewConductorPhone] = useState("");
  const [newConductorUnit, setNewConductorUnit] = useState("PRN");
  const [newConductorRegime, setNewConductorRegime] = useState<"5x2" | "6x1" | "12x36" | "custom">("12x36");
  const [newConductorShift, setNewConductorShift] = useState<"morning" | "afternoon" | "full" | "night">("afternoon");

  useEffect(() => {
    const isLapa = newConductorUnit === "LAPA";
    const isVila = newConductorUnit === "Vila Prudente";
    setNewConductorRegime(isLapa ? "5x2" : isVila ? "6x1" : "12x36");
    setNewConductorShift(isLapa ? "full" : isVila ? "morning" : "afternoon");
  }, [newConductorUnit]);

  // Keep state synchronized with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("survey_tour_conductor_roster_v2", JSON.stringify(conductorStatuses));
    } catch (e) {}
  }, [conductorStatuses]);

  // Synchronize dynamic custom leaders added by any other workflow
  useEffect(() => {
    let changed = false;
    const updated = [...conductorStatuses];
    
    // Ensure all pre-built demo guides exist
    const defaults = [
      { name: "Carlos Menezes", unit: "LAPA", status: "active" as const, regime: "5x2" as const, preferredShift: "full" as const, workingDays: [1, 2, 3, 4, 5], phone: "(11) 98765-4321" },
      { name: "Fabiana Rosa", unit: "Vila Prudente", status: "active" as const, regime: "6x1" as const, preferredShift: "morning" as const, workingDays: [1, 2, 3, 4, 5, 6], phone: "(11) 97654-3210" },
      { name: "Rafaela Alessandra", unit: "PRN", status: "active" as const, regime: "12x36" as const, preferredShift: "afternoon" as const, workingDays: [0, 2, 4, 6], phone: "(84) 99823-1122" },
      { name: "Vinicius Lima", unit: "PRN", status: "active" as const, regime: "12x36" as const, preferredShift: "afternoon" as const, workingDays: [1, 3, 5], phone: "(84) 99765-4321" },
      { name: "Roberto Santos", unit: "SGA", status: "active" as const, regime: "custom" as const, preferredShift: "afternoon" as const, workingDays: [1, 3, 5, 6], phone: "(84) 99654-1234" }
    ];

    defaults.forEach(def => {
      if (!updated.some(u => u.name.trim().toLowerCase() === def.name.toLowerCase())) {
        updated.push(def);
        changed = true;
      }
    });

    leaders.forEach(lead => {
      const trimmed = lead.trim();
      const lowered = trimmed.toLowerCase();
      if (lowered === "congo oficial") return;
      if (trimmed && !updated.some(u => u.name.trim().toLowerCase() === lowered)) {
        const isLapa = session.unidade === "LAPA";
        const isVila = session.unidade === "Vila Prudente";
        updated.push({
          name: trimmed,
          unit: session.unidade === "TODAS" ? "LAPA" : session.unidade,
          status: "active",
          phone: "",
          regime: isLapa ? "5x2" : isVila ? "6x1" : "12x36",
          preferredShift: isLapa ? "full" : isVila ? "morning" : "afternoon",
          workingDays: isLapa ? [1,2,3,4,5] : isVila ? [1,2,3,4,5,6] : [0,2,4,6]
        });
        changed = true;
      }
    });

    if (changed) {
      setConductorStatuses(updated);
    }
  }, [leaders, session.unidade]);

  // Upcoming schedules assigned to absent or leave guides
  const upcomingToursWithAbsentGuides = useMemo(() => {
    return schedules.filter(s => {
      if (s.status === "completed" || s.status === "cancelled") return false;
      if (session && session.unidade !== "TODAS" && s.unit.trim().toLowerCase() !== session.unidade.trim().toLowerCase()) return false;
      const c = conductorStatuses.find(cand => cand.name.trim().toLowerCase() === s.guide.trim().toLowerCase());
      return c && c.status !== "active";
    });
  }, [schedules, conductorStatuses, session]);

  // List of leaders restricted by current session unit for dropdown filters
  const filteredLeadersForFilter = useMemo(() => {
    if (!session || session.unidade === "TODAS") return leaders || [];
    return conductorStatuses
      .filter(c => c.unit.toLowerCase() === session.unidade.toLowerCase())
      .map(c => c.name);
  }, [conductorStatuses, leaders, session]);

  // List of leaders filtered for the active form unit
  const filteredLeadersForForm = useMemo(() => {
    const unitToMatch = formUnit || "PRN";
    return conductorStatuses
      .filter(c => c.unit.toLowerCase() === unitToMatch.toLowerCase())
      .map(c => c.name);
  }, [conductorStatuses, formUnit]);

  // Automatically adjust formGuide when formUnit drops or changes while adding a new tour
  useEffect(() => {
    if (isFormOpen && !editingSchedule && !useCustomGuide) {
      if (filteredLeadersForForm && filteredLeadersForForm.length > 0) {
        setFormGuide(filteredLeadersForForm[0]);
      } else {
        setFormGuide("");
      }
    }
  }, [formUnit, isFormOpen, editingSchedule, useCustomGuide, filteredLeadersForForm]);

  // Individual automatic schedule escalations for a specific tour card
  const runAutoEscalaForTour = (tour: TourSchedule, quiet = false) => {
    const currentGuideStatus = conductorStatuses.find(c => c.name.trim().toLowerCase() === tour.guide.trim().toLowerCase());
    const statusLabel = currentGuideStatus 
      ? (currentGuideStatus.status === "leave" ? "Folga" : "Falta/Ausente")
      : "Indisponível";

    let candidates = conductorStatuses.filter(c => c.status === "active" && c.unit.toLowerCase() === tour.unit.toLowerCase());
    let sourceUnitText = `mesma unidade (${tour.unit})`;

    if (candidates.length === 0 && session && session.unidade === "TODAS") {
      candidates = conductorStatuses.filter(c => c.status === "active");
      sourceUnitText = "outras unidades (Suporte Inter-Polo)";
    }

    const freeCandidates = candidates.filter(cand => {
      return !schedules.some(s => 
        s.id !== tour.id &&
        s.date === tour.date &&
        s.time === tour.time &&
        s.guide.trim().toLowerCase() === cand.name.trim().toLowerCase() &&
        s.status !== "cancelled"
      );
    });

    if (freeCandidates.length > 0) {
      const counts = freeCandidates.map(cand => {
        const cnt = schedules.filter(s => 
          s.date === tour.date && 
          s.guide.trim().toLowerCase() === cand.name.trim().toLowerCase() &&
          s.status !== "cancelled"
        ).length;
        return { candidate: cand, count: cnt };
      });
      counts.sort((a, b) => a.count - b.count);
      const chosen = counts[0].candidate;

      const prevGuide = tour.guide;
      const updatedTour = {
        ...tour,
        guide: chosen.name,
        interventionLogs: [
          ...(tour.interventionLogs || []),
          {
            id: "roster-log-" + Date.now() + Math.random(),
            timestamp: new Date().toLocaleString("pt-BR"),
            operator: "Sistema de Escalas SIA",
            action: "Auto-Escala Reativa",
            details: `O condutor ${prevGuide} está marcado como [${statusLabel}]. Sistema resolveu automaticamente para ${chosen.name}.`,
            notes: `Substituição realizada com base na escala ativa em ${sourceUnitText}. Prevenção de conflito de escala ativa.`
          }
        ]
      };

      onUpdateSchedule(updatedTour);
      setActionCounter(prev => prev + 1);

      if (!quiet) {
        alert(
          `⚡ Remanejamento Automático Realizado com Sucesso!\n\n` +
          `• Tour: "${tour.title}" em ${tour.unit}\n` +
          `• Removido do guia indisponível: ${prevGuide}\n` +
          `• Alocado para condutor ativo livre: ${chosen.name}`
        );
      }
      return true;
    } else {
      if (!quiet) {
        alert(
          `⚠️ Atenção: Não encontramos condutores alternativos livres de conflito em ${tour.unit} ou outras sedes para assumir este tour sobressalente.`
        );
      }
      return false;
    }
  };

  // Global balancing optimizer resolver
  const autoResolveAllEscalaConflicts = () => {
    const affected = upcomingToursWithAbsentGuides;
    if (affected.length === 0) {
      alert("✨ Ótimo! Não existem conflitos de escala ou condutores indisponíveis no momento.");
      return;
    }

    let resolvedCount = 0;
    let fallbackCount = 0;
    let failedCount = 0;
    const resolvedLogs: string[] = [];

    affected.forEach(tour => {
      const currentGuideStatus = conductorStatuses.find(c => c.name.trim().toLowerCase() === tour.guide.trim().toLowerCase());
      const statusLabel = currentGuideStatus 
        ? (currentGuideStatus.status === "leave" ? "Folga" : "Falta/Ausente")
        : "Indisponível";

      let candidates = conductorStatuses.filter(c => c.status === "active" && c.unit.toLowerCase() === tour.unit.toLowerCase());
      let sourceUnitText = `mesma unidade (${tour.unit})`;

      if (candidates.length === 0 && session && session.unidade === "TODAS") {
        candidates = conductorStatuses.filter(c => c.status === "active");
        sourceUnitText = "outras unidades (Suporte Inter-Polo)";
      }

      const freeCandidates = candidates.filter(cand => {
        return !schedules.some(s => 
          s.id !== tour.id &&
          s.date === tour.date &&
          s.time === tour.time &&
          s.guide.trim().toLowerCase() === cand.name.trim().toLowerCase() &&
          s.status !== "cancelled"
        );
      });

      if (freeCandidates.length > 0) {
        const counts = freeCandidates.map(cand => {
          const cnt = schedules.filter(s => 
            s.date === tour.date && 
            s.guide.trim().toLowerCase() === cand.name.trim().toLowerCase() &&
            s.status !== "cancelled"
          ).length;
          return { candidate: cand, count: cnt };
        });
        counts.sort((a, b) => a.count - b.count);
        const chosen = counts[0].candidate;

        const prevGuide = tour.guide;
        const updated = {
          ...tour,
          guide: chosen.name,
          interventionLogs: [
            ...(tour.interventionLogs || []),
            {
              id: "roster-log-" + Date.now() + Math.random(),
              timestamp: new Date().toLocaleString("pt-BR"),
              operator: "Sistema de Escalas SIA",
              action: "Resolvido Conflito Escala",
              details: `O condutor ${prevGuide} está marcado como [${statusLabel}]. Sistema resolveu automaticamente para ${chosen.name}.`,
              notes: `Substituição realizada com base na escala ativa em ${sourceUnitText}. Prevenção de conflito operacional ativa.`
            }
          ]
        };

        onUpdateSchedule(updated);

        if (sourceUnitText.includes("outras")) {
          fallbackCount++;
        } else {
          resolvedCount++;
        }
        resolvedLogs.push(`• Tour "${tour.title}" (${tour.time}) remanejado de ${prevGuide} para ${chosen.name}`);
      } else {
        failedCount++;
      }
    });

    setActionCounter(prev => prev + 1);

    const msgLines = [
      "🔄 Relatório Geral de Auto-Escala executado:",
      `✅ ${resolvedCount} escala(s) alocadas dinamicamente na mesma unidade`,
      fallbackCount > 0 ? `✈️ ${fallbackCount} escala(s) atendidas com suporte entre polos` : null,
      failedCount > 0 ? `⚠️ ${failedCount} escala(s) sem condutores disponíveis para reposição` : null,
      "",
      ...resolvedLogs
    ].filter(Boolean);

    alert(msgLines.join("\n"));
  };

  const updateConductorField = (name: string, field: string, value: any) => {
    setConductorStatuses(prev => prev.map(c => {
      if (c.name === name) {
        const updated = { ...c, [field]: value };
        
        if (field === "status" && value !== "active") {
          const matchingTours = schedules.filter(s => 
            s.guide.trim().toLowerCase() === name.trim().toLowerCase() && 
            s.status !== "completed" && 
            s.status !== "cancelled"
          );
          if (matchingTours.length > 0) {
            setTimeout(() => {
              const confirmResize = window.confirm(
                `Atenção: O condutor ${name} possui ${matchingTours.length} tour(s) agendados com status ativo.\n\nDeseja que o Sistema de Escalas (SIA) execute o remanejamento automático imediato para esses tours?`
              );
              if (confirmResize) {
                matchingTours.forEach(tour => {
                  let candidates = [
                    ...prev.map(item => item.name === name ? { ...item, status: value as any } : item)
                  ].filter(candidateItem => candidateItem.status === "active" && candidateItem.unit.toLowerCase() === tour.unit.toLowerCase());
                  
                  if (candidates.length === 0) {
                    candidates = [
                      ...prev.map(item => item.name === name ? { ...item, status: value as any } : item)
                    ].filter(candidateItem => candidateItem.status === "active");
                  }

                  const freeCandidates = candidates.filter(cand => {
                    return !schedules.some(s => 
                      s.id !== tour.id &&
                      s.date === tour.date &&
                      s.time === tour.time &&
                      s.guide.trim().toLowerCase() === cand.name.trim().toLowerCase() &&
                      s.status !== "cancelled"
                    );
                  });

                  if (freeCandidates.length > 0) {
                    const counts = freeCandidates.map(cand => {
                      const cnt = schedules.filter(s => 
                        s.date === tour.date && 
                        s.guide.trim().toLowerCase() === cand.name.trim().toLowerCase() &&
                        s.status !== "cancelled"
                      ).length;
                      return { candidate: cand, count: cnt };
                    });
                    counts.sort((a, b) => a.count - b.count);
                    const chosen = counts[0].candidate;

                    const updatedTour = {
                      ...tour,
                      guide: chosen.name,
                      interventionLogs: [
                        ...(tour.interventionLogs || []),
                        {
                          id: "roster-log-" + Date.now() + Math.random(),
                          timestamp: new Date().toLocaleString("pt-BR"),
                          operator: "Gestor de Escalas",
                          action: "Remanejamento Rápido",
                          details: `O condutor ${name} foi marcado como [${value === "leave" ? "Folga" : "Falta"}].`,
                          notes: `Substituído automaticamente sob demanda por ${chosen.name}.`
                        }
                      ]
                    };
                    onUpdateSchedule(updatedTour);
                  }
                });
                alert(`Sucesso: Alocações do condutor ${name} foram re-escaladas.`);
                setActionCounter(actionCounter + 1);
              }
            }, 50);
          }
        }

        return updated;
      }
      return c;
    }));
  };

  const [expandedConductor, setExpandedConductor] = useState<string | null>(null);

  const toggleConductorWorkingDay = (name: string, dayNum: number) => {
    setConductorStatuses(prev => prev.map(c => {
      if (c.name === name) {
        const currentDays = c.workingDays || [];
        const updatedDays = currentDays.includes(dayNum)
          ? currentDays.filter(d => d !== dayNum)
          : [...currentDays, dayNum].sort();
        return { ...c, workingDays: updatedDays };
      }
      return c;
    }));
  };

  const changeConductorRegime = (name: string, newRegime: any) => {
    setConductorStatuses(prev => prev.map(c => {
      if (c.name === name) {
        const defaultDays = newRegime === "5x2" ? [1,2,3,4,5] : newRegime === "6x1" ? [1,2,3,4,5,6] : [0,2,4,6];
        return { ...c, regime: newRegime, workingDays: defaultDays };
      }
      return c;
    }));
  };
  useEffect(() => {
    try {
      localStorage.setItem("jaciana_admin_tasks_v2", JSON.stringify(adminTasks));
    } catch (e) {}
  }, [adminTasks]);

  useEffect(() => {
    try {
      localStorage.setItem("jaciana_action_counter", actionCounter.toString());
    } catch (e) {}
  }, [actionCounter]);

  // Tour Reminders Custom States
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [reminderMinutes, setReminderMinutes] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_minutes");
    return saved !== null ? Number(saved) : 15;
  });
  const [reminderSoundType, setReminderSoundType] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_sound_type");
    return saved !== null ? saved : "bell";
  });
  const [reminderSoundEnabled, setReminderSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_sound_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [reminderVisualEnabled, setReminderVisualEnabled] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_visual_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [reminderVisualToastEnabled, setReminderVisualToastEnabled] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_visual_toast_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [reminderVisualModalEnabled, setReminderVisualModalEnabled] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_visual_modal_enabled");
    return saved !== null ? saved === "true" : false;
  });
  const [reminderVisualPushEnabled, setReminderVisualPushEnabled] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_visual_push_enabled");
    return saved !== null ? saved === "true" : false;
  });
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<string>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });
  const [activeAlertModal, setActiveAlertModal] = useState<{
    id: string;
    title: string;
    time: string;
    guide: string;
    unit: string;
    minutesLeft: number;
    product: string;
  } | null>(null);

  const [scheduleToDelete, setScheduleToDelete] = useState<TourSchedule | null>(null);

  const [reminderVolume, setReminderVolume] = useState(() => {
    const saved = localStorage.getItem("tour_reminder_volume");
    return saved !== null ? Number(saved) : 60;
  });
  const [notifiedTours, setNotifiedTours] = useState<string[]>([]);
  const notifiedToursRef = useRef<string[]>([]);
  const [rightColumnTab, setRightColumnTab] = useState<"agenda" | "alertMonitor">("agenda");
  const [activeAlertToasts, setActiveAlertToasts] = useState<Array<{
    id: string;
    title: string;
    time: string;
    guide: string;
    unit: string;
    minutesLeft: number;
    product: string;
  }>>([]);

  // Sync reminder configurations to localStorage
  useEffect(() => {
    localStorage.setItem("tour_reminder_enabled", String(reminderEnabled));
  }, [reminderEnabled]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_minutes", String(reminderMinutes));
  }, [reminderMinutes]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_sound_type", reminderSoundType);
  }, [reminderSoundType]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_sound_enabled", String(reminderSoundEnabled));
  }, [reminderSoundEnabled]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_visual_enabled", String(reminderVisualEnabled));
  }, [reminderVisualEnabled]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_visual_toast_enabled", String(reminderVisualToastEnabled));
  }, [reminderVisualToastEnabled]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_visual_modal_enabled", String(reminderVisualModalEnabled));
  }, [reminderVisualModalEnabled]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_visual_push_enabled", String(reminderVisualPushEnabled));
  }, [reminderVisualPushEnabled]);

  useEffect(() => {
    localStorage.setItem("tour_reminder_volume", String(reminderVolume));
  }, [reminderVolume]);

  // Audio Synthesizer player helper using only standard Web Audio API (No downloads, perfectly safe and zero latency)
  const playReminderSound = (type: string, volume: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const vol = volume / 100;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      
      if (type === "beep") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === "wood") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "crystal") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === "bell") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
        
        osc.start();
        osc2.start();
        
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        
        osc.stop(ctx.currentTime + 1.0);
        osc2.stop(ctx.currentTime + 1.0);
      } else { // digital standard
        osc.type = "square";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (error) {
      console.warn("AudioContext playback was blocked or errored:", error);
    }
  };

  // Date formatted to local yyyy-mm-dd
  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Reminders check scanner engine function
  const checkTodayReminders = () => {
    if (!reminderEnabled) return;
    const now = new Date();
    const todayStr = getLocalDateString(now);

    schedules.forEach((sc) => {
      // Must be scheduled & on same day
      if (sc.status !== "scheduled") return;
      if (sc.date !== todayStr) return;
      
      // Collaborators only see and get reminded of their own unit's schedules unless TODAS (manager)
      if (session.unidade !== "TODAS" && sc.unit !== session.unidade) return;

      const [tourHours, tourMinutes] = sc.time.split(":").map(Number);
      if (isNaN(tourHours) || isNaN(tourMinutes)) return;

      const tourTimeObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), tourHours, tourMinutes, 0, 0);
      const diffMs = tourTimeObj.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (60 * 1000));

      // Custom overrides per individual tour or fallback to global defaults
      const overrideMin = sc.reminderMinutesOverride !== undefined ? sc.reminderMinutesOverride : reminderMinutes;
      const overrideSoundType = sc.reminderSoundTypeOverride !== undefined ? sc.reminderSoundTypeOverride : reminderSoundType;
      const overrideSoundEnabled = sc.reminderSoundEnabledOverride !== undefined ? sc.reminderSoundEnabledOverride : reminderSoundEnabled;
      const overrideVisualEnabled = sc.reminderVisualEnabledOverride !== undefined ? sc.reminderVisualEnabledOverride : true;

      // Trigger if the tour is coming up within the alert configuration limit
      if (diffMinutes >= 0 && diffMinutes <= overrideMin) {
        if (notifiedToursRef.current.includes(sc.id)) return;

        // Save as notified to prevent repeating
        notifiedToursRef.current = [...notifiedToursRef.current, sc.id];
        setNotifiedTours(prev => [...prev, sc.id]);

        // play the synth audio
        if (overrideSoundEnabled) {
          playReminderSound(overrideSoundType, reminderVolume);
        }

        const alertData = {
          id: sc.id,
          title: sc.title,
          time: sc.time,
          guide: sc.guide,
          unit: sc.unit,
          minutesLeft: diffMinutes,
          product: sc.product
        };

        // float visual popup (toast)
        if (reminderVisualToastEnabled && overrideVisualEnabled) {
          setActiveAlertToasts(prev => [...prev, alertData]);
        }

        // central blocking modal dialog
        if (reminderVisualModalEnabled && overrideVisualEnabled) {
          setActiveAlertModal(alertData);
        }

        // native browser push notification
        if (reminderVisualPushEnabled && overrideVisualEnabled && "Notification" in window && Notification.permission === "granted") {
          try {
            const pushTitle = `Tour agendado à vista: ${sc.title}`;
            const pushBody = `Horário: ${sc.time} | Guia: ${sc.guide} | Unidade: ${sc.unit} (Inicia em ${diffMinutes}m)`;
            new Notification(pushTitle, {
              body: pushBody,
              icon: "https://cdn-icons-png.flaticon.com/512/3602/3652191.png"
            });
          } catch (err) {
            console.warn("Permissão de Push no iframe impediu notificação direta:", err);
          }
        }
      }
    });
  };

  // Auto-scan cycle every 12 seconds
  useEffect(() => {
    checkTodayReminders();

    const intervalId = setInterval(() => {
      checkTodayReminders();
    }, 12000);

    return () => clearInterval(intervalId);
  }, [schedules, reminderEnabled, reminderMinutes, reminderSoundType, reminderSoundEnabled, reminderVisualToastEnabled, reminderVisualModalEnabled, reminderVisualPushEnabled, reminderVolume, session.unidade]);

  // Test the current reminder config immediately
  const testReminderSettings = () => {
    if (reminderSoundEnabled) {
      playReminderSound(reminderSoundType, reminderVolume);
    }
    
    const testData = {
      id: "test-" + Date.now(),
      title: "Tour de Teste - Integração Ativa",
      time: "15:45",
      guide: session.nome,
      unit: session.unidade === "TODAS" ? "PRN" : session.unidade,
      minutesLeft: reminderMinutes,
      product: "Demonstração Lembrete"
    };

    if (reminderVisualToastEnabled) {
      setActiveAlertToasts(prev => [
        ...prev,
        testData
      ]);
    }

    if (reminderVisualModalEnabled) {
      setActiveAlertModal(testData);
    }

    if (reminderVisualPushEnabled) {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification("Teste de Alerta Push!", {
              body: `Seu sistema de notificações nativas funcionou perfeitamente. Lembrete configurado para ${reminderMinutes} minutos de antecedência.`,
              icon: "https://cdn-icons-png.flaticon.com/512/3602/3652191.png"
            });
          } catch (e) {
            console.warn("Falha de envio push no iframe sandbox:", e);
          }
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            setBrowserNotificationPermission(permission);
            if (permission === "granted") {
              try {
                new Notification("Teste de Alerta Push!", {
                  body: "Permissão concedida! Agora você receberá lembretes pelo sistema.",
                  icon: "https://cdn-icons-png.flaticon.com/512/3602/3652191.png"
                });
              } catch (e) {
                console.warn(e);
              }
            }
          });
        }
      }
    }
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Get days in the current month
  const totalDays = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // Calendar weekday grid alignment (getDay starting week offset)
  const firstDayIndex = useMemo(() => {
    return new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday ...
  }, [year, month]);

  // Unit filter - collaborators are restricted to their own unit.
  const activeUnit = session.unidade;

  // Filter schedules based on active unit and selected filters
  const processedSchedules = useMemo(() => {
    return schedules.filter(s => {
      // 1. Colleague only sees their unit (unless Gestor)
      if (activeUnit !== "TODAS" && s.unit !== activeUnit) return false;
      // 2. Status Filter
      if (statusFilter !== "TODOS" && s.status !== statusFilter.toLowerCase()) return false;
      // 3. Guide Filter
      if (guideFilter !== "TODOS" && s.guide !== guideFilter) return false;
      // 4. Product Filter
      if (productFilter !== "TODOS" && s.product !== productFilter) return false;
      return true;
    });
  }, [schedules, activeUnit, statusFilter, guideFilter, productFilter]);

  // Filtered schedules specifically for the monitored container (alertMonitor)
  const monitoredSchedulesToShow = useMemo(() => {
    return processedSchedules.filter(sc => {
      if (monitorStatusFilter === "TODOS") return true;
      return sc.status === monitorStatusFilter;
    });
  }, [processedSchedules, monitorStatusFilter]);

  // Active notices relevant to collaborator's unit (or TODAS)
  const relevantNotices = useMemo(() => {
    return notices.filter(n => n.affectedUnit === "TODAS" || n.affectedUnit === activeUnit);
  }, [notices, activeUnit]);

  // Real-time conflict validation for selected guide at same date and time
  const realTimeConflict = useMemo(() => {
    const currentGuide = useCustomGuide ? customGuideName.trim() : formGuide;
    if (!currentGuide || !formDate || !formTime) return null;

    // Filter schedules for conflict: same date, same time, same active guide (case-insensitive), excluding current editing
    const conflict = schedules.find(s => 
      s.id !== (editingSchedule?.id || "") &&
      s.status === "scheduled" &&
      s.date === formDate &&
      s.time === formTime &&
      s.guide.trim().toLowerCase() === currentGuide.trim().toLowerCase()
    );

    return conflict || null;
  }, [schedules, editingSchedule, formDate, formTime, formGuide, useCustomGuide, customGuideName]);

  // Real-time simultaneous/conflicting tours count for the selected date & time
  const realTimeConflictsCount = useMemo(() => {
    if (!formDate || !formTime) return 0;
    
    // Find tours on same date & time (excluding current being edited)
    return schedules.filter(s => 
      s.id !== (editingSchedule?.id || "") &&
      s.status === "scheduled" &&
      s.date === formDate &&
      s.time === formTime
    ).length;
  }, [schedules, editingSchedule, formDate, formTime]);

  const getUnitCapacityLimit = (unit: string, date?: string) => {
    if (unit === "LAPA" && date && date >= "2026-05-25" && date <= "2026-05-27") {
      return 20;
    }
    return 30;
  };

  // Double check scheduling warning issues / clashes
  const getSchedulesWarnings = (s: TourSchedule) => {
    const warnings: string[] = [];
    
    // Check limit threshold (e.g. > suggested maximum capacity)
    const maxCap = getUnitCapacityLimit(s.unit, s.date);
    if (s.participants > maxCap) {
      warnings.push(`Capacidade acima do recomendado (${s.participants} visitantes).`);
    }

    // Check guide schedule collision/clash on same date + time in database
    const hasCollision = schedules.some(other => 
      other.id !== s.id &&
      other.status === "scheduled" &&
      other.guide === s.guide &&
      other.date === s.date &&
      other.time === s.time
    );

    if (hasCollision) {
      warnings.push(`Conflito: O guia ${s.guide} possui outro tour ativo na mesma data e horário.`);
    }

    // Check active schedule (escala) mismatch for the guide
    if (s.guide && s.date && s.status !== "completed" && s.status !== "cancelled") {
      try {
        const dateObj = new Date(s.date + "T00:00:00");
        const dayOfWeek = dateObj.getDay(); 
        const condObj = conductorStatuses.find(c => c.name.trim().toLowerCase() === s.guide.trim().toLowerCase());
        
        if (condObj && condObj.workingDays && condObj.workingDays.length > 0) {
          if (!condObj.workingDays.includes(dayOfWeek)) {
            const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
            const regimeLabels: Record<string, string> = {
              "5x2": "Regime Admin (5x2)",
              "6x1": "Regime Revezamento (6x1)",
              "12x36": "Plantonista (12x36)",
              "custom": "Escala Customizada"
            };
            const regLabel = regimeLabels[condObj.regime || "custom"] || "Escala Customizada";
            warnings.push(`Incompatibilidade de Escala: ${s.guide} folga aos/às ${dayNames[dayOfWeek]} de acordo com a sua escala (${regLabel}) na unidade ${s.unit}.`);
          }
        }
      } catch (e) {}
    }

    return warnings;
  };

  // Trigger setup for editing a tour schedule
  const handleOpenEdit = (s: TourSchedule) => {
    setEditingSchedule(s);
    setFormTitle(s.title);
    setFormDate(s.date);
    setFormTime(s.time);
    
    if (leaders.includes(s.guide)) {
      setFormGuide(s.guide);
      setUseCustomGuide(false);
      setCustomGuideName("");
    } else {
      setFormGuide("");
      setUseCustomGuide(true);
      setCustomGuideName(s.guide);
    }

    setFormParticipants(s.participants);
    setFormProduct(s.product);
    setFormNotes(s.notes || "");
    setFormStatus(s.status);
    setFormUnit(s.unit);
    
    // Set warning/notification overrides
    setFormReminderMinutesOverride(s.reminderMinutesOverride);
    setFormReminderSoundTypeOverride(s.reminderSoundTypeOverride);
    setFormReminderSoundEnabledOverride(s.reminderSoundEnabledOverride);
    setFormReminderVisualEnabledOverride(s.reminderVisualEnabledOverride);

    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setFormTitle("Novo Tour de Boas-Vindas");
    
    // Default current date or selected date format YYYY-MM-DD
    const paddedM = String(month + 1).padStart(2, "0");
    const d = selectedDay ? String(selectedDay).padStart(2, "0") : String(new Date().getDate()).padStart(2, "0");
    setFormDate(`${year}-${paddedM}-${d}`);
    setFormTime("09:30");
    const activeUnitVal = session.unidade === "TODAS" ? "LAPA" : session.unidade;
    const initialGuide = conductorStatuses.find(c => c.unit.toLowerCase() === activeUnitVal.toLowerCase())?.name || leaders[0] || "";
    setFormGuide(initialGuide);
    setUseCustomGuide(false);
    setCustomGuideName("");
    setFormParticipants(15);
    setFormProduct(products[0] || "");
    setFormNotes("");
    setFormStatus("scheduled");
    setFormUnit(session.unidade === "TODAS" ? "LAPA" : session.unidade);
    
    // No overrides initially for new tours
    setFormReminderMinutesOverride(undefined);
    setFormReminderSoundTypeOverride(undefined);
    setFormReminderSoundEnabledOverride(undefined);
    setFormReminderVisualEnabledOverride(undefined);

    setFormError("");
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("O título do agendamento é obrigatório.");
      return;
    }
    if (!formDate) {
      setFormError("A data do agendamento é obrigatória.");
      return;
    }
    if (!formTime) {
      setFormError("O horário do agendamento é obrigatório.");
      return;
    }

    const finalGuideName = useCustomGuide ? customGuideName.trim() : formGuide;
    if (!finalGuideName) {
      setFormError("Selecione ou digite um líder/guia responsável.");
      return;
    }

    if (!formProduct) {
      setFormError("Selecione um produto/operação correspondente.");
      return;
    }
    if (formParticipants <= 0) {
      setFormError("A quantidade de participantes deve ser maior que zero.");
      return;
    }

    if (editingSchedule) {
      // Update existing
      const updated: TourSchedule = {
        ...editingSchedule,
        title: formTitle.trim(),
        date: formDate,
        time: formTime,
        guide: finalGuideName,
        unit: session.unidade === "TODAS" ? formUnit : editingSchedule.unit,
        participants: Number(formParticipants),
        product: formProduct,
        notes: formNotes.trim(),
        status: formStatus,
        reminderMinutesOverride: formReminderMinutesOverride,
        reminderSoundTypeOverride: formReminderSoundTypeOverride,
        reminderSoundEnabledOverride: formReminderSoundEnabledOverride,
        reminderVisualEnabledOverride: formReminderVisualEnabledOverride
      };
      onUpdateSchedule(updated);
    } else {
      // Create new
      const created: TourSchedule = {
        id: "tour-" + Date.now(),
        title: formTitle.trim(),
        date: formDate,
        time: formTime,
        guide: finalGuideName,
        unit: session.unidade === "TODAS" ? formUnit : activeUnit,
        participants: Number(formParticipants),
        product: formProduct,
        notes: formNotes.trim(),
        status: "scheduled",
        createdAt: new Date().toISOString(),
        reminderMinutesOverride: formReminderMinutesOverride,
        reminderSoundTypeOverride: formReminderSoundTypeOverride,
        reminderSoundEnabledOverride: formReminderSoundEnabledOverride,
        reminderVisualEnabledOverride: formReminderVisualEnabledOverride
      };
      onAddSchedule(created);
    }

    setIsFormOpen(false);
  };

  // Days list inside month grid
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Tours corresponding to a specific day inside current month navigation
  const getDaySchedules = (dayNum: number) => {
    const paddedM = String(month + 1).padStart(2, "0");
    const paddedD = String(dayNum).padStart(2, "0");
    const testDateStr = `${year}-${paddedM}-${paddedD}`;
    return processedSchedules.filter(s => s.date === testDateStr);
  };

  // Active tour schedules selected list for display
  const activeSchedulesList = useMemo(() => {
    if (selectedDay === null) {
      return processedSchedules;
    }
    const paddedM = String(month + 1).padStart(2, "0");
    const paddedD = String(selectedDay).padStart(2, "0");
    const testDateStr = `${year}-${paddedM}-${paddedD}`;
    return processedSchedules.filter(s => s.date === testDateStr);
  }, [processedSchedules, selectedDay, year, month]);

  // Export current month's scheduled tours to clean, printable/consultable PDF
  const handleExportMonthPDF = () => {
    try {
      const doc = new jsPDF() as any;
      const pageWidth = 210;
      const pageHeight = 297;
      let y = 15;

      const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
      const monthSchedules = processedSchedules
        .filter(s => s.date.startsWith(prefix))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        });

      const drawPageHeader = (pageNum: number, totalPages: number) => {
        // Draw elegant slate header banner
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(10, 10, pageWidth - 20, 11, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("AGENDA DE TOURS & ROTINAS ADMINISTRATIVAS", 15, 17.5);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(245, 158, 11); // Amber 500 gold
        doc.text(`Unidade: ${session.unidade} • Mês: ${monthNames[month]} / ${year}`, pageWidth - 15, 17.5, { align: "right" });
      };

      const drawPageFooter = (pageNum: number, totalPages: number) => {
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(115, 115, 115); // gray-500
        doc.text("Sistema de Gestão e Monitoramento de Fluxo Operacional • Impressão Oficial de Rotinas", 15, pageHeight - 10);
        
        doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: "right" });
      };

      // Header decorative block
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(10, 15, pageWidth - 20, 34, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("AGENDA DE ATIVIDADES & TOURS", 15, 27);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(245, 158, 11); // Amber
      doc.text(`Escala Operacional Geral — ${monthNames[month]} de ${year}`, 15, 34);

      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`Emissão oficial em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} • Solicitado por: ${session.nome}`, 15, 41);

      y = 56;

      // Section 1: INFORMAÇÕES GERAIS
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("1. INFORMAÇÕES GERAIS E REGISTRO", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 6;

      // Stats calculation for the current month
      const counts = monthSchedules.reduce((acc, current) => {
        acc[current.status] = (acc[current.status] || 0) + 1;
        acc.totalParticipants += current.participants || 0;
        return acc;
      }, { scheduled: 0, completed: 0, cancelled: 0, in_progress: 0, totalParticipants: 0 } as any);

      // Info summary card box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(10, y, pageWidth - 20, 26, "F");
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.rect(10, y, pageWidth - 20, 26, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Resumo de Metas e Escala Operacional:", 15, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`- Compromissos programados: ${monthSchedules.length} atividades localizadas`, 15, y + 11);
      doc.text(`- Status:  [ ${counts.scheduled || 0} Agendados ]   [ ${counts.in_progress || 0} Em Andamento ]   [ ${counts.completed || 0} Concluídos ]   [ ${counts.cancelled || 0} Cancelados ]`, 15, y + 16);
      doc.text(`- Estimativa de fluxo de público: ${counts.totalParticipants} visitantes acumulados`, 15, y + 21);

      // Filters summary on the right
      doc.setFont("helvetica", "bold");
      doc.text("Parâmetros do Filtro:", pageWidth - 85, y + 6);
      doc.setFont("helvetica", "normal");
      doc.text(`• Unidade Cadastradora: ${session.unidade}`, pageWidth - 85, y + 11);
      doc.text(`• Filtro Guia: ${guideFilter}`, pageWidth - 85, y + 16);
      doc.text(`• Filtro Roteiro: ${productFilter}`, pageWidth - 85, y + 21);

      y += 38;

      // Section 2: TABULAR CALENDAR DATA
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("2. LISTAGEM INDIVIDUALIZADA DOS AGENDAMENTOS MENSAL", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 6;

      // Table columns definition
      const colX = { date: 10, time: 27, title: 41, guide: 96, product: 130, participants: 172, status: 186 };

      const drawTableHeaders = (currentY: number) => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(10, currentY - 5, pageWidth - 20, 7.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("Data", colX.date + 1.5, currentY);
        doc.text("Horário", colX.time + 1, currentY);
        doc.text("Título do Tour / Compromisso", colX.title + 1, currentY);
        doc.text("Condutor / Líder", colX.guide + 1, currentY);
        doc.text("Roteiro Operacional", colX.product + 1, currentY);
        doc.text("Vis.", colX.participants + 1, currentY);
        doc.text("Status", colX.status + 1, currentY);
      };

      drawTableHeaders(y);
      y += 6.5;

      if (monthSchedules.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Nenhum tour agendado localizado nesta competência de mês.", 15, y + 5);
        y += 12;
      } else {
        monthSchedules.forEach((sc, idx) => {
          // Check for overflow / page break
          if (y > 265) {
            doc.addPage();
            // Header for next page
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(10, 10, pageWidth - 20, 10, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.text("AGENDA DE TOURS & ROTINAS ADMINISTRATIVAS", 15, 16.5);
            
            y = 30;
            drawTableHeaders(y);
            y += 6.5;
          }

          // Alternating row highlighting
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252); // slate-50
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(10, y - 4.5, pageWidth - 20, 6, "F");

          // Row separation line
          doc.setDrawColor(241, 245, 249); // slate-100
          doc.line(10, y + 1.5, pageWidth - 10, y + 1.5);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);

          // Render Date
          const dateParts = sc.date.split("-");
          const displayDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : sc.date;
          doc.text(displayDate.substring(0, 5), colX.date + 1.5, y);
          doc.text(sc.time, colX.time + 1, y);

          // Render truncated Title
          let titleStr = sc.title || "";
          if (titleStr.length > 29) {
            titleStr = titleStr.substring(0, 26) + "...";
          }
          doc.text(titleStr, colX.title + 1, y);

          // Render truncated Guide
          let guideStr = sc.guide || "";
          if (guideStr.length > 18) {
            guideStr = guideStr.substring(0, 15) + "...";
          }
          doc.text(guideStr, colX.guide + 1, y);

          // Render truncated Product
          let productStr = sc.product || "";
          if (productStr.length > 21) {
            productStr = productStr.substring(0, 18) + "...";
          }
          doc.text(productStr, colX.product + 1, y);

          // Render Participants
          doc.text(String(sc.participants || 0), colX.participants + 1, y);

          // Status custom text design
          let statusLabel = "Ativo";
          if (sc.status === "completed") {
            doc.setTextColor(16, 185, 129); // emerald-500 tint
            statusLabel = "Concluido";
          } else if (sc.status === "cancelled") {
            doc.setTextColor(239, 68, 68); // rose-500 tint
            statusLabel = "Cancelado";
          } else if (sc.status === "in_progress") {
            doc.setTextColor(217, 119, 6); // amber-600 tint
            statusLabel = "Em Progresso";
          } else {
            doc.setTextColor(59, 130, 246); // blue-500 tint
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text(statusLabel, colX.status + 1, y);

          y += 6.2;
        });
      }

      // Keep signatures section cohesive
      if (y > 230) {
        doc.addPage();
        // Header for next page
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(10, 10, pageWidth - 20, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("AGENDA DE TOURS & ROTINAS ADMINISTRATIVAS", 15, 16.5);
        y = 35;
      } else {
        y += 10;
      }

      // Section 3: ASSINATURAS E FISCALIZAÇÃO
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("3. CONTROLE DE VISTORIA E HOMOLOGAÇÃO", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 5;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(
        "Este documento serve como registro físico de agendamentos planejados e homologados neste setor para o respectivo mês de referência.",
        10,
        y
      );
      doc.text(
        "A escala está de acordo com as diretrizes do manual de operações offline do setor de roteiros de visitas técnicas operacionais.",
        10,
        y + 4
      );

      y += 18;

      // Lines for supervisors and conductors
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.line(15, y, 95, y);
      doc.line(115, y, 195, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Assinatura do Condutor Plantonista", 15, y + 4);
      doc.text("Visto da Chefia / Supervisor Técnico", 115, y + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("Matrícula: _______________________________", 15, y + 8);
      doc.text("Data: ____ / ____ / ________", 115, y + 8);

      // Loop page layout rendering
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) {
          drawPageHeader(i, totalPages);
        }
        drawPageFooter(i, totalPages);
      }

      doc.save(`agenda_${monthNames[month].toLowerCase()}_${year}_${session.unidade.toLowerCase()}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF da Agenda:", err);
    }
  };

  // Filter messages based on reader authorization (collaborator only sees their unit's alerts, manager sees all)
  const filteredMessages = useMemo(() => {
    if (session.unidade === "TODAS") {
      return collaboratorMessages;
    }
    return collaboratorMessages.filter(m => m.senderUnit === session.unidade);
  }, [collaboratorMessages, session.unidade]);

  // Handle post message
  const handlePostMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgContent.trim()) {
      setMsgFeedback("Erro: Assunto e descrição do recado são obrigatórios.");
      return;
    }

    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateString = now.toISOString().substring(0, 10);

    const newMsg: CollaboratorMessage = {
      id: "col-msg-" + Date.now(),
      senderName: session.nome,
      senderUnit: session.unidade === "TODAS" ? "Gestor Geral" : session.unidade,
      subject: msgSubject.trim(),
      content: msgContent.trim(),
      date: dateString,
      time: timeString,
      isRead: false
    };

    onAddCollaboratorMessage(newMsg);
    setMsgSubject("");
    setMsgContent("");
    setMsgPriority("medium");
    setMsgFeedback("✓ Recado enviado com sucesso para o canal do gestor!");
    setIsPosting(false);

    setTimeout(() => {
      setMsgFeedback("");
    }, 4500);
  };

  // Handle post daily activity report
  const handlePostDailyReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyReportActivities.trim()) {
      setDailyReportFeedback("Erro: O campo de descrição das atividades é obrigatório.");
      return;
    }

    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newReport: DailyActivityReport = {
      id: "report-" + Date.now(),
      collaboratorName: session.nome,
      date: dailyReportDate,
      unit: session.unidade === "TODAS" ? "LAPA" : session.unidade,
      activities: dailyReportActivities.trim(),
      timestamp: timeString
    };

    onAddDailyReport(newReport);
    setDailyReportActivities("");
    setDailyReportFeedback("✓ Relatório de atividades diárias enviado com sucesso!");

    setTimeout(() => {
      setDailyReportFeedback("");
    }, 4500);
  };

  // Computed values for Jaciana Melo's administrative dashboard
  const activeDateString = useMemo(() => {
    if (!selectedDay) return new Date().toISOString().split("T")[0];
    const d = new Date(year, month, selectedDay);
    return d.toISOString().split("T")[0];
  }, [year, month, selectedDay]);

  const rafaelaToursSelected = useMemo(() => {
    return schedules.filter(s => s.guide.trim().toLowerCase().includes("rafaela") && s.date === activeDateString);
  }, [schedules, activeDateString]);

  const viniciusToursSelected = useMemo(() => {
    return schedules.filter(s => s.guide.trim().toLowerCase().includes("vinicius") && s.date === activeDateString);
  }, [schedules, activeDateString]);

  const rafaelaSubmissions = useMemo(() => {
    if (!submissions) return [];
    return submissions.filter(sub => sub.liderEducador.trim().toLowerCase().includes("rafaela"));
  }, [submissions]);

  const viniciusSubmissions = useMemo(() => {
    if (!submissions) return [];
    return submissions.filter(sub => sub.liderEducador.trim().toLowerCase().includes("vinicius"));
  }, [submissions]);

  const rafaelaAverageGeral = useMemo(() => {
    if (!rafaelaSubmissions || rafaelaSubmissions.length === 0) return 0;
    const sum = rafaelaSubmissions.reduce((acc, curr) => acc + (curr.mediaGeral || 0), 0);
    return sum / rafaelaSubmissions.length;
  }, [rafaelaSubmissions]);

  const viniciusAverageGeral = useMemo(() => {
    if (!viniciusSubmissions || viniciusSubmissions.length === 0) return 0;
    const sum = viniciusSubmissions.reduce((acc, curr) => acc + (curr.mediaGeral || 0), 0);
    return sum / viniciusSubmissions.length;
  }, [viniciusSubmissions]);

  const handleAddAdminTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = {
      id: "jt-" + Date.now(),
      text: newTaskText.trim(),
      status: "pendente" as "pendente" | "andamento" | "concluído",
      category: newTaskCategory,
      targetGuide: newTaskGuide || undefined,
      dateCreated: new Date().toISOString().split("T")[0]
    };
    setAdminTasks(prev => [newTask, ...prev]);
    setNewTaskText("");
    setActionCounter(prev => prev + 1);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setAdminTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === "pendente" ? "andamento" : t.status === "andamento" ? "concluído" : "pendente";
        return { ...t, status: nextStatus };
      }
      return t;
    }));
    setActionCounter(prev => prev + 1);
  };

  const handleDeleteAdminTask = (taskId: string) => {
    setAdminTasks(prev => prev.filter(t => t.id !== taskId));
    setActionCounter(prev => prev + 1);
  };

  const handleQuickActionLog = () => {
    setActionCounter(prev => prev + 1);
  };

  const [selectedTourForAdminNote, setSelectedTourForAdminNote] = useState<string | null>(null);
  const [adminTourNoteText, setAdminTourNoteText] = useState("");

  const handleSaveAdminNote = (schedule: TourSchedule) => {
    onUpdateSchedule({
      ...schedule,
      notes: adminTourNoteText.trim() ? adminTourNoteText.trim() : schedule.notes,
    });
    setSelectedTourForAdminNote(null);
    setAdminTourNoteText("");
    setActionCounter(prev => prev + 1);
  };

  const handleQuickAudit = (schedule: TourSchedule) => {
    const auditTag = "[Apoio Técnico PRN: Jaciana Melo]";
    const existingNotes = schedule.notes ? schedule.notes : "";
    const updatedNotes = existingNotes.includes(auditTag) ? existingNotes : `${existingNotes} ${auditTag}`.trim();
    
    onUpdateSchedule({
      ...schedule,
      status: "completed",
      notes: updatedNotes
    });
    setActionCounter(prev => prev + 1);
  };

  const [quickNoteTourId, setQuickNoteTourId] = useState<string | null>(null);
  const [quickNoteValue, setQuickNoteValue] = useState("");

  const handleSaveQuickNote = (schedule: TourSchedule) => {
    onUpdateSchedule({
      ...schedule,
      notes: quickNoteValue.trim()
    });
    setQuickNoteTourId(null);
    setQuickNoteValue("");
    setActionCounter(prev => prev + 1);
  };

  const handleExportTourSummary = (sc: TourSchedule) => {
    const maxCap = getUnitCapacityLimit(sc.unit, sc.date);
    const text = `==================================================
RESUMO INTEGRAL DO COMPROMISSO: ${sc.title.toUpperCase()}
==================================================
📆 Data: ${sc.date}
⏰ Horário: ${sc.time}
📍 Unidade/Polo: ${sc.unit}
👤 Condutor Responsável: ${sc.guide}
👥 Participantes: ${sc.participants} visitantes (Capacidade recomendada: ${maxCap})
🏷️ Categoria/Produto: ${sc.product || "Não especificado"}
💡 Status Operacional: ${sc.status}

--------------------------------------------------
CONFIGURAÇÃO DE DISPARADOR DE ALERTA:
--------------------------------------------------
🔔 Disparador Sonoro: ${sc.reminderSoundEnabledOverride !== false ? "Ativo" : "Inativo"}
🔊 Tipo de Som: ${sc.reminderSoundTypeOverride || "Sino"}
⏱️ Antecedência de Alerta: ${sc.reminderMinutesOverride !== undefined ? sc.reminderMinutesOverride : "15"} minutos antes
🖥️ Disparo Visual: ${sc.reminderVisualEnabledOverride !== false ? "Ativo" : "Inativo"}

--------------------------------------------------
📝 ANOTAÇÃO & OBSERVAÇÕES REGISTRADAS:
--------------------------------------------------
${sc.notes || "Nenhuma anotação ou instrução cadastrada."}

--------------------------------------------------
Relatório gerado automaticamente para arquivamento externo.
Data da Exportação: ${new Date().toLocaleString("pt-BR")}
==================================================`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resumo_tour_${sc.id || "compromisso"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const todayDateStr = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const hasPostedReportForToday = useMemo(() => {
    if (!dailyReports || !session || session.isVisitor || session.nome === "Administrador" || session.unidade === "TODAS") {
      return true;
    }
    return dailyReports.some(rep => 
      rep.collaboratorName.trim().toLowerCase() === session.nome.trim().toLowerCase() && 
      rep.date === todayDateStr
    );
  }, [dailyReports, session, todayDateStr]);

  return (
    <div className="space-y-6">
      
      {/* ALERTA DE REPORTE DIÁRIO OBRIGATÓRIO BOTOES */}
      {!hasPostedReportForToday && (
        <div id="mandatory-report-alert" className="bg-amber-500/10 border border-amber-505/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left shadow-xs">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-550/35 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xl shrink-0">
              ⚠️
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap font-sans">
                Envio Diário de Atividades Obrigatório Pendente!
                <span className="bg-rose-600 text-white text-[8px] font-mono uppercase px-1.5 py-0.2 rounded font-black tracking-normal shrink-0 animate-bounce">
                  Obrigatório Hoje
                </span>
              </h4>
              <p className="text-[11.2px] text-slate-650 dark:text-slate-350 mt-1 font-semibold leading-relaxed font-sans">
                Olá, <strong className="text-slate-800 dark:text-slate-100">{session.nome}</strong>. O envio do relatório diário de atividades do seu polo (<strong className="text-indigo-650 dark:text-indigo-400 uppercase font-black">{session.unidade}</strong>) é obrigatório antes de encerrar seu expediente para a auditoria operacional diária. Por favor, registre suas ações.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const formElem = document.getElementById("secao-relatorio-atividades");
                if (formElem) {
                  formElem.scrollIntoView({ behavior: "smooth", block: "center" });
                  const textarea = formElem.querySelector("textarea");
                  if (textarea) textarea.focus();
                }
              }}
              className="px-3.5 py-1.8 bg-amber-600 hover:bg-amber-700 active:scale-97 text-white text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1 font-sans"
            >
              <FileText className="w-3.5 h-3.5" />
              Preencher Relatório
            </button>
          </div>
        </div>
      )}
      
      {session.nome === "Jaciana Melo" && (() => {
        const totalTasks = adminTasks.length;
        const completedTasks = adminTasks.filter(t => t.status === "concluído").length;
        const inProgressTasks = adminTasks.filter(t => t.status === "andamento").length;
        const pendingTasks = adminTasks.filter(t => t.status === "pendente").length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const filteredTasks = adminTasks.filter(t => {
          if (activeTaskFilter === "TODAS") return true;
          return t.status === activeTaskFilter;
        });

        const activeDateFormatted = activeDateString.split("-").reverse().join("/");

        // Compute today's active support counts
        const totalRafaelaTours = rafaelaToursSelected.length;
        const totalViniciusTours = viniciusToursSelected.length;

        return (
          <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-6 shadow-sm mb-4 animate-in fade-in duration-500">
            {/* Header Greeting Room */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-900/60 pb-5 text-left">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-950/70 border border-indigo-200/50 dark:border-indigo-900/50 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-bold text-2xl shadow-3xs">
                  💼
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-slate-850 dark:text-indigo-300 uppercase tracking-wider leading-none">
                      Painel do Facilitador & Controle Operacional (PRN)
                    </h2>
                    <span className="bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200/30 px-2 py-0.5 rounded-md text-[8.5px] text-indigo-700 dark:text-indigo-400 font-black tracking-widest uppercase font-mono">
                      Nível de Acesso: Supervisor adm
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Bem-vinda, <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">Jaciana Melo</strong>! Monitore a eficácia das tarefas, controle a agenda, divida as levas e dê suporte direto a <strong>Rafaela</strong> e <strong>Vinicius</strong>.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleQuickActionLog}
                  className="px-3.5 py-1.8 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] rounded-xl shadow-xs hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-spin duration-1000" />
                  Registrar Ponto Técnico (+1 ação)
                </button>
              </div>
            </div>

            {/* Metrics Row: Contabilização dinâmicas de todas as atividades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Metric Card 1: Eficácia de Rotinas */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-3xs flex flex-col justify-between">
                <div className="text-left">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] uppercase font-black tracking-widest font-mono">Eficácia de Rotinas</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-slate-850 dark:text-white font-mono">{completionRate}%</span>
                    <span className="text-xs text-slate-400 font-medium font-sans"> de conclusão</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-emerald-550 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${completionRate}%`, backgroundColor: "#10b981" }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-850/60 pt-2 flex justify-between font-mono">
                  <span>Concluídas: {completedTasks}</span>
                  <span>Total: {totalTasks}</span>
                </div>
              </div>

              {/* Metric Card 2: Contador Real de Produtividade */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-3xs flex flex-col justify-between">
                <div className="text-left">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] uppercase font-black tracking-widest font-mono">Métrica de Ação</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 font-mono">{actionCounter}</span>
                    <span className="text-xs text-slate-400 font-medium font-sans">ações logadas</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                    Incrementado automaticamente a cada checklist, auditoria, alteração de status ou diretriz emitida.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-850/60 pt-2 font-mono text-left">
                  📊 Volume de Engajamento total
                </div>
              </div>

              {/* Metric Card 3: Carga de Trabalho Selecionada */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] uppercase font-black tracking-widest font-mono">Etapas Ativas</span>
                    <Filter className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex justify-between items-center mt-2.5">
                    <div className="text-left">
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">{inProgressTasks}</p>
                      <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Andamento</span>
                    </div>
                    <div className="border-l border-slate-200 dark:border-slate-800 h-8 mx-2" />
                    <div className="text-right text-right">
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">{pendingTasks}</p>
                      <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Pendentes</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-455 mt-3 leading-tight text-center">
                    Gargalos ativos sob sua tutela.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-850/60 pt-2 font-mono text-center">
                  ⚠️ Manter andamento sob controle
                </div>
              </div>

              {/* Metric Card 4: Cobertura de Equipe */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-3xs flex flex-col justify-between">
                <div className="text-left">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] uppercase font-black tracking-widest font-mono">Auditoria do Dia</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-xl font-extrabold text-slate-855 dark:text-slate-200 font-mono">
                      {totalRafaelaTours + totalViniciusTours} Tours
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans ml-1">no dia {activeDateFormatted}</span>
                  </div>
                  <div className="space-y-1 mt-2.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Rafaela:</span>
                      <strong className="text-indigo-650 dark:text-indigo-400 font-mono">{totalRafaelaTours} tours</strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Vinicius:</span>
                      <strong className="text-indigo-650 dark:text-indigo-400 font-mono">{totalViniciusTours} tours</strong>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-850/60 pt-2 font-mono flex items-center gap-1 text-left">
                  🎯 Foco: Rafaela & Vinicius
                </div>
              </div>

            </div>

            {/* Interactive Grid: Checklists on Left, Guide Monitor on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              
              {/* Left Column: Interactive Task checklist list */}
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-850 rounded-2xl p-5 shadow-3xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-850 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                    <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                      Gerenciador de Atividades Administrativas
                    </h3>
                  </div>
                  
                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-850 p-0.5 rounded-lg select-none">
                    {(["TODAS", "pendente", "andamento", "concluído"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveTaskFilter(filter)}
                        className={`px-1.5 py-0.8 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeTaskFilter === filter
                            ? "bg-indigo-600 text-white shadow-3xs"
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
                        }`}
                      >
                        {filter === "TODAS" ? "Todos" : filter === "pendente" ? "Pend." : filter === "andamento" ? "And." : "Concl."}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List Tasks wrapper */}
                <div className="space-y-2.5 max-h-[295px] overflow-y-auto pr-1">
                  {filteredTasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-405 text-xs italic">
                      Nenhuma atividade operacional encontrada neste status de checklist.
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      // Style dynamic categories
                      const catStyle = 
                        task.category === "Rotina" ? "bg-blue-50 text-blue-700 border-blue-105 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30" :
                        task.category === "Assessoria" ? "bg-amber-50 text-amber-700 border-amber-105 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" :
                        task.category === "Relatório" ? "bg-purple-50 text-purple-700 border-purple-105 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30" :
                        "bg-emerald-50 text-emerald-700 border-emerald-105 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";

                      const statusColor = 
                        task.status === "concluído" ? "bg-emerald-50/40 border-emerald-250 dark:bg-emerald-950/15 dark:border-emerald-900/40 text-slate-800 dark:text-slate-205" :
                        task.status === "andamento" ? "bg-amber-50/20 border-amber-255 dark:bg-amber-955/10 dark:border-amber-900/40 text-slate-850 dark:text-slate-200" :
                        "bg-slate-52 border-slate-150 dark:bg-slate-900 dark:border-slate-800 text-slate-550 dark:text-slate-450";

                      return (
                        <div 
                          key={task.id}
                          className={`p-3 border rounded-xl flex items-center justify-between gap-3 hover:shadow-3xs transition duration-200 ${statusColor}`}
                        >
                          <div className="flex items-start gap-2.5 text-left min-w-0 flex-1">
                            {/* Checkbox trigger */}
                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(task.id)}
                              className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                                task.status === "concluído"
                                  ? "bg-emerald-500 border-emerald-600 text-white"
                                  : task.status === "andamento"
                                  ? "bg-amber-500 border-amber-550 text-white"
                                  : "bg-white border-slate-300 dark:bg-slate-850 dark:border-slate-705 hover:border-indigo-400"
                              }`}
                              title="Clique para alternar o status do checklist operacional (+1 ação)"
                            >
                              {task.status === "concluído" && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                              {task.status === "andamento" && <span className="w-1.5 h-1.5 rounded-full bg-white block animate-ping" />}
                            </button>

                            <div className="min-w-0 flex-1">
                              <p className={`text-[11.5px] font-extrabold leading-normal truncate ${task.status === "concluído" ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-250"}`}>
                                {task.text}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className={`text-[8.5px] px-1.5 py-0.2 border rounded font-extrabold font-mono uppercase tracking-widest ${catStyle}`}>
                                  {task.category}
                                </span>
                                {task.targetGuide && (
                                  <span className="text-[8.5px] bg-slate-100 dark:bg-slate-800 px-1.2 py-0.2 rounded text-slate-500 font-bold">
                                    Condutor: {task.targetGuide.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Fast status trigger cycler button */}
                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(task.id)}
                              className={`px-2 py-0.8 text-[8.5px] font-black uppercase rounded-lg border cursor-pointer select-none transition-all ${
                                task.status === "concluído"
                                  ? "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border-emerald-250"
                                  : task.status === "andamento"
                                  ? "bg-amber-100 dark:bg-amber-955/45 text-amber-750 dark:text-amber-400 border-amber-250"
                                  : "bg-slate-105 text-slate-600 dark:bg-slate-800 dark:text-slate-405 border-slate-205"
                              }`}
                            >
                              {task.status === "concluído" ? "Feito" : task.status === "andamento" ? "Andamento" : "Pendente"}
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteAdminTask(task.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="Remover rotina administrativa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add task Fast form inside dashboard */}
                <form onSubmit={handleAddAdminTask} className="border-t border-slate-100 dark:border-slate-850 pt-3.5 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-left">
                    <div className="sm:col-span-8">
                      <input 
                        type="text"
                        placeholder="Novo checklist ou rotina administrativa..."
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        className="w-full text-xs px-3 py-1.8 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-white font-medium"
                      />
                    </div>
                    <div className="sm:col-span-4 flex gap-1.5">
                      <select
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        className="w-full text-[10.5px] px-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-slate-700 dark:text-slate-300 font-black cursor-pointer"
                      >
                        <option value="Rotina">Rotina</option>
                        <option value="Assessoria">Assessoria</option>
                        <option value="Relatório">Relatório</option>
                        <option value="Qualidade">Qualidade</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <label className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 self-start">
                      <span>Vincular ao condutor da unidade:</span>
                      <select
                        value={newTaskGuide}
                        onChange={(e) => setNewTaskGuide(e.target.value)}
                        className="text-[10px] py-1 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-hidden text-indigo-700 dark:text-indigo-400 font-extrabold cursor-pointer"
                      >
                        <option value="">Nenhum (Geral)</option>
                        <option value="Rafaela Alessandra">Rafaela Alessandra</option>
                        <option value="Vinicius Lima">Vinicius Lima</option>
                      </select>
                    </label>

                    <button
                      type="submit"
                      disabled={!newTaskText.trim()}
                      className="w-full sm:w-auto px-4 py-1.8 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-755 dark:text-indigo-400 font-black text-[10px] rounded-xl transition cursor-pointer flex items-center justify-center gap-1 uppercase tracking-wide shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      Criar Atividade
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Rafaela Alessandra & Vinicius Lima Live Control Box */}
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-855 rounded-2xl p-5 shadow-3xs space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-2 text-left">
                    <Users className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                    <div>
                      <h3 className="text-xs font-black text-slate-955 dark:text-white uppercase tracking-wider">
                        Assessoria e Controle de Tours (PRN)
                      </h3>
                      <p className="text-[9.5px] text-slate-400 dark:text-slate-455 leading-tight">
                        Supervisão presencial de Rafaela Alessandra e Vinicius Lima
                      </p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-mono text-indigo-750 bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 px-2.5 py-0.8 rounded-md font-black self-start sm:self-auto border border-indigo-100/40">
                    Agenda: {activeDateFormatted}
                  </span>
                </div>

                {/* Sub-cards comparing guides performance and today's allocated schedules */}
                <div className="grid grid-cols-2 gap-3 pb-1 border-b border-slate-100 dark:border-slate-850/60 font-sans">
                  
                  {/* Guide A: Rafaela */}
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/20 dark:from-slate-950/50 dark:to-transparent rounded-xl border border-slate-200 dark:border-slate-850 shadow-3xs text-left">
                    <p className="text-[11px] font-black text-slate-900 dark:text-indigo-450 truncate">
                      👩‍🏫 Rafaela Alessandra
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 flex-wrap">
                      <span>Média Clientes:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        {rafaelaAverageGeral > 0 ? `${rafaelaAverageGeral.toFixed(2)}` : "8.7 (Hist.)"}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-550 mt-1 border-t border-dotted border-slate-200 dark:border-slate-800/60 pt-1">
                      <span>Pesquisas (N):</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-350">{rafaelaSubmissions.length || "12"}</strong>
                    </div>
                  </div>

                  {/* Guide B: Vinicius */}
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-amber-50/10 dark:from-slate-950/50 dark:to-transparent rounded-xl border border-slate-200 dark:border-slate-850 shadow-3xs text-left">
                    <p className="text-[11px] font-black text-slate-900 dark:text-amber-400 truncate">
                      👨‍🏫 Vinicius Lima
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 flex-wrap">
                      <span>Média Clientes:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        {viniciusAverageGeral > 0 ? `${viniciusAverageGeral.toFixed(2)}` : "8.5 (Hist.)"}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-555 mt-1 border-t border-dotted border-slate-200 dark:border-slate-800/60 pt-1 font-sans">
                      <span>Pesquisas (N):</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-350">{viniciusSubmissions.length || "9"}</strong>
                    </div>
                  </div>

                </div>

                {/* Active tour controls list */}
                <div className="space-y-3">
                  <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-mono text-left">
                    Monitoramento de Escala de Tours no PRN:
                  </span>

                  <div className="space-y-2 max-h-[178px] overflow-y-auto pr-1">
                    {[...rafaelaToursSelected, ...viniciusToursSelected].length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-slate-400 italic leading-snug text-left">
                        Nenhum tour escalado para Rafaela ou Vinicius em {activeDateFormatted}. Navegue pelo calendário ao lado para as datas anteriores ou posteriores.
                      </div>
                    ) : (
                      [...rafaelaToursSelected, ...viniciusToursSelected].map((sc) => {
                        const isRafaela = sc.guide.trim().toLowerCase().includes("rafaela");
                        const badgeColor = isRafaela ? "bg-pink-50 text-pink-700 border-pink-100/40 dark:bg-pink-950/20 dark:text-pink-450" : "bg-cyan-50 text-cyan-700 border-cyan-100/40 dark:bg-cyan-950/20 dark:text-cyan-455";
                        const isAudited = sc.notes && sc.notes.includes("[Apoio Técnico PRN");

                        return (
                          <div 
                            key={sc.id} 
                            className="p-3 bg-slate-50/40 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 relative shadow-3xs text-left"
                          >
                            <div className="flex items-center justify-between gap-1.5 font-sans">
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span className={`text-[8.5px] font-mono px-1 py-0.2 rounded font-black uppercase shrink-0 ${sc.status === "completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50"}`}>
                                  🕒 {sc.time}
                                </span>
                                <span className={`text-[8.5px] border font-black px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider ${badgeColor}`}>
                                  {isRafaela ? "Rafaela" : "Vinicius"}
                                </span>
                                <span className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200 truncate max-w-[120px]">
                                  {sc.product}
                                </span>
                              </div>
                              
                              {isAudited && (
                                <span className="text-[8px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.2 py-0.2 rounded font-black border border-emerald-200/50 flex items-center shrink-0 uppercase tracking-widest font-mono">
                                  ✓ Concluído Adm
                                </span>
                              )}
                            </div>

                            {sc.notes && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-450 italic bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-150 border-dotted text-left leading-normal font-sans">
                                <strong className="text-[9px] uppercase font-mono not-italic text-slate-400 block mb-0.5 border-b pb-0.5 border-slate-100 dark:border-slate-850/60">Anotação Administrativa:</strong>
                                {sc.notes}
                              </p>
                            )}

                            {/* Options action drawer inside card */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-850/60 flex items-center justify-between gap-2">
                              {selectedTourForAdminNote === sc.id ? (
                                <div className="w-full space-y-2 text-left">
                                  <input 
                                    type="text"
                                    placeholder="Escrever diretriz de assessoria ou ajuste técnico..."
                                    value={adminTourNoteText}
                                    onChange={(e) => setAdminTourNoteText(e.target.value)}
                                    className="w-full text-[10.5px] px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded focus:outline-hidden text-slate-800 dark:text-white font-medium shadow-3xs text-left"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTourForAdminNote(null)}
                                      className="px-2 py-0.5 text-[9px] font-bold text-slate-505 bg-slate-150 dark:bg-slate-800 dark:text-slate-350 rounded cursor-pointer hover:bg-slate-205"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveAdminNote(sc)}
                                      className="px-2.5 py-0.5 text-[9px] font-bold text-white bg-indigo-650 hover:bg-indigo-700 rounded cursor-pointer"
                                    >
                                      Gravar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTourForAdminNote(sc.id);
                                      setAdminTourNoteText(sc.notes || "");
                                    }}
                                    className="px-2 py-0.8 text-[9.5px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-slate-805 rounded transition-all cursor-pointer flex items-center gap-1 font-sans"
                                  >
                                    <Edit2 className="w-3.2 h-3.2 text-slate-400" />
                                    Escrever Obs/Diretriz
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickAudit(sc)}
                                    className="px-2.5 py-1 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-755 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 dark:text-indigo-400 text-[9.5px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 uppercase tracking-wider border border-indigo-200/50 dark:border-indigo-900/30 font-sans"
                                  >
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                    Dar Apoio Técnico
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        );
      })()}
      
      {/* HEADER BAR AND ACTIVE ANNOUNCEMENTS FROM GESTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Unit Notices Panel (Avisos do Gestor) */}
        <div className="col-span-1 lg:col-span-12 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 rounded-full bg-amber-400 text-slate-900 text-xs font-mono font-extrabold flex items-center gap-1 shrink-0">
                📢 {relevantNotices.length}
              </span>
              <h3 className="text-sm font-black text-slate-800 dark:text-amber-400 uppercase tracking-wide">
                Canal de Avisos e Alertas do Gestor ({activeUnit})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              Sincronizado via Board Geral
            </span>
          </div>

          {relevantNotices.length === 0 ? (
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs gap-2 py-6">
              <Info className="w-4 h-4 text-slate-350" />
              Nenhum aviso ativo direcionado à sua unidade no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relevantNotices.map((notice) => (
                <div 
                  key={notice.id} 
                  className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-3xs hover:shadow-2xs transition relative overflow-hidden flex flex-col justify-between ${
                    notice.priority === "high" 
                      ? "border-rose-200 dark:border-rose-950/60 bg-rose-50/10" 
                      : notice.priority === "medium"
                      ? "border-amber-200 dark:border-amber-950/60 bg-amber-50/10"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest leading-none ${
                        notice.priority === "high" 
                          ? "bg-rose-100 text-rose-700" 
                          : notice.priority === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {notice.priority === "high" ? "🚨 Alta" : notice.priority === "medium" ? "⚠️ Média" : "💡 Geral"}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        {notice.date}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {notice.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3 hover:line-clamp-none transition-all duration-300 pb-2">
                      {notice.content}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                    <span>Autor: <strong className="text-slate-600 dark:text-slate-300">{notice.createdBy}</strong></span>
                    <span>Destino: <strong className="text-indigo-600 dark:text-indigo-400">{notice.affectedUnit}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE MONTH CALENDAR */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              Agenda / Calendário de Tours
            </h4>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono px-1 min-w-[75px] text-center uppercase tracking-wide">
                {monthNames[month]} {year}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded transition cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono py-1 border-b border-slate-100 dark:border-slate-800">
            <span>D</span>
            <span>S</span>
            <span>T</span>
            <span>Q</span>
            <span>Q</span>
            <span>S</span>
            <span>S</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty boxes for offset alignment of first day index */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-10 text-xs text-transparent select-none bg-slate-50/30 rounded-lg"></div>
            ))}

            {/* Days in current month */}
            {daysArray.map((dayNum) => {
              const daySchedules = getDaySchedules(dayNum);
              const isSelected = selectedDay === dayNum;
              const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

              // Calculate active counts to render dots
              const activeCount = daySchedules.filter(s => s.status === "scheduled").length;
              const compCount = daySchedules.filter(s => s.status === "completed").length;
              const cancCount = daySchedules.filter(s => s.status === "cancelled").length;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-10 text-xs rounded-lg flex flex-col items-center justify-between p-1.5 transition cursor-pointer relative font-semibold hover:border-amber-400 dark:hover:border-amber-500 border ${
                    isSelected
                      ? "bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-xs hover:bg-amber-600"
                      : isToday
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-bold"
                      : "bg-slate-50 dark:bg-slate-800/55 border-slate-200/60 dark:border-slate-750 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-[11px] font-mono leading-none">{dayNum}</span>
                  
                  {/* Event indicators */}
                  <div className="flex gap-0.5 justify-center mt-0.5 max-w-full">
                    {activeCount > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-slate-950" : "bg-emerald-500 animate-pulse"}`} title={`${activeCount} Agendados`} />
                    )}
                    {compCount > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-slate-850" : "bg-blue-500"}`} title={`${compCount} Concluídos`} />
                    )}
                    {cancCount > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-slate-705" : "bg-rose-500"}`} title={`${cancCount} Cancelados`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10.5px] text-slate-400 dark:text-slate-500 leading-normal flex flex-wrap gap-x-4 gap-y-1 align-center justify-center font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Agendado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Concluído
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Cancelado
            </span>
          </div>

          {/* Quick Button to Schedule the Selected Date */}
          <button
            onClick={handleOpenAdd}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 py-2.5 rounded-xl transition cursor-pointer shadow-3xs"
          >
            <Plus className="w-4 h-4" /> Agendar para {selectedDay ? `${selectedDay}/${monthNames[month].slice(0,3)}` : "Hoje"}
          </button>

          {/* PAINEL DE CONFIGURAÇÕES DE LEMBRETES DE TOURS - DEDICADO E CONFIGURÁVEL */}
          <div className="mt-4 p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-850/60 border border-slate-250 dark:border-slate-800 rounded-2xl space-y-4 text-left shadow-xs transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-505 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-indigo-500" />
                </div>
                <div>
                  <h5 className="text-[12px] font-black text-slate-900 dark:text-indigo-400 uppercase tracking-wider font-sans leading-none">
                    Configurar Alertas e Lembretes 🕗
                  </h5>
                  <span className="text-[9.5px] text-slate-450 dark:text-slate-500 font-medium font-sans mt-1 block">
                    Gerencie avisos de tours programados para sua jornada
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={reminderEnabled} 
                  onChange={(e) => setReminderEnabled(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                <span className="ml-2 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase font-mono">{reminderEnabled ? "On" : "Off"}</span>
              </label>
            </div>

            {reminderEnabled && (
              <div className="space-y-4 animate-fade-in text-left">
                
                {/* 1. ANTECEDÊNCIA & SOM SELECTORS */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-sans">
                      ⏰ Antecedência
                    </label>
                    <select
                      value={reminderMinutes}
                      onChange={(e) => setReminderMinutes(Number(e.target.value))}
                      className="w-full text-xs font-bold py-2 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-205 cursor-pointer shadow-3xs"
                    >
                      <option value="2">2 minutos</option>
                      <option value="5">5 minutos</option>
                      <option value="10">10 minutos</option>
                      <option value="15">15 minutos</option>
                      <option value="20">20 minutos</option>
                      <option value="30">30 minutos</option>
                      <option value="60">1 hora</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-sans">
                      🎵 Alarme Sonoro
                    </label>
                    <select
                      value={reminderSoundType}
                      onChange={(e) => setReminderSoundType(e.target.value)}
                      className="w-full text-xs font-bold py-2 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-205 cursor-pointer shadow-3xs"
                    >
                      <option value="bell">🔔 Chime de Sino</option>
                      <option value="crystal">💎 Cristal Resonante</option>
                      <option value="beep">⚡ Bipe Suave</option>
                      <option value="wood">🪵 Marimba de Madeira</option>
                      <option value="digital">📟 Pulso Digital</option>
                    </select>
                  </div>
                </div>

                {/* 2. GRANULAR VISUAL TYPES TOGGLES */}
                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="block text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
                    Canais de Alerta Ativos
                  </span>

                  {/* TOAST TOGGLE */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 align-middle">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      Lembrete Flutuante (Toast)
                    </span>
                    <input 
                      type="checkbox" 
                      checked={reminderVisualToastEnabled} 
                      onChange={(e) => setReminderVisualToastEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 cursor-pointer h-4 w-4"
                    />
                  </div>

                  {/* IMMERSIVE MODAL TOGGLE */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 align-middle">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      Modal Central Bloqueante
                    </span>
                    <input 
                      type="checkbox" 
                      checked={reminderVisualModalEnabled} 
                      onChange={(e) => setReminderVisualModalEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 cursor-pointer h-4 w-4"
                    />
                  </div>

                  {/* NATIVE PUSH BROWSER NOTIFICATION TOGGLE */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-3xs">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 align-middle leading-tight">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        Notificações Push do Sistema
                      </span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={reminderVisualPushEnabled} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setReminderVisualPushEnabled(val);
                        if (val && "Notification" in window && Notification.permission === "default") {
                          Notification.requestPermission().then(permission => {
                            setBrowserNotificationPermission(permission);
                          });
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 cursor-pointer h-4 w-4"
                    />
                  </div>
                </div>

                {/* 3. NATIVE PUSH PERMISSION CONTROLLER */}
                {reminderVisualPushEnabled && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-left animate-fade-in">
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                        Permissão no Navegador:
                      </span>
                      {browserNotificationPermission === "granted" ? (
                        <span className="text-[9.5px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase">
                          ✓ Concedido
                        </span>
                      ) : browserNotificationPermission === "denied" ? (
                        <span className="text-[9.5px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase">
                          ✖ Bloqueado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if ("Notification" in window) {
                              Notification.requestPermission().then(p => setBrowserNotificationPermission(p));
                            }
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] rounded-md transition cursor-pointer uppercase shadow-4xs"
                        >
                          Ativar Push
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-normal font-medium leading-relaxed">
                      Nota: No ambiente Preview, as notificações de push nativas dependem das permissões do navegador e podem ser limitadas dentro do Iframe. Recomendamos manter também o Alerta Visual (Toast) ou o Modal ativo.
                    </p>
                  </div>
                )}

                {/* 4. SINAL SONORO ALARM CONFIG */}
                {reminderSoundEnabled && (
                  <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                        Volume de Reprodução
                      </span>
                      <span>{reminderVolume}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={reminderVolume} 
                      onChange={(e) => setReminderVolume(Number(e.target.value))}
                      className="w-full accent-indigo-655 h-1.5 bg-slate-205 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* 5. TEST SOUND TRIGGER & INFO STATS */}
                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[9.5px] text-slate-450 dark:text-slate-450 font-mono font-bold">
                    🔔 {notifiedTours.length} lembretes emitidos nesta sessão
                  </div>
                  <button
                    type="button"
                    onClick={testReminderSettings}
                    className="p-1.5 px-3 text-[10px] font-bold uppercase rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/45 border border-indigo-200 dark:border-indigo-850 text-indigo-755 dark:text-indigo-400 transition cursor-pointer flex items-center gap-1 shadow-4xs font-sans"
                  >
                    <Music className="w-3.5 h-3.5 text-indigo-500" /> Testar Config.
                  </button>
                </div>
              </div>
            )}

            {!reminderEnabled && (
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 italic text-left pt-1 leading-relaxed">
                Alertas automáticos desativados. Ative a chave acima para receber notificações de tours agendados da sua unidade nos canais e antecedências que escolher.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TOUR SCHEDULES LIST & FILTERS */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* TAB SWITCHER: OPERATION VS ROSTER VS ALERT MONITORING */}
          <div className="flex border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setRightColumnTab("agenda")}
              className={`flex-1 py-1.5 px-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 leading-none ${
                rightColumnTab === "agenda"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-xs border border-slate-100 dark:border-slate-800/60 font-mono"
                  : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Agenda & Atividades
            </button>
            <button
              onClick={() => setRightColumnTab("roster")}
              className={`flex-1 py-1.5 px-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 leading-none relative ${
                rightColumnTab === "roster"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-xs border border-slate-100 dark:border-slate-800/60 font-mono"
                  : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-550 dark:text-indigo-400" />
              Escalas & Ausências (SIA)
              {upcomingToursWithAbsentGuides.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setRightColumnTab("alertMonitor")}
              className={`flex-1 py-1.5 px-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 leading-none relative ${
                rightColumnTab === "alertMonitor"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-xs border border-slate-100 dark:border-slate-800/60 font-mono"
                  : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-205"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Monitor Alertas
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 animate-pulse" />
            </button>
          </div>

          {rightColumnTab === "agenda" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* SEARCH FILTERS HEADERS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-500" />
                Filtros Rápidos da Unidade
              </h4>
              
              {selectedDay !== null && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold transition flex items-center gap-0.5 leading-none"
                >
                  <ListFilter className="w-3" /> Ver Todos os Dias do Mês
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status Selector */}
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg outline-none text-slate-700 dark:text-slate-350 cursor-pointer"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="SCHEDULED">Agendado</option>
                  <option value="IN_PROGRESS">Em Andamento</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              {/* Guide Selector */}
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Líder / Guia</label>
                <select
                  value={guideFilter}
                  onChange={(e) => setGuideFilter(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg outline-none text-slate-700 dark:text-slate-350 cursor-pointer"
                >
                  <option value="TODOS">Todos os Líderes</option>
                  {filteredLeadersForFilter.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Product Selector */}
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Produto / Operação</label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg outline-none text-slate-700 dark:text-slate-350 cursor-pointer"
                >
                  <option value="TODOS">Todos os Produtos</option>
                  {products.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ACTIVE DAY HIGHLIGHT DISPLAY AND SCHEDULES LIST */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-2.5">
              <span className="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-wide">
                {selectedDay === null 
                  ? `Compromissos de ${monthNames[month]} • ${activeSchedulesList.length} localizados` 
                  : `Tours para o dia ${selectedDay}/${monthNames[month]} • ${activeSchedulesList.length} encontrados`
                }
              </span>
              
              <button
                type="button"
                onClick={handleExportMonthPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 text-[10px] font-black rounded-lg transition shadow-3xs cursor-pointer uppercase font-mono tracking-wider self-start sm:self-auto"
                title="Sincronizar e exportar agenda mensal completa para PDF limpo"
              >
                <FileDown className="w-3.5 h-3.5" />
                Exportar Agenda PDF
              </button>
            </div>

            {activeSchedulesList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center space-y-2.5">
                <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-350 dark:text-slate-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum compromisso agendado.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {selectedDay === null 
                      ? "Nenhum tour atende aos parâmetros dos filtros ativos para este mês."
                      : `Não há tours agendados para este dia específico. Clique no botão de agendamento abaixo do calendário para criar um!`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activeSchedulesList.map((sc) => {
                  const warnings = getSchedulesWarnings(sc);
                  return (
                    <div 
                      key={sc.id}
                      className={`bg-white dark:bg-slate-900 border p-4 rounded-xl shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden transition ${
                        sc.status === "cancelled" 
                          ? "opacity-60 saturate-50 border-slate-200 dark:border-slate-800"
                          : sc.status === "in_progress"
                          ? "border-amber-300 dark:border-amber-700 bg-amber-50/10 dark:bg-amber-950/5 ring-1 ring-amber-300/20"
                          : warnings.length > 0
                          ? "border-amber-200 bg-amber-50/5 dark:bg-amber-950/10 dark:border-amber-900/60"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* Left color bar based on Tour Status */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                        sc.status === "completed" 
                          ? "bg-blue-500" 
                          : sc.status === "cancelled"
                          ? "bg-slate-400 dark:bg-slate-600"
                          : sc.status === "in_progress"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-emerald-505"
                      }`} />

                      <div className="space-y-2.5 pl-2 grow">
                        
                        {/* Header Details */}
                        <div className="flex flex-wrap items-center gap-2">
                          {sc.status === "in_progress" ? (
                            <motion.span 
                              animate={{ 
                                scale: [1, 1.02, 1],
                                borderColor: ["rgba(245, 158, 11, 0.4)", "rgba(245, 158, 11, 0.8)", "rgba(245, 158, 11, 0.4)"]
                              }}
                              transition={{ 
                                repeat: Infinity, 
                                duration: 2, 
                                ease: "easeInOut" 
                              }}
                              className="text-[9px] font-black px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 leading-none uppercase tracking-wide border bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-900 shadow-xs"
                            >
                              <span className="relative flex h-1.5 w-1.5">
                                <motion.span
                                  animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                  className="absolute inline-flex h-full w-full rounded-full bg-amber-550 dark:bg-amber-400"
                                />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-550 dark:bg-amber-400" />
                              </span>
                              <Play className="w-2.5 h-2.5 fill-amber-550 dark:fill-amber-400 text-amber-550 dark:text-amber-400" /> Em Andamento
                            </motion.span>
                          ) : (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full font-mono flex items-center gap-1 leading-none uppercase tracking-wide border ${
                              sc.status === "completed"
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 border-blue-200 dark:border-blue-900"
                                : sc.status === "cancelled"
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-550 border-slate-200 dark:border-slate-700"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-200 dark:border-emerald-900"
                            }`}>
                              {sc.status === "completed" ? (
                                <>
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Concluído
                                </>
                              ) : sc.status === "cancelled" ? (
                                <>
                                  <XCircle className="w-2.5 h-2.5" /> Cancelado
                                </>
                              ) : (
                                <>
                                  <Clock className="w-2.5 h-2.5 animate-pulse" /> Agendado
                                </>
                              )}
                            </span>
                          )}

                          <span className="text-[10.5px] bg-amber-100 dark:bg-amber-955 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-extrabold flex items-center gap-1.5 font-mono shadow-2xs border border-amber-200/40">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> {sc.date} às {sc.time}
                          </span>

                          <span className="text-[10.5px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-350 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider flex items-center gap-0.5">
                            <MapPin className="w-3.5 h-3.5" /> {sc.unit}
                          </span>
                        </div>

                        {/* Title and Product info */}
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                            {sc.title}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-bold block">
                            Processo: <strong className="text-slate-600 dark:text-slate-350 font-normal">{sc.product}</strong>
                          </span>
                        </div>

                        {/* Guide, participants info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-350 font-bold">
                          <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-150 dark:border-slate-800 text-slate-755 dark:text-slate-205">
                            👤 Responsável: <strong className="text-indigo-600 dark:text-amber-400 font-black ml-0.5">{sc.guide}</strong>
                          </span>
                          <span className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 text-slate-755 dark:text-slate-205 min-w-[140px]">
                            <div className="flex items-center justify-between gap-2.5">
                              <span className="flex items-center gap-1 select-none">👥 Visitantes:</span>
                              <div className="flex items-baseline gap-0.5 font-mono">
                                <strong className="text-slate-900 dark:text-white font-black">{sc.participants}</strong>
                                <span className="text-[9.5px] text-slate-400 font-medium">/{getUnitCapacityLimit(sc.unit, sc.date)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden shrink-0">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  sc.participants >= getUnitCapacityLimit(sc.unit, sc.date)
                                    ? "bg-rose-500"
                                    : sc.participants >= getUnitCapacityLimit(sc.unit, sc.date) * 0.8
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, (sc.participants / getUnitCapacityLimit(sc.unit, sc.date)) * 100)}%` }}
                              />
                            </div>
                          </span>
                          {sc.isSplitPart && (
                            <span className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-955 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-700 dark:text-amber-400 font-black tracking-wide text-[10.5px]">
                              ⚡ Leva Integrada (Tour Dividido PRN)
                            </span>
                          )}
                        </div>

                        {/* Schedule Notes */}
                        {sc.notes && (
                          <div className="p-2 bg-slate-50 dark:bg-slate-800 border-l-2 border-slate-205 dark:border-slate-700 rounded-r-md text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                            🗒️ {sc.notes}
                          </div>
                        )}

                        {/* System suggested warnings / conflicts alerts */}
                        {warnings.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {warnings.map((warn, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[9.5px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 p-1.5 px-2.5 rounded-lg border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                <p>{warn}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Conductor Leave/Absent Danger warning with Smart Auto-Escala actions */}
                        {(() => {
                          const guideStatus = conductorStatuses.find(c => c.name.trim().toLowerCase() === sc.guide.trim().toLowerCase());
                          if (guideStatus && guideStatus.status !== "active" && sc.status !== "completed" && sc.status !== "cancelled") {
                            return (
                              <div className="flex items-center gap-1.5 text-[9.5px] text-rose-600 dark:text-rose-450 font-extrabold bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 mt-2">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-550 shrink-0 animate-pulse" />
                                <p className="leading-tight">
                                  Cobertura em Risco: <strong>{sc.guide}</strong> está {guideStatus.status === "leave" ? "em folga planejada" : "ausente/falta"}!
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    runAutoEscalaForTour(sc);
                                  }}
                                  className="ml-auto px-2 py-0.8 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[8.5px] font-black uppercase transition duration-150 cursor-pointer shadow-3xs flex items-center gap-0.5"
                                  title="Procurar condutor substituto livre e sem choques de horário para assumir"
                                >
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Auto-Escala
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}

                      </div>

                      {/* Right Action Options */}
                      <div className="flex md:flex-col gap-1.5 shrink-0 self-end md:self-center">
                        {sc.status === "scheduled" && (
                          <button
                            onClick={() => onUpdateSchedule({ ...sc, status: "in_progress" })}
                            className="p-1 px-2.5 text-[9.5px] font-black border border-amber-350 dark:border-amber-850 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/20 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                            title="Iniciar Condução do Tour"
                          >
                            <Play className="w-3 h-3 text-amber-550 fill-amber-550 shrink-0" /> Iniciar
                          </button>
                        )}
                        {(sc.status === "scheduled" || sc.status === "in_progress") && (
                          <button
                            onClick={() => setCompletionTour(sc)}
                            className="p-1 px-2.5 text-[9.5px] font-bold border border-emerald-250 dark:border-emerald-850 bg-emerald-50/20 text-emerald-650 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                            title="Marcar como Concluído"
                          >
                            <Check className="w-3 h-3 text-emerald-555" /> Concluir
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(sc)}
                          className="p-1 px-2.5 text-[9.5px] font-bold border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          title="Editar Detalhes"
                        >
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                        <button
                          onClick={() => setSelectedTourForLogs(sc)}
                          className="p-1 px-2.5 text-[9.5px] font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          title="Histórico de Intervenções"
                        >
                          <History className="w-3 h-3 text-slate-500" /> Histórico
                        </button>
                        <button
                          onClick={() => setScheduleToDelete(sc)}
                          className="p-1 px-2.5 text-[9.5px] font-black border border-rose-250 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/25 text-rose-650 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          title="Excluir Agendamento (Apagar Atividade)"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500 shrink-0" /> Excluir Atividade
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
          </div>
          )}

          {rightColumnTab === "roster" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm p-5 space-y-5 animate-in fade-in duration-200 text-left">
              {/* Header inside the tab */}
              <div className="border-b border-slate-150 dark:border-slate-800 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100/30">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                      Rodízio de Escala & Prevenção {session.unidade !== "TODAS" && <span className="text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.2 rounded text-[9.5px] uppercase font-mono border border-indigo-100/30">📍 {session.unidade}</span>}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-1">
                      {session.unidade === "TODAS" 
                        ? "Gerenciamento simples de revezamento de condutores por polo operacional" 
                        : `Acesso exclusivo para gerenciamento de equipe da unidade ${session.unidade}`
                      }
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={autoResolveAllEscalaConflicts}
                  className="px-3.5 py-1.8 bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-600 border border-transparent dark:text-slate-950 text-white font-black text-[10px] rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide shrink-0 shadow-3xs"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Revezar / Auto-Escala
                </button>
              </div>

              {/* Conflict Status Callout */}
              {(() => {
                const affectedTours = upcomingToursWithAbsentGuides;
                if (affectedTours.length > 0) {
                  return (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-start gap-2 max-w-md">
                        <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[11px] text-rose-700 dark:text-rose-400 uppercase tracking-wider block font-black">
                            {affectedTours.length} Conflito(s) Detectado(s)!
                          </strong>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                            Tours foram programados para condutores que estão marcados como fora de rodízio.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={autoResolveAllEscalaConflicts}
                        className="sm:ml-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[9.5px] font-black uppercase rounded-lg transition cursor-pointer flex items-center gap-1 shadow-3xs"
                      >
                        ⚡ Revezar Automaticamente
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-555 shrink-0" />
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-400 font-bold leading-none">
                        Todos os tours ativos estão escalados sem conflito de equipe por unidade!
                      </span>
                    </div>
                  );
                }
              })()}

              {/* Grid with the 4 Active Units for Rotation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "PRN", label: "Parnamirim (PRN)", bg: "border-sky-100 dark:border-sky-950/50" },
                  { id: "SGA", label: "São Gonçalo (SGA)", bg: "border-indigo-150 dark:border-indigo-950/50" },
                  { id: "LAPA", label: "LAPA (Sede SP)", bg: "border-emerald-100 dark:border-emerald-950/50" },
                  { id: "Vila Prudente", label: "Vila Prudente", bg: "border-amber-100 dark:border-amber-950/50" }
                ].filter(u => session.unidade === "TODAS" || session.unidade.toLowerCase() === u.id.toLowerCase())
                 .map((unitInfo) => {
                  const unitConds = conductorStatuses.filter(
                    c => c.unit.toLowerCase() === unitInfo.id.toLowerCase()
                  );
                  return (
                    <div 
                      key={unitInfo.id}
                      className={`p-4 bg-slate-50/50 dark:bg-slate-950/30 border ${unitInfo.bg} rounded-2xl flex flex-col space-y-3.5`}
                    >
                      {/* Unit Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-205 uppercase tracking-wide">
                          📍 {unitInfo.label}
                        </span>
                        <span className="bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 px-2 py-0.5 rounded-md font-mono text-[9px] font-black">
                          {unitConds.filter(c => c.status === "active").length} Ativo(s)
                        </span>
                      </div>

                      {/* Conductor list for this unit */}
                      <div className="space-y-2 flex-1">
                        {unitConds.length === 0 ? (
                          <p className="text-[10.5px] text-slate-400 italic py-4 text-center">
                            Nenhum condutor cadastrado neste polo.
                          </p>
                        ) : (
                          unitConds.map((cond) => {
                            const scheduledToursCount = schedules.filter(s => 
                              s.guide.trim().toLowerCase() === cond.name.trim().toLowerCase() && 
                              s.status !== "cancelled"
                            ).length;

                            const isAbsent = cond.status !== "active";

                            return (
                              <div
                                key={cond.name}
                                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate block">
                                      {cond.name}
                                    </span>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-500 font-bold text-[8.5px] shrink-0">
                                      {scheduledToursCount} tours
                                    </span>
                                  </div>
                                  
                                  {/* Conflict warnings */}
                                  {isAbsent && scheduledToursCount > 0 && (
                                    <span className="text-[8.5px] font-bold text-rose-600 block leading-tight mt-0.5 animate-pulse uppercase font-mono">
                                      ⚠️ Alocado em Folga!
                                    </span>
                                  )}
                                </div>

                                {/* Status Toggle & Action controls */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextStatus = cond.status === "active" ? "leave" : "active";
                                      updateConductorField(cond.name, "status", nextStatus);
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors border cursor-pointer ${
                                      cond.status === "active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400"
                                        : "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400"
                                    }`}
                                    title={cond.status === "active" ? "Clique para colocar em folga" : "Clique para ativar no rodízio"}
                                  >
                                    {cond.status === "active" ? "🟢 Ativo" : "🟡 Folga"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConductorStatuses(prev => prev.filter(c => c.name !== cond.name));
                                      onDeleteLeader(cond.name);
                                    }}
                                    className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-rose-600 transition duration-155 cursor-pointer"
                                    title="Remover"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Simplistic quick conductor input inside this unit card */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = (e.currentTarget.elements.namedItem("newGuideName") as HTMLInputElement);
                          const nameVal = input ? input.value.trim() : "";
                          if (!nameVal) return;

                          if (conductorStatuses.some(c => c.name.toLowerCase() === nameVal.toLowerCase())) {
                            alert("Este condutor já está cadastrado.");
                            return;
                          }

                          const newC = {
                            name: nameVal,
                            unit: unitInfo.id,
                            status: "active" as const,
                            regime: "custom" as const,
                            workingDays: [0, 1, 2, 3, 4, 5, 6],
                            preferredShift: "full" as const
                          };

                          setConductorStatuses(prev => [...prev, newC]);
                          onAddLeader(nameVal);
                          if (input) input.value = "";
                        }}
                        className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60"
                      >
                        <input
                          type="text"
                          name="newGuideName"
                          placeholder="Adicionar condutor..."
                          required
                          className="flex-1 text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 dark:bg-slate-900 border-slate-205 dark:border-slate-800 rounded-lg focus:outline-hidden dark:text-white font-medium shadow-3xs"
                        />
                        <button
                          type="submit"
                          className="px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-3xs"
                          title="Adicionar Condutor"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>

              {/* Informative Roster Logs overview */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-dotted border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-550 dark:text-slate-400 leading-relaxed font-sans space-y-1">
                <span className="not-italic uppercase font-mono text-[9px] text-indigo-600 dark:text-indigo-400 font-black block leading-none">
                  💡 Como funciona o rodízio de escalas e verificação de conflitos:
                </span>
                <p>
                  Cada tour operacional deve possuir um condutor da mesma unidade. Quando você altera a disponibilidade de um condutor para <strong>Folga</strong>, o sistema detecta imediatamente e avisa se há conflitos com tours pendentes. Ao clicar em <strong>Revezar / Auto-Escala</strong>, o sistema faz o rodízio inteligente de horários distribuindo os tours de forma equilibrada para outros condutores disponíveis daquela respectiva unidade.
                </p>
              </div>
            </div>
          )}

          {rightColumnTab === "alertMonitor" && (
            <div className="space-y-4 animate-in fade-in duration-350 text-left">
              
              {/* Monitoring Header Card */}
              <div className="bg-gradient-to-r from-indigo-505/10 to-purple-550/10 border border-indigo-200/40 dark:border-indigo-805/40 p-4 rounded-2xl text-left space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-550 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                      Monitor de Configurações de Lembrete Real-Time
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                      Visualização em tempo real das notificações sonoras e visuais programadas para cada tour administrativo.
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-white/70 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/60">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-455 font-mono text-left block leading-none">Status Global de Avisos</span>
                    <strong className="block text-slate-800 dark:text-slate-200 mt-1 text-left">
                      {reminderEnabled ? "🟢 Habilitado" : "🔴 Desabilitado"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-455 font-mono text-left block leading-none">Regra Padronizada</span>
                    <strong className="block text-indigo-650 dark:text-indigo-400 mt-1 font-mono text-left">
                      {reminderMinutes}m antes • {reminderSoundType === "bell" ? "🔔 Sino" : reminderSoundType === "crystal" ? "💎 Cristal" : reminderSoundType === "beep" ? "📟 Bipe" : reminderSoundType === "wood" ? "🪵 Marimba" : "📟 Digital"} ({reminderVolume}%)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Central real-time list */}
              <div className="space-y-3">
                {/* Status Quick Filter Dropdown */}
                <div className="bg-slate-50 dark:bg-slate-950/45 p-3 rounded-2xl border border-slate-205 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-505 animate-pulse" />
                    <div>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block font-sans">Filtro Rápido de Monitoramento</span>
                      <span className="text-[9px] text-slate-400">Filtragem ágil de tours por status operacional</span>
                    </div>
                  </div>
                  <div>
                    <select
                      value={monitorStatusFilter}
                      onChange={(e) => setMonitorStatusFilter(e.target.value)}
                      className="text-xs p-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-705 dark:text-slate-300 font-extrabold focus:outline-hidden cursor-pointer"
                    >
                      <option value="TODOS">Todos os Status</option>
                      <option value="scheduled">Agendado (scheduled)</option>
                      <option value="in_progress">Em Andamento (in_progress)</option>
                      <option value="completed">Concluído (completed)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-slate-705 dark:text-slate-300 uppercase tracking-widest font-mono">
                    Compromissos de Alerta ({monitoredSchedulesToShow.length})
                  </span>
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-450 animate-pulse font-mono font-bold flex items-center gap-1">
                    ● Disparador Sonoro Prontificado
                  </span>
                </div>

                {monitoredSchedulesToShow.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center space-y-2.5">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-350 dark:text-slate-600 flex items-center justify-center">
                      <VolumeX className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-305">Nenhum compromisso com este status.</p>
                    <p className="text-[10.5px] text-slate-400 max-w-sm mx-auto">
                      {monitorStatusFilter === "TODOS"
                        ? "Crie um agendamento na aba \"Agenda & Atividades\" para que o sistema de disparo de áudio/notificação comece a rastrear em tempo real."
                        : `Não foram encontrados compromissos com o status "${monitorStatusFilter}" para monitorar no momento.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {monitoredSchedulesToShow.map((sc) => {
                      const minutesBefore = sc.reminderMinutesOverride !== undefined ? sc.reminderMinutesOverride : reminderMinutes;
                      const soundTypeOverride = sc.reminderSoundTypeOverride !== undefined ? sc.reminderSoundTypeOverride : reminderSoundType;
                      const soundEnabledOverride = sc.reminderSoundEnabledOverride !== undefined ? sc.reminderSoundEnabledOverride : reminderSoundEnabled;
                      const visualEnabledOverride = sc.reminderVisualEnabledOverride !== undefined ? sc.reminderVisualEnabledOverride : true;
                      const hasOverride = sc.reminderMinutesOverride !== undefined || sc.reminderSoundTypeOverride !== undefined || sc.reminderSoundEnabledOverride !== undefined || sc.reminderVisualEnabledOverride !== undefined;

                      return (
                        <div 
                          key={sc.id}
                          className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl shadow-3xs flex flex-col gap-3 relative overflow-hidden transition duration-205 text-left ${
                            expandedTourMonitorId === sc.id
                              ? "border-indigo-500 ring-1 ring-indigo-550/10 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 hover:border-indigo-550/45 dark:hover:border-indigo-400/45"
                          }`}
                        >
                          {/* Indicator stripe */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${hasOverride ? "bg-amber-400" : "bg-indigo-505"}`} />
                          
                          {/* Inner interactive click wrap to expand */}
                          <div 
                            onClick={() => setExpandedTourMonitorId(expandedTourMonitorId === sc.id ? null : sc.id)}
                            className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                          >
                            <div className="space-y-2.5 pl-1.5 grow max-w-full">
                              {/* Title & Info */}
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 px-2 py-0.5 rounded font-black font-mono leading-none">
                                    {sc.time}
                                  </span>
                                  <span className="text-[9.5px] font-mono text-slate-400 font-bold">
                                    {sc.date}
                                  </span>
                                  <span className="text-[9.5px] bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase font-bold font-mono">
                                    📍 {sc.unit}
                                  </span>
                                  {hasOverride && (
                                    <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-450 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                                      ⚙️ Customizado
                                    </span>
                                  )}
                                  <span className="text-[9px] font-black uppercase text-indigo-550 dark:text-indigo-400 font-mono tracking-widest ml-auto md:ml-2">
                                    {expandedTourMonitorId === sc.id ? "▲ recolher" : "▼ expandir detalhes"}
                                  </span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 dark:text-white leading-tight group-hover:text-indigo-605">
                                  {sc.title}
                                </h5>
                                <p className="text-[10.5px] text-slate-455 dark:text-slate-400 mt-0.5 font-bold">
                                  Líder: <strong className="text-slate-700 dark:text-slate-250 font-black">{sc.guide}</strong> • Processo: <strong className="text-slate-600 dark:text-slate-350 font-normal">{sc.product}</strong>
                                </p>
                              </div>

                              {/* Alert Channel Configuration Visual Trackers */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono">
                                
                                {/* Timing Setting */}
                                <div className="p-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-150 dark:border-slate-850">
                                  <span className="text-[8.5px] font-bold text-slate-455 block leading-none mb-1">⏰ Disparo</span>
                                  <strong className="text-slate-705 dark:text-slate-300">{minutesBefore}m antes</strong>
                                </div>

                                {/* Visual Setting */}
                                <div className="p-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-150 dark:border-slate-850">
                                  <span className="text-[8.5px] font-bold text-slate-455 block leading-none mb-1">🖥️ Canais Visuais</span>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    {visualEnabledOverride ? (
                                      <>
                                        {reminderVisualToastEnabled && <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-505/10 px-1.5 py-0.5 rounded uppercase">Toast</span>}
                                        {reminderVisualModalEnabled && <span className="text-[8px] text-amber-500 font-extrabold bg-amber-505/10 px-1.5 py-0.5 rounded uppercase">Modal</span>}
                                        {reminderVisualPushEnabled && <span className="text-[8px] text-emerald-500 font-extrabold bg-emerald-505/10 px-1.5 py-0.5 rounded uppercase">Push</span>}
                                        {!reminderVisualToastEnabled && !reminderVisualModalEnabled && !reminderVisualPushEnabled && <span className="text-[8.5px] text-slate-400 italic">Desligado</span>}
                                      </>
                                    ) : (
                                      <span className="text-[8.5px] text-rose-500 font-black uppercase">
                                        ✕ Inativo
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Sound Setting */}
                                <div className="p-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-150 dark:border-slate-850 col-span-2 md:col-span-1">
                                  <span className="text-[8.5px] font-bold text-slate-455 block leading-none mb-1">🎵 Canal Sonoro</span>
                                  <div className="flex items-center gap-1 text-slate-705 dark:text-slate-300 font-sans">
                                    {soundEnabledOverride ? (
                                      <>
                                        <Volume2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span className="truncate font-black text-[10.5px] text-slate-800 dark:text-slate-205">
                                          {soundTypeOverride === "bell" ? "Sino 🔔" : soundTypeOverride === "crystal" ? "Cristal 💎" : soundTypeOverride === "beep" ? "Bipe 📟" : soundTypeOverride === "wood" ? "Marimba 🪵" : "Digital 📟"}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <VolumeX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        <span className="text-rose-505 font-mono font-black text-[9px] uppercase">Apagado</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </div>

                            {/* Quick Edit settings & History buttons container */}
                            <div className="flex flex-row md:flex-col items-center gap-1.5 shrink-0 self-start md:self-center">
                              {sc.status === "scheduled" && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateSchedule({ ...sc, status: "in_progress" });
                                  }}
                                  className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/25 dark:hover:bg-emerald-900/40 rounded-xl border border-emerald-250 dark:border-emerald-800/80 transition shadow-4xs cursor-pointer select-none w-20 md:w-24 text-center group/ci text-emerald-800 dark:text-emerald-400"
                                  title="Registrar a Chegada (Check-in) dos Visitantes"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500 group-hover/ci:scale-110 transition duration-300 mx-auto" />
                                  <span className="text-[7.5px] font-black uppercase font-mono tracking-tight text-center mt-1 block leading-none">
                                    Check-in
                                  </span>
                                </div>
                              )}

                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(sc);
                                }}
                                className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800 transition shadow-4xs cursor-pointer select-none w-20 md:w-24 text-center"
                                title="Ajustar Alertas de Disparo"
                              >
                                <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-550 group-hover:rotate-45 transition duration-300 mx-auto" />
                                <span className="text-[7.5px] font-black uppercase text-indigo-555 dark:text-indigo-400 font-mono tracking-tight text-center mt-1 block leading-none">
                                  Ajustar Alertas
                                </span>
                              </div>

                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTourForLogs(sc);
                                }}
                                className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800 transition shadow-4xs cursor-pointer select-none w-20 md:w-24 text-center"
                                title="Ver Histórico de Intervenções do Gestor"
                              >
                                <History className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-550 transition duration-300 mx-auto" />
                                <span className="text-[7.5px] font-black uppercase text-slate-700 dark:text-slate-300 font-mono tracking-tight text-center mt-1 block leading-none">
                                  Histórico Logs
                                </span>
                              </div>

                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (quickNoteTourId === sc.id) {
                                    setQuickNoteTourId(null);
                                  } else {
                                    setQuickNoteTourId(sc.id);
                                    setQuickNoteValue(sc.notes || "");
                                  }
                                }}
                                className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800 transition shadow-4xs cursor-pointer select-none w-20 md:w-24 text-center group/qa"
                                title="Anotação Rápida para o Condutor"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400 group-hover/qa:text-indigo-550 transition duration-300 mx-auto" />
                                <span className="text-[7.5px] font-black uppercase text-slate-705 dark:text-slate-300 font-mono tracking-tight text-center mt-1 block leading-none">
                                  Anotação Rápida
                                </span>
                              </div>

                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportTourSummary(sc);
                                }}
                                className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800 transition shadow-4xs cursor-pointer select-none w-20 md:w-24 text-center group/exp"
                                title="Exportar Resumo Operacional do Tour"
                              >
                                <FileDown className="w-3.5 h-3.5 text-slate-400 group-hover/exp:text-indigo-550 transition duration-300 mx-auto" />
                                <span className="text-[7.5px] font-black uppercase text-slate-705 dark:text-slate-300 font-mono tracking-tight text-center mt-1 block leading-none">
                                  Exportar Resumo
                                </span>
                              </div>

                              {/* Direct action trash/delete button */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleToDelete(sc);
                                }}
                                className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/45 rounded-xl border border-rose-200 dark:border-rose-900 transition shadow-4xs cursor-pointer select-none w-20 md:w-24 text-center group/del"
                                title="Excluir Atividade Permanentemente (Lixeira)"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover/del:scale-110 transition duration-300 mx-auto" />
                                <span className="text-[7.5px] font-black uppercase text-rose-650 dark:text-rose-400 font-mono tracking-tight text-center mt-1 block leading-none">
                                  Excluir Ativ.
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Note Input Box */}
                          {quickNoteTourId === sc.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              className="mt-1 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-indigo-100 dark:border-indigo-950/40 text-left space-y-2 animate-in slide-in-from-top-2 duration-150"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-indigo-505" /> Anotação Rápida do Condutor
                                </span>
                                <span className="text-[8px] text-slate-400">Gravado no agendamento</span>
                              </div>
                              <textarea
                                value={quickNoteValue}
                                onChange={(e) => setQuickNoteValue(e.target.value)}
                                placeholder="Insira informações, observações importantes ou dados de campo rápidos sobre o andamento..."
                                className="w-full text-[11px] p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 focus:ring-1 focus:ring-indigo-505 outline-hidden text-slate-800 dark:text-white font-medium resize-none h-16 shadow-3xs text-left"
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickNoteTourId(null);
                                    setQuickNoteValue("");
                                  }}
                                  className="px-2.5 py-1 text-[9px] font-bold text-slate-505 bg-slate-150 dark:bg-slate-800 dark:text-slate-350 rounded cursor-pointer hover:bg-slate-205"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveQuickNote(sc)}
                                  className="px-3 py-1 text-[9px] font-black uppercase text-white bg-indigo-650 hover:bg-indigo-700 rounded-lg shadow-3xs cursor-pointer transition hover:scale-98 active:scale-95"
                                >
                                  Gravar Nota
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Expandable Details Pane */}
                          {expandedTourMonitorId === sc.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: "easeInOut" }}
                              className="border-t border-dashed border-slate-150 dark:border-slate-800 pt-3.5 mt-2.5 space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-indigo-50/20 text-left"
                            >
                              {/* Notes */}
                              <div>
                                <h6 className="text-[10px] font-black uppercase tracking-wider text-indigo-950 dark:text-slate-300 mb-1 flex items-center gap-1">
                                  🗒️ Notas do Agendamento
                                </h6>
                                <p className="text-slate-650 dark:text-slate-350 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-lg text-[10.5px] leading-relaxed font-medium">
                                  {sc.notes ? sc.notes : "Nenhuma nota operacional inserida para este tour."}
                                </p>
                              </div>

                              {/* Conductor Instructions */}
                              <div>
                                <h6 className="text-[10px] font-black uppercase tracking-wider text-indigo-950 dark:text-slate-300 mb-1 flex items-center gap-1">
                                  📋 Recomendações & Instruções para o Condutor
                                </h6>
                                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-lg space-y-2 text-[10.5px] leading-relaxed text-slate-650 dark:text-slate-350 font-medium">
                                  {(() => {
                                    const prodLower = (sc.product || "").toLowerCase();
                                    let instructions = [
                                      `Verificar se a quantidade total de visitantes (${sc.participants}) está adequada para a lotação no polo ${sc.unit}.`,
                                      "Cumprimentar o grupo com entusiasmo e realizar o alinhamento de conduta básica de campo.",
                                      "Lembrar de colher feedbacks e orientar todos a responder o formulário ao final da visita."
                                    ];
                                    if (prodLower.includes("pedagógico") || prodLower.includes("pedagogico")) {
                                      instructions = [
                                        "Focar na linguagem extremamente acessível e dinâmica para estudantes e jovens do ensino básico/superior.",
                                        "Apresentar experimentos práticos integrando teoria acadêmica e vivência no campo de coleta.",
                                        "Concluir gerando uma reflexão coletiva e solicitar a resposta do formulário de satisfação de apoio."
                                      ];
                                    } else if (prodLower.includes("histórico") || prodLower.includes("historico")) {
                                      instructions = [
                                        "Visitar a galeria de fundadores e enfatizar os marcos de evolução e conquistas históricas do polo.",
                                        "Fazer paradas direcionadas para fotos históricas no corredor principal do acervo.",
                                        "Manter fidelidade rigorosa aos dados oficiais para manter o tom de acervo documental qualificado."
                                      ];
                                    } else if (prodLower.includes("corporativo")) {
                                      instructions = [
                                        "Adotar postura executiva e vocabulário focado em eficiência de processos e governança corporativa.",
                                        "Abordar metas ambientais, sustentabilidade (ESG) e os números gerais de impacto do polo de inovação.",
                                        "Reservar os últimos 10 minutos para perguntas livres, networking interativo e captação qualificada."
                                      ];
                                    } else if (prodLower.includes("tecnológico") || prodLower.includes("tecnologico")) {
                                      instructions = [
                                        "Demonstrar detalhadamente os painéis de automatização real-time e conectividade local.",
                                        "Estimular interação direta com os displays digitais e instruir sobre a segurança no manejo.",
                                        "Orientar o preenchimento digital das avaliações pós-tour diretamente no tablet de monitoramento."
                                      ];
                                    }
                                    return (
                                      <ul className="list-disc list-inside space-y-1 pl-1">
                                        {instructions.map((ins, index) => (
                                          <li key={index} className="text-[10.5px] leading-relaxed">
                                            {ins}
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Conductor History stats info */}
                              <div>
                                <h6 className="text-[10px] font-black uppercase tracking-wider text-indigo-955 dark:text-slate-300 mb-1 flex items-center justify-between">
                                  <span>📊 Histórico Geral de {sc.guide}</span>
                                  <span className="font-mono text-[9px] text-indigo-600 dark:text-indigo-400 capitalize bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100/30">Dados Consolidados</span>
                                </h6>
                                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-lg space-y-2 font-medium">
                                  {(() => {
                                    const relatedSubmissions = (submissions || []).filter(
                                      (s) => (s.liderEducador || "").trim().toLowerCase() === (sc.guide || "").trim().toLowerCase()
                                    );
                                    
                                    const totalEvaluations = relatedSubmissions.length;
                                    
                                    if (totalEvaluations === 0) {
                                      return (
                                        <p className="text-[10px] italic text-slate-400 text-center py-1 bg-slate-50/50 dark:bg-slate-950/30 rounded leading-snug">
                                          Nenhuma avaliação de satisfação resgatada para este condutor no banco de dados ainda.
                                        </p>
                                      );
                                    }

                                    const avgClareza = relatedSubmissions.reduce((acc, curr) => acc + (curr.notaClareza || 0), 0) / totalEvaluations;
                                    const avgAcolhimento = relatedSubmissions.reduce((acc, curr) => acc + (curr.notaAcolhimento || 0), 0) / totalEvaluations;
                                    const avgAssistente = relatedSubmissions.reduce((acc, curr) => acc + (curr.notaAssistente || 0), 0) / totalEvaluations;
                                    const scoreGeral = (avgClareza + avgAcolhimento + avgAssistente) / 3;

                                    return (
                                      <div className="space-y-1.5 text-[10.5px]">
                                        <div className="flex items-center justify-between text-[11px] font-bold pb-1 text-slate-650 dark:text-slate-350">
                                          <span>Fichas Avaliadas: <strong className="text-slate-850 dark:text-slate-200">{totalEvaluations}</strong></span>
                                          <span className="flex items-center gap-0.5 font-mono text-indigo-650 dark:text-indigo-400">
                                            Média: <strong className="font-black text-xs">{scoreGeral.toFixed(1)}/10</strong>
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                          <div className="bg-slate-50/60 dark:bg-slate-955 p-1 rounded-md border border-slate-150 dark:border-slate-850">
                                            <span className="text-[8.5px] text-slate-400 block font-mono">Clareza</span>
                                            <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{avgClareza.toFixed(1)}</strong>
                                          </div>
                                          <div className="bg-slate-50/60 dark:bg-slate-955 p-1 rounded-md border border-slate-150 dark:border-slate-850">
                                            <span className="text-[8.5px] text-slate-400 block font-mono">Recepção</span>
                                            <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{avgAcolhimento.toFixed(1)}</strong>
                                          </div>
                                          <div className="bg-slate-50/60 dark:bg-slate-955 p-1 rounded-md border border-slate-150 dark:border-slate-850">
                                            <span className="text-[8.5px] text-slate-400 block font-mono">Conduta</span>
                                            <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{avgAssistente.toFixed(1)}</strong>
                                          </div>
                                        </div>
                                        
                                        {/* Recent suggest comment */}
                                        {relatedSubmissions.some(s => s.melhorias && s.melhorias.trim()) && (
                                          <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[9.5px] text-slate-505">
                                            <span className="font-black text-slate-400 block pb-0.5">Última Sugestão do Público:</span>
                                            <p className="italic font-medium leading-relaxed">
                                              "{relatedSubmissions.find(s => s.melhorias && s.melhorias.trim())?.melhorias}"
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-100 dark:bg-slate-950/65 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 text-left">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
                  💡 <strong>Diretriz de Ajuste:</strong> Clique em qualquer cartão acima para configurar ou customizar o disparo visual e o som de áudio específico para o tour selecionado individualmente. O painel sincronizará as mudanças em tempo de execução.
                </p>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MURAL DE RECADOS E AVISOS DOS COLABORADORES PARA O GESTOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        
        {/* Board Header info panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                💬 Mural Ativo
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-indigo-400 uppercase tracking-wide">
                Mural de Avisos das Equipes para o Gestor
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Canal de comunicação direta das unidades. Avise o gestor sobre fones auxiliares danificados, intercorrências de logística, dúvidas ou solicitações emergenciais.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono font-bold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-lg border border-slate-150 dark:border-slate-700 flex items-center gap-1.5 uppercase">
              <Bell className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
              {filteredMessages.filter(m => !m.isRead).length} pendentes
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Form write block */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800/60 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-amber-400 uppercase tracking-wider">
              <Send className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              Publicar Novo Recado / Alerta
            </div>

            {msgFeedback && (
              <div className={`p-2.5 rounded-lg text-xs font-semibold border leading-snug animate-fade-in ${
                msgFeedback.startsWith("Erro") 
                  ? "bg-rose-50 border-rose-200 text-rose-700" 
                  : "bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
              }`}>
                {msgFeedback}
              </div>
            )}

            <form onSubmit={handlePostMessage} className="space-y-3.5">
              
              {/* Autofilled metadata summary card */}
              <div className="grid grid-cols-2 gap-3 text-[10px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                <div>
                  <span className="block text-slate-400 font-mono font-bold uppercase tracking-wide">Remetente:</span>
                  <strong className="text-slate-750 dark:text-slate-200 font-black">{session.nome}</strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-mono font-bold uppercase tracking-wide">Origem:</span>
                  <strong className="text-indigo-650 dark:text-indigo-400 font-black uppercase">{session.unidade === "TODAS" ? "Gestão Geral" : session.unidade}</strong>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-350 text-[10px] font-bold uppercase tracking-wider">
                  Assunto Principal
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 fones com ruído persistente"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 font-semibold"
                />
              </div>

              {/* Content text */}
              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-350 text-[10px] font-bold uppercase tracking-wider">
                  Detalhamento
                </label>
                <textarea
                  placeholder="Explique o caso para o gestor. Ex: O auditório secundário está muito quente, fones auxiliares estão estragados, etc."
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 font-sans"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-600 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Enviar Aviso ao Gestor
              </button>

            </form>
          </div>

          {/* Messages Bullet list */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-350 uppercase tracking-wider font-mono border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <span>Recados enviados no Mural</span>
              <span className="text-[10px] font-normal text-slate-400 uppercase">
                {session.unidade === "TODAS" ? "📍 TODAS AS UNIDADES" : `📍 FILTROS DE ${session.unidade}`}
              </span>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="border border-dashed border-slate-205 dark:border-slate-800 rounded-xl p-8 py-10 bg-slate-50/50 dark:bg-slate-900/40 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-850 rounded-full flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-5 h-5 text-slate-450" />
                </div>
                <h5 className="text-xs font-bold text-slate-600 dark:text-slate-400">O mural está vazio</h5>
                <p className="text-[10px] text-slate-400 max-w-sm font-sans leading-relaxed">
                  {session.unidade === "TODAS" 
                    ? "Nenhum recado de colaborador recebido recentemente nesta área." 
                    : "Sua unidade ainda não postou nenhuma ocorrência. Digite no formulário ao lado para reportar à gerência!"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {filteredMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-3.5 rounded-xl border transition-all ${
                        !msg.isRead 
                          ? "bg-indigo-50/15 dark:bg-sky-950/10 border-indigo-200 dark:border-sky-900/60 shadow-3xs" 
                          : "bg-slate-50/35 dark:bg-slate-850/50 border-slate-200/80 dark:border-slate-800/80 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 grow">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="text-[8.5px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-400 px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                              {msg.senderUnit}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {msg.senderName}
                            </span>
                            <span className="text-slate-400 font-mono text-[9px]">
                              • {msg.date} {msg.time}
                            </span>
                          </div>

                          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 leading-snug flex items-center gap-1.5">
                            {!msg.isRead && (
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                            )}
                            {msg.subject}
                          </h4>

                          <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-sans whitespace-pre-line">
                            {msg.content}
                          </p>
                        </div>

                        {/* Interactive Status elements & delete/mark actions */}
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-3">
                          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                            msg.isRead 
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400" 
                              : "bg-amber-100 dark:bg-amber-955 text-amber-700 dark:text-amber-400 font-mono"
                          }`}>
                            {msg.isRead ? "✓ Lido/Ok" : "✉ Novo"}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {session.unidade === "TODAS" && (
                              <button
                                onClick={() => onToggleReadCollaboratorMessage(msg.id)}
                                className={`p-1 px-1.5 rounded-md border text-[9.5px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
                                  msg.isRead 
                                    ? "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-200" 
                                    : "bg-indigo-600 hover:bg-indigo-700 border-transparent text-white shadow-3xs"
                                }`}
                                title={msg.isRead ? "Marcar como pendente" : "Confirmar leitura / Marcar resolvido"}
                              >
                                {msg.isRead ? (
                                  <>
                                    <Mail className="w-3 h-3" /> Pendente
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" /> Resolver
                                  </>
                                )}
                              </button>
                            )}

                            {/* Deleting warning message: Creator or Manager can delete it */}
                            {(session.unidade === "TODAS" || session.nome === msg.senderName) && (
                              <button
                                onClick={() => onDeleteCollaboratorMessage(msg.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-md transition cursor-pointer border border-transparent hover:border-rose-100"
                                title="Remover este recado"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* SEÇÃO: COOPERATIVO ENVIAR ATIVIDADES DIÁRIAS (DAILY REPORTS) */}
      <div id="secao-relatorio-atividades" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        
        {/* Header of Activities Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-450 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                📋 Atividades Diárias
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase tracking-wide">
                Reporte de Atividades Diárias dos Colaboradores
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Registre as ações, acompanhamentos de público, verificação de equipamentos e entregas realizadas durante o seu expediente. O gestor central visualizará em tempo real sobre quem concluiu suas tarefas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono font-bold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-lg border border-slate-150 dark:border-slate-700 flex items-center gap-1.5 uppercase">
              <Check className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
              {dailyReports.filter(r => r.date === new Date().toISOString().split("T")[0]).length} de Hoje
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Form to Create/Add Daily Activity Report */}
          <div className="lg:col-span-12 xl:col-span-5 bg-slate-50/70 dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-850 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider text-left">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Preencher Reporte de Hoje
            </div>

            {dailyReportFeedback && (
              <div className={`p-2.5 rounded-lg text-xs font-semibold border leading-snug animate-fade-in text-left ${
                dailyReportFeedback.startsWith("Erro") 
                  ? "bg-rose-50 border-rose-200 text-rose-700" 
                  : "bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-955/20 dark:border-emerald-900/40 dark:text-emerald-450"
              }`}>
                {dailyReportFeedback}
              </div>
            )}

            <form onSubmit={handlePostDailyReport} className="space-y-3.5 text-left">
              
              {/* Report Metadata */}
              <div className="grid grid-cols-2 gap-3 text-[10px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                <div>
                  <span className="block text-slate-400 font-mono font-bold uppercase tracking-wide">Colaborador:</span>
                  <strong className="text-slate-750 dark:text-slate-200 font-black">{session.nome}</strong>
                </div>
                <div>
                  <span className="block text-slate-400 font-mono font-bold uppercase tracking-wide">Posto Unidade:</span>
                  <strong className="text-indigo-650 dark:text-indigo-400 font-black uppercase">{session.unidade}</strong>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-350 text-[10px] font-bold uppercase tracking-wider">
                  Data do Expediente
                </label>
                <input
                  type="date"
                  value={dailyReportDate}
                  onChange={(e) => setDailyReportDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 font-semibold"
                />
              </div>

              {/* Activities Description */}
              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-350 text-[10px] font-bold uppercase tracking-wider">
                  Atividades Realizadas (Descrição Detalhada)
                </label>
                <textarea
                  placeholder="Relate aqui as principais ações do seu turno... Exemplos: Recepção de grupos escolares concluída; Alinhamento das placas de sinalização; Suporte a 2 grupos escolares. Todos os equipamentos conferidos."
                  value={dailyReportActivities}
                  onChange={(e) => setDailyReportActivities(e.target.value)}
                  rows={4}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 font-medium leading-relaxed font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" /> Enviar Relatório Diário
              </button>

            </form>
          </div>

          {/* List of Submitted Reports */}
          <div className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
              <span className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <FileText className="w-4 h-4 text-emerald-500" />
                Histórico de Relatórios Enviados ({dailyReports.filter(r => r.unit === session.unidade || r.collaboratorName === session.nome).length})
              </span>
            </div>

            {dailyReports.filter(r => r.unit === session.unidade || r.collaboratorName === session.nome).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-12 text-center italic max-w-xs mx-auto">
                Nenhum relatório diário enviado pela sua unidade ainda. Preencha o formulário ao lado para reportar as atividades do dia do seu expediente.
              </p>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {dailyReports
                  .filter(r => r.unit === session.unidade || r.collaboratorName === session.nome)
                  .map((report) => (
                    <div 
                      key={report.id}
                      className="p-3 bg-slate-50/70 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex items-start justify-between gap-4 transition hover:bg-slate-100/50"
                    >
                      <div className="space-y-1.5 text-left grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="p-0.5 px-1.5 bg-emerald-100 dark:bg-emerald-955 text-emerald-850 dark:text-emerald-400 font-mono text-[8px] font-black uppercase tracking-widest rounded-sm">
                            {report.unit}
                          </span>
                          <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                            {report.collaboratorName}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono ml-auto">
                            📅 {report.date.split("-").reverse().join("/")} às {report.timestamp}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans whitespace-pre-line leading-relaxed">
                          {report.activities}
                        </p>
                      </div>

                      {/* Deleting reporting option, fulfilling "botão de exclusão para cada funcionalidade" */}
                      {(session.unidade === "TODAS" || session.nome === report.collaboratorName) && (
                        <button
                          onClick={() => onDeleteDailyReport(report.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/25 border border-transparent hover:border-rose-100 dark:hover:border-rose-900 rounded-lg transition shrink-0 cursor-pointer"
                          title="Excluir este relatório"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* BOOKING DIALOG FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500 shrink-0"></div>
              
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {editingSchedule ? "Editar Agendamento de Tour" : "Novo Agendamento Administrativo"}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    Unidade Reguladora: <strong>{activeUnit}</strong> • Autor: {session.nome}
                  </p>
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2 shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col overflow-hidden min-h-0">
                
                {/* Beautiful custom-scrollbar container that allows full-range vertical scrolling on any device height */}
                <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 custom-scroll-container min-h-0 py-1">
                  
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider">
                      Título / Identificação do Tour
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-semibold"
                      placeholder="Ex: Visita Técnica Instituto Mauá..."
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Date */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider">
                        Data do Tour
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-100 focus:outline-none font-semibold font-mono"
                      />
                    </div>

                    {/* Time */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider">
                        Horário do Tour
                      </label>
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-100 focus:outline-none font-semibold font-mono"
                      />
                      
                      {/* Quick hour selector badges */}
                      <div className="space-y-1 pt-1 text-left">
                        <span className="block text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Escolha Rápida de Horários:</span>
                        <div className="flex flex-wrap gap-1">
                          {["08:30", "09:30", "10:30", "13:30", "14:30", "15:35", "19:00"].map((quickT) => (
                            <button
                              key={quickT}
                              type="button"
                              onClick={() => setFormTime(quickT)}
                              className={`px-2 py-0.5 text-[9.5px] font-bold rounded-md font-mono transition border cursor-pointer ${
                                formTime === quickT
                                  ? "bg-amber-500 border-amber-500 text-slate-950 shadow-xs"
                                  : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {quickT}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Conflict Alert Badge directly under the Date & Time Grid */}
                  {formDate && formTime && realTimeConflictsCount > 0 && (
                    <div className="p-2.5 bg-rose-550/10 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 rounded-xl text-left flex items-center justify-between animate-fade-in">
                      <div className="flex items-center gap-2 text-rose-750 dark:text-rose-300 text-[10.5px] font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Atenção: Já existem outros tours agendados para este mesmo horário!</span>
                      </div>
                      <span className="bg-rose-600 dark:bg-rose-500 text-white dark:text-slate-950 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg shrink-0">
                        {realTimeConflictsCount} CONFLITO{realTimeConflictsCount > 1 ? "S" : ""}
                      </span>
                    </div>
                  )}

                  {session.unidade === "TODAS" && (
                    <div className="space-y-1 bg-indigo-50/20 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wide">
                        Unidade do Atendimento (Vínculo)
                      </label>
                      <select
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-indigo-150 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-bold cursor-pointer"
                      >
                        <option value="LAPA">📍 LAPA (Sede SP)</option>
                        <option value="PRN">📍 PRN (Parnamirim)</option>
                        <option value="Vila Prudente">📍 Vila Prudente</option>
                        <option value="SGA">📍 SGA (São Gonçalo)</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Guide */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider">
                          Líder / Responsável pelo Tour
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomGuide(!useCustomGuide);
                            if (!useCustomGuide) {
                              setCustomGuideName("");
                            } else {
                              setFormGuide(filteredLeadersForForm[0] || leaders[0] || "");
                            }
                          }}
                          className="text-[9.5px] text-amber-600 dark:text-amber-400 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          {useCustomGuide ? "📋 Selecionar da Lista" : "✍️ Nome Personalizado"}
                        </button>
                      </div>
                      {useCustomGuide ? (
                        <input
                          type="text"
                          value={customGuideName}
                          onChange={(e) => setCustomGuideName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-semibold"
                          placeholder="Digite o nome de quem ficará responsável..."
                        />
                      ) : (
                        <select
                          value={formGuide}
                          onChange={(e) => setFormGuide(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-semibold cursor-pointer"
                        >
                          {filteredLeadersForForm.length > 0 ? (
                            filteredLeadersForForm.map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))
                          ) : (
                            <option value="">⚠️ Cadastre um condutor para esta unidade</option>
                          )}
                        </select>
                      )}

                      {realTimeConflict && (
                        <div className="mt-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-[10.5px] text-amber-855 dark:text-amber-400 font-medium rounded-lg flex items-start gap-2 shadow-2xs animate-pulse">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-left leading-normal">
                            <span className="font-extrabold block text-[11px] text-amber-900 dark:text-amber-300">Conflito de Escala Real!</span>
                            O guia/líder <strong>{realTimeConflict.guide}</strong> já possui um compromisso agendado para o tour <strong className="underline">"{realTimeConflict.title}"</strong> nesta data ({realTimeConflict.date.split("-").reverse().join("/")}) às {realTimeConflict.time} na unidade {realTimeConflict.unit}.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Participants number */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider">
                        Participantes Previstos
                      </label>
                      <input
                        type="number"
                        value={formParticipants}
                        onChange={(e) => setFormParticipants(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-slate-100 focus:outline-none font-semibold font-mono"
                        min="1"
                      />

                      {formParticipants > 25 && (
                        <div className="mt-1.5 p-2.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900/50 text-[10px] text-indigo-800 dark:text-indigo-350 font-medium rounded-lg flex items-start gap-1.5 leading-snug shadow-3xs">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
                          <div>
                            <strong className="font-black text-[10.5px] block text-indigo-900 dark:text-indigo-300">Divisão Automática Ativa ⚡</strong>
                            {(activeUnit === "PRN" || formUnit === "PRN" || session?.unidade === "PRN") ? (
                              <span>Como o quantitativo excede 25 participantes no <strong>PRN</strong>, o sistema dividirá automaticamente o tour em duas levas conduzidas pelo mesmo guia, sincronizando o formulário de satisfação para que ambas as partes sejam contabilizadas de forma agregada como um único tour realizado.</span>
                            ) : (
                              <span>Como o quantitativo excede 25 participantes, o sistema irá criar e delegar um segundo tour de apoio para o outro condutor disponível na mesma unidade para garantir a segurança e excelência.</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Product / Operations */}
                    <div className="space-y-1">
                      <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider">
                        Produto / Operação correspondente
                      </label>
                      <select
                        value={formProduct}
                        onChange={(e) => setFormProduct(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-semibold cursor-pointer"
                      >
                        {products.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status edit (Only displayed on Edit Schedule to change completions) */}
                    {editingSchedule && (
                      <div className="space-y-1">
                        <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider">
                          Status do Compromisso
                        </label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-semibold cursor-pointer font-mono text-indigo-700"
                        >
                          <option value="scheduled">🟢 AGENDADO</option>
                          <option value="completed">🔵 CONCLUÍDO</option>
                          <option value="cancelled">🔴 CANCELADO</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Custom Tour Alerts Config section */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-205 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10.5px] font-black text-slate-900 dark:text-amber-400 uppercase tracking-wider font-sans">
                        ⏰ Alertas Individuais para este Tour
                      </span>
                      <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={formReminderMinutesOverride !== undefined}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormReminderMinutesOverride(10);
                              setFormReminderSoundTypeOverride("bell");
                              setFormReminderSoundEnabledOverride(true);
                              setFormReminderVisualEnabledOverride(true);
                            } else {
                              setFormReminderMinutesOverride(undefined);
                              setFormReminderSoundTypeOverride(undefined);
                              setFormReminderSoundEnabledOverride(undefined);
                              setFormReminderVisualEnabledOverride(undefined);
                            }
                          }}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                        Personalizar Alertas
                      </label>
                    </div>
                    
                    {formReminderMinutesOverride !== undefined ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in pt-1.5 border-t border-slate-150 dark:border-slate-800">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                            Antecedência (Minutos)
                          </label>
                          <select
                            value={formReminderMinutesOverride}
                            onChange={(e) => setFormReminderMinutesOverride(Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white cursor-pointer"
                          >
                            <option value="2">2 minutos antes</option>
                            <option value="5">5 minutos antes</option>
                            <option value="10">10 minutos antes</option>
                            <option value="15">15 minutos antes</option>
                            <option value="20">20 minutos antes</option>
                            <option value="30">30 minutos antes</option>
                            <option value="60">1 hora antes</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                            Som do Alarme
                          </label>
                          <select
                            value={formReminderSoundTypeOverride}
                            onChange={(e) => setFormReminderSoundTypeOverride(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white cursor-pointer"
                          >
                            <option value="bell">🔔 Chime de Sino</option>
                            <option value="crystal">💎 Cristal Resonante</option>
                            <option value="beep">⚡ Bipe Suave</option>
                            <option value="wood">🪵 Marimba de Madeira</option>
                            <option value="digital">📟 Pulso Digital</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="formReminderSoundEnabledOverride"
                            checked={formReminderSoundEnabledOverride}
                            onChange={(e) => setFormReminderSoundEnabledOverride(e.target.checked)}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                          <label htmlFor="formReminderSoundEnabledOverride" className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            Ativar Alerta Sonoro
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="formReminderVisualEnabledOverride"
                            checked={formReminderVisualEnabledOverride}
                            onChange={(e) => setFormReminderVisualEnabledOverride(e.target.checked)}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                          <label htmlFor="formReminderVisualEnabledOverride" className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            Ativar Alerta Visual / Toasts
                          </label>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                        ✓ Seguindo as regras do painel de configuração global ({reminderMinutes} minutos de antecedência, som {reminderSoundType === "bell" ? "Sino" : reminderSoundType === "crystal" ? "Cristal" : reminderSoundType === "beep" ? "Bipe" : reminderSoundType === "wood" ? "Marimba" : "Digital"}).
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 dark:text-slate-300 text-[10px] font-bold text-left uppercase tracking-wider font-sans">
                      Anotações Adicionais / Alinhamentos
                    </label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-sans"
                      placeholder="Pontos de atenção adicionais: fones extras, coffee break agendado, logística de acesso..."
                    />
                  </div>

                  {/* Real-time conflict tracker at current selected date and time inside scrollbox */}
                  {formDate && formTime && (
                    <div className="mt-2 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                          ⚡ Monitor de Conflitos (Tempo Real)
                        </span>
                        {realTimeConflictsCount > 0 ? (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md font-mono animate-pulse">
                            ⚠️ {realTimeConflictsCount} Conflito{realTimeConflictsCount > 1 ? "s" : ""} Detectado{realTimeConflictsCount > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-mono">
                            ✓ Sem Overlaps
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-slate-650 dark:text-slate-300 font-medium font-sans leading-normal">
                        Para o dia <strong className="font-bold font-mono">{formDate.split("-").reverse().join("/")}</strong> às <strong className="font-bold font-mono">{formTime}</strong>:
                      </p>
                      
                      {realTimeConflictsCount > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {schedules
                            .filter(s => 
                              s.id !== (editingSchedule?.id || "") &&
                              s.status === "scheduled" &&
                              s.date === formDate &&
                              s.time === formTime
                            )
                            .map(sc => {
                              const currentGuide = useCustomGuide ? customGuideName.trim() : formGuide;
                              const isGuideClash = currentGuide && sc.guide.trim().toLowerCase() === currentGuide.trim().toLowerCase();
                              return (
                                <div 
                                  key={sc.id} 
                                  className={`p-2.5 rounded-lg border text-[10.5px] leading-snug flex items-start gap-2 ${
                                    isGuideClash 
                                      ? "bg-rose-50/70 border-rose-150 text-rose-755 dark:bg-rose-950/20 dark:border-rose-900/45 dark:text-rose-350" 
                                      : "bg-amber-50/70 border-amber-150 text-amber-755 dark:bg-amber-950/20 dark:border-amber-900/45 dark:text-amber-300"
                                  }`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <div>
                                    {isGuideClash ? (
                                      <span>
                                        <strong>Choque de Guia!</strong> O condutor <strong>{sc.guide}</strong> já está escalado para o tour <strong className="underline font-bold font-black">"{sc.title}"</strong> na unidade {sc.unit}.
                                      </span>
                                    ) : (
                                      <span>
                                        <strong>Horário Concorrente!</strong> Tour <strong className="underline font-bold font-black">"{sc.title}"</strong> agendado para o mesmo horário na unidade {sc.unit} com o líder {sc.guide}.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-[10.5px] text-slate-450 dark:text-slate-400 italic">
                          Não existem outros compromissos ou tours escalados para este mesmo horário. Livre para agendamento!
                        </p>
                      )}
                    </div>
                  )}

                </div>

                {/* Fixed Footer Buttons - Always anchored and visible at the dialog bottom */}
                <div className="flex gap-2.5 pt-4 mt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer text-center shadow-3xs"
                  >
                    {editingSchedule ? "Atualizar Detalhes" : "Reservar Horário"}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK COMPLETION CONFIRMATION MODAL */}
      <AnimatePresence>
        {completionTour && (() => {
          const ct = completionTour;
          const isJaciana = session?.nome === "Jaciana Melo";
          const hasData = submissions.some(sub => 
            sub.date === ct.date && 
            sub.liderEducador.trim().toLowerCase() === ct.guide.trim().toLowerCase() && 
            sub.produto.trim().toLowerCase() === ct.product.trim().toLowerCase() &&
            sub.unidade === ct.unit
          );
          const hasNoData = !isJaciana && !hasData;
          const displayedDate = ct.date.split("-").reverse().join("/");

          return (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Concluir Tour Agendado
                    </h3>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Tour: <strong>{ct.title}</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  {/* Details card */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-150 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                    <p>📅 <strong>Data:</strong> {displayedDate}</p>
                    <p>👤 <strong>Responsável (Líder):</strong> {ct.guide}</p>
                    <p>📋 <strong>Produto/Operação:</strong> {ct.product}</p>
                    <p>📍 <strong>Unidade:</strong> {ct.unit}</p>
                  </div>

                  {hasNoData ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-500/10 border border-amber-200/40 rounded-xl flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[11px] font-black text-amber-855 dark:text-amber-400 block uppercase tracking-wide">Sem Pesquisa Vinculada!</span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">
                            Não identificamos formulários de pesquisa de satisfação preenchidos para este líder no produto e data especificados.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                        Recomendamos preencher o formulário para computar o NPS e as metas de satisfação deste tour. Deseja ser redirecionado para o formulário de pesquisa com os dados já preenchidos?
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-start gap-2.5">
                      <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-black text-emerald-750 dark:text-emerald-400 block uppercase tracking-wide font-sans">
                          {isJaciana ? "Finalização Administrativa" : "Pesquisa Cadastrada!"}
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">
                          {isJaciana 
                            ? "Confirmar a conclusão deste tour diretamente na agenda, sem a necessidade de responder à pesquisa correspondente."
                            : "Este tour já possui dados de pesquisa de satisfação correspondente registrados no sistema."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    {hasNoData ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSchedule({ ...ct, status: "completed" });
                            if (onRedirectToForm) {
                              onRedirectToForm({
                                liderEducador: ct.guide,
                                produto: ct.product,
                                participantes: ct.participants,
                                date: ct.date,
                                unidade: ct.unit,
                                isSecondLeva: ct.title.includes("[Parte B]") || !!ct.isSplitPart && ct.title.includes("Parte B")
                              });
                            }
                            setCompletionTour(null);
                          }}
                          className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" /> Sim, Marcar & Ir para Pesquisa
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSchedule({ ...ct, status: "completed" });
                            setCompletionTour(null);
                          }}
                          className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-705 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                        >
                          Apenas Marcar como Concluído
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateSchedule({ ...ct, status: "completed" });
                          setCompletionTour(null);
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-4 h-4" /> {isJaciana ? "Confirmar Encerramento do Tour" : "Confirmar Conclusão"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setCompletionTour(null)}
                      className="w-full py-2 bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold transition cursor-pointer text-center"
                    >
                      Voltar
                    </button>
                  </div>

                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {scheduleToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setScheduleToDelete(null)}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-6 max-w-md w-full relative overflow-hidden shadow-2xl space-y-5 z-10 text-left"
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-455 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider font-mono">
                    Confirmar Exclusão?
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-450 font-bold block mt-0.5 leading-none">
                    Esta ação não poderá ser desfeita
                  </span>
                </div>
              </div>

              {/* Notice Box with Details */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-150 dark:border-slate-800/60 space-y-3.5">
                <div>
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 font-mono">Compromisso</span>
                  <p className="text-xs font-black text-slate-800 dark:text-white leading-snug mt-0.5">
                    {scheduleToDelete.title}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 text-[10.5px]">
                  <div>
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-450 font-mono">Guia / Líder</span>
                    <strong className="block text-slate-750 dark:text-slate-250 mt-0.5 truncate">{scheduleToDelete.guide}</strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-450 font-mono">Unidade</span>
                    <strong className="block text-emerald-600 dark:text-emerald-450 mt-0.5 font-mono">📍 {scheduleToDelete.unit}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 text-[10.5px]">
                  <div>
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-450 font-mono">Data do Tour</span>
                    <strong className="block text-slate-750 dark:text-slate-250 mt-0.5 font-mono">
                      {scheduleToDelete.date.split("-").reverse().join("/")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-450 font-mono">Horário</span>
                    <strong className="block text-slate-755 dark:text-slate-250 mt-0.5 font-mono">⏰ {scheduleToDelete.time}</strong>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduleToDelete(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer text-center font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSchedule(scheduleToDelete.id);
                    setScheduleToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/10 font-mono"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMMERSIVE COMPREHENSIVE TOUR ALERT MODAL */}
      <AnimatePresence>
        {activeAlertModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveAlertModal(null)}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-slate-900 border-2 border-amber-400 text-slate-900 dark:text-white rounded-3xl p-6 max-w-md w-full relative overflow-hidden shadow-2xl space-y-5 z-10"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-indigo-550 animate-pulse"></div>

              {/* Icon Alert Header */}
              <div className="flex items-center gap-3.5 text-left border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10 animate-bounce">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[13px] font-black uppercase text-amber-600 dark:text-amber-450 tracking-wider font-mono">
                    Lembrete Crítico de Tour!
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                    Seu compromisso está prestes a iniciar
                  </span>
                </div>
              </div>

              {/* Tour Details Box */}
              <div className="bg-slate-100 dark:bg-slate-950/65 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/80 text-left space-y-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 font-mono">Operação</span>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-snug mt-0.5">
                    {activeAlertModal.title}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-slate-150 dark:border-slate-800/60">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 font-mono">Guia / Líder</span>
                    <strong className="block text-xs text-slate-800 dark:text-slate-250 mt-0.5 truncate">{activeAlertModal.guide}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 font-mono">Unidade</span>
                    <strong className="block text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">📍 {activeAlertModal.unit}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-slate-150 dark:border-slate-800/60">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 font-mono">Horário do Tour</span>
                    <div className="flex items-center gap-1.5 text-slate-850 dark:text-white font-mono text-xs font-bold mt-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-550" />
                      {activeAlertModal.time}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 font-mono">Tempo Restante</span>
                    <div className="bg-amber-400 text-slate-950 rounded-lg p-1 text-[11px] font-black font-mono text-center mt-0.5 animate-pulse uppercase leading-none">
                      ➔ {activeAlertModal.minutesLeft}m restantes
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAlertModal(null)}
                  className="w-full py-3 bg-indigo-655 hover:bg-indigo-750 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-98"
                >
                  <Check className="w-4 h-4" /> Entendido, Preparado!
                </button>
                <p className="text-[9px] text-center text-slate-450 dark:text-slate-500 leading-normal font-mono font-medium">
                  Este lembrete também foi gravado no histórico de emissão de áudio.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING TOAST REMINDER OVERLAYS CONTAINER */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeAlertToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-slate-900 dark:bg-slate-950 border border-amber-400/40 text-white rounded-2xl p-4 shadow-2xl relative overflow-hidden flex flex-col gap-3 pointer-events-auto ring-4 ring-slate-900/15"
            >
              {/* Highlight bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400"></div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-400/10 rounded-lg flex items-center justify-center text-amber-400 shrink-0">
                    <Bell className="w-4.5 h-4.5 animate-bounce" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black uppercase text-amber-450 tracking-wider font-mono">
                      Lembrete de Tour Ativo!
                    </h5>
                    <span className="text-[10px] text-slate-400 leading-none block mt-0.5">
                      Processo: {toast.product}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveAlertToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition cursor-pointer shrink-0"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="text-left space-y-1">
                <p className="text-xs font-black tracking-tight text-white leading-snug">
                  {toast.title}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9.5px] font-bold">
                  <span className="bg-white/10 text-white p-1 px-2 rounded flex items-center gap-1 leading-none">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> {toast.time}
                  </span>
                  <span className="bg-amber-400 text-slate-950 p-1 px-2 rounded flex items-center gap-1 leading-none">
                    ➔ Começa em {toast.minutesLeft}m
                  </span>
                  <span className="bg-indigo-600 text-white p-1 px-2 rounded flex items-center gap-1 leading-none">
                    📍 {toast.unit}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-2.5 mt-0.5">
                <span className="truncate max-w-[200px]">Guia: <strong className="text-white">{toast.guide}</strong></span>
                <button
                  type="button"
                  onClick={() => setActiveAlertToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="text-amber-450 hover:underline font-extrabold text-[9.5px] uppercase font-mono cursor-pointer shrink-0"
                >
                  Confirmar Aviso ✓
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* TOUR INTERVENTIONS HISTORIC AUDIT MODAL */}
      <AnimatePresence>
        {selectedTourForLogs && (() => {
          const tour = schedules.find(s => s.id === selectedTourForLogs.id) || selectedTourForLogs;
          // Fallback log if empty
          const fallbackLogs = [
            {
              id: "fallback-creation",
              timestamp: tour.createdAt ? new Date(tour.createdAt).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR"),
              operator: "Sistema",
              action: "Criação de Agendamento",
              details: `O tour foi agendado para o dia ${tour.date} às ${tour.time}. Condutor designado: ${tour.guide}.`,
              notes: tour.notes
            }
          ];
          const logsList = tour.interventionLogs && tour.interventionLogs.length > 0 
            ? [...tour.interventionLogs].reverse() 
            : fallbackLogs;

          const statusLabels: Record<string, string> = {
            scheduled: "Agendado",
            in_progress: "Em Andamento",
            completed: "Concluído",
            cancelled: "Cancelado"
          };
          const statusColors: Record<string, string> = {
            scheduled: "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40",
            in_progress: "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900/40",
            completed: "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40",
            cancelled: "bg-slate-100 text-slate-700 border-slate-200/50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
          };

          return (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] text-left"
              >
                {/* Header ribbon */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-505 shrink-0 animate-pulse"></div>

                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/30">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Histórico de Intervenções
                      </h3>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-none font-bold">
                        Rastreio de status, notas administrativas e logs de auditoria
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTourForLogs(null)}
                    className="p-1 px-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white rounded-lg transition duration-200 text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                {/* Tour Quick Meta Reference Card */}
                <div className="bg-slate-50/70 dark:bg-slate-955 p-3 rounded-xl border border-slate-150 dark:border-slate-850 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10.5px] mb-4 shrink-0 font-medium">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] uppercase font-bold font-mono">Título do Tour</span>
                    <strong className="block text-slate-800 dark:text-slate-200 truncate" title={tour.title}>{tour.title}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] uppercase font-bold font-mono">Responsável / Unidade</span>
                    <strong className="block text-slate-800 dark:text-slate-200 truncate">👤 {tour.guide} ({tour.unit})</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] uppercase font-bold font-mono">Processo de Visita</span>
                    <strong className="block text-indigo-600 dark:text-indigo-400 truncate">{tour.product}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] uppercase font-bold font-mono">Status Operacional</span>
                    <span className={`inline-block border text-[8.5px] font-black uppercase px-2 rounded mt-0.5 ${statusColors[tour.status] || ""}`}>
                      {statusLabels[tour.status] || tour.status}
                    </span>
                  </div>
                </div>

                {/* Scrollable Timeline Trail */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono border-b pb-1 border-slate-100 dark:border-slate-800">
                    Trilha de Auditoria (Mais recentes primeiro)
                  </span>

                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-6.5 space-y-6 text-left py-1 ml-2.5">
                    {logsList.map((log, index) => {
                      // Determine dot colors
                      const isAudit = log.action.includes("Auditoria");
                      const isStatus = log.action.includes("Status");
                      const isCreation = log.action.includes("Criação");
                      const isSplit = log.action.includes("Divisão");

                      const borderDotColor = isAudit 
                        ? "border-emerald-500 bg-emerald-105 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400"
                        : isStatus
                        ? "border-amber-500 bg-amber-105 text-amber-600 dark:bg-amber-955/60 dark:text-amber-400"
                        : isCreation
                        ? "border-indigo-505 bg-indigo-100 text-indigo-600 dark:bg-indigo-955/65 dark:text-indigo-400"
                        : isSplit
                        ? "border-pink-500 bg-pink-100 text-pink-600 dark:bg-pink-955/60 dark:text-pink-400"
                        : "border-slate-400 bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400";

                      return (
                        <div key={log.id || index} className="relative group/item">
                          {/* Left dot connected to line */}
                          <div className={`absolute -left-9.5 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-black z-10 ${borderDotColor}`}>
                            {isAudit ? "✓" : isStatus ? "⟲" : isCreation ? "★" : isSplit ? "⚡" : "•"}
                          </div>

                          <div className="space-y-1">
                            {/* Timestamp */}
                            <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                              <span className="text-[9.5px] font-black text-indigo-650 dark:text-indigo-400 font-mono">
                                📅 {log.timestamp}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide font-mono bg-slate-50 dark:bg-slate-950 px-1.5 py-0.2 rounded border border-slate-150 dark:border-slate-850">
                                {log.action}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-auto font-bold opacity-80">
                                👤 {log.operator}
                              </span>
                            </div>

                            {/* Details text */}
                            <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                              {log.details}
                            </p>

                            {/* Associated comments or notes inside custom nested block */}
                            {log.notes && (
                              <div className="mt-1.5 p-2 bg-slate-50/70 dark:bg-slate-955/50 border border-l-2 border-slate-200 dark:border-slate-800 border-l-indigo-505 rounded-r-lg text-[10px] text-slate-500 dark:text-slate-400 italic font-mono space-y-0.5">
                                <span className="not-italic uppercase font-sans text-[8.5px] text-slate-405 font-black block leading-none">
                                  Justificativa / Comentário Técnico:
                                </span>
                                <p className="leading-snug">{log.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Action to print or export logs */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 text-[10px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 leading-none">
                  <span>Trilha auditável em conformidade com as diretrizes do Supervisor PRN</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Generate and download a simple CSV of these logs
                      const csvHeader = "\uFEFFTimestamp,Operator,Action,Details,Notes\n";
                      const csvRows = logsList.map(l => 
                        `"${l.timestamp}","${l.operator}","${l.action}","${l.details.replace(/"/g, '""')}","${(l.notes || "").replace(/"/g, '""')}"`
                      ).join("\n");
                      const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.setAttribute("download", `auditoria_tour_${tour.id}_logs.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="p-1.5 px-3 text-[10px] font-black border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 text-indigo-750 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/35 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Exportar logs em arquivo CSV"
                  >
                    <FileDown className="w-3.5 h-3.5" /> CSV de Auditoria
                  </button>
                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
