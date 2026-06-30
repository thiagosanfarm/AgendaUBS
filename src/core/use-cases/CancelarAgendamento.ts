import { Agendamento } from "../domain/entities/Agendamento";
import { IAgendamentoRepository } from "../domain/repositories/IAgendamentoRepository";
import { IUbsRepository } from "../domain/repositories/IUbsRepository";
import { calcularDiferencaHoras } from "@/utils/date-helpers";

export interface CancelarAgendamentoInput {
  agendamentoId: string;
  motivoCancelamento?: string;
  canceladoPorNome: string;
}

export class CancelarAgendamento {
  constructor(
    private agendamentoRepository: IAgendamentoRepository,
    private ubsRepository?: IUbsRepository
  ) {}

  async executar(input: CancelarAgendamentoInput): Promise<Agendamento> {
    if (!input.agendamentoId) {
      throw new Error("ID do agendamento é obrigatório.");
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

    // 3. Aplica regra de prazo mínimo configurada pela unidade (UBS)
    if (this.ubsRepository) {
      const ubs = await this.ubsRepository.obterPorId(agendamento.ubsId);
      if (ubs && ubs.prazoMinimoCancelamentoHoras !== undefined) {
        const diffHoras = calcularDiferencaHoras(agendamento.data, agendamento.horario);
        if (diffHoras < ubs.prazoMinimoCancelamentoHoras) {
          throw new Error(`Não é permitido cancelar este agendamento. A unidade de saúde exige antecedência mínima de ${ubs.prazoMinimoCancelamentoHoras} horas.`);
        }
      }
    }

    // 4. Atualiza o status para cancelado com auditoria
    return await this.agendamentoRepository.atualizarStatus(
      input.agendamentoId,
      "cancelado",
      input.motivoCancelamento || "",
      undefined, // reguladorNome
      undefined, // observacaoRegulacao
      input.canceladoPorNome
    );
  }
}
