import { Agendamento, StatusAgendamento, DocumentoAgendamento } from "@/core/domain/entities/Agendamento";
import { IAgendamentoRepository } from "@/core/domain/repositories/IAgendamentoRepository";
import { verificarHorarioNoPassado } from "@/utils/date-helpers";

const LOCAL_STORAGE_KEY = "agendaubs_agendamentos";

const HORARIOS_PADRAO = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
];

export class LocalStorageAgendamentoRepository implements IAgendamentoRepository {
  obterTodos(): Agendamento[] {
    if (typeof window === "undefined") return [];
    const dados = localStorage.getItem(LOCAL_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  salvarTodos(agendamentos: Agendamento[]): void {
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

    const agora = new Date();
    const dataAtual = agora.toISOString().split("T")[0];
    const horarioAtual = agora.toTimeString().split(" ")[0].slice(0, 5);

    const novoAgendamento: Agendamento = {
      ...agendamento,
      id: `agendamento-${Math.random().toString(36).substring(2, 9)}`,
      status: "solicitado",
      dataCriacao: agora.toISOString(),
      historicoStatus: [
        {
          status: "solicitado",
          data: dataAtual,
          horario: horarioAtual,
          usuarioNome: "Paciente (Solicitante)",
          observacao: "Solicitação de agendamento criada e enviada para triagem."
        }
      ]
    };

    agendamentos.push(novoAgendamento);
    this.salvarTodos(agendamentos);

    return novoAgendamento;
  }

  async atualizarStatus(
    id: string,
    status: StatusAgendamento,
    motivoCancelamento?: string,
    reguladorNome?: string,
    observacaoRegulacao?: string,
    canceladoPorNome?: string,
    motivoSolicitacaoComplementar?: string,
    prazoEnvioDocumentacao?: string
  ): Promise<Agendamento> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const agendamentos = this.obterTodos();
    const index = agendamentos.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error("Agendamento não encontrado.");
    }

    const agora = new Date();
    const dataAtual = agora.toISOString().split("T")[0];
    const horarioAtual = agora.toTimeString().split(" ")[0].slice(0, 5);

    // Mapeamento de responsável e observação para o histórico
    const usuarioNome = canceladoPorNome || reguladorNome || (status === "solicitado" ? "Paciente (Solicitante)" : status === "reagendado" ? "Paciente (Solicitante)" : "Regulação Central");
    
    let observacaoHist = "Alteração de status do processo.";
    if (status === "em_analise") {
      observacaoHist = observacaoRegulacao || "Início da triagem dos documentos anexados.";
    } else if (status === "agendado") {
      observacaoHist = observacaoRegulacao || "Solicitação de agendamento homologada e vaga confirmada.";
    } else if (status === "cancelado") {
      observacaoHist = motivoCancelamento || observacaoRegulacao || "Solicitação cancelada ou recusada.";
    } else if (status === "aguardando_documentacao") {
      observacaoHist = `Solicitada documentação complementar: "${motivoSolicitacaoComplementar}"`;
    } else if (status === "solicitado") {
      observacaoHist = "Documentação complementar enviada. Retornado à fila de triagem.";
    } else if (status === "reagendado") {
      observacaoHist = motivoCancelamento || "Solicitação reagendada pelo paciente.";
    } else if (status === "ausente") {
      observacaoHist = observacaoRegulacao || "Registro de ausência do paciente no horário agendado.";
    }

    const historicoAtual = agendamentos[index].historicoStatus || [];
    const novoHistorico = [
      ...historicoAtual,
      {
        status,
        data: dataAtual,
        horario: horarioAtual,
        usuarioNome,
        observacao: observacaoHist
      }
    ];

    const agendamentoAtualizado = {
      ...agendamentos[index],
      status,
      historicoStatus: novoHistorico,
      motivoCancelamento: motivoCancelamento || agendamentos[index].motivoCancelamento,
      ...(reguladorNome ? {
        reguladorNome,
        dataRegulacao: dataAtual,
        horarioRegulacao: horarioAtual,
        decisaoRegulacao: status === "agendado" ? ("aprovado" as const) : (status === "aguardando_documentacao" ? undefined : ("rejeitado" as const)),
        observacaoRegulacao: observacaoRegulacao || ""
      } : {}),
      ...(status === "aguardando_documentacao" ? {
        motivoSolicitacaoComplementar,
        prazoEnvioDocumentacao,
        dataSolicitacaoComplementar: dataAtual,
        horarioSolicitacaoComplementar: horarioAtual,
        reguladorResponsavelComplementar: reguladorNome || "Regulador"
      } : {}),
      ...(status === "cancelado" ? {
        canceladoPorNome: canceladoPorNome || "Usuário",
        dataCancelamento: dataAtual,
        horarioCancelamento: horarioAtual
      } : {})
    };

    // Se voltar para solicitado, remove os campos temporários de solicitação complementar
    if (status === "solicitado") {
      delete agendamentoAtualizado.motivoSolicitacaoComplementar;
      delete agendamentoAtualizado.prazoEnvioDocumentacao;
      delete agendamentoAtualizado.dataSolicitacaoComplementar;
      delete agendamentoAtualizado.horarioSolicitacaoComplementar;
      delete agendamentoAtualizado.reguladorResponsavelComplementar;
    }

    agendamentos[index] = agendamentoAtualizado;
    this.salvarTodos(agendamentos);

    return agendamentoAtualizado;
  }

  async atualizarDocumentos(
    id: string,
    documentos: DocumentoAgendamento[]
  ): Promise<Agendamento> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const agendamentos = this.obterTodos();
    const index = agendamentos.findIndex(a => a.id === id);

    if (index === -1) {
      throw new Error("Agendamento não encontrado.");
    }

    const agendamentoAtualizado = {
      ...agendamentos[index],
      documentos
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
      .filter(a => a.profissionalId === profissionalId && a.data === data && (a.status === "agendado" || a.status === "solicitado" || a.status === "aguardando_documentacao"))
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

  async atualizarLembreteWhatsApp(
    id: string,
    lembrete: {
      enviado: boolean;
      dataEnvio?: string;
      horarioEnvio?: string;
      statusEntrega?: 'entregue' | 'falha';
      motivoErro?: string;
      confirmadoPaciente?: boolean;
      dataConfirmacao?: string;
    }
  ): Promise<Agendamento> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const agendamentos = this.obterTodos();
    const index = agendamentos.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error("Agendamento não encontrado.");
    }
    
    const agendamentoAtualizado = {
      ...agendamentos[index],
      lembreteWhatsApp: lembrete
    };
    
    agendamentos[index] = agendamentoAtualizado;
    this.salvarTodos(agendamentos);
    return agendamentoAtualizado;
  }
}
