import { useState, useEffect } from "react";
import { SurveySubmission, UserSession, TourSchedule, ManagerNotice, CollaboratorMessage, DailyActivityReport } from "./types";
import { INITIAL_SUBMISSIONS, INITIAL_PRODUCTS, INITIAL_LEADERS } from "./data";
import FormSurvey from "./components/FormSurvey";
import DashboardStatsPanel from "./components/DashboardStatsPanel";
import DatabaseGrid from "./components/DatabaseGrid";
import LoginScreen from "./components/LoginScreen";
import ManagerCredentialsPanel from "./components/ManagerCredentialsPanel";
import RoutinesAgendaPanel from "./components/RoutinesAgendaPanel";
import ManagerWarningsPanel from "./components/ManagerWarningsPanel";
import { ClipboardList, BarChart3, Database, Compass, Sparkles, HelpCircle, LogOut, User, MapPin, Building2, KeyRound, Sun, Moon, Calendar } from "lucide-react";
import { updatePassword } from "./utils/auth";

function seedDefaultSchedules(): TourSchedule[] {
  return [
    {
      id: "sched-1",
      title: "Tour de Inovação Estácio PRN",
      date: "2026-05-24",
      time: "10:00",
      guide: "Amanda Costa",
      unit: "PRN",
      participants: 15,
      product: "Tour de Inovação & Tecnologia",
      notes: "Alunos do último período de SI. Destacar laboratório 3.",
      status: "scheduled",
      createdAt: new Date().toISOString()
    },
    {
      id: "sched-2",
      title: "Visita Técnica Colegial Centro Mauá",
      date: "2026-05-25",
      time: "14:00",
      guide: "Carlos Menezes",
      unit: "LAPA",
      participants: 35, // triggers capacity warning (>30)
      product: "Tour Pedagógico Industrial",
      notes: "Ensino médio técnico. Usar fone coletor extra.",
      status: "scheduled",
      createdAt: new Date().toISOString()
    },
    {
      id: "sched-3",
      title: "Integração Estagiários Itaú",
      date: "2026-05-26",
      time: "10:00",
      guide: "Fabiana Rosa",
      unit: "Vila Prudente",
      participants: 12,
      product: "Tour de Integração Corporativa",
      notes: "Preparar crachás corporativos adicionais.",
      status: "scheduled",
      createdAt: new Date().toISOString()
    },
    {
      id: "sched-4",
      title: "Visita de Escola Pública E.E. Adolfo",
      date: "2026-05-27",
      time: "14:30",
      guide: "Roberto Santos",
      unit: "SGA",
      participants: 18,
      product: "Tour Histórico e Cultural",
      notes: "Material de apoio didático no auditório.",
      status: "scheduled",
      createdAt: new Date().toISOString()
    },
    {
      id: "sched-5",
      title: "Tour Ambiental Governança ESG",
      date: "2026-05-27",
      time: "14:30",
      guide: "Roberto Santos", // triggers double booking clash
      unit: "SGA",
      participants: 8,
      product: "Tour Institucional",
      notes: "Auditoria externa.",
      status: "scheduled",
      createdAt: new Date().toISOString()
    }
  ];
}

function seedDefaultNotices(): ManagerNotice[] {
  return [
    {
      id: "not-1",
      title: "Manutenção de Ar-condicionado LAPA",
      content: "O auditório principal da LAPA passará por reparação do sistema de climatização de 25 a 27 de maio. Recomenda-se reduzir a capacidade máxima de visitantes para 20 em cada tour agendado nestas datas.",
      date: "2026-05-22",
      createdBy: "Gestor Geral",
      priority: "medium",
      affectedUnit: "LAPA"
    },
    {
      id: "not-2",
      title: "Módulo Obrigatório de Segurança",
      content: "Todos os guias de todas as unidades devem assistir ao treinamento de evacuação e brigada contra incêndios até dia 30/05. O link foi compartilhado no canal oficial.",
      date: "2026-05-22",
      createdBy: "Gestor Geral",
      priority: "high",
      affectedUnit: "TODAS"
    },
    {
      id: "not-3",
      title: "Fones Extras Disponibilizados",
      content: "Foram disponibilizados fones de áudio adicionais na portaria principal para tours populosos da unidade.",
      date: "2026-05-22",
      createdBy: "Gestor Geral",
      priority: "low",
      affectedUnit: "PRN"
    }
  ];
}

function seedDefaultCollaboratorMessages(): CollaboratorMessage[] {
  return [
    {
      id: "col-msg-1",
      senderName: "Amanda Costa",
      senderUnit: "PRN",
      subject: "Fones com ruído persistente",
      content: "Olá gestor, identificamos que 3 fones auxiliares na sala de recepção do PRN estão apresentando chiado de estática constante que dificulta a audição. Solicitamos apoio técnico.",
      date: "2026-05-22",
      time: "14:10",
      isRead: false
    },
    {
      id: "col-msg-2",
      senderName: "Carlos Menezes",
      senderUnit: "LAPA",
      subject: "Adaptação de trajeto no auditório",
      content: "Adaptamos o percurso para desviar das salas de ar-condicionado em manutenção. Guias da unidade já sincronizados com o roteiro provisório.",
      date: "2026-05-21",
      time: "11:30",
      isRead: true
    },
    {
      id: "col-msg-3",
      senderName: "Fabiana Rosa",
      senderUnit: "Vila Prudente",
      subject: "Dúvida sobre crachás extras",
      content: "Olá, para o tour com 12 participantes do Itaú precisaremos de 2 crachás extras de visitante para supervisores externos. Já acionei a portaria.",
      date: "2026-05-22",
      time: "16:05",
      isRead: false
    }
  ];
}

export default function App() {
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);

  // Memory Database States (Products & Leaders)
  const [products, setProducts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_products");
      return stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [leaders, setLeaders] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_leaders");
      return stored ? JSON.parse(stored) : INITIAL_LEADERS;
    } catch {
      return INITIAL_LEADERS;
    }
  });

  // Sync Memory Database to local storage
  useEffect(() => {
    try {
      localStorage.setItem("survey_tour_products", JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem("survey_tour_leaders", JSON.stringify(leaders));
    } catch (e) {
      console.error(e);
    }
  }, [leaders]);

  // Handlers to dynamically add items to memory database
  const handleAddProduct = (prod: string) => {
    const trimmed = prod.trim();
    if (!trimmed) return;
    setProducts((prev) => {
      if (prev.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [...prev, trimmed];
    });
  };

  const handleAddLeader = (lead: string) => {
    const trimmed = lead.trim();
    if (!trimmed) return;
    setLeaders((prev) => {
      if (prev.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [...prev, trimmed];
    });
  };

  const handleDeleteProduct = (prod: string) => {
    setProducts((prev) => prev.filter((p) => p !== prod));
  };

  const handleDeleteLeader = (lead: string) => {
    setLeaders((prev) => prev.filter((l) => l !== lead));
  };

  // Collaborator Messages State: load from localStorage or seed
  const [collaboratorMessages, setCollaboratorMessages] = useState<CollaboratorMessage[]>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_collaborator_msg");
      return stored ? JSON.parse(stored) : seedDefaultCollaboratorMessages();
    } catch {
      return seedDefaultCollaboratorMessages();
    }
  });

  // Save collaboratorMessages on change
  useEffect(() => {
    try {
      localStorage.setItem("survey_tour_collaborator_msg", JSON.stringify(collaboratorMessages));
    } catch (e) {
      console.error(e);
    }
  }, [collaboratorMessages]);

  // Handlers for collaboratorMessages
  const handleAddCollaboratorMessage = (msg: CollaboratorMessage) => {
    setCollaboratorMessages([msg, ...collaboratorMessages]);
  };

  const handleDeleteCollaboratorMessage = (id: string) => {
    setCollaboratorMessages(collaboratorMessages.filter(m => m.id !== id));
  };

  const handleToggleReadCollaboratorMessage = (id: string) => {
    setCollaboratorMessages(collaboratorMessages.map(m => {
      if (m.id === id) {
        return { ...m, isRead: !m.isRead };
      }
      return m;
    }));
  };

  // Schedules State: load from localStorage or seed
  const [tourSchedules, setTourSchedules] = useState<TourSchedule[]>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_agenda");
      return stored ? JSON.parse(stored) : seedDefaultSchedules();
    } catch {
      return seedDefaultSchedules();
    }
  });

  // Notices State: load from localStorage or seed
  const [managerNotices, setManagerNotices] = useState<ManagerNotice[]>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_notices");
      return stored ? JSON.parse(stored) : seedDefaultNotices();
    } catch {
      return seedDefaultNotices();
    }
  });

  // Save tourSchedules on change
  useEffect(() => {
    try {
      localStorage.setItem("survey_tour_agenda", JSON.stringify(tourSchedules));
    } catch (e) {
      console.error(e);
    }
  }, [tourSchedules]);

  // Save managerNotices on change
  useEffect(() => {
    try {
      localStorage.setItem("survey_tour_notices", JSON.stringify(managerNotices));
    } catch (e) {
      console.error(e);
    }
  }, [managerNotices]);

  // Handlers for tourSchedules
  const handleAddSchedule = (schedule: TourSchedule) => {
    setTourSchedules([schedule, ...tourSchedules]);
  };

  const handleUpdateSchedule = (updated: TourSchedule) => {
    setTourSchedules(tourSchedules.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteSchedule = (id: string) => {
    setTourSchedules(tourSchedules.filter(s => s.id !== id));
  };

  // Handlers for managerNotices
  const handleAddNotice = (notice: ManagerNotice) => {
    setManagerNotices([notice, ...managerNotices]);
  };

  const handleDeleteNotice = (id: string) => {
    setManagerNotices(managerNotices.filter(n => n.id !== id));
  };

  // State: daily activity reports
  const [dailyReports, setDailyReports] = useState<DailyActivityReport[]>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_daily_reports");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save reports to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("survey_tour_daily_reports", JSON.stringify(dailyReports));
    } catch (e) {
      console.error(e);
    }
  }, [dailyReports]);

  // Handler to submit a new daily activity report
  const handleAddDailyReport = (report: DailyActivityReport) => {
    setDailyReports([report, ...dailyReports]);
  };

  const handleDeleteDailyReport = (id: string) => {
    setDailyReports(dailyReports.filter(r => r.id !== id));
  };
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_dark_mode");
      return stored === "true";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);
  
  // Password change states
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem("survey_tour_session");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<"form" | "dashboard" | "database" | "routines">(() => {
    try {
      const stored = localStorage.getItem("survey_tour_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.unidade === "TODAS" ? "dashboard" : "form";
      }
    } catch (e) {}
    return "form";
  });

  const [prefilledSurveyData, setPrefilledSurveyData] = useState<Partial<SurveySubmission> | null>(null);

  // Check if direct QR Code access parameter is present on URL path
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryUnidade = params.get("unidade");
      if (queryUnidade) {
        const validUnits = ["LAPA", "Vila Prudente", "PRN", "SGA"];
        const normalized = validUnits.find(u => u.toLowerCase() === queryUnidade.toLowerCase());
        if (normalized) {
          const guestSession: UserSession = {
            nome: "Participante " + normalized,
            unidade: normalized,
            isVisitor: true
          };
          setSession(guestSession);
          localStorage.setItem("survey_tour_session", JSON.stringify(guestSession));
          setActiveTab("form");
          
          // Clear URL parameter so it looks clean
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    } catch (err) {
      console.error("Error reading URL search params for direct tour login", err);
    }
  }, []);

  // Load submissions from LocalStorage or seed with default mock submissions
  useEffect(() => {
    try {
      const stored = localStorage.getItem("survey_tour_submissions");
      if (stored) {
        setSubmissions(JSON.parse(stored));
      } else {
        setSubmissions(INITIAL_SUBMISSIONS);
        localStorage.setItem("survey_tour_submissions", JSON.stringify(INITIAL_SUBMISSIONS));
      }
    } catch (e) {
      console.error("Local storage not accessible, falling back to mock initial seed", e);
      setSubmissions(INITIAL_SUBMISSIONS);
    }
  }, []);

  // Save submissions on change helper
  const saveSubmissions = (updated: SurveySubmission[]) => {
    setSubmissions(updated);
    try {
      localStorage.setItem("survey_tour_submissions", JSON.stringify(updated));
    } catch (e) {
      console.error("Could not write to local storage", e);
    }
  };

  // Add new survey submission
  const handleAddSubmission = (newSub: SurveySubmission) => {
    const updated = [newSub, ...submissions];
    saveSubmissions(updated);
    
    // Auto index new leader/product to memory database
    if (newSub.liderEducador) handleAddLeader(newSub.liderEducador);
    if (newSub.produto) handleAddProduct(newSub.produto);

    // Auto switch tab to visual Dashboard Analytics for immediately highlighting results in real-time
    setTimeout(() => {
      setActiveTab("dashboard");
    }, 1500);
  };

  // Add a direct mock sample response from the Database grid view
  const handleAddSample = (sample: SurveySubmission) => {
    const updated = [sample, ...submissions];
    saveSubmissions(updated);
    
    // Auto index new leader/product to memory database
    if (sample.liderEducador) handleAddLeader(sample.liderEducador);
    if (sample.produto) handleAddProduct(sample.produto);
  };

  // Delete an individual survey submission
  const handleDeleteSubmission = (id: string) => {
    const updated = submissions.filter((s) => s.id !== id);
    saveSubmissions(updated);
  };

  // Edit/Update an individual survey submission attributes
  const handleUpdateSubmission = (updatedRow: SurveySubmission) => {
    const updated = submissions.map((s) => (s.id === updatedRow.id ? updatedRow : s));
    saveSubmissions(updated);
    
    // Auto index new leader/product to memory database on edits too
    if (updatedRow.liderEducador) handleAddLeader(updatedRow.liderEducador);
    if (updatedRow.produto) handleAddProduct(updatedRow.produto);
  };

  if (!session) {
    return <LoginScreen onLogin={(user) => {
      setSession(user);
      try {
        localStorage.setItem("survey_tour_session", JSON.stringify(user));
      } catch (e) {
        console.error(e);
      }
    }} />;
  }

  // Filter visible submissions based on user role/unidade
  const visibleSubmissions = submissions.filter((s) => {
    if (session.unidade === "TODAS") return true; // Gestor has complete access to everything!
    return s.unidade === session.unidade;
  });

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased font-sans flex flex-col ${isDark ? "dark" : ""}`}>
      
      {/* CUSTOMLY POLISHED GLOBAL HEADER ENVIRONMENT */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo / Brand Title description */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-wider text-slate-900 dark:text-white uppercase font-sans">
                  {session.isVisitor ? `Pesquisa de Avaliação - ${session.unidade}` : `${session.unidade === "TODAS" ? "Gestão Geral" : session.unidade} Tour Evaluation`}
                </h1>
                {session.isVisitor ? (
                  <span className="bg-amber-500 text-slate-900 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    MODO PARTICIPANTE
                  </span>
                ) : session.unidade === "TODAS" ? (
                  <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    ACESSO GESTOR
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    REAL-TIME DB
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {session.isVisitor 
                  ? "Sua avaliação ajuda a aprimorar permanentemente a experiência Boas-Vindas."
                  : `Pesquisa de Satisfação & Painel Executivo de Indicadores • ${session.unidade === "TODAS" ? "Todas as Unidades" : session.unidade}`}
              </p>
            </div>
          </div>

          {/* Right Group: Toggle and Status Information */}
          <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
            {/* Dark Mode Theme Controller */}
            <button
              onClick={() => {
                const newValue = !isDark;
                setIsDark(newValue);
                try {
                  localStorage.setItem("survey_tour_dark_mode", String(newValue));
                } catch (e) {}
              }}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-amber-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-205 dark:border-slate-700 transition duration-150 cursor-pointer flex items-center justify-center shadow-2xs shrink-0"
              title={isDark ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/10 animate-spin-slow" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 fill-slate-500/10" />
              )}
            </button>

            {!session.isVisitor ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-750 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                    {session.nome.substring(0, 2)}
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-[8px] uppercase font-bold text-slate-400 dark:text-slate-500 block font-mono">Logado como</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{session.nome}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" /> {session.unidade === "TODAS" ? "Todas as Unidades" : session.unidade}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsChangePasswordOpen(true);
                      setNewPasswordInput("");
                      setConfirmPasswordInput("");
                      setChangePasswordError("");
                      setChangePasswordSuccess("");
                    }}
                    className="ml-2 p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 text-slate-400 dark:text-slate-500 rounded-md transition cursor-pointer"
                    title="Alterar Minha Senha"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setSession(null);
                      try {
                        localStorage.removeItem("survey_tour_session");
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="ml-1.5 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 text-slate-400 dark:text-slate-500 rounded-md transition cursor-pointer"
                    title="Sair"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right hidden lg:block">
                  <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500 block font-mono">Pesquisas Coletadas</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans">
                    <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">{visibleSubmissions.length}</span> formulários ativos
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setSession(null);
                    try {
                      localStorage.removeItem("survey_tour_session");
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair da Pesquisa
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* DYNAMIC TAB NAVIGATION BAR */}
      {!session.isVisitor && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-850 py-2.5 sticky top-[69px] z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg w-full max-w-lg mx-auto md:mx-0">
              
              {/* Tab: Painel Analytics */}
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-amber-400"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {session.unidade === "TODAS" ? "Painel Geral" : "Dashboard & Comparativos"}
              </button>

              {/* Tab: Responder Formulário */}
              {session.unidade !== "TODAS" && (
                <button
                  onClick={() => setActiveTab("form")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "form"
                      ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-amber-400"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Pesquisa de Avaliação
                </button>
              )}

              {/* Tab: Rotinas Administrativas (Agenda) */}
              {session.unidade !== "TODAS" && (
                <button
                  onClick={() => setActiveTab("routines")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "routines"
                      ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-amber-400"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Rotinas Administrativas
                </button>
              )}

              {/* Tab: Banco de Dados */}
              <button
                onClick={() => setActiveTab("database")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "database"
                    ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-amber-400"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Banco Coletado
              </button>

            </div>
          </div>
        </div>
      )}


      {/* MAIN LAYOUT CANVAS WINDOW */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Render Tab Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 md:p-8 text-white shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
                <Sparkles className="w-96 h-96 -mr-16 -mt-16 text-white" />
              </div>
              <div className="space-y-1.5 relative z-10 text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                  Painel de Indicadores Gerais
                </h2>
                <p className="text-slate-350 text-xs max-w-xl font-normal">
                  {session.unidade === "TODAS" 
                    ? "Resultados consolidados em tempo real de todas as unidades de atendimento em conformidade com a gestão."
                    : `Resultados em tempo real gerados a partir do banco de dados de amostras coletadas pela Equipe Boas-Vindas de ${session.unidade} guiado por ${session.nome}.`
                  }
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs border border-white/10 rounded-lg p-3.5 shrink-0">
                <div className="text-center">
                  <span className="text-[10px] text-amber-400 font-semibold block uppercase tracking-wider">Amostras Ativas</span>
                  <p className="text-2xl font-bold font-mono text-white tracking-tight">
                    {visibleSubmissions.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Manager Warning Diagnostics and Bulletin Creator */}
            {session.unidade === "TODAS" && (
              <ManagerWarningsPanel
                schedules={tourSchedules}
                notices={managerNotices}
                onAddNotice={handleAddNotice}
                onDeleteNotice={handleDeleteNotice}
                session={session}
                dailyReports={dailyReports}
                onDeleteDailyReport={handleDeleteDailyReport}
              />
            )}

            <DashboardStatsPanel submissions={submissions} session={session} onAddSample={handleAddSample} products={products} leaders={leaders} />
            {session.unidade === "TODAS" && <ManagerCredentialsPanel />}
          </div>
        )}

        {activeTab === "form" && (
          <FormSurvey
            onSubmitSuccess={(sub) => {
              handleAddSubmission(sub);
              setPrefilledSurveyData(null);
            }}
            session={session}
            products={products}
            leaders={leaders}
            prefilledData={prefilledSurveyData}
          />
        )}

        {activeTab === "routines" && session.unidade !== "TODAS" && (
          <RoutinesAgendaPanel
            schedules={tourSchedules}
            submissions={submissions}
            onAddSchedule={handleAddSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            notices={managerNotices}
            session={session}
            collaboratorMessages={collaboratorMessages}
            onAddCollaboratorMessage={handleAddCollaboratorMessage}
            onDeleteCollaboratorMessage={handleDeleteCollaboratorMessage}
            onToggleReadCollaboratorMessage={handleToggleReadCollaboratorMessage}
            products={products}
            leaders={leaders}
            onRedirectToForm={(prefill) => {
              setPrefilledSurveyData(prefill);
              setActiveTab("form");
            }}
            dailyReports={dailyReports}
            onAddDailyReport={handleAddDailyReport}
            onDeleteDailyReport={handleDeleteDailyReport}
          />
        )}

        {activeTab === "database" && (
          <DatabaseGrid
            submissions={visibleSubmissions}
            session={session}
            onAddSample={handleAddSample}
            onDeleteSubmission={handleDeleteSubmission}
            onUpdateSubmission={handleUpdateSubmission}
            products={products}
            leaders={leaders}
            onAddProduct={handleAddProduct}
            onAddLeader={handleAddLeader}
            onDeleteProduct={handleDeleteProduct}
            onDeleteLeader={handleDeleteLeader}
          />
        )}

      </main>

      {/* FOOTER SYSTEM GUIDELINES */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 dark:text-slate-500 text-[11px] font-medium font-sans">
          <p>© 2026 Equipe Boas-Vindas / {session.unidade === "TODAS" ? "Gestão Geral" : session.unidade} ({session.nome}). Todos os direitos reservados.</p>
          <p className="mt-0.5 text-[10px] text-slate-350 dark:text-slate-600 font-mono">
            Compilado com precisão e persistência local garantida de forma segura.
          </p>
        </div>
      </footer>

      {/* PASSWORD CHANGE MODAL FOR COLLABORATORS AND GESTOR */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Alterar Minha Senha</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {session.nome} • Unidade: {session.unidade === "TODAS" ? "Todas as Unidades" : session.unidade}
                </p>
              </div>
            </div>

            {changePasswordError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <p>{changePasswordError}</p>
              </div>
            )}

            {changePasswordSuccess && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p>{changePasswordSuccess}</p>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              setChangePasswordError("");
              setChangePasswordSuccess("");

              if (!newPasswordInput.trim()) {
                setChangePasswordError("Por favor, digite a nova senha.");
                return;
              }
              if (newPasswordInput.trim().length < 4) {
                setChangePasswordError("A senha deve ter pelo menos 4 caracteres.");
                return;
              }
              if (newPasswordInput !== confirmPasswordInput) {
                setChangePasswordError("As senhas digitadas não coincidem.");
                return;
              }

              const success = updatePassword(session.unidade, session.nome, newPasswordInput.trim());
              if (success) {
                setChangePasswordSuccess("Sua senha foi alterada com sucesso!");
                setTimeout(() => {
                  setIsChangePasswordOpen(false);
                }, 2000);
              } else {
                setChangePasswordError("Não foi possível atualizar a senha.");
              }
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold text-left uppercase tracking-wider font-sans">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                  placeholder="Nova senha de acesso..."
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold text-left uppercase tracking-wider font-sans">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-650 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                  placeholder="Confirme a nova senha..."
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer text-center border border-transparent dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                >
                  Confirmar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
