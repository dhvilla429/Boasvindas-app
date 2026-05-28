import { useState } from "react";
import { getStoredCredentials, updatePassword, CredentialUnit } from "../utils/auth";
import { ShieldCheck, Eye, EyeOff, Key, Copy, Check, Lock, MapPin, Edit3, Save, X } from "lucide-react";

export default function ManagerCredentialsPanel() {
  const [credentials, setCredentials] = useState<CredentialUnit[]>(() => getStoredCredentials());
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedUser, setCopiedUser] = useState<string | null>(null);

  // States for Editing/Changing Password
  const [editingUser, setEditingUser] = useState<{ unidadeValue: string; nome: string } | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const togglePasswordVisibility = (nome: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [nome]: !prev[nome]
    }));
  };

  const handleCopyCredentials = (nome: string, senha: string, unidade: string) => {
    const textToCopy = `User: ${nome} | Senha: ${senha} | Unidade: ${unidade}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedUser(nome);
        setTimeout(() => setCopiedUser(null), 2000);
      })
      .catch((err) => console.error("Could not copy text: ", err));
  };

  const startEditPassword = (unidadeValue: string, nome: string, currentSenha: string) => {
    setEditingUser({ unidadeValue, nome });
    setNewPasswordVal(currentSenha);
  };

  const handleSavePassword = (unidadeValue: string, nome: string) => {
    if (!newPasswordVal.trim()) return;

    const ok = updatePassword(unidadeValue, nome, newPasswordVal.trim());
    if (ok) {
      setCredentials(getStoredCredentials()); // refresh state
      setEditingUser(null);
      setNewPasswordVal("");
      setSuccessMsg(`Senha do colaborador ${nome} foi atualizada com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mt-6">
      
      {/* Header section */}
      <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase">
              Gerenciamento de Credenciais de Acesso
            </h3>
            <p className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">
              Painel Exclusivo de Controle Administrativo (Gestor)
            </p>
          </div>
        </div>
        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase font-mono font-bold tracking-wider">
          Acesso Seguro
        </span>
      </div>

      <div className="p-5 space-y-4">
        
        {/* Helper Alert Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-800">Gerenciamento e Alteração de Credenciais:</strong> Como gestor geral, você pode visualizar e alterar as senhas de qualquer integrante das Equipes Boas-Vindas por unidade ou da própria administração. Use as ferramentas inline para redefinir as chaves de acesso imediatamente.
          </div>
        </div>

        {/* Temporary Success Alert Banner */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Dashboard grid for each unit section list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {credentials.map((unit) => (
            <div 
              key={unit.unidadeValue} 
              className={`border rounded-xl bg-white overflow-hidden shadow-xs flex flex-col justify-between ${
                unit.unidadeValue === "TODAS" 
                  ? "border-emerald-200 ring-1 ring-emerald-100" 
                  : "border-slate-200"
              }`}
            >
              {/* Card Header for Unit */}
              <div className={`p-3 border-b flex items-center justify-between ${
                unit.unidadeValue === "TODAS"
                  ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                  : "bg-slate-50/60 border-slate-100 text-slate-800"
              }`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className={`w-3.5 h-3.5 ${unit.unidadeValue === "TODAS" ? "text-emerald-500" : "text-amber-500"} shrink-0`} />
                  <span className="text-xs font-bold leading-tight truncate uppercase tracking-wider font-mono">
                    {unit.unidadeValue === "TODAS" ? "ADMINISTRAÇÃO" : unit.unidadeLabel}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-md font-mono">
                  {unit.usuarios.length} {unit.usuarios.length === 1 ? "Usuário" : "Usuários"}
                </span>
              </div>

              {/* Card Body - list users in unit */}
              <div className="divide-y divide-slate-100 divide-dotted p-3 bg-white space-y-2.5">
                {unit.usuarios.map((usr) => {
                  const isVisible = !!showPasswords[usr.nome];
                  const hasCopied = copiedUser === usr.nome;
                  const isEditing = editingUser && editingUser.unidadeValue === unit.unidadeValue && editingUser.nome === usr.nome;

                  return (
                    <div key={usr.nome} className="flex flex-col py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {usr.nome}
                          </p>
                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-slate-400" />
                              <span className="text-[11px] font-mono font-medium text-slate-500">
                                {isVisible ? usr.senha : "••••••••"}
                              </span>
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Edit Password Trigger */}
                            <button
                              onClick={() => startEditPassword(unit.unidadeValue, usr.nome, usr.senha)}
                              className="p-1.5 hover:bg-amber-50 hover:text-amber-700 text-slate-400 rounded-md transition cursor-pointer"
                              title="Alterar Senha"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Show/Hide password toggle */}
                            <button
                              onClick={() => togglePasswordVisibility(usr.nome)}
                              className="p-1.5 hover:bg-slate-100 hover:text-slate-800 text-slate-400 rounded-md transition cursor-pointer"
                              title={isVisible ? "Esconder Senha" : "Mostrar Senha"}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Copy button */}
                            <button
                              onClick={() => handleCopyCredentials(usr.nome, usr.senha, unit.unidadeValue)}
                              className={`p-1.5 rounded-md transition cursor-pointer ${
                                hasCopied 
                                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100/80" 
                                  : "hover:bg-slate-100 hover:text-slate-800 text-slate-400"
                              }`}
                              title="Copiar Usuário + Senha"
                            >
                              {hasCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline password edit form */}
                      {isEditing && (
                        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
                          <input
                            type="text"
                            value={newPasswordVal}
                            onChange={(e) => setNewPasswordVal(e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs grow font-mono text-slate-700 focus:outline-none focus:border-amber-500"
                            placeholder="Nova senha..."
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePassword(unit.unidadeValue, usr.nome)}
                            className="p-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded transition cursor-pointer"
                            title="Salvar senha"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded transition cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
