import React, { useState, useTransition } from "react";
import { SurveySubmission, UserSession } from "../types";
import { INITIAL_PRODUCTS, INITIAL_LEADERS } from "../data";
import { FileText, CheckCircle2, User, Users, Calendar, Award, Star, ThumbsUp } from "lucide-react";

interface FormSurveyProps {
  onSubmitSuccess: (newSubmission: SurveySubmission) => void;
  session: UserSession | null;
  products?: string[];
  leaders?: string[];
  prefilledData?: Partial<SurveySubmission> | null;
}

export default function FormSurvey({ 
  onSubmitSuccess, 
  session, 
  products = INITIAL_PRODUCTS, 
  leaders = INITIAL_LEADERS,
  prefilledData
}: FormSurveyProps) {
  const [isPending, startTransition] = useTransition();
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [idade, setIdade] = useState("");
  const [liderEducador, setLiderEducador] = useState(prefilledData?.liderEducador || "");
  const [produto, setProduto] = useState(prefilledData?.produto || "");
  const [participantes, setParticipantes] = useState(prefilledData?.participantes ? String(prefilledData.participantes) : "");
  const [assistente, setAssistente] = useState(session ? session.nome.toUpperCase() : "VINICIUS");
  const [unidade, setUnidade] = useState(session ? (session.unidade === "TODAS" ? "LAPA" : session.unidade) : "PRN");
  const [date, setDate] = useState(prefilledData?.date || new Date().toISOString().split("T")[0]);

  // Scores
  const [notaClareza, setNotaClareza] = useState<number | null>(null);
  const [justificativaClareza, setJustificativaClareza] = useState("");

  const [notaAcolhimento, setNotaAcolhimento] = useState<number | null>(null);
  const [justificativaAcolhimento, setJustificativaAcolhimento] = useState("");

  const [notaAssistente, setNotaAssistente] = useState<number | null>(null);
  const [justificativaAssistente, setJustificativaAssistente] = useState("");

  const [melhorias, setMelhorias] = useState("");

  // Error & Status message states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Synchronize state with current active session or prefilledData
  React.useEffect(() => {
    if (prefilledData) {
      if (prefilledData.liderEducador) setLiderEducador(prefilledData.liderEducador);
      if (prefilledData.produto) setProduto(prefilledData.produto);
      if (prefilledData.participantes !== undefined) setParticipantes(String(prefilledData.participantes));
      if (prefilledData.date) setDate(prefilledData.date);
      if (prefilledData.unidade) setUnidade(prefilledData.unidade);
    }
  }, [prefilledData]);

  React.useEffect(() => {
    if (session) {
      setAssistente(session.nome.toUpperCase());
      if (!prefilledData?.unidade) {
        setUnidade(session.unidade === "TODAS" ? "LAPA" : session.unidade);
      }
    } else {
      setAssistente("VINICIUS");
      if (!prefilledData?.unidade) {
        setUnidade("PRN");
      }
    }
  }, [session, prefilledData]);

  // Validate fields
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nomeCompleto.trim()) newErrors.nomeCompleto = "O Nome Completo é obrigatório.";
    
    const parsedIdade = Number(idade);
    if (!idade) {
      newErrors.idade = "A idade é obrigatória.";
    } else if (isNaN(parsedIdade) || parsedIdade <= 0) {
      newErrors.idade = "Insira uma idade válida.";
    }

    if (!liderEducador) newErrors.liderEducador = "O Nome do Líder Educador é obrigatório.";
    if (!produto) newErrors.produto = "Selecione ou escreva o produto/operação.";
    
    const parsedParticipantes = Number(participantes);
    if (!participantes) {
      newErrors.participantes = "A quantidade de participantes é obrigatória.";
    } else if (isNaN(parsedParticipantes) || parsedParticipantes < 1) {
      newErrors.participantes = "A quantidade de participantes precisa ser no mínimo 1.";
    }

    if (!assistente) newErrors.assistente = "A especificação do assistente é obrigatória.";
    if (!unidade) newErrors.unidade = "A especificação da unidade é obrigatória.";

    if (notaClareza === null) newErrors.notaClareza = "Favor selecionar uma nota de 1 a 10.";
    if (!justificativaClareza.trim()) newErrors.justificativaClareza = "Favor preencher a justificativa da nota.";

    if (notaAcolhimento === null) newErrors.notaAcolhimento = "Favor selecionar uma nota de 1 a 10.";
    if (!justificativaAcolhimento.trim()) newErrors.justificativaAcolhimento = "Favor preencher a justificativa da nota.";

    if (notaAssistente === null) newErrors.notaAssistente = "Favor selecionar uma nota de 1 a 10.";
    if (!justificativaAssistente.trim()) newErrors.justificativaAssistente = "Favor preencher a justificativa da nota.";

    if (!melhorias.trim()) newErrors.melhorias = "Favor preencher sugestões de melhoria (ou escreva 'Sem sugestões').";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const errorElement = document.getElementById(`field-${firstErrorKey}`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setErrors({});

    const finalAssistente = (session && session.unidade !== "TODAS" && !session.isVisitor) ? session.nome.toUpperCase() : assistente;
    const finalUnidade = (session && session.unidade !== "TODAS") ? session.unidade : unidade;

    const submission: SurveySubmission = {
      id: "sub-" + Date.now(),
      date,
      nomeCompleto: nomeCompleto.trim(),
      idade: parsedIdade,
      liderEducador,
      produto,
      participantes: parsedParticipantes,
      assistente: finalAssistente,
      unidade: finalUnidade,
      notaClareza: notaClareza!,
      justificativaClareza: justificativaClareza.trim(),
      notaAcolhimento: notaAcolhimento!,
      justificativaAcolhimento: justificativaAcolhimento.trim(),
      notaAssistente: notaAssistente!,
      justificativaAssistente: justificativaAssistente.trim(),
      melhorias: melhorias.trim()
    };

    startTransition(() => {
      onSubmitSuccess(submission);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const resetForm = () => {
    setNomeCompleto("");
    setIdade("");
    setLiderEducador("");
    setProduto("");
    setParticipantes("");
    setAssistente(session ? session.nome.toUpperCase() : "VINICIUS");
    setUnidade(session ? (session.unidade === "TODAS" ? "LAPA" : session.unidade) : "PRN");
    setDate(new Date().toISOString().split("T")[0]);
    setNotaClareza(null);
    setJustificativaClareza("");
    setNotaAcolhimento(null);
    setJustificativaAcolhimento("");
    setNotaAssistente(null);
    setJustificativaAssistente("");
    setMelhorias("");
    setErrors({});
    setSuccess(false);
  };

  // Dynamic fill progress tracking
  const progressStats = React.useMemo(() => {
    const totalFields = 15;
    let completedCount = 0;

    if (date) completedCount++;
    if (nomeCompleto.trim().length > 0) completedCount++;
    
    const parsedIdade = Number(idade);
    if (idade && !isNaN(parsedIdade) && parsedIdade > 0) completedCount++;
    
    if (liderEducador.trim().length > 0) completedCount++;
    if (produto.trim().length > 0) completedCount++;
    
    const parsedParticipantes = Number(participantes);
    if (participantes && !isNaN(parsedParticipantes) && parsedParticipantes >= 1) completedCount++;
    
    if (assistente.trim().length > 0) completedCount++;
    if (unidade.trim().length > 0) completedCount++;
    
    if (notaClareza !== null) completedCount++;
    if (justificativaClareza.trim().length > 0) completedCount++;
    
    if (notaAcolhimento !== null) completedCount++;
    if (justificativaAcolhimento.trim().length > 0) completedCount++;
    
    if (notaAssistente !== null) completedCount++;
    if (justificativaAssistente.trim().length > 0) completedCount++;
    
    if (melhorias.trim().length > 0) completedCount++;

    const percent = Math.round((completedCount / totalFields) * 100);
    const finalPercent = Math.min(percent, 100);

    return { completedCount, totalFields, percent: finalPercent };
  }, [
    date,
    nomeCompleto,
    idade,
    liderEducador,
    produto,
    participantes,
    assistente,
    unidade,
    notaClareza,
    justificativaClareza,
    notaAcolhimento,
    justificativaAcolhimento,
    notaAssistente,
    justificativaAssistente,
    melhorias
  ]);

  const todayFormatted = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const activeUnidade = session ? (session.unidade === "TODAS" ? "LAPA" : session.unidade) : "PRN";
  const activeAssistente = session ? session.nome.toUpperCase() : "VINICIUS";

  if (success) {
    return (
      <div className="max-w-2xl mx-auto my-8 bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs transition-all duration-300">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Muito Obrigado!</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
          Sua pesquisa de avaliação foi enviada e integrada ao banco de dados em tempo real com sucesso!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetForm}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white text-xs uppercase tracking-wider font-semibold rounded-md transition cursor-pointer"
          >
            Fazer Nova Avaliação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-4 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
      
      {/* Visual Header inspired by Clean Minimalism template */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 text-slate-800 p-6 md:p-8 mb-8 rounded-r-2xl border-y border-r border-slate-200 shadow-xs">
        <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none">
          <FileText className="w-48 h-48 -mr-8 -mt-8 text-amber-500" />
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 mb-2">
          Pesquisa de Avaliação pós Tour
        </h1>
        <p className="text-slate-600 font-medium text-sm md:text-base">
          Olá participante! Esta pesquisa é direcionada à sua percepção sobre o acolhimento e clareza do nosso tour corporativo.
        </p>

        {/* Dynamic Host Profile Info */}
        <div className="mt-5 p-3.5 bg-white border border-slate-200/90 rounded-xl flex items-center gap-3 max-w-sm shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
            {activeAssistente.substring(0, 2)}
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Condutor do seu Tour</span>
            <p className="text-xs font-bold text-slate-900">{activeAssistente}</p>
            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5 font-mono">
              Unidade {activeUnidade}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5 items-center text-xs text-slate-500 font-semibold font-mono">
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-md shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-amber-500" /> {todayFormatted}
          </span>
          <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-md shadow-2xs">
            <Award className="w-3.5 h-3.5 text-amber-500" /> Unidade {activeUnidade}
          </span>
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-150 px-3 py-1 rounded-md shadow-2xs">
            Preenchimento pelo Visitante
          </span>
        </div>
      </div>

      {/* INDICADOR DE PROGRESSO DE PREENCHIMENTO DO VISITANTE */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 mb-6 transition-all duration-300 shadow-3xs relative overflow-hidden">
        {/* Decorative subtle pulse background gradient spot */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-amber-500 text-slate-950">
              <span className="relative flex h-1.5 w-1.5 animate-pulse">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-950"></span>
              </span>
              Seu Progresso
            </span>
            <span className="text-slate-600 text-xs font-bold font-mono">
              {progressStats.completedCount} de {progressStats.totalFields} itens concluídos
            </span>
          </div>
          <span className="text-amber-600 font-mono text-sm font-black text-right">
            {progressStats.percent}% completo
          </span>
        </div>

        {/* Progress bar glass bar overlay */}
        <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden border border-slate-250/40 shadow-inner">
          <div 
            className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progressStats.percent}%` }}
          >
            {/* Glossy light streak shine overlay */}
            <div className="absolute inset-x-0 top-0 bottom-1/2 bg-white/20 rounded-t-full pointer-events-none"></div>
          </div>
        </div>

        <p className="text-slate-400 text-[10.5px] mt-2 font-medium leading-relaxed">
          {progressStats.percent === 100 
            ? "✨ Excelente! Todas as perguntas obrigatórias foram preenchidas. Vá ao final e envie sua resposta." 
            : `Faltam ${progressStats.totalFields - progressStats.completedCount} campos obrigatórios para concluir 100% da avaliação.`}
        </p>
      </div>

      <p className="text-slate-400 text-xs mb-6">
        Os campos marcados com um asterisco vermelho (<span className="text-red-500 font-bold">*</span>) são de preenchimento obrigatório.
      </p>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* Data do Tour */}
        <div id="field-date" className="p-5 border border-slate-250/70 rounded-xl bg-slate-50/20 hover:border-slate-350 transition-all shadow-xs">
          <label className="block text-slate-800 text-sm font-semibold mb-2">
            Data de Realização do Tour <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-xs md:text-sm bg-white"
          />
        </div>

        {/* 1. Seu Nome Completo */}
        <div id="field-nomeCompleto" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.nomeCompleto ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            1. Seu Nome Completo <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">Insira o seu nome completo conforme documento escolar ou de crachá.</p>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Digite aqui seu nome completo..."
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-xs md:text-sm bg-white text-slate-800"
            />
          </div>
          {errors.nomeCompleto && <p className="text-red-500 text-xs mt-2 font-medium">{errors.nomeCompleto}</p>}
        </div>

        {/* 2. Idade */}
        <div id="field-idade" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.idade ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            2. Idade <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">Digite a sua idade (somente números).</p>
          <input
            type="number"
            min="1"
            max="120"
            placeholder="Ex: 27"
            value={idade}
            onChange={(e) => setIdade(e.target.value)}
            className="w-full max-w-[120px] px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-xs md:text-sm bg-white text-slate-800"
          />
          {errors.idade && <p className="text-red-500 text-xs mt-2 font-medium">{errors.idade}</p>}
        </div>

        {/* 3. Nome do seu Líder Educador */}
        <div id="field-liderEducador" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.liderEducador ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            3. Nome do seu Líder Educador <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">Selecione um líder sugerido ou digite o nome completo dele.</p>
          
          <div className="flex flex-wrap gap-1.5 mb-3">
            {leaders.map((leader) => (
              <button
                type="button"
                key={leader}
                onClick={() => setLiderEducador(leader)}
                className={`px-3 py-1 text-xs font-medium rounded border transition cursor-pointer ${
                  liderEducador === leader
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {leader}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Selecione acima ou digite o nome do líder educador..."
            value={liderEducador}
            onChange={(e) => setLiderEducador(e.target.value)}
            className="w-full px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-xs md:text-sm bg-white text-slate-800"
          />
          {errors.liderEducador && <p className="text-red-500 text-xs mt-2 font-medium">{errors.liderEducador}</p>}
        </div>

        {/* 4. Qual é o seu produto (operação)? */}
        <div id="field-produto" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.produto ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            4. Qual é o seu produto (operação)? <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">Selecione uma operação abaixo ou digite outra personalizada.</p>

          <div className="flex flex-col gap-1.5 mb-3">
            {products.map((prod) => (
              <button
                type="button"
                key={prod}
                onClick={() => setProduto(prod)}
                className={`py-2 px-3 text-left text-xs rounded-md border transition flex items-center justify-between cursor-pointer ${
                  produto === prod
                    ? "bg-slate-900 border-slate-900 text-white font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{prod}</span>
                {produto === prod && <span className="bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">Ativo</span>}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Ou digite outro produto/operação caso não esteja listado..."
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
            className="w-full px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-xs md:text-sm bg-white text-slate-800"
          />
          {errors.produto && <p className="text-red-500 text-xs mt-2 font-medium">{errors.produto}</p>}
        </div>

        {/* 5. Quantidade de participantes nos tour */}
        <div id="field-participantes" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.participantes ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            5. Quantidade de participantes no tour <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">Informe o número de participantes presentes neste tour conduzido.</p>
          <div className="relative max-w-[125px]">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Users className="w-4 h-4" />
            </span>
            <input
              type="number"
              min="1"
              placeholder="Ex: 25"
              value={participantes}
              onChange={(e) => setParticipantes(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-xs md:text-sm bg-white text-slate-800"
            />
          </div>
          {errors.participantes && <p className="text-red-500 text-xs mt-2 font-medium">{errors.participantes}</p>}
        </div>

        {/* 6. Qual assistente que conduziu o TP TOUR? */}
        <div id="field-assistente" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.assistente ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            6. Qual assistente que conduziu o TP TOUR? <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">O assistente condutor oficial responsável pelo seu tour.</p>
          <div className="space-y-1.5 mt-2.5">
            {session && session.unidade !== "TODAS" && !session.isVisitor ? (
              /* Se for um colaborador regular logado, deixa UNICAMENTE o nome dele */
              <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl cursor-default transition">
                <input
                  type="radio"
                  name="assistente"
                  value={session.nome.toUpperCase()}
                  checked={true}
                  readOnly
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                <div className="flex flex-col">
                  <span className="text-slate-900 font-extrabold text-xs flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {session.nome.toUpperCase()}
                  </span>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                    Responsável Oficial pela Condução do Tour
                  </span>
                </div>
              </label>
            ) : (
              /* Se for Gestor Geral (TODAS) ou não logado, exibe todas as opções */
              <>
                {session && (
                  <label className="flex items-center gap-3 p-2.5 bg-emerald-50/50 border border-emerald-250 rounded-md hover:bg-emerald-50 cursor-pointer transition">
                    <input
                      type="radio"
                      name="assistente"
                      value={session.nome.toUpperCase()}
                      checked={assistente.toUpperCase() === session.nome.toUpperCase()}
                      onChange={(e) => setAssistente(e.target.value)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-slate-900 font-bold text-xs flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {session.nome.toUpperCase()} (Assistente Logado)
                    </span>
                  </label>
                )}

                <label className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="radio"
                    name="assistente"
                    value="VINICIUS"
                    checked={assistente === "VINICIUS"}
                    onChange={(e) => setAssistente(e.target.value)}
                    className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-slate-800 font-semibold font-mono text-xs">VINICIUS (Coordenador Operacional)</span>
                </label>

                <div className="flex gap-2 items-center p-2.5 bg-white border border-slate-200 rounded-md">
                  <input
                    type="radio"
                    name="assistente"
                    value="OUTRO"
                    checked={assistente !== "VINICIUS" && (!session || assistente.toUpperCase() !== session.nome.toUpperCase())}
                    onChange={() => setAssistente("")}
                    className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Digitar outro assistente..."
                    value={(assistente === "VINICIUS" || (session && assistente.toUpperCase() === session.nome.toUpperCase())) ? "" : assistente}
                    disabled={assistente === "VINICIUS" || (session && assistente.toUpperCase() === session.nome.toUpperCase())}
                    onChange={(e) => setAssistente(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-amber-500 outline-none bg-white font-medium"
                  />
                </div>
              </>
            )}
          </div>
          {errors.assistente && <p className="text-red-500 text-xs mt-2 font-medium">{errors.assistente}</p>}
        </div>

        {/* 7. Em qual unidade foi realizado o tour? */}
        <div id="field-unidade" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.unidade ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            7. Em qual unidade foi realizado o tour? <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">A unidade operacional oficial onde o tour foi realizado.</p>
          
          {session && session.unidade !== "TODAS" ? (
            /* Se for um colaborador regular logado, deixa unicamente a unidade dele */
            <div className="mt-2.5">
              <label className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-300 rounded-xl cursor-default transition">
                <input
                  type="radio"
                  name="unidade"
                  value={session.unidade}
                  checked={true}
                  readOnly
                  className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500"
                />
                <div className="flex flex-col">
                  <span className="text-slate-900 font-extrabold text-xs flex items-center gap-1.5 font-mono uppercase tracking-wide">
                    Unidade {session.unidade}
                  </span>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                    Posto de Trabalho Vinculado ao Colaborador
                  </span>
                </div>
              </label>
            </div>
          ) : (
            /* Se for Gestor Geral (TODAS) ou não logado, exibe todas as opções */
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                {["LAPA", "Vila Prudente", "PRN", "SGA"].map((u) => (
                  <label 
                    key={u} 
                    className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition text-xs font-semibold ${
                      unidade === u 
                        ? "bg-amber-500 text-slate-900 border-amber-600 shadow-xs" 
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="unidade"
                      value={u}
                      checked={unidade === u}
                      onChange={(e) => setUnidade(e.target.value)}
                      className="w-3.5 h-3.5 text-slate-900 border-slate-300 focus:ring-slate-900"
                    />
                    <span>{u}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex gap-2 items-center p-2.5 bg-white border border-slate-200 rounded-md mt-2">
                <input
                  type="radio"
                  name="unidade"
                  value="OUTRA"
                  checked={!["LAPA", "Vila Prudente", "PRN", "SGA"].includes(unidade)}
                  onChange={() => setUnidade("")}
                  className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500"
                />
                <input
                  type="text"
                  placeholder="Outra unidade de lotação..."
                  value={["LAPA", "Vila Prudente", "PRN", "SGA"].includes(unidade) ? "" : unidade}
                  disabled={["LAPA", "Vila Prudente", "PRN", "SGA"].includes(unidade)}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-amber-500 outline-none bg-white font-medium"
                />
              </div>
            </>
          )}
          {errors.unidade && <p className="text-red-500 text-xs mt-2 font-medium">{errors.unidade}</p>}
        </div>

        {/* 8. Como você avalia a clareza e a utilidade das informações compartilhadas durante o tour? */}
        <div id="field-notaClareza" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.notaClareza || errors.justificativaClareza ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            8. Como você avalia a clareza e a utilidade das informações compartilhadas durante o tour? <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-4">Escolha de 1 (Pouquíssimo clara/Sem utilidade) a 10 (Extremamente clara e útil).</p>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-4">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setNotaClareza(val)}
                className={`py-2 rounded-md border font-mono font-bold text-xs transition duration-150 cursor-pointer ${
                  notaClareza === val
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          {errors.notaClareza && <p className="text-red-500 text-xs mt-1 mb-2 font-medium">{errors.notaClareza}</p>}

          {/* 9. Justificar a nota selecionada do item 8 */}
          <div className="mt-4">
            <label className="block text-slate-800 text-xs font-semibold mb-1.5">
              9. Justificar a nota selecionada do item 8 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Explique o motivo da nota dada à clareza das informações..."
              value={justificativaClareza}
              onChange={(e) => setJustificativaClareza(e.target.value)}
              className="w-full px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 text-xs md:text-sm resize-y bg-white placeholder-slate-400"
            />
            {errors.justificativaClareza && <p className="text-red-500 text-xs mt-1 font-medium">{errors.justificativaClareza}</p>}
          </div>
        </div>

        {/* 10. Como você avalia o acolhimento e a receptividade do time de Boas-Vindas? */}
        <div id="field-notaAcolhimento" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.notaAcolhimento || errors.justificativaAcolhimento ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            10. Como você avalia o acolhimento e a receptividade do time de Boas-Vindas? <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-4">Escolha de 1 (Pouco acolhedor) a 10 (Extremamente caloroso).</p>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-4">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setNotaAcolhimento(val)}
                className={`py-2 rounded-md border font-mono font-bold text-xs transition duration-150 cursor-pointer ${
                  notaAcolhimento === val
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          {errors.notaAcolhimento && <p className="text-red-500 text-xs mt-1 mb-2 font-medium">{errors.notaAcolhimento}</p>}

          {/* 11. Justificar a nota selecionada do item 10 */}
          <div className="mt-4">
            <label className="block text-slate-800 text-xs font-semibold mb-1.5">
              11. Justificar a nota selecionada do item 10 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Por que você deu essa nota para a receptividade do time de Boas-Vindas?..."
              value={justificativaAcolhimento}
              onChange={(e) => setJustificativaAcolhimento(e.target.value)}
              className="w-full px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 text-xs md:text-sm resize-y bg-white placeholder-slate-400"
            />
            {errors.justificativaAcolhimento && <p className="text-red-500 text-xs mt-1 font-medium">{errors.justificativaAcolhimento}</p>}
          </div>
        </div>

        {/* 12. de 1 a 10 qual nota você daria para o assistente? */}
        <div id="field-notaAssistente" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.notaAssistente || errors.justificativaAssistente ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            12. de 1 a 10 qual nota você daria para o assistente? <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-4">Classifique o suporte direto oferecido pelo assistente de 1 a 10.</p>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-4">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setNotaAssistente(val)}
                className={`py-2 rounded-md border font-mono font-bold text-xs transition duration-150 cursor-pointer ${
                  notaAssistente === val
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          {errors.notaAssistente && <p className="text-red-500 text-xs mt-1 mb-2 font-medium">{errors.notaAssistente}</p>}

          {/* 13. Justificar a nota selecionada do item 12 */}
          <div className="mt-4">
            <label className="block text-slate-800 text-xs font-semibold mb-1.5">
              13. Justificar a nota selecionada do item 12 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="O que motivou a nota dada ao assistente condutor?..."
              value={justificativaAssistente}
              onChange={(e) => setJustificativaAssistente(e.target.value)}
              className="w-full px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 text-xs md:text-sm resize-y bg-white placeholder-slate-400"
            />
            {errors.justificativaAssistente && <p className="text-red-500 text-xs mt-1 font-medium">{errors.justificativaAssistente}</p>}
          </div>
        </div>

        {/* 14. Há algo que o time dos Boas - Vindas poderia melhorar para tornar a experiência ainda melhor? */}
        <div id="field-melhorias" className={`p-5 border rounded-xl transition-all shadow-xs ${errors.melhorias ? 'border-red-300 bg-red-50/5' : 'border-slate-250/70 bg-slate-50/20 hover:border-slate-350'}`}>
          <label className="block text-slate-900 text-sm font-semibold mb-1">
            14. Há algo que o time dos Boas - Vindas poderia melhorar para tornar a experiência ainda melhor? <span className="text-red-500">*</span>
          </label>
          <p className="text-slate-400 text-xs mb-3">Escreva suas sugestões construtivas ou ideias de pontos de melhoria observados.</p>
          <textarea
            rows={4}
            placeholder="Espaço livre para sugestões práticas de melhoria..."
            value={melhorias}
            onChange={(e) => setMelhorias(e.target.value)}
            className="w-full px-3 py-2 border border-slate-250 rounded-md focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 text-xs md:text-sm resize-y bg-white placeholder-slate-400"
          />
          {errors.melhorias && <p className="text-red-500 text-xs mt-1 font-medium">{errors.melhorias}</p>}
        </div>

        {/* Botoes de Controle */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-md transition duration-200 cursor-pointer"
          >
            Limpar Respostas
          </button>
          
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-md transition duration-200 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Configurando..." : "Enviar Resposta"}
            <ThumbsUp className="w-4 h-4" />
          </button>
        </div>

      </form>
    </div>
  );
}
