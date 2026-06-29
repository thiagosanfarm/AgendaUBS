import { SolicitacaoRemanejamento, StatusRemanejamento } from "../entities/SolicitacaoRemanejamento";

export interface ISolicitacaoRemanejamentoRepository {
  obterPorId(id: string): Promise<SolicitacaoRemanejamento | null>;
  obterPorAgendamentoId(agendamentoId: string): Promise<SolicitacaoRemanejamento | null>;
  listarPorPaciente(pacienteId: string): Promise<SolicitacaoRemanejamento[]>;
  listarTodos(): Promise<SolicitacaoRemanejamento[]>;
  listarPendentesPorEspecialidade(especialidade: string): Promise<SolicitacaoRemanejamento[]>;
  salvar(solicitacao: Omit<SolicitacaoRemanejamento, 'id' | 'status' | 'dataCriacao'>): Promise<SolicitacaoRemanejamento>;
  atualizarStatus(id: string, status: StatusRemanejamento): Promise<SolicitacaoRemanejamento>;
  atualizar(solicitacao: SolicitacaoRemanejamento): Promise<SolicitacaoRemanejamento>;
  remover(id: string): Promise<void>;
}
