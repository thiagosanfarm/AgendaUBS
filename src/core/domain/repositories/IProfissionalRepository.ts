import { Profissional } from "../entities/Profissional";

export interface IProfissionalRepository {
  obterPorId(id: string): Promise<Profissional | null>;
  listarPorUbs(ubsId: string): Promise<Profissional[]>;
  listarPorUbsEEspecialidade(ubsId: string, especialidade: string): Promise<Profissional[]>;
  listarEspecialidadesDisponiveis(ubsId: string): Promise<string[]>;
  cadastrar(profissional: Profissional): Promise<void>;
  obterPorCpfOuRegistro(cpf?: string, registro?: string): Promise<Profissional | null>;
}
