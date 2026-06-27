import { Agendamento } from "../domain/entities/Agendamento";
import { IAgendamentoRepository } from "../domain/repositories/IAgendamentoRepository";

export interface CancelarAgendamentoInput {
  agendamentoId: string;
  motivoCancelamento: string;
}

export class CancelarAgendamento {
  constructor(private agendamentoRepository: IAgendamentoRepository) {}

  async executar(input: CancelarAgendamentoInput): Promise<Agendamento> {
    if (!input.agendamentoId) {
      throw new Error("ID do agendamento é obrigatório.");
    }

    if (!input.motivoCancelamento || input.motivoCancelamento.trim().length < 5) {
      throw new Error("Por favor, descreva o motivo do cancelamento (mínimo de 5 caracteres).");
    }

    // 1. Busca o agendamento
    const agendamento = await this.agendamentoRepository.obterPorId(input.agendamentoId);
    if (!agendamento) {
      throw new Error("Agendamento não encontrado.");
    }

    // 2. Valida o status do agendamento
    if (agendamento.status === "cancelado") {
      throw new Error("Este agendamento já se encontra cancelado.");
    }

    if (agendamento.status === "realizado") {
      throw new Error("Não é possível cancelar uma consulta/exame que já foi realizado.");
    }

    // 3. Atualiza o status para cancelado
    return await this.agendamentoRepository.atualizarStatus(
      input.agendamentoId,
      "cancelado",
      input.motivoCancelamento
    );
  }
}
