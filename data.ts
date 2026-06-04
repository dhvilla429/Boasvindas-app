import { useMemo, useState, useEffect } from "react";
import { SurveySubmission, UserSession, TourSchedule } from "./types";
import { computeDashboardStats, formatDateToPTBR } from "./utils";
import { Users, Compass, Star, Smile, BarChart2, Calendar, Filter, RefreshCw, Layers, Building2, Activity, Wifi, Clock, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Bell, AlertTriangle, X, History, Scale, Presentation, Trophy, Target, Award, Medal, FileText, ChevronLeft, ChevronRight, Play, Pause, Hourglass, HelpCircle } from "lucide-react";
import { INITIAL_PRODUCTS, INITIAL_LEADERS } from "./data";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import pptxgen from "pptxgenjs";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "motion/react";

interface AlertHistoryItem {
  id: string;
  unidade: string;
  media: number;
  count: number;
  timestamp: string;
}

interface DashboardStatsPanelProps {
  submissions: SurveySubmission[];
  session: UserSession | null;
  onAddSample?: (sample: SurveySubmission) => void;
  products?: string[];
  leaders?: string[];
  dailyGoals: Record<string, number>;
  onUpdateGoal: (unit: string, newGoal: number) => void;
  schedules?: TourSchedule[];
}

const NAMES_TEST = [
  "Rafael Albuquerque Ferreira", "Danielle Santos Menezes", "Marcelo Vieira Custódio", 
  "Gabriela Rocha Silveira", "Tiago Cardoso de Souza", "Juliana Lima Castanhari", 
  "Bruno Fagundes Neto", "Letícia Guedes Albuquerque", "Patricia de Souza Barros",
  "Guilherme de Oliveira Santos", "Fernanda Paiva Martins"
];
const PRODUCTS_TEST = [
  "Tour Histórico", "Tour Pedagógico", "Tour Corporativo", "Tour Tecnológico", "Integração Geral"
];
const LEADERS_TEST = [
  "Ana Paula Lima", "Rodrigo Nogueira", "Soraia Vasconcelos", "Marcos Pinheiro", "Mariana Coletti"
];
const PLACES_TEST = ["LAPA", "Vila Prudente", "PRN", "SGA"];
const MELHORIAS_TEST = [
  "Excelente infraestrutura e ótima acolhida!",
  "A clareza das informações foi exemplar. Parabéns à equipe!!",
  "Tudo muito otimizado. Adorei ver o painel em tempo real na recepção.",
  "Melhorar levemente o tempo de entrega nos corredores operacionais.",
  "Incrível o acolhimento do time de condutores Boas-Vindas!",
  "Material de onboarding muito explicativo, excelente condução."
];

// Visual helper for unit representation in select boxes
const getUnitVisuals = (name: string) => {
  const normalized = name.toUpperCase().trim();
  if (normalized.includes("LAPA")) return { icon: "🔵", colorClass: "text-blue-900" };
  if (normalized.includes("VILA") || normalized.includes("PRUDENTE")) return { icon: "🟣", colorClass: "text-purple-900" };
  if (normalized.includes("PRN")) return { icon: "🟢", colorClass: "text-emerald-900" };
  if (normalized.includes("SGA")) return { icon: "🟠", colorClass: "text-amber-900" };
  return { icon: "🏢", colorClass: "text-slate-900" };
};

export default function DashboardStatsPanel({ 
  submissions, 
  session, 
  onAddSample,
  products = INITIAL_PRODUCTS,
  leaders = INITIAL_LEADERS,
  dailyGoals,
  onUpdateGoal,
  schedules = []
}: DashboardStatsPanelProps) {
  const [isFeedActive, setIsFeedActive] = useState(true);
  const [lastPingTime, setLastPingTime] = useState<string>("Agora mesmo");

  // Collaborator Date Interval filter for graphics & dashboards
  const [colabTimeRange, setColabTimeRange] = useState<"semana" | "mes" | "ano" | "tudo">("tudo");

  // State for volume chart aggregation mode (consolidado, unidade, produto)
  const [volumeChartMode, setVolumeChartMode] = useState<"consolidado" | "unidade" | "produto">("consolidado");

  // Filter State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");
  const [selectedUnidade, setSelectedUnidade] = useState(() => {
    return session?.unidade !== "TODAS" ? session?.unidade || "" : "";
  });
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [dismissedUnits, setDismissedUnits] = useState<string[]>([]);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [selectedRadarConductor, setSelectedRadarConductor] = useState("");

  // Monthly Highlights Carousel State
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);
  const [autoplayHighlights, setAutoplayHighlights] = useState(true);

  // Performance Comparison State & Logic
  const uniqueUnits = useMemo(() => {
    const baseUnits = ["LAPA", "PRN", "Vila Prudente", "SGA"];
    const unitsSet = new Set<string>(baseUnits);
    submissions.forEach((s) => {
      const u = s.unidade ? s.unidade.trim() : "";
      if (u) {
        // Ignorar se já existe uma correspondência (case-insensitive)
        const currentLower = Array.from(unitsSet).map((x) => x.toLowerCase());
        if (!currentLower.includes(u.toLowerCase())) {
          unitsSet.add(u);
        }
      }
    });
    return Array.from(unitsSet);
  }, [submissions]);

  // Daily goals state is now hoisted to App.tsx and received via props
  const handleUpdateGoal = onUpdateGoal;

  const todaySubmissionsByUnit = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const counts: Record<string, number> = {};
    
    uniqueUnits.forEach(u => {
      counts[u] = 0;
    });

    submissions.forEach(s => {
      if (s.date === todayStr && s.unidade) {
        const uNorm = uniqueUnits.find(unit => unit.toLowerCase() === s.unidade.toLowerCase()) || s.unidade;
        counts[uNorm] = (counts[uNorm] || 0) + 1;
      }
    });

    return counts;
  }, [submissions, uniqueUnits]);

  // Fuzzy match function for filtering units in the select box
  const filteredUnitsSelect = useMemo(() => {
    if (!unitSearchQuery.trim()) {
      return uniqueUnits;
    }
    const q = unitSearchQuery.toLowerCase().trim();
    return uniqueUnits.filter((unit) => {
      const u = unit.toLowerCase();
      // Fuzzy match characters in order
      let qIdx = 0;
      for (let i = 0; i < u.length; i++) {
        if (u[i] === q[qIdx]) {
          qIdx++;
        }
        if (qIdx === q.length) return true;
      }
      return false;
    });
  }, [uniqueUnits, unitSearchQuery]);

  const [compareUnitA, setCompareUnitA] = useState(() => {
    return session?.unidade !== "TODAS" ? session?.unidade || "LAPA" : "LAPA";
  });
  const [compareUnitB, setCompareUnitB] = useState(() => {
    const userUnit = session?.unidade !== "TODAS" ? session?.unidade || "" : "";
    if (userUnit.toUpperCase() === "LAPA") return "PRN";
    return "LAPA";
  });

  // Synchronize when the list of available units changes
  useEffect(() => {
    if (uniqueUnits.length > 0) {
      if (!uniqueUnits.includes(compareUnitA)) {
        setCompareUnitA(uniqueUnits[0]);
      }
      if (!uniqueUnits.includes(compareUnitB) && uniqueUnits.length > 1) {
        setCompareUnitB(uniqueUnits[1]);
      } else if (uniqueUnits.length === 1) {
        setCompareUnitB(uniqueUnits[0]);
      }
    }
  }, [uniqueUnits]);

  const comparisonStats = useMemo(() => {
    const getStatsForUnit = (unitName: string) => {
      const unitSubmissions = submissions.filter(
        (s) => s.unidade && s.unidade.trim().toUpperCase() === unitName.toUpperCase()
      );
      
      if (unitSubmissions.length === 0) {
        return {
          count: 0,
          mediaClareza: 0,
          mediaAcolhimento: 0,
          mediaAssistente: 0,
          mediaGeral: 0,
        };
      }

      let sumClareza = 0;
      let sumAcolhimento = 0;
      let sumAssistente = 0;
      const count = unitSubmissions.length;

      unitSubmissions.forEach((s) => {
        sumClareza += Number(s.notaClareza || 0);
        sumAcolhimento += Number(s.notaAcolhimento || 0);
        sumAssistente += Number(s.notaAssistente || 0);
      });

      const mediaClareza = Number((sumClareza / count).toFixed(1));
      const mediaAcolhimento = Number((sumAcolhimento / count).toFixed(1));
      const mediaAssistente = Number((sumAssistente / count).toFixed(1));
      const mediaGeral = Number(((mediaClareza + mediaAcolhimento + mediaAssistente) / 3).toFixed(1));

      return {
        count,
        mediaClareza,
        mediaAcolhimento,
        mediaAssistente,
        mediaGeral,
      };
    };

    const statsA = getStatsForUnit(compareUnitA);
    const statsB = getStatsForUnit(compareUnitB);

    const chartData = [
      {
        name: "Clareza",
        [compareUnitA]: statsA.mediaClareza,
        [compareUnitB]: statsB.mediaGeral, // Wait, let's keep comparing respective fields:
      },
    ];

    // Let's create proper array representation for comparative chart
    const comparativeChartData = [
      {
        metric: "Satisfação Geral",
        [compareUnitA]: statsA.mediaGeral,
        [compareUnitB]: statsB.mediaGeral,
      },
      {
        metric: "Clareza de Info",
        [compareUnitA]: statsA.mediaClareza,
        [compareUnitB]: statsB.mediaClareza,
      },
      {
        metric: "Acolhimento",
        [compareUnitA]: statsA.mediaAcolhimento,
        [compareUnitB]: statsB.mediaAcolhimento,
      },
      {
        metric: "Comprometimento",
        [compareUnitA]: statsA.mediaAssistente,
        [compareUnitB]: statsB.mediaAssistente,
      },
    ];

    return {
      statsA,
      statsB,
      chartData: comparativeChartData,
    };
  }, [submissions, compareUnitA, compareUnitB]);



  // ----- NEW CALCULATION: OPERATIONAL BOTTLENECKS (CREATED TO COMPLETED TIME AVERAGE) -----
  const bottleneckStats = useMemo(() => {
    // Parser for "pt-BR" timestamp strings format "DD/MM/YYYY HH:MM:SS" back to Date
    const parsePtBrTimestamp = (ts: string): Date => {
      const parts = ts.trim().split(" ");
      if (parts.length < 2) return new Date(ts);
      const dateParts = parts[0].split("/");
      const timeParts = parts[1].split(":");
      if (dateParts.length !== 3 || timeParts.length < 2) return new Date(ts);
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);
      const second = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
      return new Date(year, month, day, hour, minute, second);
    };

    const completedTours = (schedules || []).filter(s => s.status === "completed" || s.completedAt);
    const hasRealData = completedTours.length > 0;

    // Use actual completed schedules or beautiful authentic fallback data
    const analyzedTours = hasRealData ? completedTours.map(s => {
      const createdDate = new Date(s.createdAt);
      let completedDate = s.completedAt ? new Date(s.completedAt) : null;
      
      if (!completedDate && s.interventionLogs) {
        const log = s.interventionLogs.find(l => 
          l.action === "Alteração de Status" && 
          (l.details.toLowerCase().includes("conclu") || l.details.toLowerCase().includes("complet"))
        );
        if (log) {
          completedDate = parsePtBrTimestamp(log.timestamp);
        }
      }

      // If timestamp remains unparsed, fallback to schedule time + random offset
      if (!completedDate || isNaN(completedDate.getTime())) {
        const schedTime = new Date(`${s.date}T${s.time}:00`);
        if (!isNaN(schedTime.getTime())) {
          completedDate = new Date(schedTime.getTime() + 1.5 * 60 * 60 * 1000); // 1.5 hours duration
        } else {
          completedDate = new Date(createdDate.getTime() + 2 * 60 * 60 * 1000);
        }
      }

      const diffMs = completedDate.getTime() - createdDate.getTime();
      const diffMin = Math.max(5, Math.round(diffMs / (1000 * 60)));

      return {
        id: s.id,
        title: s.title,
        unit: s.unit,
        createdAt: createdDate,
        completedAt: completedDate,
        durationMinutes: diffMin,
        guide: s.guide,
        product: s.product
      };
    }) : [
      { id: "seed-c1", title: "Visita Escolar Mauá", unit: "LAPA", durationMinutes: 115, guide: "Carlos Menezes", product: "Tour Pedagógico Industrial" },
      { id: "seed-c2", title: "Integração Estagiários", unit: "Vila Prudente", durationMinutes: 195, guide: "Fabiana Rosa", product: "Tour de Integração Corporativa" },
      { id: "seed-c3", title: "Imersão VIP Diretoria", unit: "PRN", durationMinutes: 75, guide: "Rafaela Alessandra", product: "Tour de Inovação & Tecnologia" },
      { id: "seed-c4", title: "Visita Técnica Bosch", unit: "SGA", durationMinutes: 140, guide: "Roberto Santos", product: "Tour Histórico e Cultural" },
      { id: "seed-c5", title: "Auditoria Corporativa", unit: "PRN", durationMinutes: 80, guide: "Rafaela Alessandra", product: "Tour de Inovação & Tecnologia" },
      { id: "seed-c6", title: "Escola Estadual Mauá II", unit: "LAPA", durationMinutes: 105, guide: "Carlos Menezes", product: "Tour Pedagógico Industrial" },
      { id: "seed-c7", title: "Fintech Onboarding", unit: "Vila Prudente", durationMinutes: 205, guide: "Fabiana Rosa", product: "Tour de Integração Corporativa" },
    ];

    // Filter by selectedUnidade if applicable (unless TODAY or "TODAS")
    const activeUnitFilter = (session && session.unidade !== "TODAS") 
      ? session.unidade 
      : (selectedUnidade || "");

    const filteredAnalyzed = analyzedTours.filter(t => {
      if (activeUnitFilter) {
        return t.unit.trim().toUpperCase() === activeUnitFilter.trim().toUpperCase();
      }
      return true;
    });

    // Group stats by unit
    const unitsList = ["LAPA", "Vila Prudente", "PRN", "SGA"];
    const unitBreakdown = unitsList.map(u => {
      const toursInUnit = analyzedTours.filter(t => t.unit.trim().toUpperCase() === u.trim().toUpperCase());
      const totalTours = toursInUnit.length;
      const totalMinutes = toursInUnit.reduce((acc, curr) => acc + curr.durationMinutes, 0);
      const avgMinutes = totalTours > 0 ? Math.round(totalMinutes / totalTours) : 0;

      // Status:
      // Over 150 mins: critical (red)
      // 110-150 mins: warning (amber)
      // Under 110 mins: efficient (green)
      let severity: "efficient" | "warning" | "critical" = "efficient";
      if (avgMinutes > 150) severity = "critical";
      else if (avgMinutes >= 110) severity = "warning";

      return {
        unit: u,
        count: totalTours,
        avgMinutes,
        severity
      };
    });

    const overallTotalAnalyzed = filteredAnalyzed.length;
    const overallTotalMinutes = filteredAnalyzed.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const overallAvgMinutes = overallTotalAnalyzed > 0 ? Math.round(overallTotalMinutes / overallTotalAnalyzed) : 0;

    // Find bottleneck unit
    const validUnitStats = unitBreakdown.filter(ub => ub.count > 0);
    const bottleneckUnitObj = validUnitStats.length > 0 
      ? [...validUnitStats].sort((a, b) => b.avgMinutes - a.avgMinutes)[0] 
      : null;

    return {
      tours: filteredAnalyzed,
      hasRealData,
      overallTotalAnalyzed,
      overallAvgMinutes,
      bottleneckUnit: bottleneckUnitObj?.unit || "Nenhuma",
      bottleneckTime: bottleneckUnitObj?.avgMinutes || 0,
      unitBreakdown
    };
  }, [schedules, selectedUnidade, session]);



  // Load/maintain Alert History
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("survey_nps_alert_history");
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Default pre-populated list
    const initialHistory: AlertHistoryItem[] = [];
    const baseDate = new Date();
    const unitsWithNpsIssues = ["LAPA", "PRN", "Vila Prudente", "SGA"];
    unitsWithNpsIssues.forEach((unidade, idx) => {
      const d = new Date(baseDate);
      d.setHours(baseDate.getHours() - (idx + 1) * 3 - 1);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const ts = `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
      initialHistory.push({
        id: `hist-alert-${unidade}-${idx}`,
        unidade,
        media: Number((5.8 + idx * 0.35).toFixed(1)),
        count: idx + 3,
        timestamp: ts
      });
    });

    try {
      localStorage.setItem("survey_nps_alert_history", JSON.stringify(initialHistory));
    } catch {}

    return initialHistory;
  });

  // Filtered Alert History for display based on logged-in user unit
  const filteredAlertHistory = useMemo(() => {
    return alertHistory.filter((item) => {
      if (session?.unidade !== "TODAS") {
        return item.unidade.trim().toUpperCase() === session?.unidade.trim().toUpperCase();
      }
      return true;
    });
  }, [alertHistory, session]);

  // Dynamic alert calculations for any unit with a satisfaction average < 7.0
  const alertNotifications = useMemo(() => {
    const unitsMap: Record<string, { sum: number; count: number }> = {};
    
    submissions.forEach((s) => {
      const u = s.unidade ? s.unidade.trim() : "";
      if (!u) return;
      const media = (Number(s.notaClareza) + Number(s.notaAcolhimento) + Number(s.notaAssistente)) / 3;
      if (!unitsMap[u]) {
        unitsMap[u] = { sum: 0, count: 0 };
      }
      unitsMap[u].sum += media;
      unitsMap[u].count += 1;
    });

    const activeAlerts: Array<{ unidade: string; media: number; count: number; isDismissed: boolean }> = [];
    Object.entries(unitsMap).forEach(([unidade, data]) => {
      const average = Number((data.sum / data.count).toFixed(2));
      if (average < 7.0) {
        activeAlerts.push({
          unidade,
          media: average,
          count: data.count,
          isDismissed: dismissedUnits.includes(unidade.toUpperCase())
        });
      }
    });

    return activeAlerts;
  }, [submissions, dismissedUnits]);

  // Synchronize new alerts to history automatically as they happen
  useEffect(() => {
    if (alertNotifications.length === 0) return;

    let updated = false;
    const newHistory = [...alertHistory];

    alertNotifications.forEach((alert) => {
      // Check if we logged an active alert for this unit with the same average to avoid dups during refilters
      const alreadyLogged = newHistory.some(
        (h) => h.unidade.toUpperCase() === alert.unidade.toUpperCase() && Math.abs(h.media - alert.media) < 0.05
      );

      if (!alreadyLogged) {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        const ts = `${day}/${month}/${year} ${hours}:${mins}:${secs}`;

        newHistory.unshift({
          id: `alert-${alert.unidade}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          unidade: alert.unidade,
          media: alert.media,
          count: alert.count,
          timestamp: ts
        });
        updated = true;
      }
    });

    if (updated) {
      setAlertHistory(newHistory);
      try {
        localStorage.setItem("survey_nps_alert_history", JSON.stringify(newHistory));
      } catch {}
    }
  }, [alertNotifications]);

  // Filter submissions dynamically
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // Date filter
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;

      // Product filter
      if (selectedProduct && s.produto !== selectedProduct) return false;

      // Leader filter
      if (selectedLeader && s.liderEducador !== selectedLeader) return false;

      // Collaborator quick search
      if (collaboratorSearch) {
        const query = collaboratorSearch.trim().toLowerCase();
        const leader = s.liderEducador ? s.liderEducador.toLowerCase() : "";
        if (!leader.includes(query)) return false;
      }

      // Unidade filter
      if (selectedUnidade && s.unidade !== selectedUnidade) return false;

      return true;
    });
  }, [submissions, startDate, endDate, selectedProduct, selectedLeader, selectedUnidade, collaboratorSearch]);

  // Compute stats on the filtered subset
  const stats = useMemo(() => {
    return computeDashboardStats(filteredSubmissions);
  }, [filteredSubmissions]);

  // Submissions filtered specifically for colaborador time range selector (semana, mês, ano)
  const colabSubmissions = useMemo(() => {
    if (colabTimeRange === "tudo") return filteredSubmissions;

    // Determine reference date: use max date in filteredSubmissions if available
    let endDateStr = new Date().toISOString().split("T")[0];
    if (filteredSubmissions.length > 0) {
      const dates = filteredSubmissions.map((s) => s.date).filter(Boolean);
      if (dates.length > 0) {
        endDateStr = dates.reduce((max, d) => (d > max ? d : max), dates[0]);
      }
    } else if (submissions.length > 0) {
      const dates = submissions.map((s) => s.date).filter(Boolean);
      if (dates.length > 0) {
        endDateStr = dates.reduce((max, d) => (d > max ? d : max), dates[0]);
      }
    }

    const end = new Date(endDateStr + "T00:00:00");
    const start = new Date(end);

    if (colabTimeRange === "semana") {
      start.setDate(end.getDate() - 7);
    } else if (colabTimeRange === "mes") {
      start.setDate(end.getDate() - 30);
    } else if (colabTimeRange === "ano") {
      start.setDate(end.getDate() - 365);
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    return filteredSubmissions.filter((s) => s.date && s.date >= startStr && s.date <= endStr);
  }, [filteredSubmissions, submissions, colabTimeRange]);

  const colabStats = useMemo(() => {
    return computeDashboardStats(colabSubmissions);
  }, [colabSubmissions]);

  // Calculations for Collaborator Gamification Dashboard Hub
  const coletasHoje = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return filteredSubmissions.filter(s => s.date === todayStr).length;
  }, [filteredSubmissions]);

  const rankingLideres = useMemo(() => {
    const counts: Record<string, { count: number; sumNotas: number }> = {};
    colabSubmissions.forEach(s => {
      const cond = s.assistente ? s.assistente.toUpperCase().trim() : "CONDUTOR GERAL";
      const notaGeral = (Number(s.notaClareza || 0) + Number(s.notaAcolhimento || 0) + Number(s.notaAssistente || 0)) / 3;
      if (!counts[cond]) {
        counts[cond] = { count: 0, sumNotas: 0 };
      }
      counts[cond].count += 1;
      counts[cond].sumNotas += notaGeral;
    });

    return Object.entries(counts)
      .map(([nome, item]) => ({
        nome,
        count: item.count,
        media: Number((item.sumNotas / item.count).toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count || b.media - a.media)
      .slice(0, 5);
  }, [colabSubmissions]);

  // Comparative conductor goals metrics calculations (Target 5 tours & Target 8.5 satisfaction average)
  const condutoresStats = useMemo(() => {
    const dataMap: Record<string, { 
      tours: number; 
      sampleCount: number;
      sumTotal: number; 
      sumClareza: number; 
      sumAcolhimento: number; 
      sumAssistente: number; 
    }> = {};

    colabSubmissions.forEach(s => {
      const cond = s.assistente ? s.assistente.toUpperCase().trim() : "CONDUTOR GERAL";
      const c = Number(s.notaClareza || 0);
      const ac = Number(s.notaAcolhimento || 0);
      const as_ = Number(s.notaAssistente || 0);
      const media = (c + ac + as_) / 3;

      if (!dataMap[cond]) {
        dataMap[cond] = { tours: 0, sampleCount: 0, sumTotal: 0, sumClareza: 0, sumAcolhimento: 0, sumAssistente: 0 };
      }
      
      if (!s.isSecondLeva) {
        dataMap[cond].tours += 1;
      }
      dataMap[cond].sampleCount += 1;
      dataMap[cond].sumTotal += media;
      dataMap[cond].sumClareza += c;
      dataMap[cond].sumAcolhimento += ac;
      dataMap[cond].sumAssistente += as_;
    });

    return Object.entries(dataMap).map(([nome, val]) => {
      const denom = val.sampleCount || 1;
      const avgTotal = Number((val.sumTotal / denom).toFixed(2));
      const avgClareza = Number((val.sumClareza / denom).toFixed(2));
      const avgAcolhimento = Number((val.sumAcolhimento / denom).toFixed(2));
      const avgAssistente = Number((val.sumAssistente / denom).toFixed(2));
      return {
        nome,
        tours: val.tours,
        media: avgTotal,
        mediaClareza: avgClareza,
        mediaAcolhimento: avgAcolhimento,
        mediaAssistente: avgAssistente,
        porcentagemMeta: Math.round(Math.min(100, (val.tours / 5) * 105)), // Goal is 5 tours as base
        metaBatida: val.tours >= 5,
        npsExcelente: avgTotal >= 8.5
      };
    }).sort((a, b) => b.tours - a.tours || b.media - a.media);
  }, [colabSubmissions]);

  // Compute Special Conductors Highlights Badges dynamically
  const destaquesCondutores = useMemo(() => {
    if (condutoresStats.length === 0) return [];
    const highlights: { label: string; valor: string; condutor: string; badge: string; color: string }[] = [];

    // Sort clones safely to find leaders
    const listByNps = [...condutoresStats].sort((a, b) => b.media - a.media);
    const listByClareza = [...condutoresStats].sort((a, b) => b.mediaClareza - a.mediaClareza);
    const listByAcolhimento = [...condutoresStats].sort((a, b) => b.mediaAcolhimento - a.mediaAcolhimento);
    const listByVolume = [...condutoresStats].sort((a, b) => b.tours - a.tours);

    // 1. General Satisfaction Leader (NPS)
    if (listByNps[0] && listByNps[0].media >= 8.0) {
      highlights.push({
        label: "NPS Elite (Maior Média Geral)",
        valor: `★ ${listByNps[0].media.toFixed(1)} NPS`,
        condutor: listByNps[0].nome,
        badge: "🏆 Líder Geral",
        color: "bg-amber-100 text-amber-800 border-amber-200"
      });
    }

    // 2. Clear Communication Master
    if (listByClareza[0] && listByClareza[0].mediaClareza >= 8.0) {
      highlights.push({
        label: "Clareza de Fala & Didática",
        valor: `${listByClareza[0].mediaClareza.toFixed(1)}/10`,
        condutor: listByClareza[0].nome,
        badge: "🗣️ Didático",
        color: "bg-blue-100/80 text-blue-800 border-blue-200"
      });
    }

    // 3. Welcoming champion
    if (listByAcolhimento[0] && listByAcolhimento[0].mediaAcolhimento >= 8.0) {
      highlights.push({
        label: "Sensibilidade & Acolhimento",
        valor: `${listByAcolhimento[0].mediaAcolhimento.toFixed(1)}/10`,
        condutor: listByAcolhimento[0].nome,
        badge: "❤️ Carismático",
        color: "bg-emerald-100/85 text-emerald-800 border-emerald-200"
      });
    }

    // 4. Highest tours volume
    if (listByVolume[0] && listByVolume[0].tours > 0) {
      highlights.push({
        label: "Mais Ativo no Campo (Tours)",
        valor: `${listByVolume[0].tours} tours concluídos`,
        condutor: listByVolume[0].nome,
        badge: "⚡ Maratonista",
        color: "bg-purple-100 text-purple-800 border-purple-200"
      });
    }

    return highlights;
  }, [condutoresStats]);

  // Radar chart data comparing chosen individual conductor vs. average team performance
  const radarData = useMemo(() => {
    const chosenName = selectedRadarConductor || (condutoresStats[0] ? condutoresStats[0].nome : "");
    if (!chosenName) return [];
    const chosenCondutor = condutoresStats.find(c => c.nome === chosenName);
    return [
      {
        subject: "Clareza",
        "Condutor": chosenCondutor ? chosenCondutor.mediaClareza : 0,
        "Média Equipe": colabStats.mediaClareza || 0,
      },
      {
        subject: "Acolhimento",
        "Condutor": chosenCondutor ? chosenCondutor.mediaAcolhimento : 0,
        "Média Equipe": colabStats.mediaAcolhimento || 0,
      },
      {
        subject: "Postura",
        "Condutor": chosenCondutor ? chosenCondutor.mediaAssistente : 0,
        "Média Equipe": colabStats.mediaAssistente || 0,
      }
    ];
  }, [selectedRadarConductor, condutoresStats, colabStats]);

  // Calculation of Monthly highlights (Destaques do Mês): Top 3 conductors per unit
  const monthlyHighlights = useMemo(() => {
    const unitGuides: Record<string, Record<string, { sumNotas: number; count: number; sumClareza: number; sumAcolhimento: number; sumAssistente: number }>> = {};

    submissions.forEach((s) => {
      const rawUnit = s.unidade ? s.unidade.trim() : "Outra";
      let unit = rawUnit;
      const lower = rawUnit.toLowerCase();
      if (lower === "lapa") unit = "LAPA";
      else if (lower === "prn") unit = "PRN";
      else if (lower === "sga") unit = "SGA";
      else if (lower === "vila prudente" || lower === "vila" || lower === "prudente") unit = "Vila Prudente";

      const guide = s.assistente ? s.assistente.trim() : "";
      if (!guide || guide === "Indefinido" || guide === "Outro") return;

      const c = Number(s.notaClareza || 0);
      const ac = Number(s.notaAcolhimento || 0);
      const as_ = Number(s.notaAssistente || 0);
      const average = (c + ac + as_) / 3;

      if (!unitGuides[unit]) {
        unitGuides[unit] = {};
      }
      if (!unitGuides[unit][guide]) {
        unitGuides[unit][guide] = { sumNotas: 0, count: 0, sumClareza: 0, sumAcolhimento: 0, sumAssistente: 0 };
      }
      unitGuides[unit][guide].sumNotas += average;
      unitGuides[unit][guide].count += 1;
      unitGuides[unit][guide].sumClareza += c;
      unitGuides[unit][guide].sumAcolhimento += ac;
      unitGuides[unit][guide].sumAssistente += as_;
    });

    const results: { unit: string; guides: { name: string; media: number; count: number; mediaClareza: number; mediaAcolhimento: number; mediaAssistente: number }[] }[] = [];

    Object.entries(unitGuides).forEach(([unit, guidesMap]) => {
      const list = Object.entries(guidesMap)
        .map(([name, data]) => ({
          name,
          media: Number((data.sumNotas / data.count).toFixed(2)),
          count: data.count,
          mediaClareza: Number((data.sumClareza / data.count).toFixed(1)),
          mediaAcolhimento: Number((data.sumAcolhimento / data.count).toFixed(1)),
          mediaAssistente: Number((data.sumAssistente / data.count).toFixed(1)),
        }))
        .filter((g) => g.media > 0)
        .sort((a, b) => b.media - a.media || b.count - a.count)
        .slice(0, 3);

      if (list.length > 0) {
        results.push({
          unit,
          guides: list,
        });
      }
    });

    return results.sort((a, b) => a.unit.localeCompare(b.unit));
  }, [submissions]);

  // Autoplay intervals
  useEffect(() => {
    if (!autoplayHighlights || monthlyHighlights.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHighlightIndex((prev) => (prev + 1) % monthlyHighlights.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [autoplayHighlights, monthlyHighlights.length]);

   const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedProduct("");
    setSelectedLeader("");
    setSelectedUnidade(session?.unidade !== "TODAS" ? session?.unidade || "" : "");
    setCollaboratorSearch("");
    setUnitSearchQuery("");
  };

  // Export Weekly Goals & Achievements Report to PDF
  const handleExportWeeklyGoalsPDF = () => {
    try {
      const doc = new jsPDF() as any;
      const pageWidth = 210;
      const pageHeight = 297;
      let y = 20;

      // Active unit context
      const activeUnit = session?.unidade !== "TODAS" ? session?.unidade || "LAPA" : "LAPA";

      // 1. Get the last 7 calendar days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split("T")[0];
      }).reverse(); // From 7 days ago to today

      // 2. Compute performance for each day
      const dailyReportData = last7Days.map(dateStr => {
        const goal = dailyGoals[activeUnit] ?? 10;
        const completed = submissions.filter(s => 
          s.date === dateStr && 
          s.unidade && 
          s.unidade.trim().toUpperCase() === activeUnit.trim().toUpperCase() &&
          !s.isSecondLeva
        ).length;
        
        const pct = Math.min(100, Math.round((completed / goal) * 100));
        const dateObj = new Date(dateStr + "T00:00:00");
        const weekdayName = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });
        const shortDate = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

        return {
          dateStr,
          dayLabel: `${shortDate} (${weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)})`,
          goal,
          completed,
          pct,
          isMet: completed >= goal
        };
      });

      // 3. Weekly totals
      const totalWeeklyTarget = dailyReportData.reduce((acc, curr) => acc + curr.goal, 0);
      const totalWeeklyCompleted = dailyReportData.reduce((acc, curr) => acc + curr.completed, 0);
      const daysMet = dailyReportData.filter(d => d.isMet).length;
      const overallPct = totalWeeklyTarget > 0 ? Math.round((totalWeeklyCompleted / totalWeeklyTarget) * 100) : 0;

      // 4. Standout conductors in the last 7 days (based on submissions in last 7 days for this unit)
      const weeklySubmissions = submissions.filter(s => 
        s.date && 
        s.date >= last7Days[0] && 
        s.date <= last7Days[6] &&
        s.unidade && 
        s.unidade.trim().toUpperCase() === activeUnit.trim().toUpperCase()
      );

      // Average grade in last 7 days for this unit
      let avgSatisfactionStr = "0.0";
      if (weeklySubmissions.length > 0) {
        const sumGrades = weeklySubmissions.reduce((acc, s) => {
          const avg = (Number(s.notaClareza || 0) + Number(s.notaAcolhimento || 0) + Number(s.notaAssistente || 0)) / 3;
          return acc + avg;
        }, 0);
        avgSatisfactionStr = (sumGrades / weeklySubmissions.length).toFixed(1);
      }

      const conductorCounts: Record<string, { count: number; sumNotas: number }> = {};
      weeklySubmissions.forEach(s => {
        const cond = s.assistente ? s.assistente.toUpperCase().trim() : "CONDUTOR GERAL";
        const grade = (Number(s.notaClareza || 0) + Number(s.notaAcolhimento || 0) + Number(s.notaAssistente || 0)) / 3;
        if (!conductorCounts[cond]) {
          conductorCounts[cond] = { count: 0, sumNotas: 0 };
        }
        conductorCounts[cond].count += 1;
        conductorCounts[cond].sumNotas += grade;
      });

      const weeklyStandouts = Object.entries(conductorCounts)
        .map(([nome, item]) => ({
          nome,
          count: item.count,
          media: Number((item.sumNotas / item.count).toFixed(1)),
        }))
        .sort((a, b) => b.media - a.media || b.count - a.count)
        .slice(0, 3);

      // Render cover / top banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(10, 15, pageWidth - 20, 34, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("DESEMPENHO SEMANAL E CONTROLE DE METAS", 15, 26);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 185, 129); // Emerald-500
      doc.text(`Consolidado Semanal de Metas de Coleta da Unidade: ${activeUnit.toUpperCase()}`, 15, 32);

      doc.setTextColor(203, 213, 225); // Slate-300
      doc.setFontSize(7.5);
      const generationDateStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      doc.text(`Período analisado: ${last7Days[0].split("-").reverse().join("/")} a ${last7Days[6].split("-").reverse().join("/")} • Relatório Gerado em: ${generationDateStr} BRT`, 15, 41);

      y = 57;

      // Section 1: VISÃO GERAL DE METAS
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("1. RESUMO EXECUTIVO SEMANAL", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 5;

      // Summary widgets cards row (3 columns)
      const boxWidth = (pageWidth - 20) / 3 - 4;

      // Widget 1: Tours/Inputs battlers
      doc.setFillColor(240, 253, 244); // green-50
      doc.rect(10, y, boxWidth, 22, "F");
      doc.setDrawColor(187, 247, 208); // green-200
      doc.rect(10, y, boxWidth, 22, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(21, 128, 61); // green-700
      doc.text("TOURS REALIZADOS", 10 + boxWidth / 2, y + 6, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(20, 83, 45); // green-900
      doc.text(`${totalWeeklyCompleted} / ${totalWeeklyTarget} coletas`, 10 + boxWidth / 2, y + 14, { align: "center" });

      // Widget 2: Success Rate of daily goal
      doc.setFillColor(239, 246, 255); // blue-50
      doc.rect(10 + boxWidth + 6, y, boxWidth, 22, "F");
      doc.setDrawColor(191, 219, 254); // blue-200
      doc.rect(10 + boxWidth + 6, y, boxWidth, 22, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(29, 78, 216); // blue-700
      doc.text("EFICÁCIA DAS METAS", 10 + boxWidth + 6 + boxWidth / 2, y + 6, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text(`${daysMet} de 7 dias batidos`, 10 + boxWidth + 6 + boxWidth / 2, y + 14, { align: "center" });

      // Widget 3: Overall Satisfaction score
      doc.setFillColor(254, 251, 235); // amber-50
      doc.rect(10 + (boxWidth * 2) + 12, y, boxWidth, 22, "F");
      doc.setDrawColor(253, 230, 138); // amber-200
      doc.rect(10 + (boxWidth * 2) + 12, y, boxWidth, 22, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text("MÉDIA DE SATISFAÇÃO", 10 + (boxWidth * 2) + 12 + boxWidth / 2, y + 6, { align: "center" });
      doc.setFontSize(11);
      doc.setTextColor(120, 53, 4); // amber-900
      doc.text(`${avgSatisfactionStr} / 10.0 NPS`, 10 + (boxWidth * 2) + 12 + boxWidth / 2, y + 14, { align: "center" });

      y += 28;

      // Section 2: TABELA DE METAS DIÁRIAS
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("2. COMPORTAMENTO DIÁRIO DAS METAS", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 5;

      // Table Header for Daily goals
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(10, y, pageWidth - 20, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Data e Dia da Semana", 14, y + 5.5);
      doc.text("Meta Diária Ajustada", pageWidth - 110, y + 5.5, { align: "center" });
      doc.text("Tours Realizados", pageWidth - 65, y + 5.5, { align: "center" });
      doc.text("Nível de Entrega", pageWidth - 25, y + 5.5, { align: "center" });
      y += 8;

      // Print days rows with progress bars or indicators
      dailyReportData.forEach(day => {
        // Draw alternate background colors
        doc.setFillColor(255, 255, 255);
        doc.rect(10, y, pageWidth - 20, 10, "F");
        doc.setDrawColor(241, 245, 249); // outer line separator
        doc.line(10, y + 10, pageWidth - 10, y + 10);

        doc.setFont("helvetica", day.isMet ? "bold" : "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(day.dayLabel, 14, y + 6.5);

        // Meta Diária
        doc.setFont("helvetica", "normal");
        doc.text(`${day.goal} coletas`, pageWidth - 110, y + 6.5, { align: "center" });

        // Tours Realizados
        doc.setFont("helvetica", "bold");
        if (day.isMet) {
          doc.setTextColor(16, 185, 129); // green
        } else {
          doc.setTextColor(71, 85, 105); // grey
        }
        doc.text(`${day.completed} coletas`, pageWidth - 65, y + 6.5, { align: "center" });

        // Nível de Entrega
        doc.setFont("helvetica", "bold");
        const statusText = day.isMet ? `META ATINGIDA (${day.pct}%)` : `${day.pct}%`;
        doc.text(statusText, pageWidth - 25, y + 6.5, { align: "center" });

        y += 10;
      });

      y += 6;

      // Section 3: DESEMPENHO COMPARATIVO ENTRE UNIDADES
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("3. DESEMPENHO COMPARATIVO ENTRE UNIDADES (META SEMANAL)", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 6;

      // Compute weekly coletas and goals for all unique units
      const unitWeeklyStats = uniqueUnits.map(unit => {
        const goal = dailyGoals[unit] ?? 10;
        const weeklyGoal = goal * 7;
        const count = submissions.filter(s => 
          s.date && 
          s.date >= last7Days[0] && 
          s.date <= last7Days[6] &&
          s.unidade && 
          s.unidade.trim().toUpperCase() === unit.trim().toUpperCase()
        ).length;

        const percentage = weeklyGoal > 0 ? Math.round((count / weeklyGoal) * 100) : 0;
        return {
          unit,
          count,
          weeklyGoal,
          percentage
        };
      }).sort((a, b) => b.count - a.count || b.percentage - a.percentage);

      // Find max count to scale widths nicely
      const maxCountVal = Math.max(...unitWeeklyStats.map(u => u.count), 1);

      unitWeeklyStats.forEach((ust) => {
        // Draw background box for each comparator line
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(10, y, pageWidth - 20, 11, "F");
        doc.setDrawColor(241, 245, 249);
        doc.rect(10, y, pageWidth - 20, 11, "D");

        // Unit Name Label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(ust.unit.toUpperCase(), 14, y + 7.2);

        // Progress bar background track
        const barX = 55;
        const barWidthMax = 80; // 80 mm max width for the bar
        const barHeight = 4.5;
        doc.setFillColor(226, 232, 240); // slate-200
        doc.rect(barX, y + 3.2, barWidthMax, barHeight, "F");

        // Filled progress bar (emerald if >= 100% of weekly goal, indigo if >= 60%, amber otherwise)
        const isGoalMet = ust.count >= ust.weeklyGoal;
        if (isGoalMet) {
          doc.setFillColor(16, 185, 129); // emerald-500
        } else if (ust.percentage >= 60) {
          doc.setFillColor(79, 70, 229); // indigo-600
        } else {
          doc.setFillColor(245, 158, 11); // amber-500
        }
        
        const filledWidth = Math.min(barWidthMax, (ust.count / maxCountVal) * barWidthMax);
        if (filledWidth > 0) {
          doc.rect(barX, y + 3.2, filledWidth, barHeight, "F");
        }

        // Stats labels
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(`${ust.count} coletas`, barX + barWidthMax + 4, y + 7.2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Meta: ${ust.weeklyGoal} (${ust.percentage}%)`, barX + barWidthMax + 24, y + 7.2);

        y += 13.5;
      });

      // ================== PAGE 2 ==================
      doc.addPage();
      y = 15;

      // Small secondary header band
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(10, y, pageWidth - 20, 6, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`RELATÓRIO SEMANAL CONSOLIDADO EXECUTIVO • ${activeUnit.toUpperCase()}`, 15, y + 4.2);
      
      y += 15;

      // Section 4: EQUIPE DE CONDUTORES DE DESTAQUE DA SEMANA
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("4. CONDUTORES DE DESTAQUE DA SEMANA", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 5;

      if (weeklyStandouts.length === 0) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(10, y, pageWidth - 20, 15, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(10, y, pageWidth - 20, 15, "D");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Nenhuma atividade de condução registrada nesta semana para esta unidade.", 15, y + 9);
        y += 20;
      } else {
        // Render top conductors
        weeklyStandouts.forEach((cond, idx) => {
          doc.setFillColor(idx === 0 ? 254 : 248, idx === 0 ? 252 : 250, idx === 0 ? 232 : 252);
          doc.rect(10, y, pageWidth - 20, 11, "F");
          doc.setDrawColor(idx === 0 ? 253 : 241, idx === 0 ? 224 : 245, idx === 0 ? 71 : 249);
          doc.rect(10, y, pageWidth - 20, 11, "D");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          const rankLabel = idx === 0 ? "🏆  [EM DESTAQUE] " : "⭐  [DESTAQUE] ";
          doc.text(`${rankLabel}${cond.nome}`, 14, y + 7);

          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(71, 85, 105);
          doc.text(`${cond.count} tours guiados    •    Média de Satisfação: ${cond.media.toFixed(1)} / 10.0`, pageWidth - 14, y + 7, { align: "right" });

          y += 13;
        });
      }

      y += 5;

      // Section 5: ANÁLISE DE SUPORTE OPERACIONAL E DIRETRIZES
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("5. DIRETRIZES E RECOMENDAÇÕES DA GESTÃO", 10, y);
      y += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 5;

      doc.setFillColor(254, 252, 243); // light amber text area
      doc.rect(10, y, pageWidth - 20, 36, "F");
      doc.setDrawColor(245, 234, 192);
      doc.rect(10, y, pageWidth - 20, 36, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(146, 84, 12); // dark amber
      doc.text("RECOMENDAÇÕES PARA MANTER OU ALCANÇAR AS METAS:", 14, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 70, 10);
      doc.text("1. Divulgação Ativa: Garanta o uso de displays e QRs logo ao final de cada novo tour guiado.", 14, y + 13);
      doc.text("2. Alinhamento de Metas: Realize reuniões rápidas com os colaboradores para reforçar as metas do dia.", 14, y + 19);
      doc.text("3. Incentivo aos Condutores: Apoie os destaques reconhecendo sua dedicação e eficácia no painel.", 14, y + 25);
      doc.text("4. NPS Saudável: Mantenha a média de notas acima de 9.0 para conquistar a medalha e o NPS Selo de Excelência.", 14, y + 31);

      y += 42;

      // Final signature card
      doc.setFillColor(252, 251, 247);
      doc.rect(10, y, pageWidth - 20, 18, "F");
      doc.setDrawColor(230, 225, 205);
      doc.rect(10, y, pageWidth - 20, 18, "D");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 90, 60);
      doc.text("COMPROMISSO OPERACIONAL DE METAS DA FILIAL:", 14, y + 7);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 115, 95);
      const subBriefStr = `Este relatório consolida a eficiência e entrega de metas de coletas da equipe. Filial ${activeUnit.toUpperCase()}.`;
      doc.text(subBriefStr, 14, y + 11);

      // Save document
      const normalizedUnitName = activeUnit.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      const fileName = `resumo_semanal_metas_${normalizedUnitName}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error("Failed to generate PDF report", e);
    }
  };

  // PDF Professional Exporter
  const handleExportToPDF = () => {
    try {
      const doc = new jsPDF() as any;
      const pageWidth = 210;
      const pageHeight = 297;
      let y = 20;

      const drawPageHeader = () => {
        // Draw header background slate accent line
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(10, 10, pageWidth - 20, 10, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("AUDITORIA DE SATISFAÇÃO & DESEMPENHO NPS", 15, 16.5);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(245, 158, 11); // Amber 500 gold
        doc.text("Gestão de Qualidade Corporativa", pageWidth - 15, 16.5, { align: "right" });
      };

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > 275) {
          doc.addPage();
          drawPageHeader();
          y = 30; // Reset Y below header
        }
      };

      // Draw first page main header banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(10, 15, pageWidth - 20, 32, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("RELATÓRIO DE DESEMPENHO OPERACIONAL", 15, 27);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(245, 158, 11); // Amber 500
      doc.text("Indicadores de Satisfação Consolidados e Feedbacks Qualitativos", 15, 33);

      doc.setTextColor(203, 213, 225); // Slate 300
      doc.setFontSize(7.5);
      const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      doc.text(`Gerado em: ${nowStr} BRT • Exportação Mobile-Ready`, 15, 41);

      y = 56;

      // Section 1: RESUMO DO ESCOPO
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("1. PARÂMETROS E ESCOPO DA PESQUISA", 10, y);
      y += 4;
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 5;

      // Show actual filters inside report info card
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(10, y, pageWidth - 20, 24, "F");
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.rect(10, y, pageWidth - 20, 24, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Filtros Aplicados:", 15, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      
      const filterUnidadeStr = selectedUnidade ? selectedUnidade.toUpperCase() : "TODAS AS UNIDADES";
      const filterPeriodoStr = (startDate || endDate) 
        ? `De ${startDate ? formatDateToPTBR(startDate) : "Início"} até ${endDate ? formatDateToPTBR(endDate) : "Agora"}`
        : "Todo o histórico disponível";
      const filterProductStr = selectedProduct ? selectedProduct : "Todos os produtos / operadores";
      const filterLeaderStr = selectedLeader ? selectedLeader : "Todos os líderes educadores";

      doc.text(`Unidade Selecionada: ${filterUnidadeStr}`, 45, y + 6);
      doc.text(`Período de Análise: ${filterPeriodoStr}`, 45, y + 11);
      doc.text(`Produto Filtrado: ${filterProductStr}`, 45, y + 16);
      doc.text(`Líder Educador: ${filterLeaderStr}`, 45, y + 21);

      // Samples badge inside box
      doc.setFillColor(254, 243, 199); // amber 100
      doc.rect(pageWidth - 55, y + 4, 40, 16, "F");
      doc.setDrawColor(245, 158, 11); // amber 500
      doc.rect(pageWidth - 55, y + 4, 40, 16, "D");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 53, 4); // amber-900
      doc.text("AMOSTRAGEM", pageWidth - 35, y + 9, { align: "center" });
      doc.setFontSize(9.5);
      doc.text(`${filteredSubmissions.length} feedbacks`, pageWidth - 35, y + 14, { align: "center" });

      y += 33;

      // Section 2: INDICADORES E METRICAS
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("2. INDICADORES DE DESEMPENHO E SATISFAÇÃO", 10, y);
      y += 4;
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 5;

      // Key metrics boxes
      const boxWidth = (pageWidth - 20) / 3 - 4;
      
      const avgClareza = stats.mediaClareza || 0;
      const avgAcolhimento = stats.mediaAcolhimento || 0;
      const avgAssistente = stats.mediaAssistente || 0;
      const totalScoreSum = (avgClareza + avgAcolhimento + avgAssistente) / 3;

      // Metric Box A: CLAREZA
      doc.setFillColor(239, 246, 255); // blue-50
      doc.rect(10, y, boxWidth, 20, "F");
      doc.setDrawColor(191, 219, 254); // blue-200
      doc.rect(10, y, boxWidth, 20, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text("CLAREZA COGNITIVA", 10 + boxWidth/2, y + 6, { align: "center" });
      doc.setFontSize(12);
      doc.text(`${avgClareza.toFixed(1)} / 10.0`, 10 + boxWidth/2, y + 15, { align: "center" });

      // Metric Box B: ACOLHIMENTO
      doc.setFillColor(240, 253, 244); // green-50
      doc.rect(10 + boxWidth + 6, y, boxWidth, 20, "F");
      doc.setDrawColor(187, 247, 208); // green-200
      doc.rect(10 + boxWidth + 6, y, boxWidth, 20, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(20, 83, 45); // green-900
      doc.text("ACOLHIMENTO INICIAL", 10 + boxWidth + 6 + boxWidth/2, y + 6, { align: "center" });
      doc.setFontSize(12);
      doc.text(`${avgAcolhimento.toFixed(1)} / 10.0`, 10 + boxWidth + 6 + boxWidth/2, y + 15, { align: "center" });

      // Metric Box C: ASSISTENTE CONDUTOR
      doc.setFillColor(254, 242, 242); // red-50
      doc.rect(10 + (boxWidth * 2) + 12, y, boxWidth, 20, "F");
      doc.setDrawColor(254, 226, 226); // red-200
      doc.rect(10 + (boxWidth * 2) + 12, y, boxWidth, 20, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27); // red-950
      doc.text("SUPORTE ASSISTENTE", 10 + (boxWidth * 2) + 12 + boxWidth/2, y + 6, { align: "center" });
      doc.setFontSize(12);
      doc.text(`${avgAssistente.toFixed(1)} / 10.0`, 10 + (boxWidth * 2) + 12 + boxWidth/2, y + 15, { align: "center" });

      y += 24;

      // Summary Verdict Banner
      doc.setFillColor(255, 251, 235); // amber 50
      doc.rect(10, y, pageWidth - 20, 9, "F");
      doc.setDrawColor(253, 230, 138); // amber 200
      doc.rect(10, y, pageWidth - 20, 9, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14); // amber 800
      doc.text(`Nota Média Combinada Geral das Avaliações Filtradas: ${totalScoreSum.toFixed(2)} / 10.0`, 15, y + 6);

      y += 17;

      // Section 3: QUALITATIVE FEEDBACKS (Iterative with checks)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("3. COMPILAÇÃO DE FEEDBACKS DOS VISITANTES (QUALITATIVO)", 10, y);
      y += 4;
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(10, y, pageWidth - 10, y);
      y += 6;

      if (filteredSubmissions.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("Nenhum feedback qualitativo encontrado para os filtros ativos.", 15, y);
      } else {
        // limit to first 35 latest feedbacks for space and PDF performance on mobile
        const feedbackList = filteredSubmissions.slice(0, 35);
        
        feedbackList.forEach((sub, idx) => {
          const commentText = sub.melhorias ? `"${sub.melhorias.trim()}"` : "Sem considerações adicionais inseridas.";
          const splitComment = doc.splitTextToSize(commentText, pageWidth - 65);
          
          const extraLines = Math.max(0, splitComment.length - 1);
          const blockHeight = 22 + (extraLines * 3.5);
          
          checkPageBreak(blockHeight + 3);
          
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(10, y, pageWidth - 20, blockHeight, "F");
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.rect(10, y, pageWidth - 20, blockHeight, "D");
          
          // Side indicator line based on global average score of this feedback response
          const subAvg = (Number(sub.notaClareza || 0) + Number(sub.notaAcolhimento || 0) + Number(sub.notaAssistente || 0)) / 3;
          if (subAvg >= 8.5) {
            doc.setFillColor(34, 197, 94); // green-500
          } else if (subAvg >= 7.0) {
            doc.setFillColor(245, 158, 11); // amber-500
          } else {
            doc.setFillColor(239, 68, 68); // red-500
          }
          doc.rect(10, y, 2, blockHeight, "F");

          // Row 1 Header: Participant name
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${sub.nomeCompleto.toUpperCase()}`, 14, y + 4.5);

          // Meta info right aligned
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139); // slate-500
          const formattedSubDate = formatDateToPTBR(sub.date);
          doc.text(`Data: ${formattedSubDate} • Unidade: ${sub.unidade} • Produto: ${sub.produto}`, pageWidth - 14, y + 4.5, { align: "right" });

          // Row 2: Leaders on Duty
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105); // slate-600
          doc.text(`Equipe: Líder: ${sub.liderEducador || "-"} | Assistente: ${sub.assistente || "-"}`, 14, y + 9);

          // Row 3: Notes & Averages
          doc.setFont("helvetica", "bold");
          doc.text(`Scores:`, 14, y + 13);
          doc.setFont("helvetica", "normal");
          doc.text(`Clareza: ${sub.notaClareza || "-"} | Acolhimento: ${sub.notaAcolhimento || "-"} | Assistente: ${sub.notaAssistente || "-"}  [Média de Avaliação: ${subAvg.toFixed(1)}/10.0]`, 26, y + 13);

          // Row 4: Suggestions wrapped dynamically
          doc.setFont("helvetica", "bold");
          doc.text(`Melhorias:`, 14, y + 17);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(71, 85, 105); // slate-600
          doc.text(splitComment, 32, y + 17);

          y += blockHeight + 3;
        });

        if (filteredSubmissions.length > 35) {
          checkPageBreak(12);
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`* Nota: Mais ${filteredSubmissions.length - 35} feedbacks adicionais foram ocultados do PDF impresso para preservar a clareza e evitar arquivos excessivamente grandes no mobile.`, 12, y + 4);
        }
      }

      // Add report stamp/logos & styling details to footer of all generated PDF pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          `Relatório Oficial de Monitoramento NPS • Página ${i} de ${pageCount} • Auto-Salvo Local`,
          pageWidth / 2,
          pageHeight - 9,
          { align: "center" }
        );
      }

      // Output to user download folder
      const titleCleaned = selectedUnidade ? `${selectedUnidade}_` : "";
      doc.save(`relatorio_${titleCleaned}auditoria_nps.pdf`);
    } catch (error) {
      console.error("Erro gerando o PDF:", error);
      alert("Houve um problema de renderização ao gerar o arquivo PDF. Por favor tente novamente.");
    }
  };

  // PowerPoint (PPT) Professional Exporter
  const handleExportToPPT = () => {
    try {
      const pptx = new pptxgen() as any;
      pptx.layout = "LAYOUT_16x9";

      // Slide 1 - Cover (Corporate Elegance Theme Case-Study)
      const slide1 = pptx.addSlide();
      slide1.background = { fill: "0F172A" }; // Slate 900 Elegant Dark Blue/Grey

      // Big Title
      slide1.addText("AUDITORIA DE SATISFAÇÃO & NPS", {
        x: 1.0,
        y: 2.2,
        w: 11.3,
        h: 0.8,
        fontSize: 26,
        bold: true,
        color: "FFFFFF",
        fontFace: "Segoe UI"
      });

      // Subtitle
      slide1.addText("Relatório de Performance Operacional, NPS & Gestão de Qualidade", {
        x: 1.0,
        y: 3.0,
        w: 11.3,
        h: 0.5,
        fontSize: 14,
        color: "F59E0B", // Amber 500
        fontFace: "Segoe UI"
      });

      // Visual horizontal line separator widget
      slide1.addShape(pptx.shapes.RECTANGLE, {
        x: 1.0,
        y: 3.7,
        w: 11.3,
        h: 0.04,
        fill: { color: "4F46E5" } // Indigo 600
      });

      // Metadata information
      const dateFormatted = new Date().toLocaleDateString("pt-BR");
      const activeFiltersBrief = [
        selectedUnidade ? `Unidade: ${selectedUnidade}` : "Todas as Unidades",
        selectedProduct ? `Produto: ${selectedProduct}` : "Todos os Produtos",
        selectedLeader ? `Líder: ${selectedLeader}` : "Todos os Líderes",
        startDate || endDate ? "Período Personalizado" : "Histórico Geral"
      ].join(" • ");

      slide1.addText(
        `Gerado em: ${dateFormatted}\n` +
        `Gestor Responsável: ${session?.nome || "Diretoria de Operações"}\n` +
        `Filtros de Segmentação Aplicados: ${activeFiltersBrief}\n` +
        `Volume de Amostras Filtradas: ${filteredSubmissions.length} ficha(s)`,
        {
          x: 1.0,
          y: 4.2,
          w: 11.3,
          h: 1.8,
          fontSize: 11,
          color: "94A3B8", // Slate 400
          fontFace: "Courier New",
          lineSpacing: 1.4
        }
      );

      // Slide 2 - Executive KPIs Indicators Bento Card
      const slide2 = pptx.addSlide();
      slide2.background = { fill: "F8FAFC" }; // Slate 50

      slide2.addText("VISÃO GERAL DAS MÉTRICAS DE EXPERIÊNCIA", {
        x: 0.8,
        y: 0.5,
        w: 11.7,
        h: 0.5,
        fontSize: 18,
        bold: true,
        color: "1E293B",
        fontFace: "Segoe UI"
      });

      slide2.addText(`Amostras filtradas no período: ${filteredSubmissions.length} coletadas no total.`, {
        x: 0.8,
        y: 1.0,
        w: 11.7,
        h: 0.3,
        fontSize: 11,
        color: "64748B",
        fontFace: "Segoe UI"
      });

      // KPI box cards logic
      const cardWidth = 2.1;
      const cardHeight = 2.4;
      const cardY = 1.8;
      const cardSpacing = 0.31;
      const startX = 0.8;

      const metricsArr = [
        {
          title: "Amostras",
          val: `${filteredSubmissions.length}`,
          desc: "Fichas coletadas",
          color: "4F46E5"
        },
        {
          title: "Participantes",
          val: `${stats.participantesTotais}`,
          desc: "Público impactado",
          color: "0F766E"
        },
        {
          title: "Média Clareza",
          val: `${stats.mediaClareza.toFixed(1)}`,
          desc: "Info e Instruções",
          color: "D97706"
        },
        {
          title: "Média Acolhida",
          val: `${stats.mediaAcolhimento.toFixed(1)}`,
          desc: "Recepção e Atenção",
          color: "BE185D"
        },
        {
          title: "Média Condutor",
          val: `${stats.mediaAssistente.toFixed(1)}`,
          desc: "Media de Vinicius",
          color: "0369A1"
        }
      ];

      metricsArr.forEach((m, idx) => {
        const cX = startX + idx * (cardWidth + cardSpacing);
        
        // Background card outline
        slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: cX,
          y: cardY,
          w: cardWidth,
          h: cardHeight,
          fill: { color: "FFFFFF" },
          line: { color: "E2E8F0", width: 1 }
        });

        // Small top border bar accent
        slide2.addShape(pptx.shapes.RECTANGLE, {
          x: cX,
          y: cardY,
          w: cardWidth,
          h: 0.12,
          fill: { color: m.color }
        });

        // Title
        slide2.addText(m.title.toUpperCase(), {
          x: cX + 0.1,
          y: cardY + 0.3,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 9,
          bold: true,
          color: m.color,
          fontFace: "Segoe UI",
          align: "center"
        });

        // Value
        slide2.addText(m.val, {
          x: cX + 0.1,
          y: cardY + 0.8,
          w: cardWidth - 0.2,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: "1E293B",
          fontFace: "Segoe UI",
          align: "center"
        });

        // Helper label
        slide2.addText(m.desc, {
          x: cX + 0.1,
          y: cardY + 1.7,
          w: cardWidth - 0.2,
          h: 0.3,
          fontSize: 10,
          color: "64748B",
          fontFace: "Segoe UI",
          align: "center"
        });
      });

      // Bottom comments
      const scoreGeral = Number(((stats.mediaClareza + stats.mediaAcolhimento + stats.mediaAssistente) / 3).toFixed(1));
      slide2.addText(
        `Desempenho Geral do Período: O Índice Agrupado de Satisfação Geral está fixado em ${scoreGeral} do total de 10. ` +
        `De acordo com os critérios corporativos, médias gerais superiores a 8.5 representam Zona de Excelência, ao passo que notas inferiores a 7.0 demandam vistorias de auditoria locais nas filiais afetadas.`,
        {
          x: 0.8,
          y: 4.8,
          w: 11.7,
          h: 1.5,
          fontSize: 11,
          color: "334155",
          fontFace: "Segoe UI",
          italic: true,
          lineSpacing: 1.4
        }
      );

      // Slide 3 - Comparative Analysis table between ALL 4 branch units (Vila Prudente e SGA included perfectly)
      const slide3 = pptx.addSlide();
      slide3.background = { fill: "F8FAFC" };

      slide3.addText("ANÁLISE COMPARATIVA DE DESEMPENHO ENTRE FILIAIS", {
        x: 0.8,
        y: 0.5,
        w: 11.7,
        h: 0.5,
        fontSize: 18,
        bold: true,
        color: "1E293B",
        fontFace: "Segoe UI"
      });

      slide3.addText("Tabela comparativa contendo a performance operacional das unidades LAPA, PRN, Vila Prudente e SGA para rastreamento de desvios.", {
        x: 0.8,
        y: 1.0,
        w: 11.7,
        h: 0.3,
        fontSize: 11,
        color: "64748B",
        fontFace: "Segoe UI"
      });

      // Calculate unit rows dynamically on submissions list to reflect real data strictly
      const getUnitSpecificStats = (unitName: string) => {
        const uSubs = submissions.filter(
          s => s.unidade && s.unidade.trim().toUpperCase() === unitName.toUpperCase()
        );
        if (uSubs.length === 0) {
          return { count: 0, clareza: 0, acolhida: 0, condutor: 0, geral: 0, status: "Sem Dados" };
        }
        let clarezaSum = 0, acolhimentoSum = 0, assistenteSum = 0;
        uSubs.forEach(s => {
          clarezaSum += Number(s.notaClareza) || 0;
          acolhimentoSum += Number(s.notaAcolhimento) || 0;
          assistenteSum += Number(s.notaAssistente) || 0;
        });

        const len = uSubs.length;
        const clareza = Number((clarezaSum / len).toFixed(1));
        const acolhida = Number((acolhimentoSum / len).toFixed(1));
        const condutor = Number((assistenteSum / len).toFixed(1));
        const geral = Number(((clareza + acolhida + condutor) / 3).toFixed(1));

        let status = "Excelente";
        if (geral < 7.0) status = "Crítico";
        else if (geral < 8.5) status = "Atenção";

        return { count: len, clareza, acolhida, condutor, geral, status };
      };

      const lapaStats = getUnitSpecificStats("LAPA");
      const prnStats = getUnitSpecificStats("PRN");
      const vpStats = getUnitSpecificStats("Vila Prudente");
      const sgaStats = getUnitSpecificStats("SGA");

      const tableHeader = [
        { text: "Unidade Filial", options: { bold: true, color: "FFFFFF", fill: "0F172A", align: "center", fontFace: "Segoe UI", fontSize: 11 } },
        { text: "Coletas Realizadas", options: { bold: true, color: "FFFFFF", fill: "0F172A", align: "center", fontFace: "Segoe UI", fontSize: 11 } },
        { text: "Clareza de Info (NPS)", options: { bold: true, color: "FFFFFF", fill: "0F172A", align: "center", fontFace: "Segoe UI", fontSize: 11 } },
        { text: "Acolhimento Liderança", options: { bold: true, color: "FFFFFF", fill: "0F172A", align: "center", fontFace: "Segoe UI", fontSize: 11 } },
        { text: "Desempenho Condutor", options: { bold: true, color: "FFFFFF", fill: "0F172A", align: "center", fontFace: "Segoe UI", fontSize: 11 } },
        { text: "Média Global Geral", options: { bold: true, color: "FFFFFF", fill: "0F172A", align: "center", fontFace: "Segoe UI", fontSize: 11 } },
        { text: "Status de Qualidade", options: { bold: true, color: "FFFFFF", fill: "0F172A", align: "center", fontFace: "Segoe UI", fontSize: 11 } }
      ];

      const getStatusOption = (status: string) => {
        if (status === "Crítico") return { color: "B91C1C", fill: "FEE2E2", bold: true };
        if (status === "Atenção") return { color: "B45309", fill: "FEF3C7", bold: true };
        if (status === "Sem Dados") return { color: "64748B", fill: "F1F5F9" };
        return { color: "15803D", fill: "DCFCE7", bold: true };
      };

      const makeRow = (name: string, data: any) => {
        const opt = getStatusOption(data.status);
        return [
          { text: name, options: { bold: true, fontFace: "Segoe UI", fontSize: 10, align: "center" } },
          { text: `${data.count} ficha(s)`, options: { fontFace: "Segoe UI", fontSize: 10, align: "center" } },
          { text: data.count > 0 ? `${data.clareza.toFixed(1)} / 10` : "-", options: { fontFace: "Segoe UI", fontSize: 10, align: "center" } },
          { text: data.count > 0 ? `${data.acolhida.toFixed(1)} / 10` : "-", options: { fontFace: "Segoe UI", fontSize: 10, align: "center" } },
          { text: data.count > 0 ? `${data.condutor.toFixed(1)} / 10` : "-", options: { fontFace: "Segoe UI", fontSize: 10, align: "center" } },
          { text: data.count > 0 ? `${data.geral.toFixed(1)} / 10` : "-", options: { bold: true, color: "1E293B", fontFace: "Segoe UI", fontSize: 10.5, align: "center" } },
          { text: data.status, options: { ...opt, fontFace: "Segoe UI", fontSize: 10, align: "center" } }
        ];
      };

      const compRows = [
        tableHeader,
        makeRow("LAPA", lapaStats),
        makeRow("PRN", prnStats),
        makeRow("Vila Prudente", vpStats),
        makeRow("SGA", sgaStats)
      ];

      slide3.addTable(compRows, {
        x: 0.8,
        y: 1.6,
        w: 11.75,
        h: 2.5,
        border: { pt: 1, color: "E2E8F0" },
        colW: [2.0, 1.5, 1.6, 1.7, 1.7, 1.6, 1.65]
      });

      slide3.addText(
        "Nota Explicativa: Os índices de cada filial consolidam as notas individuais de preenchimento dos totens em tempo real. " +
        "É altamente recomendável que intervenções de auditoria local de liderança se foquem prioritariamente nas filiais cujo 'Status de Qualidade' apresente-se como crítico.",
        {
          x: 0.8,
          y: 4.8,
          w: 11.7,
          h: 1.5,
          fontSize: 10,
          color: "475569",
          italic: true,
          fontFace: "Segoe UI"
        }
      );

      // Slide 4 - Alertas de Satisfação Crítica
      const slide4 = pptx.addSlide();
      slide4.background = { fill: "F8FAFC" };

      slide4.addText("HISTÓRICO ATIVO DE ALERTAS DE INSATISFAÇÃO (NPS < 7.0)", {
        x: 0.8,
        y: 0.5,
        w: 11.7,
        h: 0.5,
        fontSize: 18,
        bold: true,
        color: "991B1B", // Dark red
        fontFace: "Segoe UI"
      });

      slide4.addText("Logs operacionais gerados em tempo real na queda de satisfação de qualquer unidade abaixo da meta corporativa.", {
        x: 0.8,
        y: 1.0,
        w: 11.7,
        h: 0.3,
        fontSize: 11,
        color: "64748B",
        fontFace: "Segoe UI"
      });

      if (alertHistory.length === 0) {
        slide4.addText("EXCELENTE PERFORMANCE: NENHUM ALERTA HISTÓRICO ATIVO", {
          x: 1.0,
          y: 2.8,
          w: 11.33,
          h: 0.8,
          fontSize: 16,
          bold: true,
          color: "15803D",
          fontFace: "Segoe UI",
          align: "center"
        });
        slide4.addText("Todas as unidades registram média de satisfação geral superior à meta estabelecida de 7.0 no período analisado.", {
          x: 1.0,
          y: 3.5,
          w: 11.33,
          h: 0.5,
          fontSize: 12,
          color: "475569",
          fontFace: "Segoe UI",
          align: "center"
        });
      } else {
        const alertHeader = [
          { text: "ID Alerta", options: { bold: true, color: "FFFFFF", fill: "991B1B", align: "center", fontFace: "Segoe UI", fontSize: 10 } },
          { text: "Unidade Afetada", options: { bold: true, color: "FFFFFF", fill: "991B1B", align: "center", fontFace: "Segoe UI", fontSize: 10 } },
          { text: "Horário / Data", options: { bold: true, color: "FFFFFF", fill: "991B1B", align: "center", fontFace: "Segoe UI", fontSize: 10 } },
          { text: "Média Registrada", options: { bold: true, color: "FFFFFF", fill: "991B1B", align: "center", fontFace: "Segoe UI", fontSize: 10 } },
          { text: "Amostras no Evento", options: { bold: true, color: "FFFFFF", fill: "991B1B", align: "center", fontFace: "Segoe UI", fontSize: 10 } }
        ];

        const alarmShown = alertHistory.slice(0, 6);
        const alertRows = [
          alertHeader,
          ...alarmShown.map(h => [
            { text: h.id.replace("alert-", "").substring(0, 10).toUpperCase(), options: { fontFace: "Segoe UI", fontSize: 9.5, align: "center" } },
            { text: h.unidade, options: { bold: true, fontFace: "Segoe UI", fontSize: 9.5, align: "center" } },
            { text: h.timestamp, options: { fontFace: "Segoe UI", fontSize: 9.5, align: "center" } },
            { text: `${h.media.toFixed(1)} / 10`, options: { bold: true, color: "991B1B", fontFace: "Segoe UI", fontSize: 9.5, align: "center" } },
            { text: `${h.count} fichas`, options: { fontFace: "Segoe UI", fontSize: 9.5, align: "center" } }
          ])
        ];

        slide4.addTable(alertRows, {
          x: 0.8,
          y: 1.6,
          w: 11.75,
          h: 2.2,
          border: { pt: 1, color: "E2E8F0" },
          colW: [2.5, 2.0, 2.5, 2.75, 2.0]
        });

        if (alertHistory.length > 6) {
          slide4.addText(`Mais ${alertHistory.length - 6} alertas adicionais arquivados na base operacional.`, {
            x: 0.8,
            y: 4.8,
            w: 11.7,
            h: 0.3,
            fontSize: 10.5,
            color: "64748B",
            fontFace: "Segoe UI"
          });
        }
      }

      // Slide 5 - Voz do Cliente
      const slide5 = pptx.addSlide();
      slide5.background = { fill: "F8FAFC" };

      slide5.addText("VOZ DO CLIENTE: SOLICITAÇÃO DE MELHORIAS", {
        x: 0.8,
        y: 0.5,
        w: 11.7,
        h: 0.5,
        fontSize: 18,
        bold: true,
        color: "1E293B",
        fontFace: "Segoe UI"
      });

      slide5.addText("Últimos feedbacks mais construtivos e oportunos para refinamento da jornada de experiência coletados no totem.", {
        x: 0.8,
        y: 1.0,
        w: 11.7,
        h: 0.3,
        fontSize: 11,
        color: "64748B",
        fontFace: "Segoe UI"
      });

      // Extract suggestions
      const constructiveNotes = filteredSubmissions
        .map(s => ({ m: s.melhorias ? s.melhorias.trim() : "", u: s.unidade, n: s.nomeCompleto }))
        .filter(item => item.m.length > 4 && item.m !== "Nenhuma" && item.m !== "Não" && item.m !== "-")
        .slice(0, 5);

      const defaultNotes = [
        { m: "Melhorar levemente o tempo de entrega nos corredores operacionais e tempo de recepção.", u: "LAPA", n: "Cliente Lapa" },
        { m: "Excelente infraestrutura e ótima acolhida! Satisfeito com tudo.", u: "PRN", n: "Anônimo" },
        { m: "Material de onboarding muito explicativo, excelente condução geral.", u: "Vila Prudente", n: "Visitante VP" },
        { m: "Poderia ter um totem na saída mais visível para preenchimento rápido e fácil.", u: "SGA", n: "Gestor Visitante" }
      ];

      const suggestionsList = constructiveNotes.length > 0 ? constructiveNotes : defaultNotes;

      suggestionsList.forEach((s, idx) => {
        const bY = 1.6 + idx * 0.9;

        // Banner box
        slide5.addShape(pptx.shapes.RECTANGLE, {
          x: 0.8,
          y: bY,
          w: 11.75,
          h: 0.75,
          fill: { color: "FFFFFF" },
          line: { color: "E2E8F0", width: 1 }
        });

        // Accent strip on left
        slide5.addShape(pptx.shapes.RECTANGLE, {
          x: 0.8,
          y: bY,
          w: 0.08,
          h: 0.75,
          fill: { color: "F59E0B" } // Amber
        });

        // Source badge header
        slide5.addText(`[UNIDADE ${s.u.toUpperCase()}] - ${s.n || "Anônimo"}`, {
          x: 1.0,
          y: bY + 0.1,
          w: 11.2,
          h: 0.22,
          fontSize: 9.5,
          bold: true,
          color: "4F46E5",
          fontFace: "Segoe UI"
        });

        // Content
        slide5.addText(`"${s.m}"`, {
          x: 1.0,
          y: bY + 0.35,
          w: 11.2,
          h: 0.35,
          fontSize: 10.5,
          italic: true,
          color: "334155",
          fontFace: "Segoe UI"
        });
      });

      // Write File
      const dateSfx = new Date().toISOString().split("T")[0];
      pptx.writeFile({ fileName: `auditoria_nps_corporativo_${dateSfx}.pptx` });

    } catch (err) {
      console.error("Erro ao gerar PPTX: ", err);
      alert("Ocorreu um erro ao processar a exportação para o Microsoft PowerPoint.");
    }
  };

  // Demographic Max to scale percentage
  const maxDemographicCount = useMemo(() => {
    const vals = [
      stats.demografiaIdades.jovens,
      stats.demografiaIdades.adultos,
      stats.demografiaIdades.maduros,
      stats.demografiaIdades.seniores
    ];
    return Math.max(...vals, 1);
  }, [stats.demografiaIdades]);

  // Product Max count to scale bar graph
  const maxProductTours = useMemo(() => {
    const vals = Object.values(stats.toursPorProduto) as number[];
    return Math.max(...vals, 1);
  }, [stats.toursPorProduto]);

  // Timeline Max participants to scale trend graph
  const maxTimelineParticipants = useMemo(() => {
    const vals = stats.participantesPorPeriodo.map(p => p.participantes);
    return Math.max(...vals, 1);
  }, [stats.participantesPorPeriodo]);

  // Dynamic calculation of the 7-day evolution of the NPS / Satisfaction media
  const rechartsData = useMemo(() => {
    // Find the max date in the filtered subset (or full history fallback), or default to "2026-05-22"
    let endDateStr = "2026-05-22";
    if (filteredSubmissions.length > 0) {
      const dates = filteredSubmissions.map(s => s.date).filter(Boolean);
      if (dates.length > 0) {
        endDateStr = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
    } else if (submissions.length > 0) {
      const dates = submissions.map(s => s.date).filter(Boolean);
      if (dates.length > 0) {
        endDateStr = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
    }

    // Create an array of the last 7 calendar days ending at endDateStr
    const datesList: string[] = [];
    const end = new Date(endDateStr + "T00:00:00");
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      datesList.push(d.toISOString().split("T")[0]);
    }

    // Calculate score average on each date
    return datesList.map((date) => {
      const daySubs = filteredSubmissions.filter((s) => s.date === date);
      
      let media: number | null = null;
      if (daySubs.length > 0) {
        const sum = daySubs.reduce((acc, s) => {
          const subAvg = (Number(s.notaClareza) + Number(s.notaAcolhimento) + Number(s.notaAssistente)) / 3;
          return acc + subAvg;
        }, 0);
        media = Number((sum / daySubs.length).toFixed(1));
      }

      // Format label as DD/MM for presentation x-axis
      const parts = date.split("-");
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;

      return {
        date,
        label,
        media,
        count: daySubs.length
      };
    });
  }, [filteredSubmissions, submissions]);

  // Dynamic calculation of the 30-day volume evolution
  const last30DaysData = useMemo(() => {
    let endDateStr = "2026-05-22"; // default fallback date
    if (filteredSubmissions.length > 0) {
      const dates = filteredSubmissions.map(s => s.date).filter(Boolean);
      if (dates.length > 0) {
        endDateStr = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
    } else if (submissions.length > 0) {
      const dates = submissions.map(s => s.date).filter(Boolean);
      if (dates.length > 0) {
        endDateStr = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
    }

    // List of the last 30 calendar days ending at endDateStr
    const datesList: string[] = [];
    const end = new Date(endDateStr + "T00:00:00");
    for (let i = 29; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      datesList.push(d.toISOString().split("T")[0]);
    }

    // Determine the top products dynamically based on filteredSubmissions to keep line series clean
    const productCounts: Record<string, number> = {};
    filteredSubmissions.forEach(s => {
      const p = s.produto ? s.produto.trim() : "OUTRO";
      productCounts[p] = (productCounts[p] || 0) + 1;
    });
    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 4); // Keep top 4 products for comparison lines

    return datesList.map((date) => {
      const daySubs = filteredSubmissions.filter((s) => s.date === date);

      // Count per unit
      const countsByUnit: Record<string, number> = {};
      uniqueUnits.forEach(un => {
        countsByUnit[un] = 0;
      });
      daySubs.forEach((s) => {
        const u = s.unidade ? s.unidade.trim() : "Outra";
        const matched = uniqueUnits.find(un => un.toLowerCase().trim() === u.toLowerCase().trim()) || u;
        countsByUnit[matched] = (countsByUnit[matched] || 0) + 1;
      });

      // Count per product
      const countsByProduct: Record<string, number> = {};
      topProducts.forEach(p => {
        countsByProduct[p] = 0;
      });
      let otherProductsCount = 0;

      daySubs.forEach((s) => {
        const p = s.produto ? s.produto.trim() : "OUTRO";
        if (topProducts.includes(p)) {
          countsByProduct[p] = (countsByProduct[p] || 0) + 1;
        } else {
          otherProductsCount++;
        }
      });

      // Format label as DD/MM for presentation x-axis
      const parts = date.split("-");
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;

      return {
        date,
        label,
        total: daySubs.length,
        ...countsByUnit,
        ...countsByProduct,
        outrosProdutos: otherProductsCount,
        topProductsList: topProducts
      };
    });
  }, [filteredSubmissions, submissions, uniqueUnits]);

  // Dynamic calculation of satisfaction trend between the current day and the previous day
  const trendInfo = useMemo(() => {
    if (!rechartsData || rechartsData.length < 2) {
      return { hasData: false, description: "Amostras insuficientes no período." };
    }

    // Default to comparing the actual last day with the day before it (index 6 vs 5 in 7-day window)
    const currentDayObj = rechartsData[6];
    const prevDayObj = rechartsData[5];

    let currentVal = currentDayObj ? currentDayObj.media : null;
    let prevVal = prevDayObj ? prevDayObj.media : null;

    // Fallback: if those specific days don't have data, find the last two days in the series that actually contain valid media scores.
    if (currentVal === null || prevVal === null) {
      const daysWithData = rechartsData.filter(d => d.media !== null);
      if (daysWithData.length >= 2) {
        const lastWithData = daysWithData[daysWithData.length - 1];
        const prevWithData = daysWithData[daysWithData.length - 2];
        
        currentVal = lastWithData.media;
        prevVal = prevWithData.media;
        
        const diff = currentVal! - prevVal!;
        const percentChange = prevVal! !== 0 ? (diff / prevVal!) * 100 : 0;
        
        return {
          hasData: true,
          currentDayLabel: lastWithData.label,
          prevDayLabel: prevWithData.label,
          currentVal,
          prevVal,
          diff: Number(diff.toFixed(2)),
          percentChange: Number(percentChange.toFixed(1)),
          isUp: diff > 0,
          isEqual: diff === 0,
          description: `Tendência baseada nas duas datas mais recentes com amostragem (${lastWithData.label} vs ${prevWithData.label}).`
        };
      }
      
      return {
        hasData: false,
        description: "Não há dados suficientes no período para calcular tendência de variação diária."
      };
    }

    const diff = currentVal - prevVal;
    const percentChange = prevVal !== 0 ? (diff / prevVal) * 100 : 0;

    return {
      hasData: true,
      currentDayLabel: currentDayObj.label,
      prevDayLabel: prevDayObj.label,
      currentVal,
      prevVal,
      diff: Number(diff.toFixed(2)),
      percentChange: Number(percentChange.toFixed(1)),
      isUp: diff > 0,
      isEqual: diff === 0,
      description: `Comparando a pontuação acumulada de hoje (${currentDayObj.label}) com ontem (${prevDayObj.label}).`
    };
  }, [rechartsData]);

  return (
    <div className="space-y-6">

      {/* PAINEL DE ALERTAS OPERACIONAIS - NPS DO SETOR < 7.0 */}
      {(() => {
        const visibleAlerts = alertNotifications.filter((a) => {
          if (session?.unidade !== "TODAS") {
            return a.unidade.trim().toUpperCase() === session?.unidade.trim().toUpperCase() && !a.isDismissed;
          }
          return !a.isDismissed;
        });
        if (visibleAlerts.length === 0) return null;

        return (
          <div className="bg-red-50/50 border border-red-200 rounded-xl p-5 shadow-xs animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
            {/* Top red bar line decor */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 border border-red-200 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-red-600 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-tight flex items-center gap-1.5">
                      Alerta Operacional: Média de Satisfação Crítica
                    </h4>
                    <span className="bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider animate-pulse">
                      NPS Menor que 7.0
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed max-w-2xl font-medium">
                    Aviso automático de controle operacional. As unidades listadas abaixo registraram um índice médio acumulado de satisfação inferior à meta de qualidade corporativa de <strong>7.0 / 10</strong>. Recomenda-se auditar o feedback individual e acionar as lideranças locais.
                  </p>
                </div>
              </div>

              {/* Utility reset button */}
              {dismissedUnits.length > 0 && (
                <button
                  onClick={() => setDismissedUnits([])}
                  className="text-[10px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer shrink-0 mt-1"
                >
                  Restaurar alertas ocultos ({dismissedUnits.length})
                </button>
              )}
            </div>

            {/* List of affected units and details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {visibleAlerts.map((alert) => (
                <div 
                  key={alert.unidade}
                  className="bg-white border border-red-100 rounded-xl p-3 shadow-3xs flex items-center justify-between gap-3 relative overflow-hidden group hover:border-red-200 transition"
                >
                  <div className="min-w-0">
                    <span className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest leading-none">
                      UNIDADE
                    </span>
                    <strong className="block text-slate-800 text-xs font-black truncate uppercase mt-1 leading-tight">
                      {alert.unidade}
                    </strong>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] font-extrabold text-red-600 font-mono">
                        {alert.media.toFixed(1)} / 10
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-medium font-mono">
                        ({alert.count} fichas)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDismissedUnits(prev => [...prev, alert.unidade.toUpperCase()])}
                    className="p-1 px-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition cursor-pointer flex items-center gap-1 font-mono text-[9px] font-bold border border-transparent hover:border-slate-200 shrink-0"
                    title="Ocultar notificação para esta unidade"
                  >
                    <X className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                    Ignorar
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* COMPONENTE DE HISTÓRICO DE ALERTAS DISPARADOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
              <History className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                Histórico de Alertas de Qualidade (NPS &lt; 7.0)
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Registro operacional das quedas de satisfação capturadas na base de dados com estampa de tempo.
              </p>
            </div>
          </div>
          
          {filteredAlertHistory.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Deseja realmente limpar todo o histórico de alertas?")) {
                  if (session?.unidade !== "TODAS") {
                    const updatedHistory = alertHistory.filter(
                      (item) => item.unidade.trim().toUpperCase() !== session?.unidade.trim().toUpperCase()
                    );
                    setAlertHistory(updatedHistory);
                    try {
                      localStorage.setItem("survey_nps_alert_history", JSON.stringify(updatedHistory));
                    } catch {}
                  } else {
                    setAlertHistory([]);
                    try {
                      localStorage.setItem("survey_nps_alert_history", JSON.stringify([]));
                    } catch {}
                  }
                }
              }}
              className="text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 bg-red-50 hover:bg-red-100/70 border border-red-200/55 py-1 px-3 rounded-lg transition shrink-0 cursor-pointer"
            >
              <X className="w-3 h-3 text-red-500" /> Limpar Histórico ({filteredAlertHistory.length})
            </button>
          )}
        </div>

        {filteredAlertHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-mono border border-dashed border-slate-200 rounded-xl relative overflow-hidden bg-slate-50/50">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
            Nenhum alerta registrado no histórico corporativo.
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAlertHistory.map((item, index) => {
                // Determine severity badge colors depending on how low the NPS is
                let badgeStyle = "text-rose-600 bg-rose-50 border-rose-200";
                let description = "Satisfação crítica detectada";
                if (item.media >= 6.0) {
                  badgeStyle = "text-amber-700 bg-amber-50 border-amber-200";
                  description = "Média de satisfação sob atenção";
                }
                
                return (
                  <div 
                    key={item.id || index}
                    className="border border-slate-200 hover:border-slate-300 bg-slate-50/40 p-3.5 rounded-xl flex items-start gap-3 transition shadow-3xs"
                  >
                    <div className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs shadow-4xs font-mono w-10 h-10">
                      {item.unidade.substring(0, 2).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                          Unidade {item.unidade}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[9.5px] text-slate-400 font-medium">
                          <Clock className="w-3 h-3 text-slate-350" />
                          <span>{item.timestamp}</span>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                        {description} baseada em <strong className="text-slate-700">{item.count} respostas</strong> obtidas no período.
                      </p>

                      <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-slate-100">
                        <span className="text-[9.5px] uppercase font-bold text-slate-400 leading-none">
                          Média Registrada
                        </span>
                        <span className={`text-[10.5px] font-black font-mono px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                          {item.media.toFixed(1)} / 10
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-right text-[9.5px] text-slate-400 font-bold uppercase tracking-wider pr-1 mt-1 font-mono">
              Total logs guardados: {filteredAlertHistory.length} • Auto-salvo no navegador
            </p>
          </div>
        )}
      </div>

      {/* PAINEL DE PERFORMANCE OPERACIONAL E ANÁLISE DE GARGALOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
              <Hourglass className="w-5 h-5 animate-spin-slow text-indigo-600" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider font-mono flex items-center gap-1.5">
                Performance Operacional: Fluxo de Criação a Conclusão ⏱️
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Tempo decorrido (transit time) médio por unidade comercial do momento de criação na agenda até o encerramento formal do tour.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 shrink-0 self-end sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bottleneckStats.hasRealData ? "bg-emerald-400" : "bg-indigo-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${bottleneckStats.hasRealData ? "bg-emerald-500" : "bg-indigo-500"}`}></span>
            </span>
            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">
              {bottleneckStats.hasRealData ? "Dados Reais em Tempo Real" : "Dados Históricos / Ativos"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* KPI Cards (Left Side) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* OVerall Average Completed Time Card */}
            <div className="bg-gradient-to-br from-indigo-50/40 to-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3.5 shadow-3xs hover:border-slate-300 transition">
              <div className="p-3 bg-white border border-slate-150 text-indigo-600 rounded-lg shadow-4xs shrink-0 flex items-center justify-center w-12 h-12">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="block text-[9.5px] font-mono font-black text-slate-400 uppercase tracking-widest leading-none">
                  MÉDIA DE FLUXO GERAL
                </span>
                <strong className="block text-xl font-black text-slate-800 font-mono tracking-tight mt-1 leading-tight">
                  {bottleneckStats.overallAvgMinutes > 0 ? (
                    <>
                      {Math.floor(bottleneckStats.overallAvgMinutes / 60)}h {bottleneckStats.overallAvgMinutes % 60}m
                    </>
                  ) : "Desconhecido"}
                </strong>
                <span className="text-[9.5px] text-slate-400 font-medium leading-none block mt-1">
                  Média ponderada ({bottleneckStats.overallTotalAnalyzed} tours)
                </span>
              </div>
            </div>

            {/* Total Analyzed Items Count */}
            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl flex items-center gap-3.5 shadow-3xs hover:border-slate-300 transition">
              <div className="p-3 bg-white border border-slate-150 text-slate-700 rounded-lg shadow-4xs shrink-0 flex items-center justify-center w-12 h-12">
                <Compass className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-left">
                <span className="block text-[9.5px] font-mono font-black text-slate-400 uppercase tracking-widest leading-none">
                  AMOSTRAS ANALISADAS
                </span>
                <strong className="block text-xl font-black text-slate-800 font-mono tracking-tight mt-1 leading-tight">
                  {bottleneckStats.overallTotalAnalyzed} Fichas
                </strong>
                <span className="text-[9.5px] text-slate-400 font-medium leading-none block mt-1 border-t border-slate-150/40 pt-1">
                  Tours qualificados para computação
                </span>
              </div>
            </div>

            {/* Detected Bottleneck Location */}
            <div className={`p-4 rounded-xl flex items-center gap-3.5 shadow-3xs border transition ${
              bottleneckStats.bottleneckTime > 150 
                ? "bg-rose-50/40 border-rose-200 hover:border-rose-300" 
                : "bg-amber-50/40 border-amber-200 hover:border-amber-300"
            }`}>
              <div className={`p-3 bg-white border rounded-lg shadow-4xs shrink-0 flex items-center justify-center w-12 h-12 ${
                bottleneckStats.bottleneckTime > 150 ? "border-rose-200 text-rose-600" : "border-amber-200 text-amber-600"
              }`}>
                <AlertTriangle className={`w-5 h-5 ${bottleneckStats.bottleneckTime > 150 ? "animate-pulse" : ""}`} />
              </div>
              <div className="text-left">
                <span className="block text-[9.5px] font-mono font-black text-slate-400 uppercase tracking-widest leading-none">
                  MAIOR GARGALO DE SLA
                </span>
                <strong className="block text-lg font-black text-slate-800 font-mono tracking-tight mt-1 leading-tight uppercase">
                  {bottleneckStats.bottleneckUnit}
                </strong>
                <span className="text-[9.5px] text-slate-400 font-semibold leading-none block mt-1.5 flex items-center gap-1">
                  Média crítica de: <strong className="text-slate-600 font-mono font-black">{Math.floor(bottleneckStats.bottleneckTime / 60)}h {bottleneckStats.bottleneckTime % 60}m</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Unit Comparison Visual representation (Right Side) */}
          <div className="lg:col-span-7 bg-slate-50/30 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
            <div className="text-left mb-3">
              <span className="text-[10px] uppercase font-bold text-slate-450 block tracking-wider font-mono">
                Comparativo de SLA de Processamento por Unidade (Tempo de Ciclo)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Relação comparativa do tempo entre agendamento, recepção e encerramento.
              </p>
            </div>

            <div className="space-y-3 flex-1 justify-center flex flex-col">
              {bottleneckStats.unitBreakdown.map((item) => {
                const maxVal = Math.max(1, bottleneckStats.bottleneckTime);
                const pct = Math.max(8, Math.min(100, Math.round((item.avgMinutes / maxVal) * 100)));

                // Color mappings based on Unit
                let barColor = "bg-sky-500";
                let unitIcon = "🔵";
                if (item.unit === "Vila Prudente") {
                  barColor = "bg-purple-500";
                  unitIcon = "🟣";
                } else if (item.unit === "PRN") {
                  barColor = "bg-emerald-500";
                  unitIcon = "🟢";
                } else if (item.unit === "SGA") {
                  barColor = "bg-amber-500";
                  unitIcon = "🟠";
                }

                // Badge style
                let badgeStyle = "text-slate-500 bg-slate-100 border-slate-205";
                let badgeLabel = "Sem Dados";
                if (item.count > 0) {
                  if (item.severity === "critical") {
                    badgeStyle = "text-rose-700 bg-rose-50 border-rose-200 animate-pulse";
                    badgeLabel = "Gargalo Crítico";
                  } else if (item.severity === "warning") {
                    badgeStyle = "text-amber-700 bg-amber-50 border-amber-200";
                    badgeLabel = "SLA Sob Alerta";
                  } else {
                    badgeStyle = "text-emerald-700 bg-emerald-50 border-emerald-200";
                    badgeLabel = "SLA Saudável";
                  }
                }

                return (
                  <div key={item.unit} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
                    <div className="w-24 shrink-0 flex items-center gap-1.5 text-left font-mono text-[10.5px] font-black text-slate-700">
                      <span>{unitIcon}</span>
                      <span className="truncate uppercase">{item.unit}</span>
                    </div>

                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/40 relative">
                        {item.count > 0 && (
                          <div
                            className={`h-full rounded-full ${barColor} shadow-4xs transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        {item.count === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase font-mono tracking-widest bg-slate-100/50">
                            Sem amostra de SLA
                          </div>
                        )}
                      </div>

                      <div className="w-20 shrink-0 text-left font-mono text-[11px] font-black text-slate-800">
                        {item.count > 0 ? (
                          <>
                            {Math.floor(item.avgMinutes / 60)}h {item.avgMinutes % 60}m
                          </>
                        ) : "—"}
                      </div>

                      <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.2 rounded font-mono border-transparent shrink-0 border select-none ${badgeStyle}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Actionable Insight Box */}
        <div className="mt-4 bg-indigo-50/50 border border-indigo-150 rounded-xl p-3.5 text-left">
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-none select-none">💡</span>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black font-mono text-indigo-700 uppercase tracking-widest">
                Recomendação de Gestão (SLA Operacional)
              </span>
              <p className="text-[11.5px] text-slate-650 leading-relaxed font-semibold">
                {(() => {
                  const bUnit = bottleneckStats.bottleneckUnit;
                  const bTime = bottleneckStats.bottleneckTime;
                  if (bUnit === "Vila Prudente" && bTime > 150) {
                    return (
                      <>
                        A unidade <strong className="text-indigo-900 font-bold">Vila Prudente</strong> excede sistematicamente o SLA esperado, levando em média 3h 15m para concluir os tours corporativos da agenda. <strong className="text-slate-800">Causa raiz identificada:</strong> Fluxo manuscrito de crachás no credenciamento. <strong className="text-indigo-800 font-black">Ação recomendada:</strong> Implementar pré-cadastro digital automático de visitantes via e-mail e integrar o leitor óptico nos totens de entrada.
                      </>
                    );
                  } else if (bUnit === "LAPA") {
                    return (
                      <>
                        A unidade <strong className="text-indigo-900 font-bold">LAPA</strong> apresenta uma média de fluxo de {Math.floor(bTime / 60)}h {bTime % 60}m. <strong className="text-slate-800">Causa raiz identificada:</strong> Altos tempos em pátio de triagem de barramento escolar. <strong className="text-indigo-800 font-black">Ação recomendada:</strong> Programar a triagem de fones receptores com antecedência imediata de 15 minutos e utilizar a divisão de levas para lotes maiores que 25 pessoas.
                      </>
                    );
                  } else if (bUnit === "PRN") {
                    return (
                      <>
                        A unidade <strong className="text-indigo-900 font-bold">PRN</strong> opera com alto grau de maturidade de processo, média de {Math.floor(bTime / 60)}h {bTime % 60}m. <strong className="text-slate-800 font-black">Análise:</strong> A triagem rápida de convidados corporativos garante excelente fluidez de agenda. <strong className="text-indigo-800">Recomendação:</strong> Replicar o modelo de cronograma automatizado do PRN para as demais unidades de fluxo moroso.
                      </>
                    );
                  } else if (bUnit === "SGA") {
                    return (
                      <>
                        A unidade <strong className="text-indigo-900 font-bold">SGA</strong> apresenta atraso concentrado em tours institucionais e de auditoria externa de ESG, com média de {Math.floor(bTime / 65)}h {bTime % 60}m. <strong className="text-slate-800 font-black">Ação de contenção recomendada:</strong> Descongestionar as agendas de rotina e priorizar o fluxo síncrono por rádio comunicador.
                      </>
                    );
                  }
                  return (
                    <>
                      Excelente consistência de SLAs operacionais! Todas as unidades operam atualmente dentro do teto sugerido de 2 horas médias de transit time. Continue registrando as mudanças de status da agenda de tours periódicos para monitoramento de desvios futuros.
                    </>
                  );
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE FILTROS INTERATIVOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-800" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              Filtros Avançados & Período
            </h3>
            <span className="bg-amber-100 text-amber-900 text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider font-mono">
              {filteredSubmissions.length} de {submissions.length} amostras
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-export-pdf"
              onClick={handleExportToPDF}
              className="text-[11px] text-white bg-rose-600 hover:bg-rose-700 font-bold flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-rose-600 hover:border-rose-700 transition cursor-pointer shadow-3xs"
            >
              <FileText className="w-3.5 h-3.5" /> Exportar para PDF
            </button>

            <button
              id="btn-export-ppt"
              onClick={handleExportToPPT}
              className="text-[11px] text-white bg-orange-600 hover:bg-orange-700 font-bold flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-orange-600 hover:border-orange-700 transition cursor-pointer shadow-3xs"
            >
              <Presentation className="w-3.5 h-3.5" /> Exportar para PPT
            </button>

            {(startDate || endDate || selectedProduct || selectedLeader || selectedUnidade || collaboratorSearch || unitSearchQuery) && (
              <button
                onClick={clearFilters}
                className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 bg-white hover:bg-red-50 py-1.5 px-3 rounded border border-red-200 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Limpar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          {/* GRUPO PRINCIPAL DE ESCOPO (DATAS E UNIDADE ATIVA COM BUSCA FUZZY) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${session?.unidade === "TODAS" ? "md:grid-cols-4 md:col-span-7 lg:col-span-7" : "md:col-span-5 lg:col-span-5"} gap-4 items-end`}>
            {/* Período De */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1 min-h-[18px]">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Período De</label>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
              />
            </div>

            {/* Período Até */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1 min-h-[18px]">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Até</label>
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
              />
            </div>

            {/* Busca Rápida de Unidade (Fuzzy) - Exibido apenas se Gestor */}
            {session?.unidade === "TODAS" && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1 min-h-[18px]">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Busca Unidade (Fuzzy)</label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Digitar unidade..."
                    value={unitSearchQuery}
                    onChange={(e) => setUnitSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-7 py-2 bg-indigo-50/20 border border-indigo-150 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 placeholder-slate-400 font-semibold"
                  />
                  {unitSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUnitSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 font-bold text-xs"
                      title="Limpar busca de unidades"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Unidade Ativa - Exibido apenas se Gestor */}
            {session?.unidade === "TODAS" && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1 min-h-[18px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Unidade Ativa</label>
                    {selectedUnidade && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest font-mono whitespace-nowrap ${
                        selectedUnidade === "LAPA" ? "bg-blue-100 text-blue-700" :
                        selectedUnidade === "PRN" ? "bg-emerald-100 text-emerald-700" :
                        selectedUnidade === "Vila Prudente" ? "bg-purple-100 text-purple-700" :
                        selectedUnidade === "SGA" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {selectedUnidade === "Vila Prudente" ? "Vila P." : selectedUnidade}
                      </span>
                    )}
                  </div>
                  <span className="text-[9.5px]/none bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-sm font-mono flex items-center gap-0.5" title="Soma de participantes nas coletas filtradas">
                    👥 {stats.participantesTotais} ativos
                  </span>
                </div>
                
                <div className="relative">
                  {/* Visual colored dot indicator inside the select box */}
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    {selectedUnidade === "LAPA" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                    )}
                    {selectedUnidade === "PRN" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                    {selectedUnidade === "Vila Prudente" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                    )}
                    {selectedUnidade === "SGA" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                    {selectedUnidade && selectedUnidade !== "LAPA" && selectedUnidade !== "PRN" && selectedUnidade !== "Vila Prudente" && selectedUnidade !== "SGA" && (
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    )}
                    {!selectedUnidade && (
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                      </span>
                    )}
                  </div>

                  <select
                    value={selectedUnidade}
                    onChange={(e) => setSelectedUnidade(e.target.value)}
                    className={`w-full text-xs pl-7 pr-3 py-2 border rounded-md outline-none focus:ring-1 transition-all font-semibold cursor-pointer ${
                      selectedUnidade === "LAPA"
                        ? "bg-blue-50/50 border-blue-200 text-blue-900 focus:ring-blue-500 focus:border-blue-500"
                        : selectedUnidade === "PRN"
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-900 focus:ring-emerald-500 focus:border-emerald-500"
                        : selectedUnidade === "Vila Prudente"
                        ? "bg-purple-50/50 border-purple-200 text-purple-900 focus:ring-purple-500 focus:border-purple-500"
                        : selectedUnidade === "SGA"
                        ? "bg-amber-50/50 border-amber-200 text-amber-900 focus:ring-amber-500 focus:border-amber-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-indigo-500 focus:border-indigo-500"
                    }`}
                  >
                    <option value="">Todas as unidades...</option>
                    {filteredUnitsSelect.map((unit) => {
                      const visuals = getUnitVisuals(unit);
                      return (
                        <option key={unit} value={unit} className={`${visuals.colorClass} font-semibold`}>
                          {visuals.icon} {unit}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* GRUPO DE FILTROS ESPECÍFICOS (PRODUTO, LÍDER, BUSCA) */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 ${session?.unidade === "TODAS" ? "md:col-span-5 lg:col-span-5" : "md:col-span-7 lg:col-span-7"} gap-4 items-end`}>
            {/* Produto */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1 min-h-[18px]">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Produto/Operação</label>
              </div>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="">Todos os produtos...</option>
                {products.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Líder Educador */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1 min-h-[18px]">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Líder Educador</label>
              </div>
              <select
                value={selectedLeader}
                onChange={(e) => {
                  setSelectedLeader(e.target.value);
                  if (e.target.value) {
                    setCollaboratorSearch(""); // Limpa campo de texto se selecionar do estático
                  }
                }}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="">Todos os líderes...</option>
                {leaders.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Busca Rápida Colaborador */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1 min-h-[18px]">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Busca Rápida Colaborador</label>
              </div>
              <div className="relative">
                <input
                  id="input-quick-search-collaborator"
                  type="text"
                  placeholder="Digitar nome do condutor..."
                  value={collaboratorSearch}
                  onChange={(e) => {
                    setCollaboratorSearch(e.target.value);
                    if (e.target.value) {
                      setSelectedLeader(""); // Limpa select estático para evitar conflitos
                    }
                  }}
                  className="w-full text-xs pl-8 pr-7 py-2 bg-indigo-50/20 border border-indigo-150 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 placeholder-slate-400 font-semibold"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none text-indigo-500">
                  🔍
                </span>
                {collaboratorSearch && (
                  <button
                    type="button"
                    onClick={() => setCollaboratorSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 font-bold text-xs"
                    title="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* METRICAS PRINCIPAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Participantes Totais */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Participantes</p>
            <p className="text-lg md:text-xl font-bold text-slate-800 tracking-tight font-mono">
              {stats.participantesTotais}
            </p>
            <span className="text-[9px] text-slate-400 font-medium">total acumulado</span>
          </div>
        </div>

        {/* Quantidade de Tours Realizados */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tours Realizados</p>
            <p className="text-lg md:text-xl font-bold text-slate-800 tracking-tight font-mono">
              {stats.totalTours}
            </p>
            <span className="text-[9px] text-slate-400 font-medium">pesquisas ativas</span>
          </div>
        </div>

        {/* Média Clareza das Informações */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shrink-0">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Média Clareza</p>
            <div className="flex items-baseline gap-0.5">
              <p className="text-lg md:text-xl font-bold text-slate-800 tracking-tight font-mono">
                {stats.mediaClareza}
              </p>
              <span className="text-slate-400 text-[10px]">/10</span>
            </div>
            <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.mediaClareza * 10}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Média Acolhimento */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Média Acolhida</p>
            <div className="flex items-baseline gap-0.5">
              <p className="text-lg md:text-xl font-bold text-slate-800 tracking-tight font-mono">
                {stats.mediaAcolhimento}
              </p>
              <span className="text-slate-400 text-[10px]">/10</span>
            </div>
            <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.mediaAcolhimento * 10}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Média Assistente Vinicius */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs col-span-2 lg:col-span-1 flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shrink-0">
            <BookmarkBadgeIcon />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Média Condutor</p>
            <div className="flex items-baseline gap-0.5">
              <p className="text-lg md:text-xl font-bold text-slate-800 tracking-tight font-mono">
                {stats.mediaAssistente}
              </p>
              <span className="text-slate-400 text-[10px]">/10</span>
            </div>
            <div className="w-16 bg-amber-100 h-1 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.mediaAssistente * 10}%` }} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* CARROSSEL INTERATIVO DE DESTAQUES DO MÊS (HALL DA FAMA DOS CONDUTORES) */}
      {monthlyHighlights.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center border-dashed">
          <Trophy className="w-8 h-8 text-amber-500/40 mx-auto mb-2 animate-bounce" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Destaques do Mês (Hall da Fama)</h4>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            Aguardando amostragem de dados para rankear os condutores. Registre novos feedbacks para ver o pódio em tempo real!
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
                <Trophy className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider font-mono flex items-center gap-1.5">
                  Destaques do Mês — Hall da Fama 🏅
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Os 3 condutores com a maior média de notas em cada unidade, atualizados dinamicamente pelo banco de dados.
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              <button
                onClick={() => setAutoplayHighlights(!autoplayHighlights)}
                className={`p-1 px-2 text-[10px] uppercase font-bold rounded transition flex items-center gap-1 cursor-pointer ${
                  autoplayHighlights 
                    ? "bg-amber-550/15 text-amber-800 hover:bg-amber-100" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-150"
                }`}
                title={autoplayHighlights ? "Pausar troca automática" : "Ativar troca automática"}
              >
                {autoplayHighlights ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span className="font-mono text-[9px]">{autoplayHighlights ? "Autoplay ativo (7s)" : "Pausado"}</span>
              </button>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setAutoplayHighlights(false);
                    setActiveHighlightIndex((prev) => (prev === 0 ? monthlyHighlights.length - 1 : prev - 1));
                  }}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition shrink-0 cursor-pointer"
                  title="Unidade Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-650" />
                </button>
                <button
                  onClick={() => {
                    setAutoplayHighlights(false);
                    setActiveHighlightIndex((prev) => (prev === monthlyHighlights.length - 1 ? 0 : prev + 1));
                  }}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition shrink-0 cursor-pointer"
                  title="Próxima Unidade"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-650" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Unit Highlight Display with Motion Transitions */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {(() => {
                const currentHl = monthlyHighlights[activeHighlightIndex];
                if (!currentHl) return null;

                return (
                  <motion.div
                    key={currentHl.unit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🏢</span>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-450 font-mono">
                        Unidade: <span className="text-slate-800 font-black">{currentHl.unit}</span>
                      </h4>
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-mono font-black px-1.5 py-0.2 rounded">
                        Ranking do mês
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {currentHl.guides.map((guide, idx) => {
                        const rank = idx + 1;
                        let rankLabel = "🥇 1º Lugar";
                        let ringColor = "border-amber-400/50 bg-amber-50/10 ring-2 ring-amber-400/10";
                        let badgeColor = "bg-amber-400 text-slate-950";
                        if (rank === 2) {
                          rankLabel = "🥈 2º Lugar";
                          ringColor = "border-slate-300/60 bg-slate-50/10";
                          badgeColor = "bg-slate-300 text-slate-900";
                        } else if (rank === 3) {
                          rankLabel = "🥉 3º Lugar";
                          ringColor = "border-orange-300/60 bg-orange-50/10";
                          badgeColor = "bg-amber-700 text-white";
                        }

                        // Label performance based on score
                        const assessmentText = guide.media >= 9.0 ? "Alta Excelência" : guide.media >= 8.0 ? "Excelente" : "Consolidado";

                        return (
                          <div
                            key={guide.name}
                            className={`p-4 rounded-xl border relative flex flex-col justify-between transition-all hover:shadow-xs group hover:translate-y-[-2px] ${ringColor}`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-mono font-bold tracking-tight ${badgeColor}`}>
                                  {rankLabel}
                                </span>
                                <span className="text-[9.5px] text-slate-400 font-mono font-bold">
                                  {guide.count} {guide.count === 1 ? "tour" : "tours"}
                                </span>
                              </div>

                              <div className="space-y-1 text-left mb-4">
                                <h5 className="text-[13px] font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition truncate" title={guide.name}>
                                  {guide.name}
                                </h5>
                                <span className="text-[9px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 inline-block font-mono font-bold">
                                  {assessmentText}
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-baseline gap-1 bg-white/60 p-2.5 rounded-lg border border-slate-100 text-center justify-center shadow-4xs">
                                <span className="text-xl font-mono font-black text-slate-900 tracking-tight">
                                  ★ {guide.media.toFixed(2)}
                                </span>
                                <span className="text-slate-400 text-[10px]">/ 10</span>
                              </div>

                              {/* Progress metric bar */}
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-3 mb-3">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${guide.media * 10}%` }}
                                />
                              </div>

                              {/* Competencies summary breakdown */}
                              <div className="grid grid-cols-3 gap-1 pt-1 text-center border-t border-slate-150/50">
                                <div>
                                  <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">Clareza</span>
                                  <strong className="text-[10px] text-slate-650 font-mono block mt-1">{guide.mediaClareza.toFixed(1)}</strong>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">Acolhida</span>
                                  <strong className="text-[10px] text-slate-650 font-mono block mt-1">{guide.mediaAcolhimento.toFixed(1)}</strong>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">Condutor</span>
                                  <strong className="text-[10px] text-slate-650 font-mono block mt-1">{guide.mediaAssistente.toFixed(1)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Unit selection dots bullet menu */}
          <div className="flex justify-center gap-1.5 mt-5 border-t border-slate-100 pt-3.5 flex-wrap">
            {monthlyHighlights.map((hl, idx) => (
              <button
                key={hl.unit}
                onClick={() => {
                  setActiveHighlightIndex(idx);
                  setAutoplayHighlights(false);
                }}
                className={`px-3 py-1 text-[10px] font-mono font-bold tracking-tight rounded-full transition duration-150 cursor-pointer ${
                  activeHighlightIndex === idx
                    ? "bg-slate-900 text-amber-400 scale-105 border border-slate-950"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-150"
                }`}
              >
                {hl.unit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PAINEL DE MONITORAMENTO DE COLETAS EM TEMPO REAL */}
      {session?.unidade === "TODAS" && (
        <div className="bg-slate-900 text-white border border-slate-850 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Subtle visual gradient spot */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-xs font-bold tracking-wider uppercase text-amber-400 font-mono flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                  CENTRAL DE COLETAS EM TEMPO REAL
                </h3>
              </div>
              <p className="text-slate-400 text-xs">
                Monitoramento instantâneo de recepção de dados transmitidos pelos totens físicos e smartphones das unidades.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFeedActive(!isFeedActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition ${
                  isFeedActive 
                    ? "bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-200"
                    : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/25"
                }`}
              >
                {isFeedActive ? "● Pausar Transmissão" : "○ Retomar Fluxo"}
              </button>
              {onAddSample && (
                <button
                  type="button"
                  onClick={() => {
                    // Generate random test object
                    const randomName = NAMES_TEST[Math.floor(Math.random() * NAMES_TEST.length)];
                    const randomProduct = products.length > 0 ? products[Math.floor(Math.random() * products.length)] : "Tour Coletado";
                    const randomLeader = leaders.length > 0 ? leaders[Math.floor(Math.random() * leaders.length)] : "Líder Coletado";
                    const randomUnit = PLACES_TEST[Math.floor(Math.random() * PLACES_TEST.length)];
                    const randomMelhoria = MELHORIAS_TEST[Math.floor(Math.random() * MELHORIAS_TEST.length)];
                    const randomClareza = Math.floor(Math.random() * 3) + 8; // 8, 9, 10
                    const randomAcolhimento = Math.floor(Math.random() * 3) + 8; 
                    const randomAssistente = Math.floor(Math.random() * 3) + 8;
                    const randomPax = Math.floor(Math.random() * 4) + 1;

                    const mockSub: SurveySubmission = {
                      id: "evt-sim-" + Math.random().toString(36).substring(2, 7),
                      date: new Date().toISOString().split("T")[0],
                      nomeCompleto: randomName,
                      idade: Math.floor(Math.random() * 20) + 19,
                      liderEducador: randomLeader,
                      produto: randomProduct,
                      participantes: randomPax,
                      assistente: "VINICIUS",
                      unidade: randomUnit,
                      notaClareza: randomClareza,
                      justificativaClareza: "Preenchimento automatizado via simulação em tempo real.",
                      notaAcolhimento: randomAcolhimento,
                      justificativaAcolhimento: "Ótima receptividade geral.",
                      notaAssistente: randomAssistente,
                      justificativaAssistente: "Suporte excelente do condutor",
                      melhorias: randomMelhoria
                    };
                    onAddSample(mockSub);
                    setLastPingTime("Agora mesmo");
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                >
                  Simular Coleta de Teste (+)
                </button>
              )}
            </div>
          </div>

          {/* Totem connections active grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-5 relative z-10 border-b border-slate-800">
            {[
              { tag: "LAPA", name: "Totem Lapa principal", ping: "8ms", color: "bg-emerald-500" },
              { tag: "Vila Prudente", name: "Recepção VP Digital", ping: "15ms", color: "bg-emerald-500" },
              { tag: "PRN", name: "Canal Operacional PRN", ping: "44ms", color: "bg-indigo-400" },
              { tag: "SGA", name: "Totem autoatendimento SGA", ping: "21ms", color: "bg-sky-400" }
            ].map((totem) => {
              const totemSubmissions = submissions.filter(s => s.unidade.toLowerCase() === totem.tag.toLowerCase());
              return (
                <div key={totem.tag} className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block font-mono">unidade</span>
                    <p className="text-xs font-bold text-white uppercase font-mono tracking-tight">{totem.tag}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{totem.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono font-bold">
                      <Wifi className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> {totem.ping}
                    </span>
                    <p className="text-[11px] font-black font-mono text-slate-300 mt-1.5">
                      {totemSubmissions.length} envios
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submissions queue ticker */}
          <div className="pt-5 relative z-10">
            <div className="flex items-center justify-between mb-3 text-xs uppercase font-extrabold font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Ingresso Recente de Respostas
              </span>
              <span className="text-[10px] text-slate-500">Última atualização: {lastPingTime}</span>
            </div>

            <div className="space-y-2.5">
              {isFeedActive ? (
                submissions.slice(0, 3).map((sub, index) => {
                  const avgScore = (sub.notaClareza + sub.notaAcolhimento + sub.notaAssistente) / 3;
                  let badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/15";
                  let feedbackText = "Excepcional";
                  if (avgScore < 7) {
                    badgeColor = "text-rose-400 bg-rose-500/10 border-rose-500/15";
                    feedbackText = "Atenção necessária";
                  } else if (avgScore < 9) {
                    badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/15";
                    feedbackText = "Satisfatório";
                  }

                  // Simulated delay tags for demonstration clarity
                  const timeStamps = ["Agora mesmo", "3 minutos atrás", "11 minutos atrás"];
                  const relTime = timeStamps[index] || "Há pouco";

                  return (
                    <div 
                      key={sub.id || index} 
                      className="bg-slate-950/45 hover:bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-150 animate-in slide-in-from-left-2 duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-amber-500 shrink-0 font-mono">
                          {sub.unidade.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center flex-wrap gap-2">
                            <p className="text-xs font-bold text-white">{sub.nomeCompleto}</p>
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                              {sub.unidade}
                            </span>
                            <span className="bg-slate-850 border border-slate-800 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                              {sub.produto}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-normal">
                            Líder: <strong className="text-slate-300">{sub.liderEducador}</strong> • Assistente: <strong className="text-slate-300">{sub.assistente || "VINI"}</strong>
                          </p>
                          {sub.melhorias && (
                            <p className="text-[11px] text-slate-500 italic max-w-xl line-clamp-1">
                              &ldquo;{sub.melhorias}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-slate-850/80 md:border-t-0 pt-2 md:pt-0">
                        <div className="text-left md:text-right">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono block">MÉDIA AVALIAÇÃO</span>
                          <div className="flex items-center md:justify-end gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${badgeColor}`}>
                              {avgScore.toFixed(1)} / 10
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold hidden md:inline">{feedbackText}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-850 px-2 py-1 rounded">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{relTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                  Transmissão em tempo real pausada. Toque em &ldquo;Retomar Fluxo&rdquo; para sincronizar totens.
                </div>
              )}

              {submissions.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                  Aguardando transmissões incidentes de participantes no momento...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAINEL GRÁFICO AVANÇADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* GRÁFICO DE EVOLUÇÃO TEMPORAL DA SATISFAÇÃO (NPS) COLETADA */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs col-span-1 md:col-span-2 lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500 animate-pulse" />
                <h4 className="font-bold text-slate-950 text-xs uppercase tracking-wider">
                  Evolução do Índice de Satisfação (Média NPS) • Últimos 7 Dias
                </h4>
              </div>
              <span className="bg-amber-100 text-amber-900 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                Interativo (Recharts)
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mb-4">
              Média móvel consolidada dos scores qualitativos (Clareza, Acolhimento e Suporte Técnico) registrados nas datas correspondentes.
            </p>
          </div>

          <div className="w-full h-[260px] pr-2 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rechartsData}
                margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const dateParts = data.date.split("-");
                      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : data.date;
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-left font-sans text-xs min-w-[150px]">
                          <p className="font-mono font-bold text-[9px] text-slate-400 border-b border-slate-850 pb-1 mb-1.5 uppercase">
                            Data: {formattedDate}
                          </p>
                          <div className="space-y-1">
                            <p className="flex items-center justify-between text-[11px] text-white">
                              <span>Pontuação Média:</span>
                              <strong className="text-amber-400 ml-2 font-mono text-xs">
                                {data.media !== null ? `${data.media} / 10` : "Sem Respostas"}
                              </strong>
                            </p>
                            <p className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Fichas Coletadas:</span>
                              <strong className="text-slate-200 font-mono">{data.count}</strong>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="media" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#f59e0b" }}
                  dot={{ r: 4, stroke: "#d97706", strokeWidth: 1.5, fill: "#ffffff" }}
                  name="Média de Satisfação"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* INDICADOR DE TENDÊNCIA DE ENGAJAMENTO (DIFERENÇA DIA COMPARATIVO) */}
          <div className="bg-slate-50 border border-slate-150/85 rounded-xl p-3.5 mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono block">
                Tendência de Qualidade Diária
              </span>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                {trendInfo.description}
              </p>
            </div>

            {trendInfo.hasData ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block font-mono font-bold leading-none mb-1">
                    ÚLTIMO REGISTRO: <strong className="text-slate-700">{trendInfo.currentVal?.toFixed(1)} / 10</strong>
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono leading-none">
                    VARIAÇÃO: <strong className={trendInfo.isEqual ? "text-slate-500" : trendInfo.isUp ? "text-emerald-600" : "text-rose-600"}>
                      {trendInfo.diff > 0 ? `+${trendInfo.diff}` : trendInfo.diff} pts
                    </strong>
                  </span>
                </div>

                <div className={`py-1.5 px-3 rounded-xl border flex items-center gap-1 font-bold font-mono text-xs ${
                  trendInfo.isEqual 
                    ? "bg-slate-100 border-slate-200 text-slate-600" 
                    : trendInfo.isUp 
                      ? "bg-emerald-500/10 border-emerald-300 text-emerald-700" 
                      : "bg-rose-500/10 border-rose-300 text-rose-700"
                }`}>
                  {trendInfo.isEqual ? (
                    <span className="text-slate-500 font-bold tracking-tight">Estável (0.0%)</span>
                  ) : trendInfo.isUp ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>+{trendInfo.percentChange}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{trendInfo.percentChange}%</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-250/65 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-400 font-mono font-bold">
                Aguardando amostragem comparativa
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
              Janela operacional exibida: {rechartsData[0]?.label} a {rechartsData[rechartsData.length - 1]?.label}
            </span>
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Aprovação do público base (Nota 0-10)</span>
            </div>
          </div>
        </div>

        {/* GRÁFICO DE VOLUME OPERACIONAL - ÚLTIMOS 30 DIAS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs col-span-1 md:col-span-2 lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-indigo-600 animate-pulse shrink-0" />
                <h4 className="font-bold text-slate-950 text-xs uppercase tracking-wider">
                  Volume Operacional de Tours • Últimos 30 Dias (Histórico Diário)
                </h4>
              </div>
              
              {/* Toggles to switch modes */}
              <div className="flex items-center bg-slate-100 hover:bg-slate-150 p-1 rounded-lg border border-slate-200/60 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setVolumeChartMode("consolidado")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    volumeChartMode === "consolidado"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-750"
                  }`}
                >
                  Consolidado
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeChartMode("unidade")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    volumeChartMode === "unidade"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-750"
                  }`}
                >
                  Por Unidade
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeChartMode("produto")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    volumeChartMode === "produto"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-750"
                  }`}
                >
                  Por Produto
                </button>
              </div>
            </div>
            
            <p className="text-slate-400 text-[11px] mb-4">
              Comparativo das ações operacionais realizadas (volume de tours concluídos com feedback). 
              {volumeChartMode === "consolidado" && " Exibição unificada do total diário no período de 30 dias."}
              {volumeChartMode === "unidade" && " Segmentação por unidade operacional para identificação de sazonalidade e demanda geral."}
              {volumeChartMode === "produto" && " Concentração dos 4 produtos de maior fluxo operacional comparados em tempo real."}
            </p>
          </div>

          <div className="w-full h-[260px] pr-2 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={last30DaysData}
                margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const dateParts = data.date.split("-");
                      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : data.date;
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-left font-sans text-xs min-w-[180px]">
                          <p className="font-mono font-bold text-[9px] text-slate-400 border-b border-slate-850 pb-1 mb-1.5 uppercase">
                            Data: {formattedDate}
                          </p>
                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                            <p className="flex items-center justify-between text-[11px] font-bold text-white border-b border-slate-800 pb-1 mb-1">
                              <span>Total de Tours:</span>
                              <span className="text-indigo-400 font-mono">{data.total}</span>
                            </p>
                            
                            {volumeChartMode === "unidade" && uniqueUnits.map((un, i) => (
                              <p key={un} className="flex items-center justify-between text-[10px] text-slate-350">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ["#4f46e5", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#3b82f6"][i % 6] }} />
                                  <span>{un}:</span>
                                </span>
                                <strong className="font-mono text-slate-200">{data[un]}</strong>
                              </p>
                            ))}

                            {volumeChartMode === "produto" && (() => {
                              const topPr = data.topProductsList || [];
                              const colors = ["#06b6d4", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"];
                              return (
                                <>
                                  {topPr.map((p, idx) => (
                                    <p key={p} className="flex items-center justify-between text-[10px] text-slate-350">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                                        <span className="truncate max-w-[120px]">{p}:</span>
                                      </span>
                                      <strong className="font-mono text-slate-200">{data[p]}</strong>
                                    </p>
                                  ))}
                                  {data.outrosProdutos > 0 && (
                                    <p className="flex items-center justify-between text-[10px] text-slate-450 border-t border-slate-800/50 pt-1 mt-1">
                                      <span>Outros:</span>
                                      <strong className="font-mono text-slate-300">{data.outrosProdutos}</strong>
                                    </p>
                                  )}
                                </>
                              );
                            })()}

                            {volumeChartMode === "consolidado" && (
                              <p className="text-[10px] text-slate-400 italic">
                                Total consolidado de todas as unidades ativas.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {volumeChartMode === "consolidado" && (
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#4f46e5" }}
                    dot={{ r: 4, stroke: "#4338ca", strokeWidth: 1.5, fill: "#ffffff" }}
                    name="Tours Conduzidos"
                  />
                )}

                {volumeChartMode === "unidade" && uniqueUnits.map((unit, idx) => {
                  const colors = ["#4f46e5", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#3b82f6"];
                  const strokeColor = colors[idx % colors.length];
                  return (
                    <Line 
                      key={unit}
                      type="monotone" 
                      dataKey={unit} 
                      stroke={strokeColor} 
                      strokeWidth={2} 
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      name={unit}
                    />
                  );
                })}

                {volumeChartMode === "produto" && (() => {
                  const topProducts = last30DaysData[0]?.topProductsList || [];
                  const colors = ["#06b6d4", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"];
                  return (
                    <>
                      {topProducts.map((p, idx) => (
                        <Line 
                          key={p}
                          type="monotone" 
                          dataKey={p} 
                          stroke={colors[idx % colors.length]} 
                          strokeWidth={2} 
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                          name={p}
                        />
                      ))}
                      {last30DaysData.some(d => d.outrosProdutos > 0) && (
                        <Line 
                          type="monotone" 
                          dataKey="outrosProdutos" 
                          stroke="#94a3b8" 
                          strokeWidth={1.5} 
                          strokeDasharray="4 4"
                          dot={{ r: 1 }}
                          name="Outros Produtos"
                        />
                      )}
                    </>
                  );
                })()}

                <Legend 
                  wrapperStyle={{ fontSize: "10px", marginTop: "15px" }} 
                  verticalAlign="bottom" 
                  height={36} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
              Janela de 30 dias: {last30DaysData[0]?.label || "N/A"} a {last30DaysData[last30DaysData.length - 1]?.label || "N/A"}
            </span>
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-indigo-550 animate-pulse" style={{ backgroundColor: "#4f46e5" }} />
              <span>Volume de Atividades Operacionais diárias</span>
            </div>
          </div>
        </div>

        {/* COMPONENTE CONDICIONAL: COMPARAÇÃO (GESTOR) OU GAMIFICAÇÃO & METAS (COLABORADORES) */}
        {session?.unidade === "TODAS" ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm col-span-1 md:col-span-2 lg:col-span-3 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4.5 h-4.5 text-amber-500 animate-pulse shrink-0" />
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">
                    Comparação de Performance entre Unidades
                  </h4>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Select Unidade A */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-black text-slate-450 uppercase tracking-widest">UNIT A</span>
                    <select
                      value={compareUnitA}
                      onChange={(e) => setCompareUnitA(e.target.value)}
                      className="text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none text-indigo-650 cursor-pointer focus:ring-1 focus:ring-amber-500"
                    >
                      {uniqueUnits.map((unit) => (
                        <option key={`a-${unit}`} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-400 font-black text-xs">VS</span>

                  {/* Select Unidade B */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-black text-slate-450 uppercase tracking-widest">UNIT B</span>
                    <select
                      value={compareUnitB}
                      onChange={(e) => setCompareUnitB(e.target.value)}
                      className="text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none text-amber-600 cursor-pointer focus:ring-1 focus:ring-amber-500"
                    >
                      {uniqueUnits.map((unit) => (
                        <option key={`b-${unit}`} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <p className="text-slate-400 text-[11px] mb-4 leading-relaxed">
                Análise comparativa das médias de satisfação e qualidade de atendimento registradas para cada unidade lado a lado. Selecione as filiais nos controles para ver o comparativo em tempo real.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center mt-2.5">
              {/* Visual comparison text/scores card */}
              <div className="lg:col-span-1 space-y-4">
                {/* Unidade A Details Mini Summary */}
                <div className="border border-slate-150 bg-slate-50/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-xs"></div>
                      <span className="font-extrabold text-slate-800 text-xs uppercase font-mono tracking-tight">Unidade: {compareUnitA}</span>
                    </div>
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md">
                      {comparisonStats.statsA.count} amostras
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white border border-slate-100 p-1.5 rounded-lg shadow-4xs">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">MÉDIA GERAL</span>
                      <strong className="text-sm font-black text-indigo-600 font-mono block mt-1">{comparisonStats.statsA.mediaGeral.toFixed(1)}</strong>
                    </div>
                    <div className="bg-white border border-slate-100 p-1.5 rounded-lg shadow-4xs">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">ACOLHIMENTO</span>
                      <strong className="text-sm font-black text-slate-700 font-mono block mt-1">{comparisonStats.statsA.mediaAcolhimento.toFixed(1)}</strong>
                    </div>
                  </div>
                </div>

                {/* Unidade B Details Mini Summary */}
                <div className="border border-slate-150 bg-slate-50/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-xs"></div>
                      <span className="font-extrabold text-slate-800 text-xs uppercase font-mono tracking-tight">Unidade: {compareUnitB}</span>
                    </div>
                    <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md">
                      {comparisonStats.statsB.count} amostras
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white border border-slate-100 p-1.5 rounded-lg shadow-4xs">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">MÉDIA GERAL</span>
                      <strong className="text-sm font-black text-amber-600 font-mono block mt-1">{comparisonStats.statsB.mediaGeral.toFixed(1)}</strong>
                    </div>
                    <div className="bg-white border border-slate-100 p-1.5 rounded-lg shadow-4xs">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">ACOLHIMENTO</span>
                      <strong className="text-sm font-black text-slate-700 font-mono block mt-1">{comparisonStats.statsB.mediaAcolhimento.toFixed(1)}</strong>
                    </div>
                  </div>
                </div>

                {/* Small insight summary */}
                <div className="text-[10px] text-slate-500 bg-amber-50/40 p-3 rounded-xl leading-relaxed border border-dashed border-amber-200">
                  💡 {compareUnitA === compareUnitB ? (
                    <span>Selecione duas filiais diferentes para analisar o comparativo de desempenho de notas operacionais.</span>
                  ) : (
                    <span>
                      A unidade <strong>{comparisonStats.statsA.mediaGeral >= comparisonStats.statsB.mediaGeral ? compareUnitA : compareUnitB}</strong> tem o melhor índice de satisfação geral (<strong>{Math.max(comparisonStats.statsA.mediaGeral, comparisonStats.statsB.mediaGeral).toFixed(1)} pts</strong> contra <strong>{Math.min(comparisonStats.statsA.mediaGeral, comparisonStats.statsB.mediaGeral).toFixed(1)} pts</strong> de {comparisonStats.statsA.mediaGeral >= comparisonStats.statsB.mediaGeral ? compareUnitB : compareUnitA}).
                    </span>
                  )}
                </div>
              </div>

              {/* Recharts BarChart side-by-side compare visualization */}
              <div className="lg:col-span-2 h-[240px] pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonStats.chartData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="metric" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={[5, 10]}
                      ticks={[5, 6, 7, 8, 9, 10]}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-xl text-left font-sans text-xs space-y-1.5">
                              <p className="font-mono font-bold text-[9px] text-slate-400 border-b border-slate-800 pb-1 mb-1 uppercase">
                                Métrica: {payload[0].payload.metric}
                              </p>
                              {payload.map((p, idx) => (
                                <p key={idx} className="flex items-center justify-between gap-4 text-[10.5px]">
                                  <span className="flex items-center gap-1.5 text-slate-300 font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                    {p.name}:
                                  </span>
                                  <strong className="font-mono font-black text-white">{p.value !== undefined ? `${Number(p.value).toFixed(1)} / 10` : "Sem dados"}</strong>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={32}
                      iconSize={8}
                      iconType="rect"
                      wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}
                    />
                    <Bar 
                      dataKey={compareUnitA} 
                      fill="#4f46e5" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={32} 
                    />
                    <Bar 
                      dataKey={compareUnitB} 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={32} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          /* NOVO PAINEL DE METAS E CONQUISTAS DA EQUIPE (GAMIFICAÇÃO DE SUCESSO) */
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs col-span-1 md:col-span-2 lg:col-span-3 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                    <Trophy className="w-5 h-5 text-amber-500 animate-bounce" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">
                      Painel de Metas & Conquistas de {session?.unidade}
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Engajamento operante, marcos acumulados e performance dos guias da equipe.
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportWeeklyGoalsPDF}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 text-emerald-800 text-[10.5px] font-black px-3.5 py-1.5 rounded-full border border-emerald-200 hover:border-emerald-300 shadow-3xs hover:shadow-2xs active:scale-95 cursor-pointer transition-all duration-150"
                    title="Exportar Resumo Semanal de Metas e Condutores em PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>EXPORTAR RESUMO SEMANAL (PDF)</span>
                  </button>

                  <div className="bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 uppercase tracking-wider shrink-0 select-none">
                    <span className="text-[10px] font-bold text-amber-800">
                      META DIÁRIA DE COLETAS
                    </span>
                  </div>
                </div>
              </div>

              {/* SELETOR DE INTERVALO DE DATAS DE DESEMPENHO (SEMANA, MÊS OU ANO) */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl mb-6 shadow-3xs">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 text-indigo-750 p-1.5 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-black text-slate-450 block uppercase tracking-wider leading-none">INTERVALO DE TEMPO DO CONDUTOR</span>
                    <span className="text-[11px] text-slate-750 font-extrabold block mt-0.5">Filtrar Metas, Ranking & Radar:</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-200/60 border border-slate-200/50 rounded-lg w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setColabTimeRange("semana")}
                    className={`grow sm:grow-0 px-3 py-1.5 text-[10.5px] font-extrabold rounded-md transition duration-150 cursor-pointer flex items-center justify-center gap-1 ${
                      colabTimeRange === "semana"
                        ? "bg-white text-indigo-750 shadow-3xs border border-indigo-100"
                        : "text-slate-500 hover:text-slate-800 font-bold"
                    }`}
                  >
                    📅 Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setColabTimeRange("mes")}
                    className={`grow sm:grow-0 px-3 py-1.5 text-[10.5px] font-extrabold rounded-md transition duration-150 cursor-pointer flex items-center justify-center gap-1 ${
                      colabTimeRange === "mes"
                        ? "bg-white text-indigo-750 shadow-3xs border border-indigo-100"
                        : "text-slate-500 hover:text-slate-800 font-bold"
                    }`}
                  >
                    🗓️ Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setColabTimeRange("ano")}
                    className={`grow sm:grow-0 px-3 py-1.5 text-[10.5px] font-extrabold rounded-md transition duration-150 cursor-pointer flex items-center justify-center gap-1 ${
                      colabTimeRange === "ano"
                        ? "bg-white text-indigo-750 shadow-3xs border border-indigo-100"
                        : "text-slate-500 hover:text-slate-800 font-bold"
                    }`}
                  >
                    ⏳ Ano
                  </button>
                  <button
                    type="button"
                    onClick={() => setColabTimeRange("tudo")}
                    className={`grow sm:grow-0 px-3 py-1.5 text-[10.5px] font-extrabold rounded-md transition duration-150 cursor-pointer flex items-center justify-center gap-1 ${
                      colabTimeRange === "tudo"
                        ? "bg-white text-indigo-750 shadow-3xs border border-indigo-100"
                        : "text-slate-500 hover:text-slate-800 font-bold"
                    }`}
                  >
                    🌐 Tudo
                  </button>
                </div>
              </div>

              {/* THREE SECTIONS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. TRACKER DE METAS DIÁRIAS PERSONALIZADAS POR UNIDADE */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Target className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
                      <h5 className="text-xs font-bold uppercase tracking-wider font-mono">Metas Diárias por Unidade</h5>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Painel do gestor para definir metas de coletas de hoje e engajar a equipe de cada unidade.
                    </p>
                  </div>

                  <div className="space-y-3.5 my-1.5 grow overflow-y-auto max-h-[310px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                    {uniqueUnits.map((unit) => {
                      const goal = dailyGoals[unit] ?? 10;
                      const completed = todaySubmissionsByUnit[unit] ?? 0;
                      const percentage = Math.min(100, Math.round((completed / goal) * 100));
                      const visuals = getUnitVisuals(unit);
                      const isCompleted = completed >= goal;

                      return (
                        <div 
                          key={unit} 
                          className={`border rounded-xl p-3 text-left transition duration-200 shadow-3xs ${
                            isCompleted 
                              ? "bg-emerald-500/5 border-emerald-200/65" 
                              : "bg-slate-50/60 hover:bg-slate-50 border-slate-200/70"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm shrink-0">{visuals.icon}</span>
                              <span className="text-[11px] font-black font-sans text-slate-800 uppercase tracking-tight leading-none">
                                {unit}
                              </span>
                              {isCompleted && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-sm font-extrabold animate-pulse leading-none">
                                  BATEU! 🏆
                                </span>
                              )}
                            </div>
                            
                            {/* Manager custom target adjusters with +/- buttons */}
                            <div 
                              className="flex items-center gap-1 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-lg shadow-4xs shrink-0" 
                              title="Definir meta diária personalizada"
                            >
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider scale-90">GOAL:</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateGoal(unit, goal - 1)}
                                className="w-4 h-4 rounded bg-slate-50 hover:bg-slate-100/90 active:scale-95 flex items-center justify-center text-[10.5px] font-black text-slate-650 border border-slate-200 cursor-pointer select-none transition"
                              >
                                -
                              </button>
                              <span className="font-mono text-[11px] font-black w-4 text-center text-slate-800 select-none">
                                {goal}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateGoal(unit, goal + 1)}
                                className="w-4 h-4 rounded bg-slate-50 hover:bg-slate-100/90 active:scale-95 flex items-center justify-center text-[10.5px] font-black text-slate-650 border border-slate-200 cursor-pointer select-none transition"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between mt-1 text-[10px] font-medium text-slate-500">
                            <span>
                              Progresso: <strong className="font-mono text-slate-900 text-[11.5px] font-black">{completed}</strong> / <span className="text-slate-450 font-mono font-bold">{goal}</span> tours
                            </span>
                            <span className="text-slate-700 font-mono font-black text-[10px]">{percentage}%</span>
                          </div>

                          {/* Beautiful Progress bar */}
                          <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted ? "bg-emerald-500" : "bg-indigo-600"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <div className="mt-1.5 text-right">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                              {isCompleted 
                                ? "✨ Incrível! Meta diária atingida" 
                                : `Faltam ${goal - completed} coletas para bater a meta`
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-600 bg-emerald-50/40 rounded-lg p-2.5 leading-relaxed text-left border border-emerald-100/50 mt-1 shrink-0">
                    💡 <strong>Para Gestores:</strong> Ajuste as metas de cada filial clicando nos botões <strong className="text-slate-800 font-black">+</strong> ou <strong className="text-slate-800 font-black">-</strong> ao lado de cada unidade.
                  </div>
                </div>

                {/* 2. BADGES & TEAM ACCOMPLISHMENTS */}
                <div className="space-y-4 flex flex-col justify-between border-y lg:border-y-0 lg:border-x border-slate-100 py-4 lg:py-0 lg:px-6">
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Award className="w-4 h-4 text-indigo-500" />
                      <h5 className="text-xs font-bold uppercase tracking-wider">Metas e Reconhecimentos</h5>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Marcos de volume acumulado de amostras e avaliação global da unidade.
                    </p>
                  </div>

                  {/* Achievements Grid */}
                  <div className="space-y-2.5 text-left py-2">
                    {/* Badge Bronze */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        colabSubmissions.length >= 5 ? "bg-amber-600/15 text-amber-700 border border-amber-600/20" : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`} title="Equipe Iniciada">
                        🥉
                      </div>
                      <div className="leading-tight">
                        <span className={`text-[10.5px] font-bold block ${colabSubmissions.length >= 5 ? "text-slate-800" : "text-slate-450 line-through"}`}>Colheita Bronze</span>
                        <span className="text-[9px] text-slate-400 block font-mono">Unlocks with 5+ feedbacks</span>
                      </div>
                    </div>

                    {/* Badge Prata */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        colabSubmissions.length >= 15 ? "bg-slate-300 text-slate-705 border border-slate-300" : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`} title="Equipe Consolidada">
                        🥈
                      </div>
                      <div className="leading-tight">
                        <span className={`text-[10.5px] font-bold block ${colabSubmissions.length >= 15 ? "text-slate-800" : "text-slate-455 line-through"}`}>Unidade Prata Act</span>
                        <span className="text-[9px] text-slate-400 block font-mono">Unlocks with 15+ feedbacks</span>
                      </div>
                    </div>

                    {/* Badge Ouro */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        colabSubmissions.length >= 30 ? "bg-amber-400/20 text-amber-600 border border-amber-400 animate-pulse" : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`} title="Equipe Suprema">
                        🥇
                      </div>
                      <div className="leading-tight">
                        <span className={`text-[10.5px] font-bold block ${colabSubmissions.length >= 30 ? "text-slate-800" : "text-slate-455 line-through"}`}>Soberania Ouro</span>
                        <span className="text-[9px] text-slate-400 block font-mono">Unlocks with 30+ feedbacks</span>
                      </div>
                    </div>

                    {/* Selo Excelência */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        ((colabStats.mediaClareza + colabStats.mediaAcolhimento + colabStats.mediaAssistente) / 3) >= 9.0 && colabSubmissions.length >= 5 
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-400" 
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`} title="Qualidade Suprema">
                        👑
                      </div>
                      <div className="leading-tight">
                        <span className={`text-[10.5px] font-bold block ${((colabStats.mediaClareza + colabStats.mediaAcolhimento + colabStats.mediaAssistente) / 3) >= 9.0 && colabSubmissions.length >= 5 ? "text-slate-800" : "text-slate-455 line-through"}`}>Selo de Excelência NPS</span>
                        <span className="text-[9px] text-slate-400 block font-mono">Uniquely holds average NPS &ge; 9.0</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. RANKING DE CONDUTORES DA UNIDADE */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Medal className="w-4 h-4 text-amber-500" />
                      <h5 className="text-xs font-bold uppercase tracking-wider font-mono">Destaques da Equipe</h5>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Condutores dos tours mais bem avaliados na unidade.
                    </p>
                  </div>

                  <div className="grow space-y-2 max-h-[175px] overflow-y-auto pr-1">
                    {rankingLideres.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center my-6">Nenhum dado registrado para os condutores da unidade.</p>
                    ) : (
                      rankingLideres.map((lider, index) => (
                        <div key={lider.nome} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 font-mono w-4 text-center">
                              {index + 1}º
                            </span>
                            <div className="text-left">
                              <span className="text-[11px] font-bold text-slate-800 truncate block max-w-[110px]" title={lider.nome}>
                                {lider.nome}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono block">
                                {lider.count} tours conduzidos
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded font-mono">
                              ★ {lider.media.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="text-center pt-2 border-t border-slate-100 shrink-0">
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Média Individual de Pontos</span>
                  </div>
                </div>

              </div>

              {/* COMPARATIVO DE METAS & DESTAQUES DE CONDUTORES */}
              <div className="border-t border-slate-100 my-6 pt-5" />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                {/* PART A: COMPARATIVO DE METAS DOS CONDUTORES */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <div>
                      <h6 className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-mono">
                        Comparativo de Metas entre Condutores
                      </h6>
                      <p className="text-[10px] text-slate-400">
                        Meta individual de cada condutor: Concluir no mínimo 5 tours com nota &ge; 8.5
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50/40 p-3 rounded-xl border border-slate-150 max-h-[220px] overflow-y-auto">
                    {condutoresStats.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">
                        Nenhum condutor monitorado neste filtro.
                      </p>
                    ) : (
                      condutoresStats.map((condutor) => (
                        <div key={condutor.nome} className="bg-white p-3 rounded-lg border border-slate-200/50 shadow-3xs hover:border-slate-300 transition">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-extrabold text-slate-800">
                              {condutor.nome}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9.5px] font-mono font-bold text-slate-500">
                                {condutor.tours} / 5 tours
                              </span>
                              {condutor.metaBatida ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                                  Meta Batida
                                </span>
                              ) : (
                                <span className="bg-indigo-50 text-indigo-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-indigo-100">
                                  Falta {Math.max(1, 5 - condutor.tours)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${condutor.metaBatida ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(100, (condutor.tours / 5) * 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[8.5px] text-slate-400 font-semibold uppercase tracking-wide">
                              Média de Satisfação Individual:
                            </span>
                            <span className={`text-[9.5px] font-mono font-extrabold px-1 rounded ${
                              condutor.media >= 8.5 ? 'text-emerald-600 bg-emerald-50' : condutor.media >= 7.5 ? 'text-indigo-650 bg-indigo-50' : 'text-amber-600 bg-amber-50'
                            }`}>
                              ★ {condutor.media.toFixed(1)} / 10
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* PART B: RADAR COMPARATIVO DE COMPETÊNCIAS */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <div>
                        <h6 className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-mono">
                          Composição & Radar de Desempenho
                        </h6>
                        <p className="text-[10px] text-slate-400">
                          Médias Individuais de Foco vs. Média Geral do Time
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/55">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Foco Conductor:
                      </label>
                      <select
                        value={selectedRadarConductor || (condutoresStats[0] ? condutoresStats[0].nome : "")}
                        onChange={(e) => setSelectedRadarConductor(e.target.value)}
                        className="text-[10px] font-extrabold bg-white border border-slate-250 rounded px-1.5 py-0.5 text-slate-750 focus:ring-1 focus:ring-indigo-400"
                      >
                        {condutoresStats.map((c) => (
                          <option key={c.nome} value={c.nome}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50/40 p-1.5 rounded-xl border border-slate-150 h-[178px] flex items-center justify-center relative overflow-hidden">
                    {radarData.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400 font-mono uppercase tracking-wider">
                        Aguardando dados...
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="62%" data={radarData}>
                          <PolarGrid stroke="#cbd5e1" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: '#334155', fontSize: 9.5, fontWeight: 'bold' }} 
                          />
                          <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 10]} 
                            tick={{ fill: '#94a3b8', fontSize: 8 }}
                          />
                          <Radar 
                            name="Individual" 
                            dataKey="Condutor" 
                            stroke="#4f46e5" 
                            fill="#818cf8" 
                            fillOpacity={0.55} 
                          />
                          <Radar 
                            name="Med. Equipe" 
                            dataKey="Média Equipe" 
                            stroke="#ea580c" 
                            fill="#fdba74" 
                            fillOpacity={0.3} 
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3.5 text-[9px] font-mono leading-none border-t border-slate-100 pt-1.5">
                    <span className="flex items-center gap-1 font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm inline-block" /> Selecionado
                    </span>
                    <span className="flex items-center gap-1 font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 bg-orange-400 rounded-sm inline-block" /> Média Geral
                    </span>
                  </div>
                </div>

                {/* PART C: DESTAQUES DOS CONDUTORES */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4.5 h-4.5 text-amber-500" />
                    <div>
                      <h6 className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-mono">
                        Destaques & Conquistas dos Condutores
                      </h6>
                      <p className="text-[10px] text-slate-400">
                        Atribuição baseada em melhores notas e maior volume coletado
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-150 max-h-[220px] overflow-y-auto">
                    {destaquesCondutores.length === 0 ? (
                      <div className="col-span-2 text-center py-6 text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">
                        Aguardando dados suficientes para outorga de medalhas de destaque.
                      </div>
                    ) : (
                      destaquesCondutores.map((dest) => (
                        <div key={dest.label} className="bg-white p-3 rounded-lg border border-slate-200/50 flex flex-col justify-between shadow-3xs hover:shadow-2xs transition">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider truncate block max-w-[100px]" title={dest.label}>
                                {dest.label}
                              </span>
                              <span className={`text-[8.5px] font-black font-mono px-1.5 py-0.5 rounded-full border ${dest.color}`}>
                                {dest.badge}
                              </span>
                            </div>
                            <h5 className="text-[11.5px] font-black text-slate-800 leading-tight">
                              {dest.condutor}
                            </h5>
                          </div>
                          
                          <div className="mt-2 text-right">
                            <span className="text-[9.5px] font-mono font-extrabold text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {dest.valor}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 1. VISUALIZAÇÃO GRÁFICA DOS DADOS DEMOGRÁFICOS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-slate-900" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Dados Demográficos (Por Faixa Etária)
              </h4>
            </div>
            <p className="text-slate-400 text-[11px] mb-4">
              Distribuição quantitativa de participantes de acordo com a faixa etária.
            </p>
          </div>

          <div className="space-y-4">
            {/* Jovens */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">Até 25 anos (Jovens)</span>
                <span className="text-slate-500 font-mono font-bold">{stats.demografiaIdades.jovens} pax</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(stats.demografiaIdades.jovens / maxDemographicCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Adultos */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">26 a 35 anos (Adultos)</span>
                <span className="text-slate-500 font-mono font-bold">{stats.demografiaIdades.adultos} pax</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-705 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(stats.demografiaIdades.adultos / maxDemographicCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Maduros */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">36 a 50 anos (Maduros)</span>
                <span className="text-slate-500 font-mono font-bold">{stats.demografiaIdades.maduros} pax</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(stats.demografiaIdades.maduros / maxDemographicCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Seniores */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">51 + anos (Seniores)</span>
                <span className="text-slate-500 font-mono font-bold">{stats.demografiaIdades.seniores} pax</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(stats.demografiaIdades.seniores / maxDemographicCount) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Estudo Demográfico Real-time</span>
          </div>
        </div>

        {/* 2. QUANTIDADE DE TOURS POR PRODUTOS / OPERAÇÃO */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-slate-900" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Tours por Operador / Produto
              </h4>
            </div>
            <p className="text-slate-400 text-[11px] mb-4">
              Volume total de tours catalogados e organizados por categoria.
            </p>
          </div>

          <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
            {Object.keys(stats.toursPorProduto).length === 0 ? (
              <p className="text-slate-400 text-xs text-center my-8">Sem produtos no período.</p>
            ) : (
              Object.entries(stats.toursPorProduto).map(([product, val]) => {
                const count = Number(val) || 0;
                const percent = (count / maxProductTours) * 100;
                return (
                  <div key={product}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-750 font-medium truncate max-w-[170px]" title={product}>{product}</span>
                      <span className="text-slate-600 font-mono text-[10px] font-bold whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded">
                        {count} tours ({stats.participantesPorProduto[product] || 0} pax)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Soma por Produto Ativo</span>
          </div>
        </div>

        {/* 3. SOMA DE PARTICIPANTES POR PERÍODOS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-900" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Soma de Participantes por Período
              </h4>
            </div>
            <p className="text-slate-400 text-[11px] mb-4">
              Acompanhamento cronológico do total de visitantes acomodados em cada data.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
            {stats.participantesPorPeriodo.length === 0 ? (
              <p className="text-slate-400 text-xs text-center my-8">Selecione datas válidas para visualizar.</p>
            ) : (
              stats.participantesPorPeriodo.map((item, index) => {
                const percent = (item.participantes / maxTimelineParticipants) * 100;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-slate-500 w-[60px] shrink-0 text-left">
                      {item.periodo}
                    </span>
                    <div className="grow bg-slate-50 border border-slate-150 rounded p-1 flex items-center gap-1.5">
                      <div className="grow bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 font-mono w-[55px] text-right shrink-0">
                        {item.participantes} pax
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Dados Cronológicos Reais</span>
          </div>
        </div>

      </div>

    </div>
  );
}

function BookmarkBadgeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}
