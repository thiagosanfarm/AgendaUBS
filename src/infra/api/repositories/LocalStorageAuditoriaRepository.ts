import { IAuditoriaRepository, TentativaLogin } from "@/core/domain/repositories/IAuditoriaRepository";

const LOCAL_STORAGE_KEY = "agendaubs_auditoria_login";

export class LocalStorageAuditoriaRepository implements IAuditoriaRepository {
  private obterTodas(): TentativaLogin[] {
    if (typeof window === "undefined") return [];
    const dados = localStorage.getItem(LOCAL_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  private salvarTodas(tentativas: TentativaLogin[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tentativas));
  }

  async registrarTentativaLogin(
    tentativa: Omit<TentativaLogin, "id" | "data">
  ): Promise<TentativaLogin> {
    const tentativas = this.obterTodas();
    
    const novaTentativa: TentativaLogin = {
      ...tentativa,
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      data: new Date().toISOString()
    };

    // Mantém as últimas 100 tentativas para não estourar o LocalStorage
    const historicoAtualizado = [novaTentativa, ...tentativas].slice(0, 100);
    this.salvarTodas(historicoAtualizado);

    return novaTentativa;
  }

  async obterHistoricoTentativas(): Promise<TentativaLogin[]> {
    return this.obterTodas();
  }
}
