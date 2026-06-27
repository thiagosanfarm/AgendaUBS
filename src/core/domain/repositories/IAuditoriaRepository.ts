export interface TentativaLogin {
  id: string;
  identificador: string;
  sucesso: boolean;
  data: string; // ISO 8601
  ipSimulado: string;
  userAgentSimulado: string;
}

export interface IAuditoriaRepository {
  registrarTentativaLogin(tentativa: Omit<TentativaLogin, 'id' | 'data'>): Promise<TentativaLogin>;
  obterHistoricoTentativas(): Promise<TentativaLogin[]>;
}
