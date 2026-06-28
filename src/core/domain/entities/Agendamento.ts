export type StatusAgendamento = 'solicitado' | 'agendado' | 'cancelado' | 'realizado' | 'ausente';
export type TipoAgendamento = 'consulta' | 'exame';

export interface Agendamento {
  id: string;
  pacienteId: string;
  ubsId: string;
  ubsNome: string; // Cacheado para facilitar exibição rápida
  profissionalId: string;
  profissionalNome: string; // Cacheado para facilitar exibição rápida
  data: string; // Formato YYYY-MM-DD
  horario: string; // Formato HH:MM
  tipo: TipoAgendamento;
  especialidade: string; // Ex: "Clínico Geral", "Odontologia", "Hemograma"
  status: StatusAgendamento;
  motivoCancelamento?: string;
  observacoes?: string;
  dataCriacao: string; // ISO 8601
}
