import { Agendamento, StatusAgendamento } from "../entities/Agendamento";

export interface IAgendamentoRepository {
  obterPorId(id: string): Promise<Agendamento | null>;
  listarPorPaciente(pacienteId: string): Promise<Agendamento[]>;
  listarPorUbsEEspecialidade(ubsId: string, especialidade: string, data: string): Promise<Agendamento[]>;
  salvar(agendamento: Omit<Agendamento, 'id' | 'status' | 'dataCriacao'>): Promise<Agendamento>;
  atualizarStatus(id: string, status: StatusAgendamento, motivoCancelamento?: string): Promise<Agendamento>;
  obterHorariosDisponiveis(ubsId: string, profissionalId: string, data: string): Promise<string[]>;
  listarTodos(): Promise<Agendamento[]>;
  listarPorProfissional(profissionalId: string): Promise<Agendamento[]>;
}
