export type StatusAgendamento = 'solicitado' | 'agendado' | 'cancelado' | 'realizado' | 'ausente' | 'aguardando_documentacao';
export type TipoAgendamento = 'consulta' | 'exame';
export type PrioridadeAgendamento = 'normal' | 'preferencial' | 'urgente';

export interface DocumentoAgendamento {
  id: string;
  nome: string;
  tipo: string; // Ex: 'PDF', 'PNG', 'JPG', etc.
  tamanho: number; // Em bytes
  status: 'pendente' | 'validado' | 'rejeitado';
  url: string; // Base64 ou URL de preview
  dataEnvio: string; // YYYY-MM-DD
  horarioEnvio: string; // HH:MM
  usuarioEnvioNome: string;
  autorizadoDownload?: boolean;
}

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
  prioridade?: PrioridadeAgendamento;
  motivoCancelamento?: string;
  observacoes?: string;
  dataCriacao: string; // ISO 8601
  documentos?: DocumentoAgendamento[];
  // Campos de Auditoria de Regulação R020
  reguladorNome?: string;
  dataRegulacao?: string;
  horarioRegulacao?: string;
  decisaoRegulacao?: 'aprovado' | 'rejeitado';
  observacaoRegulacao?: string;
  // Campos de Auditoria de Cancelamento R015
  canceladoPorNome?: string;
  dataCancelamento?: string;
  horarioCancelamento?: string;
  // Campos de Solicitação de Documentação Complementar R021
  motivoSolicitacaoComplementar?: string;
  prazoEnvioDocumentacao?: string;
  dataSolicitacaoComplementar?: string;
  horarioSolicitacaoComplementar?: string;
  reguladorResponsavelComplementar?: string;
}
