import React, { useState, useMemo } from "react";
import { SurveySubmission, UserSession } from "../types";
import { exportToCSV, formatDateToPTBR } from "../utils";
import { INITIAL_PRODUCTS, INITIAL_LEADERS } from "../data";
import { 
  Database, 
  FileSpreadsheet, 
  PlusCircle, 
  Trash2, 
  Search, 
  Edit2, 
  Check, 
  X, 
  Tag, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Smile, 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  MessagesSquare, 
  Award, 
  Zap, 
  Info,
  Calendar,
  BookOpen,
  Copy,
  FileText
} from "lucide-react";

interface DatabaseGridProps {
  submissions: SurveySubmission[];
  session: UserSession | null;
  onAddSample: (sample: SurveySubmission) => void;
  onDeleteSubmission: (id: string) => void;
  onUpdateSubmission: (updated: SurveySubmission) => void;
  products?: string[];
  leaders?: string[];
  onAddProduct?: (prod: string) => void;
  onAddLeader?: (lead: string) => void;
  onDeleteProduct?: (prod: string) => void;
  onDeleteLeader?: (lead: string) => void;
}

export default function DatabaseGrid({
  submissions,
  session,
  onAddSample,
  onDeleteSubmission,
  onUpdateSubmission,
  products = INITIAL_PRODUCTS,
  leaders = INITIAL_LEADERS,
  onAddProduct = () => {},
  onAddLeader = () => {},
  onDeleteProduct = () => {},
  onDeleteLeader = () => {}
}: DatabaseGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("");
  const [gridUnitSearchQuery, setGridUnitSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const uniqueGridUnits = useMemo(() => {
    const baseUnits = ["LAPA", "PRN", "Vila Prudente", "SGA"];
    const unitsSet = new Set<string>(baseUnits);
    submissions.forEach((s) => {
      const u = s.unidade ? s.unidade.trim() : "";
      if (u) {
        const currentLower = Array.from(unitsSet).map((x) => x.toLowerCase());
        if (!currentLower.includes(u.toLowerCase())) {
          unitsSet.add(u);
        }
      }
    });
    return Array.from(unitsSet);
  }, [submissions]);

  const filteredGridUnitsSelect = useMemo(() => {
    if (!gridUnitSearchQuery.trim()) {
      return uniqueGridUnits;
    }
    const q = gridUnitSearchQuery.toLowerCase().trim();
    return uniqueGridUnits.filter((unit) => {
      const u = unit.toLowerCase();
      let qIdx = 0;
      for (let i = 0; i < u.length; i++) {
        if (u[i] === q[qIdx]) {
          qIdx++;
        }
        if (qIdx === q.length) return true;
      }
      return false;
    });
  }, [uniqueGridUnits, gridUnitSearchQuery]);
  
  // Custom states for Dashboard & Expandable rows
  const [showDashboard, setShowDashboard] = useState(true);
  const [checkedPractices, setCheckedPractices] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // States for PowerPoint Presentation Copy Tool & Modal
  const [isPPTModalOpen, setIsPPTModalOpen] = useState(false);
  const [pptSlideIndex, setPptSlideIndex] = useState(0);
  const [pptCopied, setPptCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // States for Editing Row
  const [editNome, setEditNome] = useState("");
  const [editIdade, setEditIdade] = useState("");
  const [editLider, setEditLider] = useState("");
  const [editProduto, setEditProduto] = useState("");
  const [editParticipantes, setEditParticipantes] = useState("");

  // Search and filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // If collaborator (not TODAS), they already receive pre-filtered submissions in App.tsx.
      // But we double-check if any extra client selection applies here:
      if (filterUnidade && s.unidade !== filterUnidade) return false;
      const text = `${s.nomeCompleto} ${s.liderEducador} ${s.produto} ${s.assistente} ${s.unidade}`.toLowerCase();
      return text.includes(searchTerm.toLowerCase());
    });
  }, [submissions, searchTerm, filterUnidade]);

  // Compute live visual metrics that update in real-time as the collaborator filters or searches!
  const stats = useMemo(() => {
    const totalTours = filteredSubmissions.length;
    const totalPax = filteredSubmissions.reduce((sum, s) => sum + Number(s.participantes || 0), 0);
    
    let sumClareza = 0;
    let sumAcolhimento = 0;
    let sumAssistente = 0;
    
    // Distribution metrics
    const toursPorProduto: Record<string, number> = {};
    const participantesPorProduto: Record<string, number> = {};

    // Unit Metrics tracking
    const toursPorUnidade: Record<string, number> = {};
    const paxPorUnidade: Record<string, number> = {};
    const somaNotasPorUnidade: Record<string, number> = {};

    // Conductor Metrics tracking
    const toursPorCondutor: Record<string, number> = {};
    const paxPorCondutor: Record<string, number> = {};
    const somaNotasPorCondutor: Record<string, number> = {};
    
    filteredSubmissions.forEach((s) => {
      sumClareza += s.notaClareza;
      sumAcolhimento += s.notaAcolhimento;
      sumAssistente += s.notaAssistente;
      
      toursPorProduto[s.produto] = (toursPorProduto[s.produto] || 0) + 1;
      participantesPorProduto[s.produto] = (participantesPorProduto[s.produto] || 0) + Number(s.participantes || 0);

      // Unit grouping
      const u = s.unidade ? s.unidade.trim() : "Unidade Desconhecida";
      toursPorUnidade[u] = (toursPorUnidade[u] || 0) + 1;
      paxPorUnidade[u] = (paxPorUnidade[u] || 0) + Number(s.participantes || 0);
      const mS = (s.notaClareza + s.notaAcolhimento + s.notaAssistente) / 3;
      somaNotasPorUnidade[u] = (somaNotasPorUnidade[u] || 0) + mS;

      // Conductor (Assistente) grouping
      const c = s.assistente ? s.assistente.trim().toUpperCase() : "VINICIUS";
      toursPorCondutor[c] = (toursPorCondutor[c] || 0) + 1;
      paxPorCondutor[c] = (paxPorCondutor[c] || 0) + Number(s.participantes || 0);
      somaNotasPorCondutor[c] = (somaNotasPorCondutor[c] || 0) + s.notaAssistente;
    });
    
    const mediaClareza = totalTours > 0 ? Number((sumClareza / totalTours).toFixed(1)) : 0;
    const mediaAcolhimento = totalTours > 0 ? Number((sumAcolhimento / totalTours).toFixed(1)) : 0;
    const mediaAssistente = totalTours > 0 ? Number((sumAssistente / totalTours).toFixed(1)) : 0;
    
    // Overall satisfaction average
    const mediaGeral = totalTours > 0 
      ? Number(((mediaClareza + mediaAcolhimento + mediaAssistente) / 3).toFixed(1)) 
      : 0;

    const statsUnidade = Object.keys(toursPorUnidade).map((u) => {
      const count = toursPorUnidade[u];
      const pax = paxPorUnidade[u];
      const media = count > 0 ? Number((somaNotasPorUnidade[u] / count).toFixed(1)) : 0;
      return { unidade: u, count, pax, media };
    });

    const statsCondutor = Object.keys(toursPorCondutor).map((c) => {
      const count = toursPorCondutor[c];
      const pax = paxPorCondutor[c];
      const media = count > 0 ? Number((somaNotasPorCondutor[c] / count).toFixed(1)) : 0;
      return { condutor: c, count, pax, media };
    });
    
    return {
      totalTours,
      totalPax,
      mediaClareza,
      mediaAcolhimento,
      mediaAssistente,
      mediaGeral,
      toursPorProduto,
      participantesPorProduto,
      statsUnidade,
      statsCondutor
    };
  }, [filteredSubmissions]);

  // Trigger export
  const handleExport = () => {
    exportToCSV(submissions);
  };

  // Compute live visual slides presentation format for PowerPoint corresponding of filtered samples
  const slides = useMemo(() => {
    const totalTours = filteredSubmissions.length;
    const totalPax = stats.totalPax;
    const unitLabel = session?.unidade === "TODAS" ? "Geral (Consolidado)" : `Unidade: ${session?.unidade || "Boas-Vindas"}`;
    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    const presenter = session?.nome || "Colaborador Boas-Vindas";

    // Products list string for slide
    const productsListText = Object.entries(stats.toursPorProduto)
      .slice(0, 4)
      .map(([prod, count]) => `• ${prod}: ${count} avaliações (${stats.participantesPorProduto[prod] || 0} pax)`)
      .join("\n");

    // Feedbacks block
    const sampleFeedbacks = filteredSubmissions
      .filter((s) => s.notaAssistente >= 9 || s.notaAcolhimento >= 9)
      .slice(0, 3)
      .map((s, idx) => `“{s.melhorias && s.melhorias.trim() !== "" ? s.melhorias : s.justificativaAcolhimento || s.justificativaClareza}” \n  — Visitante: ${s.nomeCompleto} (${idx + 1}º Destaque)`)
      .join("\n\n");

    return [
      {
        title: "Relatório de Satisfação e Percepção da Experiência",
        subtitle: `Projeto Integrado de Visita Técnica & Onboarding • ${unitLabel}`,
        type: "Capa do Relatório Executivo",
        slideNum: 1,
        content: `TÍTULO PRINCIPAL:
Experiência do Tour Boas-Vindas - Resultados do Período

SUBTÍTULO:
Monitoramento de Indicadores de Qualidade e Satisfação dos Visitantes

DADOS DE IDENTIFICAÇÃO:
• Unidade Estrutural: ${session?.unidade === "TODAS" ? "Geral todas as unidades" : session?.unidade}
• Data de Fechamento: ${dateStr}
• Relator da Apresentação: ${presenter}

INDICADORES GERAIS COLETADOS:
• Total de Amostras de Pesquisa Registradas: ${totalTours} formulários respondidos
• Histórico acumulado de Visitantes Sincronizados (Pax): ${totalPax} pessoas atendidas`,
        formattedMarkdown: `• Título do Slide: Experiência do Tour Boas-Vindas — Resultados Gerais\n• Subtítulo: Relatório de Satisfação da Unidade: ${session?.unidade || ""}\n• Data: ${dateStr}\n• Apresentador: ${presenter}\n• Amostras Totais: ${totalTours} fichas registradas\n• Público Conduzido (Pax): ${totalPax} visitantes integrados no período`
      },
      {
        title: "Indicadores Gerais de Satisfação (NPS)",
        subtitle: "Aproveitamento geral calculado a partir das avaliações respondidas",
        type: "Métricas de Qualidade de Serviço",
        slideNum: 2,
        content: `TÍTULO GERAL:
Análise Estatística dos Critérios de Qualidade (Notas de 0 a 10)

MÉTRICAS CHAVE DE DESEMPENHO:
• Nota Geral Média de Satisfação: ${stats.mediaGeral} / 10
• Nota 1: Clareza e Transmissão Informativa: ${stats.mediaClareza} / 10
• Nota 2: Recepção, Atenção e Acolhimento: ${stats.mediaAcolhimento} / 10
• Nota 3: Postura e Conduta do Condutor/Guia: ${stats.mediaAssistente} / 10

INSIGHT GESTOR:
As dezenas de avaliações coletadas indicam aprovação altíssima pelas dependências. A facilidade informativa integrada à atenção humanizada compõe a principal vantagem qualitativa no período analisado.`,
        formattedMarkdown: `• Título do Slide: KPIs de Satisfação de Clientes (0 a 10)\n• Média Geral Satisfeito: ${stats.mediaGeral} (Média de Todos os Critérios)\n• Clareza de Informação: ${stats.mediaClareza} estrelas\n• Qualidade de Acolhimento: ${stats.mediaAcolhimento} estrelas\n• Nota de Atendimento Guia: ${stats.mediaAssistente} estrelas\n• Insight de Sucesso: Nota média reflete excelente trabalho de campo realizado pela equipe.`
      },
      {
        title: "Amostragem Operacional por Roteiro",
        subtitle: "Vetorização quantitativa de tráfego por produto de atendimento",
        type: "Distribuição Operacional por Produto",
        slideNum: 3,
        content: `TÍTULO COMPILADO:
Distribuição por Tipo de Roteiro e Categoria Integrada

ROTEIROS MAIS ADERIDOS COM MÉTRICAS:
${productsListText || "• Sem roteiros ou produtos cadastrados na unidade atual no período selecionado."}

RECOMENDAÇÃO OPERACIONAL:
Direcionar maior fluxo de material de apoio conceitual físico para os produtos com maior densidade de participantes integrados (Pax).`,
        formattedMarkdown: `• Título do Slide: Volume por Tipo de Visita & Público Alvo\n• Produtos Avaliados:\n${productsListText || "• Sem roteiros ou produtos cadastrados na unidade atual."}\n• Recomendação: Priorizar recursos técnicos conceituais de suporte para os produtos com maior adesão e fluxo de pessoas.`
      },
      {
        title: "Percepções Espontâneas e Depoimentos de Impacto",
        subtitle: "Pesquisa qualitativa baseada nas respostas em texto livre dos visitantes",
        type: "Feedback Qualitativo e Reclamações/Elogios",
        slideNum: 4,
        content: `TÍTULO DA SEÇÃO:
Depoimentos de Impacto Coletados Diariamente

DEPOIMENTOS DOS USUÁRIOS SELECIONADOS:
${sampleFeedbacks || "• \"Muito bem conduzido, todas as perguntas foram tiradas a contento e a recepção foi exemplar desde a portaria.\" (Elogio Proativo)"}

AVALIAÇÃO DE FEEDBACK:
O engajamento do visitante se confirma pelos elogios com foco nas atitudes cordiais e no respeito de tempo oferecido pela equipe de condutores no percurso.`,
        formattedMarkdown: `• Título do Slide: Depoimentos Reais de Visitantes (Foco Qualitativo)\n• Citações de Clientes:\n${sampleFeedbacks || "• \"Excelente recepção, equipe atenciosa e roteiro muito dinâmico!\""}\n• Conclusão Qualitativa: Sentimento extremamente positivo focado no capital humano e simpatia do condutor.`
      },
      {
        title: "Visão Prática e Plano de Ação Estratégico",
        subtitle: "Plano estruturado para potencialização contínua do onboarding",
        type: "Planejamento Estratégico & Evolutivo",
        slideNum: 5,
        content: `TÍTULO DO PLANO:
Sugestões de Ajustes de Infraestrutura e Diretrizes de Próximos Passos

AÇÕES DEFINIDAS COM BASE NAS AMOSTRAS:
1. Manutenção de Acolhimento Humanizado: Reforçar treinamento quinzenal dos condutores agregando as métricas colhidas.
2. Controle Estrito de Cronogramas: Garantir cumprimento rigoroso dos tempos limite de cada tour para evitar desgastes de fadiga.
3. Compartilhamento Direto de Dados: Exportar periodicamente os relatórios como este para as apresentações executivas.
4. Fortalecimento Conceitual: Expandir clareza nas explicações pedagógicas.`,
        formattedMarkdown: `• Título do Slide: Diretrizes Contínuas & Plano de Ação\n• Plano Contínuo 1: Feedback aos Condutores — Divulgar o resultado positivo para motivar a Equipe Boas-Vindas.\n• Plano Contínuo 2: Otimização de Horários — Reduzir gargalos em horários com grande entrada simultânea de visitantes.\n• Plano Contínuo 3: Material de Onboarding — Sanar dúvidas comuns levantadas nos feedbacks qualitativos.`
      }
    ];
  }, [filteredSubmissions, stats, session]);

  const handleCopyCurrentSlide = (index: number) => {
    const slide = slides[index];
    if (!slide) return;
    
    const textToCopy = `=== ${slide.title.toUpperCase()} ===\n[${slide.type.toUpperCase()}]\n\n${slide.content}\n\n* Gerado via Painel Boas-Vindas *`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setPptCopied(true);
        setTimeout(() => setPptCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy slide path: ", err);
      });
  };

  const handleCopyAllSlides = () => {
    const textToCopy = slides.map(s => `=========================================\nSLIDE ${s.slideNum}: ${s.title.toUpperCase()} (${s.type})\n=========================================\n\n${s.content}`).join("\n\n\n");
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy all slides: ", err);
      });
  };

  // Generate a mock random survey response
  const handleAddRandomSample = () => {
    const randomNames = [
      "Ana Julia Brandão", "Leandro Vasconcelos", "Carla Dias Novaes",
      "Tiago Ferreira Santos", "Renan Castro", "Gabriela Vieira",
      "Marcos Barbosa", "Lucas Guimarães", "Patricia Antunes", "Rodrigo Nogueira"
    ];
    const randomJustifications = [
      "Explicação de altíssima qualidade, tudo muito bem organizado de verdade.",
      "Gostei muito da recepção, equipe super prestativa e atenciosa no acolhimento.",
      "O condutor auxiliou o grupo de maneira muito simpática e tirou todas as dúvidas.",
      "O tour pedagógico agregou muito valor conceitual ao nosso grupo de visitantes.",
      "Excelente dinâmica de tempo e roteiro bem traçado pelas dependências."
    ];

    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const randomAge = Math.floor(Math.random() * 32) + 18; // 18-50
    const randomLeader = INITIAL_LEADERS[Math.floor(Math.random() * INITIAL_LEADERS.length)];
    const randomProduct = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
    const randomPartCount = Math.floor(Math.random() * 30) + 15; // 15-45
    const randomDay = Math.floor(Math.random() * 12) + 10; // May 10th to 21st
    const scoreClareza = Math.floor(Math.random() * 3) + 8; // 8-10
    const scoreAcolhida = Math.floor(Math.random() * 2) + 9; // 9-10
    const scoreAssistente = Math.floor(Math.random() * 3) + 8; // 8-10

    const randomUnit = session
      ? (session.unidade === "TODAS" ? ["LAPA", "Vila Prudente", "PRN", "SGA"][Math.floor(Math.random() * 4)] : session.unidade)
      : "PRN";

    const newSample: SurveySubmission = {
      id: "sub-temp-" + Date.now(),
      date: `2026-05-${randomDay}`,
      nomeCompleto: randomName,
      idade: randomAge,
      liderEducador: randomLeader,
      produto: randomProduct,
      participantes: randomPartCount,
      assistente: session ? (session.unidade === "TODAS" ? "VINICIUS" : session.nome.toUpperCase()) : "VINICIUS",
      unidade: randomUnit,
      notaClareza: scoreClareza,
      justificativaClareza: randomJustifications[Math.floor(Math.random() * randomJustifications.length)],
      notaAcolhimento: scoreAcolhida,
      justificativaAcolhimento: randomJustifications[Math.floor(Math.random() * randomJustifications.length)],
      notaAssistente: scoreAssistente,
      justificativaAssistente: "Demonstrou domínio técnico primoroso e energia contagiante na condução.",
      melhorias: "Manter o acolhimento caloroso nas próximas sessões de tour integrado."
    };

    onAddSample(newSample);
  };

  // Setup inline editing
  const startEditing = (s: SurveySubmission, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering accordion toggle
    setEditingId(s.id);
    setEditNome(s.nomeCompleto);
    setEditIdade(s.idade.toString());
    setEditLider(s.liderEducador);
    setEditProduto(s.produto);
    setEditParticipantes(s.participantes.toString());
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const saveEditing = (s: SurveySubmission, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: SurveySubmission = {
      ...s,
      nomeCompleto: editNome.trim() || s.nomeCompleto,
      idade: Number(editIdade) || s.idade,
      liderEducador: editLider,
      produto: editProduto,
      participantes: Number(editParticipantes) || s.participantes
    };
    onUpdateSubmission(updated);
    setEditingId(null);
  };

  // Helper colors for scores in visual listing and expand drawer
  const getRatingStyle = (rating: number) => {
    if (rating >= 9) return { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", text: "Satisfação Excelente", hex: "#10b981" };
    if (rating >= 7) return { bg: "bg-amber-50 text-amber-800 border-amber-200", text: "Regular / Bom", hex: "#f59e0b" };
    return { bg: "bg-red-50 text-red-800 border-red-200", text: "Atenção / Ruim", hex: "#ef4444" };
  };

  const maxProductCount = useMemo(() => {
    const values = Object.values(stats.toursPorProduto) as number[];
    return values.length > 0 ? Math.max(...values) : 1;
  }, [stats.toursPorProduto]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* HEADER DO BANCO DE DADOS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 bg-slate-900 text-amber-500 rounded-md">
              <Database className="w-4 h-4 shrink-0" />
            </span>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Amostras Coletadas & Banco de Dados
            </h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Visualizador oficial de auditoria para {session?.unidade === "TODAS" ? "todas as Lotações" : `Unidade ${session?.unidade}`}. Clique nas linhas da tabela para ver o feedback completo de cada participante!
          </p>
        </div>

        {/* BOTÕES DE AÇÕES RÁPIDAS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dashboard Toggle button */}
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={`px-3.5 py-1.5 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer border ${
              showDashboard 
                ? "bg-amber-50 text-amber-800 border-amber-250 hover:bg-amber-100" 
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            {showDashboard ? "Ocultar Mapeamento" : "Mostrar Gráficos & Estatísticas"}
          </button>

          {/* Gerador de Amostras */}
          <button
            onClick={handleAddRandomSample}
            className="px-3.5 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
            title="Adiciona uma amostra aleatória simulando resposta real de visitante"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Amostra Rápida
          </button>

          {/* Exportação CSV */}
          <button
            onClick={handleExport}
            disabled={submissions.length === 0}
            className="px-4 py-1.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-amber-500" /> Exportar Planilha
          </button>

          {/* Gerador PowerPoint PPT */}
          <button
            onClick={() => {
              setIsPPTModalOpen(true);
              setPptSlideIndex(0);
              setPptCopied(false);
              setCopiedAll(false);
            }}
            disabled={filteredSubmissions.length === 0}
            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/10"
            title="Copiar Relatório e Gráficos formatados para colar no PowerPoint de acordo com as amostras"
          >
            <FileText className="w-3.5 h-3.5 shrink-0 text-slate-950" /> Copiar para PowerPoint (PPT)
          </button>
        </div>
      </div>

      {/* DYNAMIC DASHBOARD PANEL FOR INDIVIDUAL COLLABORATORS */}
      {showDashboard && (
        <div className="bg-slate-50 border border-slate-200/95 duration-300 rounded-2xl p-5 shadow-inner space-y-5 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Painel Analítico de Indicadores Reais ({filteredSubmissions.length} amostras filtradas)
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-500 px-2.5 py-0.5 rounded border border-slate-200">
              Atualiza Dinamicamente ao Filtrar
            </span>
          </div>

          {/* KPI Mini-Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Total NPS/General Average */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Média Geral Satisfação</span>
                <span className="p-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">NPS Ativo</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stats.mediaGeral}</span>
                <span className="text-xs text-slate-400 font-bold font-mono">/10</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium mt-1">Aproveitamento médio global do participante</p>
            </div>

            {/* Total Volume Visitor count */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Acolhidos (Pax)</span>
                <span className="p-1 bg-amber-50 text-amber-700 rounded-md">
                  <User className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stats.totalPax}</span>
                <span className="text-[10px] text-slate-400 font-bold font-mono ml-1">visitantes</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium mt-1">Soma total de participantes integrados</p>
            </div>

            {/* Collected Volume */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Pesquisas Gravadas</span>
                <span className="p-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold font-mono">
                  {stats.totalTours}
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stats.totalTours}</span>
                <span className="text-[10px] text-slate-400 font-bold font-mono ml-1">avaliações</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium mt-1">Fichas disponíveis no banco de dados ativo</p>
            </div>

            {/* Condutor Rating Average */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/85 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Atendimento Condutor</span>
                <span className="p-1 bg-amber-550/10 text-amber-800 rounded-md">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stats.mediaAssistente}</span>
                <span className="text-xs text-slate-400 font-bold font-mono">/10</span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium mt-1">Sua nota oficial como facilitador do tour</p>
            </div>

          </div>

          {/* Graphics layout side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Chart Column 1: Acompanhamento de notas por Critérios */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-1.5 mb-3.5">
                <TrendingUp className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">
                  Avaliação Detalhada por Métrica de Qualidade
                </span>
              </div>

              <div className="space-y-4">
                {/* 1. Clareza */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      💡 1. Clareza das Informações do Tour
                    </span>
                    <span className="text-slate-900 font-bold font-mono">{stats.mediaClareza} / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${stats.mediaClareza * 10}%` }}
                    />
                  </div>
                </div>

                {/* 2. Acolhimento */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      🤝 2. Qualidade na Recepção & Acolhimento
                    </span>
                    <span className="text-slate-900 font-bold font-mono">{stats.mediaAcolhimento} / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${stats.mediaAcolhimento * 10}%` }}
                    />
                  </div>
                </div>

                {/* 3. Atendimento assistente */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 font-mono"></span>
                      👤 3. Postura & Trabalho do Condutor do Tour
                    </span>
                    <span className="text-slate-900 font-bold font-mono">{stats.mediaAssistente} / 10</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${stats.mediaAssistente * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Column 2: Volume de Atendimento por modalidade de produto no periodo */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs">
              <div className="flex items-center gap-1.5 mb-3.5">
                <BarChart3 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">
                  Participantes & Amostras por Produto de Lotação
                </span>
              </div>

              <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                {Object.keys(stats.toursPorProduto).length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-6">Sem dados suficientes para ilustrar categorias.</p>
                ) : (
                  Object.entries(stats.toursPorProduto).map(([product, val]) => {
                    const count = Number(val) || 0;
                    const percent = (count / maxProductCount) * 100;
                    const pax = stats.participantesPorProduto[product] || 0;
                    return (
                      <div key={product} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-600 font-semibold truncate max-w-[190px]" title={product}>
                            {product}
                          </span>
                          <span className="font-bold text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {count} avs ({pax} pax)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-slate-900 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* DUAL PANEL: INDICADORES APURADOS POR UNIDADE E CONDUTORES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
            
            {/* Indicadores Reais por Unidade */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs animate-fadeIn">
              <div className="flex items-center gap-1.5 mb-3.5 border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-black uppercase tracking-tight flex items-center gap-1">
                  🏢 Indicadores Reais por Unidade
                </span>
              </div>
              <div className="space-y-3">
                {stats.statsUnidade.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-6">Sem dados suficientes por unidade no conjunto ativo.</p>
                ) : (
                  stats.statsUnidade.map((item) => {
                    const percent = item.media * 10;
                    return (
                      <div key={item.unidade} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            {item.unidade === "LAPA" && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                            {item.unidade === "PRN" && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                            {item.unidade === "Vila Prudente" && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                            {item.unidade === "SGA" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                            {!["LAPA", "PRN", "Vila Prudente", "SGA"].includes(item.unidade) && <span className="w-2 h-2 rounded-full bg-slate-400" />}
                            <span>{item.unidade}</span>
                          </div>
                          <div className="font-mono text-xs flex items-center gap-1.5 text-slate-500 font-bold">
                            <span>{item.count} tours • {item.pax} pax</span>
                            <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                              ⭐ {item.media} NPS
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.media >= 9 ? "bg-emerald-500" : item.media >= 7 ? "bg-amber-500" : "bg-red-500"
                            }`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Indicadores Reais por Condutor do Tour */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-xs animate-fadeIn">
              <div className="flex items-center gap-1.5 mb-3.5 border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-black uppercase tracking-tight flex items-center gap-1">
                  👥 Indicadores Reais por Condutor do Tour
                </span>
              </div>
              <div className="space-y-3">
                {stats.statsCondutor.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-6">Sem dados suficientes de condutores no conjunto ativo.</p>
                ) : (
                  stats.statsCondutor.map((item) => {
                    const percent = item.media * 10;
                    return (
                      <div key={item.condutor} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-700">👤 {item.condutor}</span>
                          <div className="font-mono text-xs flex items-center gap-1.5 text-slate-500 font-bold">
                            <span>{item.count} tours • {item.pax} pax</span>
                            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                              ⭐ {item.media} nota
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.media >= 9 ? "bg-emerald-500" : item.media >= 7 ? "bg-amber-500" : "bg-red-500"
                            }`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* DYNAMIC IMPROVEMENT PLAN FOR CONDUCTORS (PLANO DE MELHORIA PRÁTICO) */}
          {session?.unidade !== "TODAS" && (
            <div className="bg-white border border-slate-250 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-550 shrink-0" />
                    Plano de Melhoria Prático para Condutores
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Instruções e práticas em campo baseadas nas métricas e feedbacks das amostras coletadas na unidade ativa.
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider font-mono">
                    Práticas Aplicadas:
                  </span>
                  <span className="text-xs font-mono font-extrabold bg-emerald-500 text-white rounded-full h-5 w-5 flex items-center justify-center">
                    {checkedPractices.length}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">/ 5</span>
                </div>
              </div>

              {/* Dynamic diagnostic alert box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Box Info 1 */}
                <div className={`p-3 rounded-lg border text-xs ${stats.mediaClareza < 8.5 ? "bg-rose-50/70 border-rose-150 text-rose-950" : "bg-emerald-50/30 border-emerald-100 text-emerald-950"}`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span>💡 Clareza: {stats.mediaClareza}</span>
                    {stats.mediaClareza < 8.5 ? (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-bold font-mono">REFORÇAR</span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold font-mono">EXCELENTE</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {stats.mediaClareza < 8.5 
                      ? "Recomenda-se articular melhor o roteiro, pausando ao final de dados históricos e mantendo projeção de voz adequada para o fundo do grupo."
                      : "Ótimo nível explicativo! Continue adaptando o vocabulário para as diferentes idades identificadas na planilha de auditoria."}
                  </p>
                </div>

                {/* Box Info 2 */}
                <div className={`p-3 rounded-lg border text-xs ${stats.mediaAcolhimento < 8.5 ? "bg-rose-50/70 border-rose-150 text-rose-950" : "bg-emerald-50/30 border-emerald-100 text-emerald-950"}`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span>🤝 Acolhimento: {stats.mediaAcolhimento}</span>
                    {stats.mediaAcolhimento < 8.5 ? (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-bold font-mono">REFORÇAR</span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold font-mono">EXCELENTE</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {stats.mediaAcolhimento < 8.5 
                      ? "Dedique o primeiro minuto para uma saudação calorosa, faça contato visual individual e quebre o gelo com perguntas amigáveis aos visitantes."
                      : "Sensibilidade e recepção excepcionais! Compartilhe seu método empático de recepção com os novos condutores."}
                  </p>
                </div>

                {/* Box Info 3 */}
                <div className={`p-3 rounded-lg border text-xs ${stats.mediaAssistente < 8.5 ? "bg-rose-50/70 border-rose-150 text-rose-950" : "bg-emerald-50/30 border-emerald-100 text-emerald-950"}`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span>👤 Postura do Condutor: {stats.mediaAssistente}</span>
                    {stats.mediaAssistente < 8.5 ? (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-bold font-mono">REFORÇAR</span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold font-mono">EXCELENTE</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {stats.mediaAssistente < 8.5 
                      ? "A postura em campo precisa de prontidão proativa. Lidere o grupo com firmeza simpática e evite distrações no celular durante o percurso."
                      : "Presença e facilitação exemplares. Parabéns pela condução segura e imersiva nos pontos de atenção do tour."}
                  </p>
                </div>
              </div>

              {/* Checklist of tour guide physical implementations */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  Marcar Práticas Colocadas em Ação Hoje:
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
                  {[
                    {
                      id: "p1",
                      icon: "🤝",
                      title: "Padrão Escuta Ativa (Acolhimento)",
                      desc: "Saudar cada membro do grupo nominalmente nos primeiros 2 minutos de acolhimento na área de entrada.",
                      kpi: "Recepção"
                    },
                    {
                      id: "p2",
                      icon: "📢",
                      title: "Articulação de Tom & Ritmo (Clareza)",
                      desc: "Projetar a voz a 75dB, sem gritar, orientando a postura corporal em direção a todo o semicírculo de ocupação.",
                      kpi: "Clareza"
                    },
                    {
                      id: "p3",
                      icon: "🛡️",
                      title: "Roteiro Resiliente de Segurança",
                      desc: "Anunciar verbalmente desníveis e gerenciar o espaçamento entre filas nas passagens estreitas da operação.",
                      kpi: "Segurança"
                    },
                    {
                      id: "p4",
                      icon: "📲",
                      title: "Apresentação Clara do QR Code",
                      desc: "Explicar como preencher o formulário para melhorias no tour, agradecendo a colaboração na pesquisa.",
                      kpi: "Pesquisa"
                    },
                    {
                      id: "p5",
                      icon: "⭐",
                      title: "Storytelling Local Adaptado",
                      desc: "Ajustar referências históricas e nível de detalhamento focado no público-alvo coletivo da lotação ativa.",
                      kpi: "Postura"
                    }
                  ].map((p) => {
                    const isChecked = checkedPractices.includes(p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          setCheckedPractices(prev => 
                            prev.includes(p.id) 
                              ? prev.filter(x => x !== p.id) 
                              : [...prev, p.id]
                          );
                        }}
                        className={`p-3 rounded-xl border flex gap-3 transition duration-150 cursor-pointer text-left select-none ${
                          isChecked 
                            ? "bg-amber-500/10 border-amber-400 shadow-xs" 
                            : "bg-slate-50/50 border-slate-200 hover:border-slate-350 hover:bg-slate-50"
                        }`}
                      >
                        <div className="pt-0.5">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? "bg-amber-600 border-amber-600 text-white" 
                              : "border-slate-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <span>{p.icon}</span> {p.title}
                            </span>
                            <span className="text-[8px] font-extrabold uppercase font-mono px-1.5 py-0.2 bg-slate-200/60 text-slate-600 rounded">
                              {p.kpi}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {p.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar visual */}
                <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden w-full mt-2 relative">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.30)]"
                    style={{ width: `${(checkedPractices.length / 5) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono">
                  <span>Progresso das Práticas: {checkedPractices.length * 20}%</span>
                  {checkedPractices.length === 5 ? (
                    <span className="text-emerald-600 animate-pulse font-extrabold">🚀 Excelente! Roteiro 100% otimizado hoje!</span>
                  ) : (
                    <span>Coloque as diretrizes em ação para atingir 100% de aproveitamento</span>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* SEARCH / FILTRO RAPIDO */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative grow">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search className="w-4 h-4 shrink-0" />
          </span>
          <input
            type="text"
            placeholder="Pesquisar por participante, líder educador, produto, roteiro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
          />
        </div>
        
        {/* Unit Selector (visible only if Gestor) */}
        {session?.unidade === "TODAS" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar Unidade..."
                value={gridUnitSearchQuery}
                onChange={(e) => setGridUnitSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-7 py-2.5 bg-slate-50 border border-slate-200 text-slate-850 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none placeholder-slate-400 font-semibold w-full sm:max-w-[160px]"
              />
              {gridUnitSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGridUnitSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 font-bold text-xs"
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={filterUnidade}
              onChange={(e) => setFilterUnidade(e.target.value)}
              className="text-xs px-3.5 py-2.5 bg-amber-500/10 border border-amber-550/25 text-slate-950 font-bold rounded-xl focus:ring-1 focus:ring-amber-500 outline-none cursor-pointer hover:bg-amber-500/15 transition min-w-[150px]"
            >
              <option value="">Filtrar Unidade (Todas)</option>
              {filteredGridUnitsSelect.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SPREADSHEET TABLE & ACCORDION DETAIL CARDS */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-250 text-slate-450 text-[10px] uppercase font-bold tracking-wider">
              <th className="p-3.5 py-3 w-8"></th>
              <th className="p-3.5 py-3">Data</th>
              <th className="p-3.5 py-3">Participante</th>
              <th className="p-3.5 py-3 w-[70px]">Idade</th>
              <th className="p-3.5 py-3">Unidade</th>
              <th className="p-3.5 py-3">Condutor</th>
              <th className="p-3.5 py-3">Líder Educador</th>
              <th className="p-3.5 py-3">Produto / Operação</th>
              <th className="p-3.5 py-3 w-[70px]">Pax</th>
              <th className="p-3.5 py-3">Métrica GERAL</th>
              <th className="p-3.5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-400 font-medium">
                  Nenhuma avaliação correspondente encontrada nesta unidade ou pesquisa de termo.
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((s) => {
                const isEditing = editingId === s.id;
                const isExpanded = expandedId === s.id;
                
                // Average for this direct submission
                const rowAverage = Number(((s.notaClareza + s.notaAcolhimento + s.notaAssistente) / 3).toFixed(1));
                const ratingStyle = getRatingStyle(rowAverage);
 
                return (
                  <tr 
                    key={s.id} 
                    onClick={() => {
                      if (!isEditing) {
                        setExpandedId(isExpanded ? null : s.id);
                      }
                    }}
                    className={`hover:bg-slate-50/70 transition cursor-pointer relative ${
                      isExpanded ? "bg-slate-50/40" : ""
                    }`}
                  >
                    
                    {/* Column 0: Expand trigger */}
                    <td className="p-3.5 text-center text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-500 shrink-0 mx-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 hover:text-slate-600 shrink-0 mx-auto animate-bounce duration-1000" />
                      )}
                    </td>
 
                    {/* Column 1: Date */}
                    <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500 font-semibold">
                      {formatDateToPTBR(s.date)}
                    </td>
 
                    {/* Column 2: Participant Name */}
                    <td className="p-3.5 font-bold text-slate-800">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          onClick={(e) => e.stopPropagation()} // stop toggle row expand on input hit
                          className="px-2.5 py-1 border border-slate-250 rounded text-xs w-full focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-semibold bg-white"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[9px] uppercase tracking-wide">
                            {s.nomeCompleto.substring(0, 2)}
                          </span>
                          <span className="truncate max-w-[140px]" title={s.nomeCompleto}>{s.nomeCompleto}</span>
                        </div>
                      )}
                    </td>
 
                    {/* Column 3: Age */}
                    <td className="p-3.5">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editIdade}
                          onChange={(e) => setEditIdade(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 border border-slate-250 rounded text-xs w-14 focus:outline-none bg-white"
                        />
                      ) : (
                        <span className="font-mono text-slate-500">{s.idade} anos</span>
                      )}
                    </td>

                    {/* Column 3.5: Unidade */}
                    <td className="p-3.5">
                      {s.unidade === "LAPA" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider border border-blue-200">
                          LAPA
                        </span>
                      )}
                      {s.unidade === "PRN" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider border border-emerald-200">
                          PRN
                        </span>
                      )}
                      {s.unidade === "Vila Prudente" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider border border-purple-200 whitespace-nowrap">
                          Vila P.
                        </span>
                      )}
                      {s.unidade === "SGA" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-200">
                          SGA
                        </span>
                      )}
                      {!["LAPA", "PRN", "Vila Prudente", "SGA"].includes(s.unidade) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 uppercase tracking-wider border border-slate-200">
                          {s.unidade || "GERAL"}
                        </span>
                      )}
                    </td>

                    {/* Column 3.6: Condutor */}
                    <td className="p-3.5">
                      <span className="bg-amber-100/80 border border-amber-200 text-amber-900 font-extrabold px-2.5 py-0.5 rounded text-[10px] whitespace-nowrap font-sans">
                        👤 {s.assistente || "VINICIUS"}
                      </span>
                    </td>

                    {/* Column 4: Leader */}
                    <td className="p-3.5 text-slate-600 font-medium">
                      {isEditing ? (
                        <select
                          value={editLider}
                          onChange={(e) => setEditLider(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-1.5 py-1 border border-slate-250 rounded text-xs focus:outline-none bg-white font-semibold"
                        >
                          {leaders.map((leader) => (
                            <option key={leader} value={leader}>{leader}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {s.liderEducador}
                        </span>
                      )}
                    </td>

                    {/* Column 5: Product */}
                    <td className="p-3.5 text-slate-650">
                      {isEditing ? (
                        <select
                          value={editProduto}
                          onChange={(e) => setEditProduto(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-1.5 py-1 border border-slate-250 rounded text-xs w-full focus:outline-none bg-white font-semibold"
                        >
                          {products.map((prod) => (
                            <option key={prod} value={prod}>{prod}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-slate-705 font-semibold">
                          <Tag className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[125px]" title={s.produto}>{s.produto}</span>
                        </div>
                      )}
                    </td>

                    {/* Column 6: Pax Count */}
                    <td className="p-3.5 font-mono font-extrabold text-slate-900">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editParticipantes}
                          onChange={(e) => setEditParticipantes(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 border border-slate-250 rounded text-xs w-14 focus:outline-none bg-white"
                        />
                      ) : (
                        <span>{s.participantes}</span>
                      )}
                    </td>

                    {/* Column 7: Ratings Average badge with color code */}
                    <td className="p-3.5 whitespace-nowrap">
                      {!isEditing && (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black font-mono shadow-3xs flex items-center gap-0.5 ${ratingStyle.bg}`}>
                            {rowAverage}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">{ratingStyle.text}</span>
                        </div>
                      )}
                    </td>

                    {/* Column 8: Actions */}
                    <td className="p-3.5 text-right">
                      {isEditing ? (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={(e) => saveEditing(s, e)}
                            className="p-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200 flex items-center font-bold text-xs cursor-pointer shadow-3xs"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            onClick={(e) => cancelEditing(e)}
                            className="p-1 px-1.5 bg-slate-50 hover:bg-slate-150 text-slate-700 rounded-md border border-slate-250 flex items-center text-xs font-bold cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => startEditing(s, e)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-150 text-slate-500 hover:text-slate-800 rounded-md transition cursor-pointer border border-slate-200"
                            title="Editar Amostra"
                          >
                            <Edit2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          
                          {deleteConfirmId === s.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSubmission(s.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-black tracking-wide transition cursor-pointer flex items-center gap-0.5"
                              title="Confirmar Deletar"
                            >
                              <X className="w-2.5 h-2.5 shrink-0" />
                              Sim
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(s.id);
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-md transition cursor-pointer border border-slate-200"
                              title="Deletar Amostra"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* EXPANDED ACCORDION VIEW: VISUAL FEEDBACK DRAWER SHEET */}
      {expandedId && (
        (() => {
          const s = filteredSubmissions.find((x) => x.id === expandedId);
          if (!s) return null;
          return (
            <div className="bg-slate-50 border-2 border-slate-900/10 rounded-2xl p-6 shadow-sm space-y-5 animate-slideDown">
              
              {/* Header inside feedback accordion wrapper */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-slate-900 text-amber-500 rounded-full flex items-center justify-center font-bold text-sm tracking-wider uppercase shadow-xs">
                    {s.nomeCompleto.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Ficha Analítica de {s.nomeCompleto}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                      Data do Registro: {formatDateToPTBR(s.date)} • ID Único: {s.id}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                    Unidade: {s.unidade}
                  </span>
                  <span className="bg-amber-100 text-amber-900 border border-amber-250 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                    Condutor do Tour: {s.assistente}
                  </span>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="p-1.5 hover:bg-slate-200 rounded-md shrink-0 cursor-pointer font-bold text-xs"
                    title="Fechar Painel de Feedback"
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Grid content columns containing Ratings & Written Justifications */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. CLAREZA */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-indigo-800 font-extrabold uppercase tracking-wide bg-indigo-50 px-2 py-0.5 rounded font-mono">
                        💡 1. Clareza Informação
                      </span>
                      <span className="text-xs font-black text-indigo-650 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5 font-mono">
                        Nota: {s.notaClareza}/10
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 mb-3">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${s.notaClareza * 10}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium italic mt-2.5">
                      &ldquo;{s.justificativaClareza || "Nenhum feedback em texto preenchido."}&rdquo;
                    </p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-slate-105 flex items-center gap-1 text-[9px] text-slate-400 font-bold font-mono">
                    <Info className="w-3 h-3 text-indigo-400" /> PERCEPÇÃO DE COMPREENSÃO
                  </div>
                </div>

                {/* 2. ACOLHIMENTO */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded font-mono">
                        🤝 2. Recepção & Acolhida
                      </span>
                      <span className="text-xs font-black text-emerald-650 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 font-mono">
                        Nota: {s.notaAcolhimento}/10
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 mb-3">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${s.notaAcolhimento * 10}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium italic mt-2.5">
                      &ldquo;{s.justificativaAcolhimento || "Nenhum feedback em texto preenchido."}&rdquo;
                    </p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-slate-105 flex items-center gap-1 text-[9px] text-slate-400 font-bold font-mono">
                    <Info className="w-3 h-3 text-emerald-400" /> SINTONIA DO VISITANTE
                  </div>
                </div>

                {/* 3. ASSISTENTE */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wide bg-amber-50 px-2 py-0.5 rounded font-mono">
                        👤 3. Postura Condutor
                      </span>
                      <span className="text-xs font-black text-amber-650 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 font-mono">
                        Nota: {s.notaAssistente}/10
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 mb-3">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${s.notaAssistente * 10}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium italic mt-2.5">
                      &ldquo;{s.justificativaAssistente || "Nenhum feedback em texto preenchido."}&rdquo;
                    </p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-slate-105 flex items-center gap-1 text-[9px] text-slate-400 font-bold font-mono">
                    <Info className="w-3 h-3 text-amber-500" /> QUALIFICAÇÃO DA MONITORIA
                  </div>
                </div>

              </div>

              {/* Suggested improvements & actionables */}
              <div className="bg-amber-50/50 border border-amber-200/60 p-4.5 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-amber-900 font-bold text-xs uppercase tracking-tight">
                  <MessagesSquare className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ideias de Melhorias & Recomendações do Participante</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                  {s.melhorias && s.melhorias.trim() !== "" 
                    ? s.melhorias 
                    : "Nenhum acréscimo de pontuação ou sugestão de melhoria foi registrado por esse participante."}
                </p>
              </div>

              {/* Meta detail specifications footer banner */}
              <div className="flex flex-wrap gap-4 items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
                <div className="flex gap-4">
                  <span>🚀 Líder Educador Vinculado: <strong className="text-slate-700">{s.liderEducador}</strong></span>
                  <span>📦 Roteiro Operado: <strong className="text-slate-700">{s.produto}</strong></span>
                  <span>👥 Público Conduzido: <strong className="text-slate-700">{s.participantes} participantes (Pax)</strong></span>
                </div>
                <button
                  onClick={() => setExpandedId(null)}
                  className="text-xs text-indigo-650 hover:underline font-bold"
                >
                  Fechar Visualização de Ficha
                </button>
              </div>

            </div>
          );
        })()
      )}

      {/* POWERPOINT COPY & SLIDES PREVIEW MODAL */}
      {isPPTModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-250 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Top gold bar decorative */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 mt-1 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    Apresentação Boas-Vindas para PowerPoint (PPT)
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
                      Pronto para Colar
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Textos e métricas reais calculados para montagem instantânea de slides corporativos. Copie o conteúdo formatado e cole na sua apresentação!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPPTModalOpen(false)}
                className="p-1.5 hover:bg-slate-105 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Modal Body (Split view of Slide Deck Visualizer) */}
            <div className="grow overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 pr-1">
              {/* Left Column (Deck Sidebar & Thumbnail buttons) */}
              <div className="lg:col-span-4 space-y-2.5 shrink-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Sua Estrutura de Slides ({slides.length})
                </span>
                
                <div className="space-y-2">
                  {slides.map((slide, idx) => (
                    <button
                      key={slide.slideNum}
                      type="button"
                      onClick={() => {
                        setPptSlideIndex(idx);
                        setPptCopied(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                        pptSlideIndex === idx
                          ? "bg-amber-500/10 border-amber-300 text-slate-900"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 font-mono ${
                        pptSlideIndex === idx ? "bg-amber-50 text-amber-950" : "bg-slate-100 text-slate-500"
                      }`}>
                        {slide.slideNum}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <strong className="text-xs font-bold block truncate">
                          {slide.title}
                        </strong>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide block truncate mt-0.5">
                          {slide.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Master quick paste copy box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider font-mono">
                    Área de Transferência Geral
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed font-semibold">
                    Copie a estruturação textual inteira contendo o roteiro condensado de todos os 5 slides em um único clique!
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyAllSlides}
                    className={`w-full py-2 px-3 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      copiedAll
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                    }`}
                  >
                    {copiedAll ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" /> Apresentação Copiada!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0 text-amber-400" /> Copiar 5 Slides Completos
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column (Active Widescreen Slide Preview & Copy Panel) */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                
                {/* Visual Slide Mockup Card (designed to resemble elegant ppt slide with dark slate layout) */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800 shadow-sm flex flex-col justify-between aspect-video select-none min-h-[260px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  {/* Slide header brand block */}
                  <div className="flex items-center justify-between opacity-80 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-[9px] font-mono font-bold tracking-widest uppercase">
                        EXPERIÊNCIA BOAS-VINDAS • {session?.unidade === "TODAS" ? "GERAL" : session?.unidade}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider bg-white/10 text-amber-400 px-2 py-0.5 rounded">
                      SLIDE PREVIEW {slides[pptSlideIndex].slideNum} / {slides.length}
                    </span>
                  </div>

                  {/* Slide Content Area */}
                  <div className="grow flex flex-col justify-center py-4 relative z-10 text-left">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 block">
                      {slides[pptSlideIndex].type}
                    </span>
                    <h4 className="text-base sm:text-lg font-black tracking-tight leading-snug max-w-xl">
                      {slides[pptSlideIndex].title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-normal mt-1 mb-3.5 sm:mb-4">
                      {slides[pptSlideIndex].subtitle}
                    </p>

                    {/* Simulating list or key data inside slide */}
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 max-h-[120px] overflow-y-auto space-y-1">
                      <pre className="font-sans text-[10.5px] font-semibold leading-relaxed text-slate-200 whitespace-pre-wrap">
                        {slides[pptSlideIndex].formattedMarkdown || slides[pptSlideIndex].content}
                      </pre>
                    </div>
                  </div>

                  {/* Slide Footer */}
                  <div className="text-[9px] text-slate-500 border-t border-white/5 pt-2 flex items-center justify-between">
                    <span>Apresentação Comercial e Indicadores</span>
                    <span>Pág. {slides[pptSlideIndex].slideNum}</span>
                  </div>
                </div>

                {/* Copiar Slide CTA Controls */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-left">
                    <h5 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      Copiar Conteúdo Redigido Deste Slide
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium leading-normal font-semibold">
                      Cria um bloco amigável de tópicos de conteúdo real-time formatado para posicionamento direto nas caixas de texto do PPT.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCurrentSlide(pptSlideIndex)}
                    className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      pptCopied
                        ? "bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-xs"
                        : "bg-slate-900 hover:bg-slate-800 active:scale-95 text-white shadow-xs"
                    }`}
                  >
                    {pptCopied ? (
                      <>
                        <Check className="w-4 h-4 shrink-0" /> Conteúdo Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0 text-amber-400" /> Copiar para PowerPoint
                      </>
                    )}
                  </button>
                </div>

                {/* Slide Carousel Next / Prev Controls */}
                <div className="flex items-center justify-between pt-1 shrink-0">
                  <button
                    type="button"
                    disabled={pptSlideIndex === 0}
                    onClick={() => {
                      setPptSlideIndex(prev => prev - 1);
                      setPptCopied(false);
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    ← Slide Anterior
                  </button>

                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Navegação do Deck
                  </span>

                  <button
                    type="button"
                    disabled={pptSlideIndex === slides.length - 1}
                    onClick={() => {
                      setPptSlideIndex(prev => prev + 1);
                      setPptCopied(false);
                    }}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Próximo Slide →
                  </button>
                </div>

              </div>
            </div>

            {/* Modal Footer Banner */}
            <div className="border-t border-slate-100 pt-3.5 mt-4 text-[10px] font-medium text-slate-400 text-center flex items-center justify-between shrink-0">
              <span className="font-mono">Fórmulas e layouts calculados dinamicamente baseados em {filteredSubmissions.length} amostras</span>
              <button
                type="button"
                onClick={() => setIsPPTModalOpen(false)}
                className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
              >
                Fechar Painel de Apresentação
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
