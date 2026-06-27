import { Paciente } from "../entities/Paciente";

export interface IPacienteRepository {
  obterPorId(id: string): Promise<Paciente | null>;
  obterPorCpf(cpf: string): Promise<Paciente | null>;
  obterPorCns(cns: string): Promise<Paciente | null>;
  salvar(paciente: Paciente): Promise<Paciente>;
  atualizar(paciente: Paciente): Promise<Paciente>;
}
