import { Agendamento, StatusAgendamento } from "@/core/domain/entities/Agendamento";
import { IAgendamentoRepository } from "@/core/domain/repositories/IAgendamentoRepository";
import { verificarHorarioNoPassado } from "@/utils/date-helpers";

const LOCAL_STORAGE_KEY = "agendaubs_agendamentos";

const HORARIOS_PADRAO = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
];

export class LocalStorageAgendamentoRepository implements IAgendamentoRepository {
  private obterTodos(): Agendamento[] {
    if (typeof window === "undefined") return [];
    const dados = localStorage.getItem(LOCAL_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  private salvarTodos(agendamentos: Agendamento[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(agendamentos));
  }

  async obterPorId(id: string): Promise<Agendamento | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const agendamentos = this.obterTodos();
    const agendamento = agendamentos.find(a => a.id === id);
    return agendamento || null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Agendamento[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const agendamentos = this.obterTodos();
    // Filtra agendamentos do paciente e ordena por data e horário (mais recentes primeiro para histórico, futuros depois)
    return agendamentos
      .filter(a => a.pacienteId === pacienteId)
      .sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.horario}:00`);
        const dataB = new Date(`${b.data}T${b.horario}:00`);
        return dataB.getTime() - dataA.getTime();
      });
  }

  async listarPorUbsEEspecialidade(
    ubsId: string,
    especialidade: string,
    data: string
  ): Promise<Agendamento[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const agendamentos = this.obterTodos();
    return agendamentos.filter(
      a => a.ubsId === ubsId && a.especialidade === especialidade && a.data === data && a.status === 'agendado'
    );
  }

  async salvar(
    agendamento: Omit<Agendamento, "id" | "status" | "dataCriacao">
  ): Promise<Agendamento> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const agendamentos = this.obterTodos();

    const novoAgendamento: Agendamento = {
      ...agendamento,
      id: `agendamento-${Math.random().toString(36).substring(2, 9)}`,
      status: "agendado",
      dataCriacao: new Date().toISOString()
    };

    agendamentos.push(novoAgendamento);
    this.salvarTodos(agendamentos);

    return novoAgendamento;
  }

  async atualizarStatus(
    id: string,
    status: StatusAgendamento,
    motivoCancelamento?: string
  ): Promise<Agendamento> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const agendamentos = this.obterTodos();
    const index = agendamentos.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error("Agendamento não encontrado.");
    }

    const agendamentoAtualizado = {
      ...agendamentos[index],
      status,
      motivoCancelamento: motivoCancelamento || agendamentos[index].motivoCancelamento
    };

    agendamentos[index] = agendamentoAtualizado;
    this.salvarTodos(agendamentos);

    return agendamentoAtualizado;
  }

  async obterHorariosDisponiveis(
    ubsId: string,
    profissionalId: string,
    data: string
  ): Promise<string[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const agendamentos = this.obterTodos();

    // Filtra os horários que já estão agendados (ativos) para o profissional naquele dia
    const horariosReservados = agendamentos
      .filter(a => a.profissionalId === profissionalId && a.data === data && a.status === "agendado")
      .map(a => a.horario);

    // Filtra os horários padrão removendo os reservados e os que já passaram (se for hoje)
    const horariosDisponiveis = HORARIOS_PADRAO.filter(horario => {
      const reservado = horariosReservados.includes(horario);
      if (reservado) return false;

      // Se for a data de hoje, não exibe horários que já passaram
      const hojeStr = new Date().toISOString().split('T')[0];
      if (data === hojeStr) {
        return !verificarHorarioNoPassado(data, horario);
      }

      return true;
    });

    return horariosDisponiveis;
  }

  async listarTodos(): Promise<Agendamento[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return this.obterTodos();
  }

  async listarPorProfissional(profissionalId: string): Promise<Agendamento[]> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const agendamentos = this.obterTodos();
    return agendamentos
      .filter(a => a.profissionalId === profissionalId)
      .sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.horario}:00`);
        const dataB = new Date(`${b.data}T${b.horario}:00`);
        return dataA.getTime() - dataB.getTime(); // Ordem cronológica dos atendimentos
      });
  }
}
