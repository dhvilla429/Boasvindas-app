export interface CredentialUser {
  nome: string;
  senha: string;
}

export interface CredentialUnit {
  unidadeLabel: string;
  unidadeValue: string;
  usuarios: CredentialUser[];
}

const DEFAULT_CREDENTIALS: CredentialUnit[] = [
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
      { nome: "Gustavo Assis", senha: "vila123" },
      { nome: "Catherine Dias", senha: "vila123" }
    ]
  },
  {
    unidadeLabel: "Unidade PRN",
    unidadeValue: "PRN",
    usuarios: [
      { nome: "Vinicius Lima", senha: "prn123" },
      { nome: "Rafaela Alessandra", senha: "prn123" },
      { nome: "Jaciana Melo", senha: "prn123" }
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

const LOCAL_STORAGE_KEY = "tp_tour_credentials_db";

export function getStoredCredentials(): CredentialUnit[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CredentialUnit[];
      let updated = false;
      parsed.forEach(unit => {
        unit.usuarios.forEach(user => {
          if (user.nome === "Gustavo de Assis") {
            user.nome = "Gustavo Assis";
            updated = true;
          }
        });
      });

      // Migration to guarantee Jaciana Melo is present in PRN unit
      const prnUnit = parsed.find(u => u.unidadeValue === "PRN");
      if (prnUnit) {
        const hasJaciana = prnUnit.usuarios.some(u => u.nome === "Jaciana Melo");
        if (!hasJaciana) {
          prnUnit.usuarios.push({ nome: "Jaciana Melo", senha: "prn123" });
          updated = true;
        }
      }

      if (updated) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (err) {
    console.error("Error reading credentials from localStorage", err);
  }
  return DEFAULT_CREDENTIALS;
}

export function saveCredentials(credentials: CredentialUnit[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(credentials));
  } catch (err) {
    console.error("Error saving credentials to localStorage", err);
  }
}

export function updatePassword(unidadeValue: string, nome: string, novaSenha: string): boolean {
  const current = getStoredCredentials();
  const unit = current.find(u => u.unidadeValue === unidadeValue);
  if (!unit) return false;
  
  const user = unit.usuarios.find(usr => usr.nome === nome);
  if (!user) return false;
  
  user.senha = novaSenha;
  saveCredentials(current);
  return true;
}
