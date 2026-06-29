import { SolicitacaoRemanejamento, StatusRemanejamento } from "@/core/domain/entities/SolicitacaoRemanejamento";
import { ISolicitacaoRemanejamentoRepository } from "@/core/domain/repositories/ISolicitacaoRemanejamentoRepository";

const LOCAL_STORAGE_KEY = "agendaubs_remanejamentos";

export class LocalStorageSolicitacaoRemanejamentoRepository implements ISolicitacaoRemanejamentoRepository {
  private obterTodas(): SolicitacaoRemanejamento[] {
    if (typeof window === "undefined") return [];
    const dados = localStorage.getItem(LOCAL_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  private salvarTodas(solicitacoes: SolicitacaoRemanejamento[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(solicitacoes));
  }

  async obterPorId(id: string): Promise<SolicitacaoRemanejamento | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const lista = this.obterTodas();
    const item = lista.find(s => s.id === id);
    return item || null;
  }

  async obterPorAgendamentoId(agendamentoId: string): Promise<SolicitacaoRemanejamento | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const lista = this.obterTodas();
    const item = lista.find(s => s.agendamentoId === agendamentoId && s.status !== 'cancelado' && s.status !== 'aceito');
    return item || null;
  }

  async listarPorPaciente(pacienteId: string): Promise<SolicitacaoRemanejamento[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lista = this.obterTodas();
    return lista
      .filter(s => s.pacienteId === pacienteId)
      .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
  }

  async listarTodos(): Promise<SolicitacaoRemanejamento[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return this.obterTodas();
  }

  async listarPendentesPorEspecialidade(especialidade: string): Promise<SolicitacaoRemanejamento[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lista = this.obterTodas();
    return lista
      .filter(s => s.especialidade.toLowerCase() === especialidade.toLowerCase() && s.status === 'pendente')
      .sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime()); // Mais antigos primeiro (Fila FIFO)
  }

  async salvar(
    solicitacao: Omit<SolicitacaoRemanejamento, "id" | "status" | "dataCriacao">
  ): Promise<SolicitacaoRemanejamento> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const lista = this.obterTodas();

    const novaSolicitacao: SolicitacaoRemanejamento = {
      ...solicitacao,
      id: `remanejamento-${Math.random().toString(36).substring(2, 9)}`,
      status: "pendente",
      dataCriacao: new Date().toISOString()
    };

    lista.push(novaSolicitacao);
    this.salvarTodas(lista);

    return novaSolicitacao;
  }

  async atualizarStatus(
    id: string,
    status: StatusRemanejamento
  ): Promise<SolicitacaoRemanejamento> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lista = this.obterTodas();
    const index = lista.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error("Solicitação de remanejamento não encontrada.");
    }

    const atualizada = {
      ...lista[index],
      status
    };

    lista[index] = atualizada;
    this.salvarTodas(lista);

    return atualizada;
  }

  async atualizar(solicitacao: SolicitacaoRemanejamento): Promise<SolicitacaoRemanejamento> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lista = this.obterTodas();
    const index = lista.findIndex(s => s.id === solicitacao.id);

    if (index === -1) {
      throw new Error("Solicitação de remanejamento não encontrada.");
    }

    lista[index] = solicitacao;
    this.salvarTodas(lista);

    return solicitacao;
  }

  async remover(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lista = this.obterTodas();
    const filtrada = lista.filter(s => s.id !== id);
    this.salvarTodas(filtrada);
  }
}
