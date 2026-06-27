import { UBS } from "@/core/domain/entities/UBS";

export interface HistoricoVinculoUbs {
  id: string;
  pacienteId: string;
  ubsIdAnterior: string | null;
  ubsIdNova: string;
  dataAlteracao: string;
  motivo: string; // Ex: "Cadastro Inicial", "Mudança de Endereço", "Correção Manual"
}

// Bairros e Povoados cobertos pelas Clínicas e UBSs de Lagarto/SE
const COBERTURA_BAIRROS: Record<string, string> = {
  "centro": "ubs-centro", // Urgência Maroto Centro
  "matinha": "ubs-vila-nova", // Matinha
  "pratas": "ubs-jardim-flores", // Pratas
  "colônia treze": "ubs-parque-nacoes",
  "colonia treze": "ubs-parque-nacoes",
  "caraíbas": "ubs-caraibas",
  "caraibas": "ubs-caraibas",
  "crioulo": "ubs-crioulo",
  "estação": "ubs-cer-iii",
  "estacao": "ubs-cer-iii",
  "mariquita": "ubs-mariquita",
  "araçá": "ubs-araca",
  "araca": "ubs-araca",
  "açuzinho": "ubs-acuzinho",
  "acuzinho": "ubs-acuzinho",
  "são josé": "ubs-dr-davi",
  "sao jose": "ubs-dr-davi",
  "alto da boa vista": "ubs-alto-boa-vista",
  "brasília": "ubs-brasilia",
  "brasilia": "ubs-brasilia",
  "jenipapo": "ubs-jenipapo",
  "olhos d'água": "ubs-olhos-dagua",
  "olhos dagua": "ubs-olhos-dagua",
  "brejo": "ubs-brejo",
  "cidade nova": "ubs-cidade-nova",
  "pururuca": "ubs-pururuca",
  "ademar de carvalho": "ubs-campo-vila",
};

export const identificarUbsPorEndereco = (
  bairro: string,
  cep: string,
  cidade: string,
  ubss: UBS[]
): UBS | null => {
  if (!bairro.trim() || !cep.trim() || !cidade.trim()) return null;

  const b = bairro.trim().toLowerCase();
  const c = cep.replace(/\D/g, "");
  const cid = cidade.trim().toLowerCase();

  // 1. Mapeamento por correspondência direta de bairro/povoado (cobertura)
  for (const key in COBERTURA_BAIRROS) {
    if (b.includes(key) || key.includes(b)) {
      const ubsId = COBERTURA_BAIRROS[key];
      const ubs = ubss.find(u => u.id === ubsId);
      if (ubs) return ubs;
    }
  }

  // 2. Fallback lógico pelo município de Lagarto/SE ou CEP correspondente
  if (cid.includes("lagarto") || c.startsWith("493")) {
    // Se morar no Centro de Lagarto ou se não encontrou bairro específico mapeado, vincula à Urgência Centro como padrão
    return ubss.find(u => u.id === "ubs-centro") || ubss[0] || null;
  }

  return null;
};

const HISTORICO_KEY = "agendaubs_historico_vinculo_ubs";

export const obterHistoricoVinculoUbs = (pacienteId: string): HistoricoVinculoUbs[] => {
  if (typeof window === "undefined") return [];
  const dados = localStorage.getItem(HISTORICO_KEY);
  if (!dados) return [];
  try {
    const todos = JSON.parse(dados) as HistoricoVinculoUbs[];
    return todos.filter(t => t.pacienteId === pacienteId);
  } catch {
    return [];
  }
};

export const registrarVinculoUbs = (
  pacienteId: string,
  ubsIdAnterior: string | null,
  ubsIdNova: string,
  motivo: string
): void => {
  if (typeof window === "undefined") return;
  const dados = localStorage.getItem(HISTORICO_KEY);
  const todos = dados ? JSON.parse(dados) as HistoricoVinculoUbs[] : [];
  
  const novoLog: HistoricoVinculoUbs = {
    id: `log-${Date.now()}`,
    pacienteId,
    ubsIdAnterior,
    ubsIdNova,
    dataAlteracao: new Date().toISOString(),
    motivo
  };

  todos.push(novoLog);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(todos));
};
