import { SurveySubmission, DashboardStats } from "./types";

// Helper to calculate statistics dynamically from the list of submissions
export function computeDashboardStats(submissions: SurveySubmission[]): DashboardStats {
  const totalTours = submissions.length;
  const participantesTotais = submissions.reduce((sum, s) => sum + (Number(s.participantes) || 0), 0);

  // Compute averages
  let sumClareza = 0;
  let sumAcolhimento = 0;
  let sumAssistente = 0;

  submissions.forEach((s) => {
    sumClareza += Number(s.notaClareza) || 0;
    sumAcolhimento += Number(s.notaAcolhimento) || 0;
    sumAssistente += Number(s.notaAssistente) || 0;
  });

  const mediaClareza = totalTours > 0 ? Number((sumClareza / totalTours).toFixed(1)) : 0;
  const mediaAcolhimento = totalTours > 0 ? Number((sumAcolhimento / totalTours).toFixed(1)) : 0;
  const mediaAssistente = totalTours > 0 ? Number((sumAssistente / totalTours).toFixed(1)) : 0;

  // Compute distributions
  const toursPorProduto: Record<string, number> = {};
  const participantesPorProduto: Record<string, number> = {};

  // Demographics (Ages)
  const demografiaIdades = {
    jovens: 0,   // 18-25
    adultos: 0,  // 26-35
    maduros: 0,  // 36-50
    seniores: 0  // 51+
  };

  submissions.forEach((s) => {
    // Products
    const prod = s.produto || "Não Especificado";
    toursPorProduto[prod] = (toursPorProduto[prod] || 0) + 1;
    participantesPorProduto[prod] = (participantesPorProduto[prod] || 0) + (Number(s.participantes) || 0);

    // Demographics
    const age = Number(s.idade) || 0;
    if (age <= 25) {
      demografiaIdades.jovens++;
    } else if (age <= 35) {
      demografiaIdades.adultos++;
    } else if (age <= 50) {
      demografiaIdades.maduros++;
    } else {
      demografiaIdades.seniores++;
    }
  });

  // Calculate participants and tours by periods (grouping by date)
  // To aggregate nicely, let's group by date and sort chronically
  const periodMap: Record<string, { participants: number; tours: number }> = {};
  submissions.forEach((s) => {
    const d = s.date || "Sem Data";
    if (!periodMap[d]) {
      periodMap[d] = { participants: 0, tours: 0 };
    }
    periodMap[d].participants += Number(s.participantes) || 0;
    periodMap[d].tours += 1;
  });

  const participantesPorPeriodo = Object.entries(periodMap)
    .map(([date, data]) => ({
      periodo: formatDateToPTBR(date),
      rawDate: date,
      participantes: data.participants,
      tours: data.tours
    }))
    // Sort chronologically by the raw original date string
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    .map(({ periodo, participantes, tours }) => ({ periodo, participantes, tours }));

  return {
    participantesTotais,
    totalTours,
    mediaClareza,
    mediaAcolhimento,
    mediaAssistente,
    toursPorProduto,
    participantesPorProduto,
    demografiaIdades,
    participantesPorPeriodo
  };
}

// Format Date YYYY-MM-DD to DD/MM/YYYY
export function formatDateToPTBR(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Export data to Excel-friendly CSV with BOM support for Portuguese accents
export function exportToCSV(submissions: SurveySubmission[]): void {
  const headers = [
    "ID",
    "Data",
    "Nome Completo",
    "Idade",
    "Líder Educador",
    "Produto/Operador",
    "Quantidade Participantes",
    "Assistente Condutor",
    "Unidade",
    "Score Clareza (1-10)",
    "Justificativa Clareza",
    "Score Acolhimento (1-10)",
    "Justificativa Acolhimento",
    "Score Assistente (1-10)",
    "Justificativa Assistente",
    "Melhorias Sugeridas"
  ];

  const rows = submissions.map((s) => [
    s.id,
    formatDateToPTBR(s.date),
    `"${s.nomeCompleto.replace(/"/g, '""')}"`,
    s.idade,
    `"${s.liderEducador.replace(/"/g, '""')}"`,
    `"${s.produto.replace(/"/g, '""')}"`,
    s.participantes,
    `"${s.assistente.replace(/"/g, '""')}"`,
    `"${s.unidade.replace(/"/g, '""')}"`,
    s.notaClareza,
    `"${s.justificativaClareza.replace(/"/g, '""')}"`,
    s.notaAcolhimento,
    `"${s.justificativaAcolhimento.replace(/"/g, '""')}"`,
    s.notaAssistente,
    `"${s.justificativaAssistente.replace(/"/g, '""')}"`,
    `"${s.melhorias.replace(/"/g, '""')}"`
  ]);

  // Use semicolon separator which is Excel's default in Latin-based locales (Portuguese)
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.join(";"))
  ].join("\r\n");

  // \uFEFF is the UTF-8 Byte Order Mark (BOM) which forces Excel to read UTF-8 encoding properly.
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const today = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `pesquisa_pos_tour_${today}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
