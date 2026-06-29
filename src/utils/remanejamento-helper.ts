import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStorageSolicitacaoRemanejamentoRepository } from "@/infra/api/repositories/LocalStorageSolicitacaoRemanejamentoRepository";
import { SolicitacaoRemanejamento } from "@/core/domain/entities/SolicitacaoRemanejamento";
import { obterNomeDiaSemana } from "./date-helpers";

const agendamentoRepository = new LocalStorageAgendamentoRepository();
const remanejamentoRepository = new LocalStorageSolicitacaoRemanejamentoRepository();

// Helper para converter horário em período do dia
export function obterPeriodoDoHorario(horario: string): 'manha' | 'tarde' | 'noite' {
  const hora = parseInt(horario.split(":")[0], 10);
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
}

// Cria uma notificação no LocalStorage para o paciente
export function criarNotificacaoPaciente(pacienteId: string, mensagem: string) {
  if (typeof window === "undefined") return;
  const notifsSalvas = localStorage.getItem("agendaubs_notificacoes");
  const listaNotif = notifsSalvas ? JSON.parse(notifsSalvas) : [];
  listaNotif.push({
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    pacienteId,
    mensagem,
    lida: false,
    dataCriacao: new Date().toISOString()
  });
  localStorage.setItem("agendaubs_notificacoes", JSON.stringify(listaNotif));
}

/**
 * R017 - Verifica e preenche uma vaga disponível com o primeiro paciente compatível da fila.
 */
export async function verificarELiberarVaga(params: {
  ubsId: string;
  ubsNome: string;
  profissionalId: string;
  profissionalNome: string;
  especialidade: string;
  tipo: 'consulta' | 'exame';
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
}): Promise<SolicitacaoRemanejamento | null> {
  const { ubsId, ubsNome, profissionalId, profissionalNome, especialidade, tipo, data, horario } = params;

  // 1. Busca todas as solicitações pendentes para a especialidade
  const pendentes = await remanejamentoRepository.listarPendentesPorEspecialidade(especialidade);
  if (pendentes.length === 0) return null;

  // Determina o dia da semana e o período da vaga
  const diaSemanaCompleto = obterNomeDiaSemana(data).toLowerCase(); // "segunda-feira"
  const diaSemanaSimplificado = diaSemanaCompleto.replace("-feira", ""); // "segunda"
  const periodoVaga = obterPeriodoDoHorario(horario);

  // 2. Percorre as solicitações e faz o matching
  for (const solicitacao of pendentes) {
    // A solicitação precisa ter o mesmo tipo (consulta ou exame)
    if (solicitacao.tipo !== tipo) continue;

    // Busca o agendamento original
    const agendamentoOriginal = await agendamentoRepository.obterPorId(solicitacao.agendamentoId);
    if (!agendamentoOriginal || agendamentoOriginal.status === "cancelado" || agendamentoOriginal.status === "realizado") {
      // Se o agendamento original foi cancelado ou realizado, invalida esta solicitação
      await remanejamentoRepository.atualizarStatus(solicitacao.id, "cancelado");
      continue;
    }

    // A vaga deve ser na MESMA UBS do agendamento original
    if (agendamentoOriginal.ubsId !== ubsId) continue;

    // A nova vaga deve ser ANTERIOR ao agendamento atual do paciente (para antecipar)
    const dataHoraVaga = new Date(`${data}T${horario}:00`);
    const dataHoraOriginal = new Date(`${agendamentoOriginal.data}T${agendamentoOriginal.horario}:00`);
    if (dataHoraVaga >= dataHoraOriginal) continue;

    // Valida preferência de período do dia
    if (solicitacao.preferenciaPeriodo && solicitacao.preferenciaPeriodo !== 'qualquer') {
      if (solicitacao.preferenciaPeriodo !== periodoVaga) continue;
    }

    // Valida preferência de dias da semana
    if (solicitacao.diasDisponiveis && solicitacao.diasDisponiveis.length > 0) {
      if (!solicitacao.diasDisponiveis.includes(diaSemanaSimplificado)) continue;
    }

    // MATCH ENCONTRADO!
    // Altera o status para 'disponibilizado'
    solicitacao.status = "disponibilizado";
    solicitacao.vagaDisponibilizada = {
      ubsId,
      ubsNome,
      profissionalId,
      profissionalNome,
      data,
      horario,
      // Prazo de resposta: 30 minutos a partir de agora
      prazoRespostaLimite: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    // Salva a solicitação atualizada
    await remanejamentoRepository.atualizar(solicitacao);

    // Notifica o paciente
    criarNotificacaoPaciente(
      solicitacao.pacienteId,
      `Vaga de remanejamento disponível para ${especialidade} com ${profissionalNome} no dia ${data.split("-").reverse().join("/")} às ${horario}. Você tem até 30 minutos para responder!`
    );

    return solicitacao;
  }

  return null;
}

/**
 * Aceita a vaga disponibilizada no remanejamento.
 */
export async function aceitarVagaRemanejamento(solicitacaoId: string): Promise<void> {
  const solicitacao = await remanejamentoRepository.obterPorId(solicitacaoId);
  if (!solicitacao || solicitacao.status !== "disponibilizado" || !solicitacao.vagaDisponibilizada) {
    throw new Error("Solicitação inválida ou expirada.");
  }

  const { data, horario, profissionalId, profissionalNome, ubsId, ubsNome } = solicitacao.vagaDisponibilizada;

  // Busca o agendamento original
  const agendamentoOriginal = await agendamentoRepository.obterPorId(solicitacao.agendamentoId);
  if (!agendamentoOriginal) {
    throw new Error("Agendamento original não encontrado.");
  }

  // Guarda dados do slot antigo para re-disponibilizar
  const ubsIdAntiga = agendamentoOriginal.ubsId;
  const ubsNomeAntiga = agendamentoOriginal.ubsNome;
  const profIdAntigo = agendamentoOriginal.profissionalId;
  const profNomeAntigo = agendamentoOriginal.profissionalNome;
  const dataAntiga = agendamentoOriginal.data;
  const horarioAntigo = agendamentoOriginal.horario;
  const especialidade = agendamentoOriginal.especialidade;
  const tipo = agendamentoOriginal.tipo;

  // 1. Atualiza o agendamento original com os novos dados da vaga
  agendamentoOriginal.data = data;
  agendamentoOriginal.horario = horario;
  agendamentoOriginal.profissionalId = profissionalId;
  agendamentoOriginal.profissionalNome = profissionalNome;
  agendamentoOriginal.ubsId = ubsId;
  agendamentoOriginal.ubsNome = ubsNome;
  agendamentoOriginal.status = "agendado"; // Caso estivesse 'solicitado'

  // Salva o agendamento atualizado
  const agendamentos = getAgendamentosLocalStorage();
  const idx = agendamentos.findIndex(a => a.id === agendamentoOriginal.id);
  if (idx !== -1) {
    agendamentos[idx] = agendamentoOriginal;
    setAgendamentosLocalStorage(agendamentos);
  }

  // 2. Atualiza o status da solicitação de remanejamento para 'aceito'
  solicitacao.status = "aceito";
  await remanejamentoRepository.atualizar(solicitacao);

  // Notifica o paciente do sucesso
  criarNotificacaoPaciente(
    solicitacao.pacienteId,
    `Seu agendamento de ${especialidade} foi remanejado com sucesso para o dia ${data.split("-").reverse().join("/")} às ${horario}.`
  );

  // 3. Efeito Cascata: A vaga anterior do paciente agora está LIVRE! 
  // Dispara a busca por outros pacientes na fila de remanejamento para preencher o slot antigo
  await verificarELiberarVaga({
    ubsId: ubsIdAntiga,
    ubsNome: ubsNomeAntiga,
    profissionalId: profIdAntigo,
    profissionalNome: profNomeAntigo,
    especialidade,
    tipo,
    data: dataAntiga,
    horario: horarioAntigo
  });
}

/**
 * Recusa a vaga de remanejamento disponibilizada.
 */
export async function recusarVagaRemanejamento(solicitacaoId: string): Promise<void> {
  const solicitacao = await remanejamentoRepository.obterPorId(solicitacaoId);
  if (!solicitacao || solicitacao.status !== "disponibilizado" || !solicitacao.vagaDisponibilizada) {
    throw new Error("Solicitação inválida ou expirada.");
  }

  const vaga = solicitacao.vagaDisponibilizada;

  // 1. Reseta o status da solicitação de remanejamento de volta para 'pendente' (continua na fila)
  solicitacao.status = "pendente";
  solicitacao.vagaDisponibilizada = undefined;
  await remanejamentoRepository.atualizar(solicitacao);

  // 2. A vaga recusada volta a ficar disponível. Dispara o matching de remanejamento para outros da fila!
  await verificarELiberarVaga({
    ubsId: vaga.ubsId,
    ubsNome: vaga.ubsNome,
    profissionalId: vaga.profissionalId,
    profissionalNome: vaga.profissionalNome,
    especialidade: solicitacao.especialidade,
    tipo: solicitacao.tipo,
    data: vaga.data,
    horario: vaga.horario
  });
}

// Helpers diretos de leitura/escrita do LocalStorage de agendamentos para manter consistência síncrona imediata
function getAgendamentosLocalStorage(): any[] {
  if (typeof window === "undefined") return [];
  const dados = localStorage.getItem("agendaubs_agendamentos");
  return dados ? JSON.parse(dados) : [];
}

function setAgendamentosLocalStorage(lista: any[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("agendaubs_agendamentos", JSON.stringify(lista));
}
