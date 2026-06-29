export type StatusRemanejamento = 'pendente' | 'disponibilizado' | 'aceito' | 'recusado' | 'cancelado';
export type PeriodoPreferencia = 'manha' | 'tarde' | 'noite' | 'qualquer';

export interface VagaDisponibilizada {
  ubsId: string;
  ubsNome: string;
  profissionalId: string;
  profissionalNome: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  prazoRespostaLimite: string; // ISO 8601 DateTime (limite para aceitar/recusar)
}

export interface SolicitacaoRemanejamento {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  agendamentoId: string; // Vínculo com agendamento previamente existente
  tipo: 'consulta' | 'exame';
  especialidade: string;
  dataSolicitacao: string; // YYYY-MM-DD
  preferenciaPeriodo?: PeriodoPreferencia;
  diasDisponiveis?: string[]; // Ex: ["segunda", "quarta"]
  status: StatusRemanejamento;
  vagaDisponibilizada?: VagaDisponibilizada;
  dataCriacao: string; // ISO 8601 DateTime
}
