export interface UserSession {
  nome: string;
  unidade: string; // "LAPA" | "Vila Prudente" | "PRN" | "SGA"
  isVisitor?: boolean;
}

export interface SurveySubmission {
  id: string;
  date: string; // ISO String (Y-M-D)
  nomeCompleto: string;
  idade: number;
  liderEducador: string;
  produto: string; // e.g. "Tour Histórico", "Tour Pedagógico", "Tour Corporativo", "Tour Tecnológico", etc.
  participantes: number;
  assistente: string; // "VINICIUS" or others
  unidade: string; // "PRN" or others
  notaClareza: number; // 1-10
  justificativaClareza: string;
  notaAcolhimento: number; // 1-10
  justificativaAcolhimento: string;
  notaAssistente: number; // 1-10
  justificativaAssistente: string;
  melhorias: string;
  isSplitPart?: boolean;
  originalTourId?: string;
  isSecondLeva?: boolean;
}

export interface DashboardStats {
  participantesTotais: number;
  totalTours: number;
  mediaClareza: number;
  mediaAcolhimento: number;
  mediaAssistente: number;
  toursPorProduto: Record<string, number>;
  participantesPorProduto: Record<string, number>;
  demografiaIdades: {
    jovens: number; // 18-25
    adultos: number; // 26-35
    maduros: number; // 36-50
    seniores: number; // 51+
  };
  participantesPorPeriodo: {
    periodo: string;
    participantes: number;
    tours: number;
  }[];
}

export interface TourIntervention {
  id: string;
  timestamp: string; // readable locale date-time string
  operator: string;
  action: string;
  details: string;
  notes?: string;
}

export interface TourSchedule {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  guide: string;
  unit: string; // "LAPA" | "Vila Prudente" | "PRN" | "SGA"
  participants: number;
  product: string; // e.g. "Tour Histórico", "Tour Pedagógico", etc.
  notes?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  isSplitPart?: boolean;
  originalTourId?: string;
  reminderMinutesOverride?: number;
  reminderSoundTypeOverride?: string;
  reminderSoundEnabledOverride?: boolean;
  reminderVisualEnabledOverride?: boolean;
  interventionLogs?: TourIntervention[];
}

export interface ManagerNotice {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  createdBy: string;
  priority: "low" | "medium" | "high";
  affectedUnit: string; // "TODAS" or specific unit e.g. "LAPA"
}

export interface CollaboratorMessage {
  id: string;
  senderName: string;
  senderUnit: string;
  subject: string;
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  isRead: boolean;
}

export interface PeerNotice {
  id: string;
  senderName: string;
  senderUnit: string; // e.g. "PRN", "LAPA", etc.
  type: "scheduled" | "updated" | "cancelled" | "conflict";
  title: string;
  message: string;
  timestamp: string; // YYYY-MM-DD HH:MM
  dateAffected: string; // YYYY-MM-DD
  timeAffected: string; // HH:MM
  tourId: string;
  isReadBy: string[]; // List of collaborator names who read/marked this alert
}

export interface DailyActivityReport {
  id: string;
  collaboratorName: string;
  date: string; // YYYY-MM-DD
  unit: string;
  activities: string;
  timestamp: string; // HH:MM
}


