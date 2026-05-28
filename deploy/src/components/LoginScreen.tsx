import React, { useState } from "react";
import { UserSession } from "../types";
import { getStoredCredentials } from "../utils/auth";
import { 
  Building2, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
  QrCode, 
  Printer, 
  ExternalLink, 
  Maximize2, 
  Sparkles,
  KeyRound, 
  Info, 
  CheckCircle2,
  ChevronRight,
  ChevronDown
} from "lucide-react";

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
}

export const CREDENTIALS_DEMO = [
  {
    unidadeLabel: "Gestão Geral (Acesso Total)",
    unidadeValue: "TODAS",
    usuarios: [
      { nome: "Diogo Villa", senha: "gestor123" }
    ]
  },
  {
    unidadeLabel: "Unidade LAPA",
    unidadeValue: "LAPA",
    usuarios: [
      { nome: "Joshua Carlucci", senha: "lapa123" },
      { nome: "Beatriz Reis", senha: "lapa123" },
      { nome: "Beatriz Vital", senha: "lapa123" }
    ]
  },
  {
    unidadeLabel: "Unidade Vila Prudente",
    unidadeValue: "Vila Prudente",
    usuarios: [
      { nome: "Gustavo de Assis", senha: "vila123" },
      { nome: "Catherine Dias", senha: "vila123" }
    ]
  },
  {
    unidadeLabel: "Unidade PRN",
    unidadeValue: "PRN",
    usuarios: [
      { nome: "Vinicius Lima", senha: "prn123" },
      { nome: "Rafaela Alessandra", senha: "prn123" }
    ]
  },
  {
    unidadeLabel: "Unidade SGA (São Gonçalo)",
    unidadeValue: "SGA",
    usuarios: [
      { nome: "Ester Lucas", senha: "sga123" }
    ]
  }
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedUnidade, setSelectedUnidade] = useState("");
  const [selectedNome, setSelectedNome] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const [activeQrUnit, setActiveQrUnit] = useState("LAPA");
  const [isZoomed, setIsZoomed] = useState(false);

  const UNIDADES_QR = [
    {
      nome: "LAPA",
      titulo: "Unidade LAPA",
      cor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      corPinta: "bg-emerald-500",
      urlTag: "LAPA",
      descricao: "Acesso rápido e direto para o tour realizado na unidade Lapa. O formulário será bloqueado nessa unidade para participantes responderem."
    },
    {
      nome: "Vila Prudente",
      titulo: "Unidade Vila Prudente",
      cor: "bg-indigo-50 text-indigo-800 border-indigo-200",
      corPinta: "bg-indigo-500",
      urlTag: "Vila Prudente",
      descricao: "Acesso rápido e direto para o tour realizado na unidade Vila Prudente. Ajusta automaticamente a lotação das turmas e feedbacks."
    },
    {
      nome: "PRN",
      titulo: "Unidade PRN",
      cor: "bg-amber-50 text-amber-800 border-amber-200",
      corPinta: "bg-amber-500",
      urlTag: "PRN",
      descricao: "Acesso rápido e direto para o campo operacional de PRN. Coleta em tempo real para a base de monitoramento central."
    },
    {
      nome: "SGA",
      titulo: "Unidade SGA",
      cor: "bg-sky-50 text-sky-800 border-sky-200",
      corPinta: "bg-sky-500",
      urlTag: "SGA",
      descricao: "Acesso rápido para SGA (São Gonçalo). Prático para tótens físicos, tablets ou displays localizados nas recepções operacionais."
    }
  ];

  const currentQrData = UNIDADES_QR.find(u => u.nome === activeQrUnit) || UNIDADES_QR[0];
  const hostUrl = typeof window !== "undefined" ? window.location.origin : "";
  const targetUrl = `${hostUrl}?unidade=${encodeURIComponent(currentQrData.urlTag)}`;
  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;

  const handlePrint = (unitName: string, destinationUrl: string) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir QR Code - Unidade ${unitName}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #0f172a;
              }
              .container {
                border: 3px double #e2e8f0;
                border-radius: 24px;
                padding: 40px;
                max-width: 450px;
                margin: 0 auto;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              }
              h1 {
                margin: 0 0 10px 0;
                font-size: 28px;
                text-transform: uppercase;
                letter-spacing: -0.5px;
                color: #d97706;
              }
              p.subtitle {
                color: #64748b;
                font-size: 14px;
                margin: 0 0 30px 0;
                font-weight: 500;
              }
              .qr-frame {
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 16px;
                padding: 20px;
                display: inline-block;
                margin-bottom: 25px;
              }
              img {
                display: block;
                width: 250px;
                height: 250px;
              }
              .instructions {
                font-size: 15px;
                font-weight: 600;
                line-height: 1.5;
                color: #1e293b;
                margin: 20px 0;
              }
              .footer-text {
                font-size: 11px;
                color: #94a3b8;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: #fffbeb; color: #b45309; padding: 4px 12px; border-radius: 9999px; border: 1px solid #fef3c7;">
                Pesquisa de Avaliação do Tour
              </span>
              <h1 style="margin-top: 15px;">UNIDADE ${unitName.toUpperCase()}</h1>
              <p class="subtitle">Equipe Boas-Vindas • TP TOUR</p>
              
              <div class="qr-frame">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(destinationUrl)}" alt="QR Code" />
              </div>
              
              <p class="instructions">
                Aponte a câmera do seu celular para o QR Code acima<br/>
                e responda nossa rápida Pesquisa de Avaliação pós-tour!
              </p>
              
              <p class="footer-text">
                URL: ${destinationUrl}
              </p>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const unitData = getStoredCredentials().find((c) => c.unidadeValue === selectedUnidade);
  const availableUsers = unitData ? unitData.usuarios : [];

  const handleUnitChange = (unidadeValue: string) => {
    setSelectedUnidade(unidadeValue);
    setSelectedNome(""); 
    setPassword("");
    setError("");
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUnidade) {
      setError("Por favor, selecione uma Unidade.");
      return;
    }
    if (!selectedNome) {
      setError("Por favor, selecione um Colaborador.");
      return;
    }
    if (!password) {
      setError("Por favor, digite a senha.");
      return;
    }

    const userObj = availableUsers.find((u) => u.nome === selectedNome);
    if (!userObj || userObj.senha !== password) {
      setError("Senha incorreta para o colaborador selecionado.");
      return;
    }

    setError("");
    onLogin({
      nome: selectedNome,
      unidade: selectedUnidade
    });
  };

  const quickFill = (unidade: string, nome: string, senha: string) => {
    setSelectedUnidade(unidade);
    // Wait slightly or update immediately because changing unit alters the availableUsers list
    setTimeout(() => {
      setSelectedNome(nome);
      setPassword(senha);
    }, 50);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 py-16 font-sans selection:bg-amber-100 relative overflow-hidden">
      
      {/* Ambient background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-amber-500/5 to-transparent blur-3xl -z-10 pointer-events-none"></div>
      
      {/* Super Header */}
      <div className="text-center mb-8 space-y-1 mt-4">
        <p className="text-[10px] tracking-[0.25em] font-black text-slate-400 uppercase font-mono">
          Teleperformance • Welcome Experience
        </p>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <span>PORTAL DE AVALIAÇÃO DE TOURS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 rounded-xs animate-ping" />
        </h1>
        <p className="text-slate-500 text-xs">
          Módulo integrado de Pesquisas de Satisfação, Analytics e Totens de Autoatendimento
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-100/80 relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-amber-500 via-amber-400 to-amber-600"></div>

        {/* Portal Branding / Left Info Side */}
        <div className="md:col-span-12 lg:col-span-5 bg-slate-950 p-8 md:p-10 flex flex-col justify-between text-white relative">
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          {/* Subtle glowing spot */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-lg shadow-amber-500/15">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase font-bold text-amber-400 tracking-wider font-mono bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <ShieldCheck className="w-3 h-3 text-amber-400" /> Sistema Certificado
              </span>
              <h2 className="text-2xl font-black tracking-tight mt-1 text-white uppercase font-sans">
                Boas-Vindas TP
              </h2>
            </div>
            
            <p className="text-slate-350 text-xs leading-relaxed font-normal">
              Acompanhe feedbacks de novos contratados e visitantes em tempo real. Painéis customizados para tomada de decisão e excelência no onboarding institucional.
            </p>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Integração de Totem Digital</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Métricas de Nível de Serviço</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Exportação para Relatórios Executivos</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-8 lg:pt-0 relative z-10">
            <div className="border-t border-slate-800/80 pt-5">
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider font-mono">
                Autenticação de Segurança
              </span>
              <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed font-normal">
                Faça login como colaborador para visualizar tabelas, extrair planilhas de respostas ou configurar o formulário.
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
              <span>ESTADOS / BRASIL</span>
              <span>V1.4.5</span>
            </div>
          </div>
        </div>

        {/* Form & Credential Helpers Side */}
        <div className="md:col-span-12 lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-6 bg-white">
          
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
              Acesso Colaborador
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-2.5">
              Entrar no Console de Gestão
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Informe a unidade operacional e valide suas credenciais para gerenciar respostas da avaliação.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2.5 animate-in fade-in duration-200">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Unidade selection */}
            <div className="space-y-2">
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider">
                Unidade Operacional
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                  <Building2 className="w-4 h-4" />
                </span>
                <select
                  value={selectedUnidade}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs md:text-sm text-slate-800 outline-none transition cursor-pointer font-bold appearance-none"
                >
                  <option value="">Selecione sua Unidade de Atuação</option>
                  {getStoredCredentials().map((c) => (
                    <option key={c.unidadeValue} value={c.unidadeValue}>
                      {c.unidadeLabel}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3.5 top-4 text-slate-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Colaborador selection */}
            <div className="space-y-2">
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider">
                Colaborador Indicado
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <select
                  value={selectedNome}
                  disabled={!selectedUnidade}
                  onChange={(e) => setSelectedNome(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 disabled:bg-slate-50/50 disabled:text-slate-400 border border-slate-200 disabled:border-slate-100 focus:border-slate-400 rounded-xl text-xs md:text-sm text-slate-800 outline-none transition cursor-pointer font-bold appearance-none"
                >
                  <option value="">
                    {!selectedUnidade ? "Aguardando seleção de unidade..." : "Selecione seu Nome de Colaborador"}
                  </option>
                  {availableUsers.map((u) => (
                    <option key={u.nome} value={u.nome}>
                      {u.nome}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3.5 top-4 text-slate-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider">
                  Senha de Acesso Individual
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha cadastrada para sua conta..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-slate-400 rounded-xl text-xs md:text-sm text-slate-800 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
               type="submit"
               className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10 border border-amber-600/15 text-center mt-2"
            >
              <span>Acessar Painel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-fill section inside an elegant accordion button to look pristine */}
          <div className="border-t border-slate-100 pt-4">
            <button 
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full text-slate-500 hover:text-slate-800 transition py-1 text-xs font-bold cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                Visualizar Credenciais de Demonstração
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                {showHelp ? "Fechar" : "Expandir"} <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${showHelp ? "rotate-180" : ""}`} />
              </span>
            </button>

            {showHelp && (
              <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200/60 max-h-56 overflow-y-auto space-y-2 text-xs text-slate-600 animate-in fade-in slide-in-from-top-1 duration-250">
                <p className="text-[11px] text-slate-500 font-medium leading-normal mb-1">
                  Clique diretamente em um botão de preenchimento rápido para testar perfis de gestor ou operacionais:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <p className="font-extrabold text-slate-800 text-[10px] uppercase font-mono tracking-wider border-b border-slate-100 pb-1">Perfil Corporativo</p>
                    <button
                      type="button"
                      onClick={() => quickFill("TODAS", "Diogo Villa", "gestor123")}
                      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-white rounded-md text-[10px] uppercase tracking-wide font-black transition cursor-pointer text-center text-ellipsis overflow-hidden whitespace-nowrap"
                    >
                      Preencher Gestão Geral
                    </button>
                    <p className="text-[9px] text-slate-400 font-mono text-center">Senha: gestor123</p>
                  </div>

                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <p className="font-extrabold text-slate-800 text-[10px] uppercase font-mono tracking-wider border-b border-slate-100 pb-1">Unidade Lapa</p>
                    <button
                      type="button"
                      onClick={() => quickFill("LAPA", "Joshua Carlucci", "lapa123")}
                      className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-md text-[10px] uppercase tracking-wide font-black transition cursor-pointer text-center text-ellipsis overflow-hidden whitespace-nowrap"
                    >
                      Preencher Joshua (Lapa)
                    </button>
                    <p className="text-[9px] text-slate-400 font-mono text-center">Senha: lapa123</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* SEÇÃO DE QR CODES PARA PARTICIPANTES */}
      <div className="w-full max-w-4xl bg-white border border-slate-250/70 rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/20 space-y-8 relative overflow-hidden">
        
        {/* Top styling badge accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                <QrCode className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Espelhamento de Totem / Pesquisa Direta via QR Code
              </h3>
            </div>
            <p className="text-slate-500 text-xs">
              Disponibilize de forma prática canais diretos para que os visitantes ou participantes iniciem a avaliação pós-tour em seus smartphones sem exigir login.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Seletor de Unidades em botões verticais */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Passo 1: Selecione a Unidade Operacional
              </span>
              
              <div className="grid grid-cols-1 gap-2.5">
                {UNIDADES_QR.map((item) => {
                  const isActive = activeQrUnit === item.nome;
                  return (
                    <button
                      key={item.nome}
                      type="button"
                      onClick={() => setActiveQrUnit(item.nome)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-150 flex items-center justify-between group ${
                        isActive
                          ? "bg-slate-950 border-slate-950 text-white shadow-md shadow-slate-950/10"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <span className={`w-3 h-3 rounded-full ${item.corPinta} shrink-0 ring-4 ${isActive ? "ring-slate-800" : "ring-slate-100"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-black font-mono tracking-tight uppercase">{item.titulo}</p>
                          <p className={`text-[10px] truncate mt-0.5 ${isActive ? "text-slate-400" : "text-slate-500"}`}>
                            {item.nome} • Canal Direto de Feedback
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isActive ? "translate-x-1 text-amber-400" : "text-slate-400 group-hover:translate-x-0.5"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl text-slate-600 space-y-2 text-xs">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                Guia Útil para Equipe
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
                Imprima e plastifique a filipeta de sua unidade para disponibilizar na prancheta ou display oficial do Boas-Vindas. Os dados coletados são imputados automaticamente em seu painel correspondente!
              </p>
            </div>
          </div>

          {/* Display do QR Code Ativo */}
          <div className="md:col-span-6 bg-slate-50 rounded-3xl border border-slate-200 p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            
            <div 
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative group cursor-pointer transition hover:shadow-md" 
              onClick={() => setIsZoomed(true)} 
              title="Clique para ampliar"
            >
              <img
                src={qrCodeImgSrc}
                alt={`QR Code ${activeQrUnit}`}
                className="w-44 h-44 rounded-lg object-contain transition-all duration-300 group-hover:scale-98"
              />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition duration-150 rounded-2xl flex items-center justify-center backdrop-blur-3xs">
                <span className="text-white text-[10px] font-extrabold flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl shadow-lg border border-white/10 uppercase tracking-wider">
                  <Maximize2 className="w-3.5 h-3.5" /> Ampliar QR
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-1 w-full">
              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-bold font-mono">
                <span className={`w-2 h-2 rounded-full ${currentQrData.corPinta}`} />
                <span className="text-slate-800 text-[10px] tracking-tight uppercase">{currentQrData.titulo}</span>
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed pt-2">
                {currentQrData.descricao}
              </p>
            </div>

            {/* Ações para o QR Code */}
            <div className="grid grid-cols-2 gap-3 mt-6 w-full">
              <button
                type="button"
                onClick={() => handlePrint(currentQrData.nome, targetUrl)}
                className="py-3 px-3 bg-white border border-slate-200 hover:border-slate-350 text-slate-800 hover:text-slate-900 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <a
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-900 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 border border-amber-600/10 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Testar Link
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL ZOOM DE QR CODE */}
      {isZoomed && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsZoomed(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6 text-center cursor-default animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono ${currentQrData.cor} border`}>
                QR Code de Autoatendimento
              </span>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight pt-2">
                {currentQrData.titulo}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
                Aponte a câmera do seu celular para escanear e iniciar a pesquisa correspondente diretamente.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block w-full">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(targetUrl)}`}
                alt={`QR Code ${activeQrUnit}`}
                className="w-60 h-60 mx-auto object-contain rounded-lg shadow-sm bg-white p-2"
              />
            </div>

            <div className="space-y-3 font-mono">
              <p className="text-[10px] text-slate-400 break-all border-t border-slate-100 pt-4 leading-normal">
                URL direta: {targetUrl}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  handlePrint(currentQrData.nome, targetUrl);
                  setIsZoomed(false);
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

