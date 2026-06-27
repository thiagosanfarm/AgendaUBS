import { UBS } from "../entities/UBS";

export interface IUbsRepository {
  listarTodas(): Promise<UBS[]>;
  obterPorId(id: string): Promise<UBS | null>;
  obterPorCnes(cnes: string): Promise<UBS | null>;
  buscarPorNomeOuFiltro(query: string): Promise<UBS[]>;
}
