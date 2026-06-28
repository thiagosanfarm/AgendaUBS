import { Agendamento, TipoAgendamento } from "../domain/entities/Agendamento";
import { IAgendamentoRepository } from "../domain/repositories/IAgendamentoRepository";
import { verificarHorarioNoPassado } from "@/utils/date-helpers";

export interface CriarAgendamentoInput {
  pacienteId: string;
  ubsId: string;
  ubsNome: string;
  profissionalId: string;
  profissionalNome: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  tipo: TipoAgendamento;
  especialidade: string;
  observacoes?: string;
}

export class CriarAgendamento {
  constructor(private agendamentoRepository: IAgendamentoRepository) {}

  async executar(input: CriarAgendamentoInput): Promise<Agendamento> {
    // 1. Validações básicas
    if (!input.pacienteId) throw new Error("Paciente é obrigatório.");
    if (!input.ubsId) throw new Error("UBS é obrigatória.");
    if (!input.profissionalId) throw new Error("Profissional de saúde é obrigatório.");
    if (!input.data) throw new Error("Data do agendamento é obrigatória.");
    if (!input.horario) throw new Error("Horário do agendamento é obrigatório.");

    // 2. Valida se o horário está no passado
    if (verificarHorarioNoPassado(input.data, input.horario)) {
      throw new Error("Não é possível realizar agendamentos em datas ou horários no passado.");
    }

    // 3. Verifica a disponibilidade do horário
    const horariosDisponiveis = await this.agendamentoRepository.obterHorariosDisponiveis(
      input.ubsId,
      input.profissionalId,
      input.data
    );

    if (!horariosDisponiveis.includes(input.horario)) {
      throw new Error("O horário selecionado não está mais disponível.");
    }

    // 3.5. Verifica agendamentos conflitantes no mesmo horário para o mesmo paciente (R013)
    const agendamentosExistentes = await this.agendamentoRepository.listarPorPaciente(input.pacienteId);
    const conflito = agendamentosExistentes.find(
      (a) => a.data === input.data && a.horario === input.horario && a.status !== "cancelado"
    );
    if (conflito) {
      throw new Error("Você já possui um agendamento marcado para este mesmo dia e horário.");
    }

    // 4. Salva o agendamento no repositório
    return await this.agendamentoRepository.salvar({
      pacienteId: input.pacienteId,
      ubsId: input.ubsId,
      ubsNome: input.ubsNome,
      profissionalId: input.profissionalId,
      profissionalNome: input.profissionalNome,
      data: input.data,
      horario: input.horario,
      tipo: input.tipo,
      especialidade: input.especialidade,
      observacoes: input.observacoes
    });
  }
}
