import React, { useState, useMemo, useEffect, useRef } from "react";
import { TourSchedule, ManagerNotice, UserSession, CollaboratorMessage, SurveySubmission, DailyActivityReport } from "../types";
import { INITIAL_PRODUCTS, INITIAL_LEADERS } from "../data";
import { 
  Calendar, Clock, Plus, Edit2, Trash2, Users, MapPin, 
  AlertTriangle, CheckCircle2, XCircle, Info, ChevronLeft, 
  ChevronRight, Sparkles, Filter, Check, ListFilter, AlertCircle, FileText, FileDown,
  MessageSquare, Send, Mail, MailOpen, Bell, Volume2, VolumeX, Settings, Music, Eye, EyeOff
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
  onDeleteDailyReport = () => {}
}: RoutinesAgendaPanelProps) {
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

  // Double check scheduling warning issues / clashes
  const getSchedulesWarnings = (s: TourSchedule) => {
    const warnings: string[] = [];
    
    // Check limit threshold (e.g. >30 visitors requires safety measures)
    if (s.participants > 30) {
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
    setFormGuide(leaders[0] || "");
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
      }, { scheduled: 0, completed: 0, cancelled: 0, totalParticipants: 0 });

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
      doc.text(`- Status:  [ ${counts.scheduled} Ativos ]   [ ${counts.completed} Concluídos ]   [ ${counts.cancelled} Cancelados ]`, 15, y + 16);
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

  return (
    <div className="space-y-6">
      
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
          
          {/* TAB SWITCHER: OPERATION VS ALERT MONITORING */}
          <div className="flex border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setRightColumnTab("agenda")}
              className={`flex-1 py-1.5 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                rightColumnTab === "agenda"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-xs border border-slate-100 dark:border-slate-800/60 font-mono"
                  : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Agenda & Atividades
            </button>
            <button
              onClick={() => setRightColumnTab("alertMonitor")}
              className={`flex-1 py-1.5 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                rightColumnTab === "alertMonitor"
                  ? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-xs border border-slate-100 dark:border-slate-800/60 font-mono"
                  : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Monitor Alertas Real-Time
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
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
                  {leaders.map(l => (
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
                      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden transition ${
                        sc.status === "cancelled" 
                          ? "opacity-60 saturate-50"
                          : warnings.length > 0
                          ? "border-amber-200 bg-amber-50/5 dark:bg-amber-950/10 dark:border-amber-900/60"
                          : ""
                      }`}
                    >
                      {/* Left color bar based on Tour Status */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                        sc.status === "completed" 
                          ? "bg-blue-500" 
                          : sc.status === "cancelled"
                          ? "bg-slate-400 dark:bg-slate-600"
                          : "bg-emerald-500"
                      }`} />

                      <div className="space-y-2.5 pl-2 grow">
                        
                        {/* Header Details */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                            sc.status === "completed"
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700"
                              : sc.status === "cancelled"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-550"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700"
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
                          <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-150 dark:border-slate-800 text-slate-755 dark:text-slate-205">
                            👥 Visitantes: <strong className="text-slate-900 dark:text-white font-mono ml-0.5">{sc.participants}</strong>
                          </span>
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

                      </div>

                      {/* Right Action Options */}
                      <div className="flex md:flex-col gap-1.5 shrink-0 self-end md:self-center">
                        {sc.status === "scheduled" && (
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
                          onClick={() => setScheduleToDelete(sc)}
                          className="p-1 px-2.5 text-[9.5px] font-bold border border-transparent text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          title="Excluir Agendamento"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
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
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-slate-705 dark:text-slate-300 uppercase tracking-widest font-mono">
                    Compromissos de Alerta ({processedSchedules.length})
                  </span>
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-450 animate-pulse font-mono font-bold flex items-center gap-1">
                    ● Disparador Sonoro Prontificado
                  </span>
                </div>

                {processedSchedules.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center space-y-2.5">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-350 dark:text-slate-600 flex items-center justify-center">
                      <VolumeX className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum tour cadastrado para monitorar.</p>
                    <p className="text-[10.5px] text-slate-400 max-w-sm mx-auto">
                      Crie um agendamento na aba "Agenda & Atividades" para que o sistema de disparo de áudio/notificação comece a rastrear em tempo real.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {processedSchedules.map((sc) => {
                      const minutesBefore = sc.reminderMinutesOverride !== undefined ? sc.reminderMinutesOverride : reminderMinutes;
                      const soundTypeOverride = sc.reminderSoundTypeOverride !== undefined ? sc.reminderSoundTypeOverride : reminderSoundType;
                      const soundEnabledOverride = sc.reminderSoundEnabledOverride !== undefined ? sc.reminderSoundEnabledOverride : reminderSoundEnabled;
                      const visualEnabledOverride = sc.reminderVisualEnabledOverride !== undefined ? sc.reminderVisualEnabledOverride : true;
                      const hasOverride = sc.reminderMinutesOverride !== undefined || sc.reminderSoundTypeOverride !== undefined || sc.reminderSoundEnabledOverride !== undefined || sc.reminderVisualEnabledOverride !== undefined;

                      return (
                        <div 
                          key={sc.id}
                          onClick={() => handleOpenEdit(sc)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition duration-205 group relative overflow-hidden text-left"
                        >
                          {/* Indicator stripe */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${hasOverride ? "bg-amber-400" : "bg-indigo-500"}`} />
                          
                          <div className="space-y-2.5 pl-1.5 grow max-w-full">
                            {/* Title & Info */}
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-black font-mono leading-none">
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
                              </div>
                              <h5 className="text-xs font-black text-slate-900 dark:text-white leading-tight group-hover:text-indigo-605 dark:group-hover:text-indigo-400 transition">
                                {sc.title}
                              </h5>
                              <p className="text-[10.5px] text-slate-450 dark:text-slate-400 mt-0.5 font-bold">
                                Líder: <strong className="text-slate-700 dark:text-slate-250 font-black">{sc.guide}</strong> • Processo: <strong className="text-slate-600 dark:text-slate-350 font-normal">{sc.product}</strong>
                              </p>
                            </div>

                            {/* Alert Channel Configuration Visual Trackers */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono">
                              
                              {/* Timing Setting */}
                              <div className="p-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-150 dark:border-slate-850">
                                <span className="text-[8.5px] font-bold text-slate-455 block leading-none mb-1">⏰ Disparo</span>
                                <strong className="text-slate-700 dark:text-slate-300">{minutesBefore}m antes</strong>
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
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-sans">
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

                          {/* Quick Edit settings action visual trigger */}
                          <div className="flex flex-col items-center justify-center shrink-0 self-start md:self-center gap-1 px-2.5 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800 transition shadow-4xs">
                            <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-550 group-hover:rotate-45 transition duration-300" />
                            <span className="text-[8px] font-black uppercase text-indigo-550 dark:text-indigo-400 font-mono tracking-wider text-center mt-1 block">
                              Ajustar Alertas
                            </span>
                          </div>

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>
              
              <div className="flex items-center gap-3 mb-4">
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
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-4">
                
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
                        {["08:30", "09:30", "10:30", "13:30", "14:30", "15:30", "19:00"].map((quickT) => (
                          <button
                            key={quickT}
                            type="button"
                            onClick={() => setFormTime(quickT)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md font-mono transition border cursor-pointer ${
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
                      <option value="LAPA">📍 LAPA</option>
                      <option value="PRN">📍 PRN</option>
                      <option value="Vila Prudente">📍 Vila Prudente</option>
                      <option value="SGA">📍 SGA</option>
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
                            setFormGuide(leaders[0] || "");
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
                        {leaders.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
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

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer text-center shadow-3xs"
                  >
                    {editingSchedule ? "Atualizar Detalhes" : "Reservar Horário"}
                  </button>
                </div>

              </form>

              {/* Real-time conflict tracker at current selected date and time */}
              {formDate && formTime && (
                <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left space-y-2">
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
                                    <strong>Choque de Guia!</strong> O condutor <strong>{sc.guide}</strong> já está escalado para o tour <strong className="underline font-bold">"{sc.title}"</strong> na unidade {sc.unit}.
                                  </span>
                                ) : (
                                  <span>
                                    <strong>Horário Concorrente!</strong> Tour <strong className="underline font-bold">"{sc.title}"</strong> agendado para o mesmo horário na unidade {sc.unit} com o líder {sc.guide}.
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

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK COMPLETION CONFIRMATION MODAL */}
      <AnimatePresence>
        {completionTour && (() => {
          const ct = completionTour;
          const hasData = submissions.some(sub => 
            sub.date === ct.date && 
            sub.liderEducador.trim().toLowerCase() === ct.guide.trim().toLowerCase() && 
            sub.produto.trim().toLowerCase() === ct.product.trim().toLowerCase() &&
            sub.unidade === ct.unit
          );
          const hasNoData = !hasData;
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
                        <span className="text-[11px] font-black text-emerald-750 dark:text-emerald-400 block uppercase tracking-wide font-sans">Pesquisa Cadastrada!</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">
                          Este tour já possui dados de pesquisa de satisfação correspondente registrados no sistema.
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
                                unidade: ct.unit
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
                          className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250 text-xs font-bold rounded-xl transition cursor-pointer text-center"
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
                        <Check className="w-4 h-4" /> Confirmar Conclusão
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

    </div>
  );
}
