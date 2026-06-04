import { createClient } from '@supabase/supabase-js';
import type {
  SurveySubmission,
  TourSchedule,
  ManagerNotice,
  CollaboratorMessage,
  DailyActivityReport,
} from './types';

const SUPABASE_URL = 'https://mjqnfpmbicohpaudsord.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcW5mcG1iaWNvaHBhdWRzb3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDY4ODcsImV4cCI6MjA5NjA4Mjg4N30._LIsJN6KofvNtc3m0SQVku4p9p-5XmOZvZ91u6o3l1M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── SURVEY SUBMISSIONS ──────────────────────────────────────
export function submissionToDb(s: SurveySubmission) {
  return {
    id: s.id,
    date: s.date,
    nome_completo: s.nomeCompleto ?? '',
    idade: s.idade ?? 0,
    lider_educador: s.liderEducador ?? '',
    produto: s.produto ?? '',
    participantes: s.participantes ?? 0,
    assistente: s.assistente ?? '',
    unidade: s.unidade ?? '',
    nota_clareza: s.notaClareza ?? 0,
    justificativa_clareza: s.justificativaClareza ?? '',
    nota_acolhimento: s.notaAcolhimento ?? 0,
    justificativa_acolhimento: s.justificativaAcolhimento ?? '',
    nota_assistente: s.notaAssistente ?? 0,
    justificativa_assistente: s.justificativaAssistente ?? '',
    melhorias: s.melhorias ?? '',
    is_split_part: s.isSplitPart ?? false,
    original_tour_id: s.originalTourId ?? '',
    is_second_leva: s.isSecondLeva ?? false,
  };
}

export function dbToSubmission(row: Record<string, unknown>): SurveySubmission {
  return {
    id: row.id as string,
    date: row.date as string,
    nomeCompleto: row.nome_completo as string,
    idade: row.idade as number,
    liderEducador: row.lider_educador as string,
    produto: row.produto as string,
    participantes: row.participantes as number,
    assistente: row.assistente as string,
    unidade: row.unidade as string,
    notaClareza: row.nota_clareza as number,
    justificativaClareza: row.justificativa_clareza as string,
    notaAcolhimento: row.nota_acolhimento as number,
    justificativaAcolhimento: row.justificativa_acolhimento as string,
    notaAssistente: row.nota_assistente as number,
    justificativaAssistente: row.justificativa_assistente as string,
    melhorias: row.melhorias as string,
    isSplitPart: row.is_split_part as boolean,
    originalTourId: row.original_tour_id as string,
    isSecondLeva: row.is_second_leva as boolean,
  };
}

// ─── TOUR SCHEDULES ──────────────────────────────────────────
export function scheduleToDb(s: TourSchedule) {
  return {
    id: s.id,
    title: s.title ?? '',
    date: s.date ?? '',
    time: s.time ?? '',
    guide: s.guide ?? '',
    unit: s.unit ?? '',
    participants: s.participants ?? 0,
    product: s.product ?? '',
    notes: s.notes ?? '',
    status: s.status ?? 'scheduled',
    created_at_val: s.createdAt ?? '',
    completed_at: s.completedAt ?? '',
    is_split_part: s.isSplitPart ?? false,
    original_tour_id: s.originalTourId ?? '',
    reminder_minutes_override: s.reminderMinutesOverride ?? null,
    reminder_sound_type_override: s.reminderSoundTypeOverride ?? '',
    reminder_sound_enabled_override: s.reminderSoundEnabledOverride ?? null,
    reminder_visual_enabled_override: s.reminderVisualEnabledOverride ?? null,
    intervention_logs: s.interventionLogs ?? [],
  };
}

export function dbToSchedule(row: Record<string, unknown>): TourSchedule {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    time: row.time as string,
    guide: row.guide as string,
    unit: row.unit as string,
    participants: row.participants as number,
    product: row.product as string,
    notes: row.notes as string,
    status: row.status as TourSchedule['status'],
    createdAt: row.created_at_val as string,
    completedAt: row.completed_at as string,
    isSplitPart: row.is_split_part as boolean,
    originalTourId: row.original_tour_id as string,
    reminderMinutesOverride: row.reminder_minutes_override as number | undefined,
    reminderSoundTypeOverride: row.reminder_sound_type_override as string | undefined,
    reminderSoundEnabledOverride: row.reminder_sound_enabled_override as boolean | undefined,
    reminderVisualEnabledOverride: row.reminder_visual_enabled_override as boolean | undefined,
    interventionLogs: (row.intervention_logs as TourSchedule['interventionLogs']) ?? [],
  };
}

// ─── MANAGER NOTICES ─────────────────────────────────────────
export function noticeToDb(n: ManagerNotice) {
  return {
    id: n.id,
    title: n.title ?? '',
    content: n.content ?? '',
    date: n.date ?? '',
    created_by: n.createdBy ?? '',
    priority: n.priority ?? 'medium',
    affected_unit: n.affectedUnit ?? '',
  };
}

export function dbToNotice(row: Record<string, unknown>): ManagerNotice {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    date: row.date as string,
    createdBy: row.created_by as string,
    priority: row.priority as ManagerNotice['priority'],
    affectedUnit: row.affected_unit as string,
  };
}

// ─── COLLABORATOR MESSAGES ───────────────────────────────────
export function messageToDb(m: CollaboratorMessage) {
  return {
    id: m.id,
    sender_name: m.senderName ?? '',
    sender_unit: m.senderUnit ?? '',
    subject: m.subject ?? '',
    content: m.content ?? '',
    date: m.date ?? '',
    time: m.time ?? '',
    is_read: m.isRead ?? false,
  };
}

export function dbToMessage(row: Record<string, unknown>): CollaboratorMessage {
  return {
    id: row.id as string,
    senderName: row.sender_name as string,
    senderUnit: row.sender_unit as string,
    subject: row.subject as string,
    content: row.content as string,
    date: row.date as string,
    time: row.time as string,
    isRead: row.is_read as boolean,
  };
}

// ─── DAILY REPORTS ───────────────────────────────────────────
export function reportToDb(r: DailyActivityReport) {
  return {
    id: r.id,
    collaborator_name: r.collaboratorName ?? '',
    date: r.date ?? '',
    unit: r.unit ?? '',
    activities: r.activities ?? '',
    timestamp_val: r.timestamp ?? '',
  };
}

export function dbToReport(row: Record<string, unknown>): DailyActivityReport {
  return {
    id: row.id as string,
    collaboratorName: row.collaborator_name as string,
    date: row.date as string,
    unit: row.unit as string,
    activities: row.activities as string,
    timestamp: row.timestamp_val as string,
  };
}
