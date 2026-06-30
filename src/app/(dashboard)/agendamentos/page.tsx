"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStorageSolicitacaoRemanejamentoRepository } from "@/infra/api/repositories/LocalStorageSolicitacaoRemanejamentoRepository";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { CancelarAgendamento } from "@/core/use-cases/CancelarAgendamento";
import { Agendamento, DocumentoAgendamento } from "@/core/domain/entities/Agendamento";
import { SolicitacaoRemanejamento, PeriodoPreferencia } from "@/core/domain/entities/SolicitacaoRemanejamento";
import { formatarDataBr } from "@/utils/formatters";
import { toast } from "sonner";
import { verificarELiberarVaga } from "@/utils/remanejamento-helper";
import { calcularDiferencaHoras } from "@/utils/date-helpers";
import { 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Sparkles,
  Info,
  UploadCloud,
  Trash2,
  FileText,
  Paperclip,
  Activity,
  CalendarDays
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const agendamentoRepository = new LocalStorageAgendamentoRepository();
const remanejamentoRepository = new LocalStorageSolicitacaoRemanejamentoRepository();
const ubsRepository = new MockUbsRepository();
const cancelarAgendamentoUseCase = new CancelarAgendamento(agendamentoRepository, ubsRepository);

const DIAS_SEMANA_OPCOES = [
  { id: "segunda", label: "Segunda" },
  { id: "terça", label: "Terça" },
  { id: "quarta", label: "Quarta" },
  { id: "quinta", label: "Quinta" },
  { id: "sexta", label: "Sexta" },
  { id: "sábado", label: "Sábado" }
];

export default function AgendamentosPage() {
  const { paciente } = useAuth();
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRemanejamento[]>([]);
  const [todasUbs, setTodasUbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de cancelamento
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);

  // Estados para modal de remanejamento R017
  const [agendamentoParaRemanejar, setAgendamentoParaRemanejar] = useState<Agendamento | null>(null);
  const [periodoPreferencia, setPeriodoPreferencia] = useState<PeriodoPreferencia>("qualquer");
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([]);
  const [isSubmittingRemanejamento, setIsSubmittingRemanejamento] = useState(false);

  // Estados para gerenciamento de documentos R018
  const [agendamentoParaDocumentos, setAgendamentoParaDocumentos] = useState<Agendamento | null>(null);
  const [tempDocumentos, setTempDocumentos] = useState<DocumentoAgendamento[]>([]);
  const [isSavingDocumentos, setIsSavingDocumentos] = useState(false);
  const [historicoStatusExpandido, setHistoricoStatusExpandido] = useState<Record<string, boolean>>({});

  const handleOpenDocumentosModal = (agendamento: Agendamento) => {
    setAgendamentoParaDocumentos(agendamento);
    setTempDocumentos(agendamento.documentos || []);
  };

  const handleTempFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

    Array.from(files).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Formato inválido: "${file.name}". Envie apenas PDF, PNG ou JPG.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`Arquivo muito grande: "${file.name}". Limite de 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          toast.error("Arquivo inválido ou corrompido.");
          return;
        }

        const base64Url = event.target.result as string;
        const now = new Date();
        const extension = file.name.split(".").pop()?.toUpperCase() || "DOC";

        const newDoc: DocumentoAgendamento = {
          id: `doc-${Math.random().toString(36).substring(2, 9)}`,
          nome: file.name,
          tipo: extension,
          tamanho: file.size,
          status: "pendente",
          url: base64Url,
          dataEnvio: now.toISOString().split("T")[0],
          horarioEnvio: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          usuarioEnvioNome: paciente?.nomeCompleto || "Paciente"
        };

        setTempDocumentos((prev) => [...prev, newDoc]);
        toast.success(`"${file.name}" anexado.`);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleRemoveTempDocumento = (id: string) => {
    setTempDocumentos((prev) => prev.filter((d) => d.id !== id));
    toast.info("Documento removido da lista.");
  };

  const handleSaveDocumentos = async () => {
    if (!agendamentoParaDocumentos) return;

    setIsSavingDocumentos(true);
    try {
      await agendamentoRepository.atualizarDocumentos(agendamentoParaDocumentos.id, tempDocumentos);
      
      if (agendamentoParaDocumentos.status === "aguardando_documentacao") {
        await agendamentoRepository.atualizarStatus(
          agendamentoParaDocumentos.id,
          "solicitado"
        );
        toast.success("Documentação complementar enviada! A solicitação retornou para a fila de triagem.");
      } else {
        toast.success("Documentação da solicitação atualizada com sucesso!");
      }
      
      setAgendamentoParaDocumentos(null);
      carregarAgendamentos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar documentos.");
    } finally {
      setIsSavingDocumentos(false);
    }
  };

  const carregarAgendamentos = () => {
    if (paciente) {
      setLoading(true);
      Promise.all([
        agendamentoRepository.listarPorPaciente(paciente.id),
        remanejamentoRepository.listarPorPaciente(paciente.id)
      ])
        .then(([listAgendamentos, listSolicitacoes]) => {
          setAgendamentos(listAgendamentos);
          setSolicitacoes(listSolicitacoes);
        })
        .catch((err) => console.error("Erro ao obter dados de agendamentos e remanejamentos:", err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    carregarAgendamentos();
    ubsRepository.listarTodas().then(setTodasUbs).catch(err => console.error("Erro ao listar UBSs:", err));
  }, [paciente]);

  const handleOpenCancelModal = (agendamento: Agendamento) => {
    setAgendamentoParaCancelar(agendamento);
    setMotivoCancelamento("");
  };

  const handleConfirmCancel = async () => {
    if (!agendamentoParaCancelar) return;

    setIsCanceling(true);

    try {
      // 1. Cancela o agendamento
      await cancelarAgendamentoUseCase.executar({
        agendamentoId: agendamentoParaCancelar.id,
        motivoCancelamento: motivoCancelamento.trim() || undefined,
        canceladoPorNome: paciente?.nomeCompleto || "Paciente"
      });

      // 2. Se houver remanejamento ativo para este agendamento, cancela ele também
      const solicitacaoRelacionada = solicitacoes.find(
        s => s.agendamentoId === agendamentoParaCancelar.id && s.status !== 'cancelado' && s.status !== 'aceito'
      );
      if (solicitacaoRelacionada) {
        await remanejamentoRepository.atualizarStatus(solicitacaoRelacionada.id, "cancelado");
      }

      toast.success("Agendamento cancelado com sucesso!", {
        action: {
          label: "Reagendar",
          onClick: () => {
            router.push(`/agendamentos/novo?reagendar=true&originalId=${agendamentoParaCancelar.id}&especialidade=${encodeURIComponent(agendamentoParaCancelar.especialidade)}&ubsId=${encodeURIComponent(agendamentoParaCancelar.ubsId)}`);
          }
        },
        duration: 10000
      });

      // 3. Efeito Cascata R017: A vaga cancelada agora está disponível para a fila de remanejamento!
      await verificarELiberarVaga({
        ubsId: agendamentoParaCancelar.ubsId,
        ubsNome: agendamentoParaCancelar.ubsNome,
        profissionalId: agendamentoParaCancelar.profissionalId,
        profissionalNome: agendamentoParaCancelar.profissionalNome,
        especialidade: agendamentoParaCancelar.especialidade,
        tipo: agendamentoParaCancelar.tipo,
        data: agendamentoParaCancelar.data,
        horario: agendamentoParaCancelar.horario
      });

      setAgendamentoParaCancelar(null);
      carregarAgendamentos(); // recarrega a lista
    } catch (err: any) {
      toast.error(err.message || "Não foi possível cancelar o agendamento.");
    } finally {
      setIsCanceling(false);
    }
  };

  // Funções de remanejamento R017
  const handleOpenRemanejarModal = (agendamento: Agendamento) => {
    // Evita duplicidade (Critério de Aceitação)
    const jaTemRemanejamento = solicitacoes.some(
      s => s.agendamentoId === agendamento.id && s.status === "pendente"
    );
    if (jaTemRemanejamento) {
      toast.error("Você já possui uma solicitação de remanejamento ativa para esta consulta.");
      return;
    }

    setAgendamentoParaRemanejar(agendamento);
    setPeriodoPreferencia("qualquer");
    setDiasDisponiveis([]);
  };

  const handleConfirmRemanejar = async () => {
    if (!agendamentoParaRemanejar || !paciente) return;

    setIsSubmittingRemanejamento(true);

    try {
      // 1. Salva a solicitação
      await remanejamentoRepository.salvar({
        pacienteId: paciente.id,
        pacienteNome: paciente.nomeCompleto,
        agendamentoId: agendamentoParaRemanejar.id,
        tipo: agendamentoParaRemanejar.tipo,
        especialidade: agendamentoParaRemanejar.especialidade,
        dataSolicitacao: new Date().toISOString().split("T")[0],
        preferenciaPeriodo: periodoPreferencia,
        diasDisponiveis: diasDisponiveis.length > 0 ? diasDisponiveis : undefined
      });

      toast.success("Solicitação de remanejamento registrada com sucesso!");
      setAgendamentoParaRemanejar(null);
      carregarAgendamentos();
    } catch (err: any) {
      toast.error(err.message || "Não foi possível registrar o remanejamento. Tente novamente.");
    } finally {
      setIsSubmittingRemanejamento(false);
    }
  };

  const handleCancelRemanejamento = async (solicitacaoId: string) => {
    try {
      await remanejamentoRepository.atualizarStatus(solicitacaoId, "cancelado");
      toast.success("Solicitação de remanejamento cancelada.");
      carregarAgendamentos();
    } catch (err) {
      toast.error("Não foi possível cancelar o remanejamento.");
    }
  };

  const toggleDiaDisponivel = (diaId: string) => {
    if (diasDisponiveis.includes(diaId)) {
      setDiasDisponiveis(diasDisponiveis.filter(d => d !== diaId));
    } else {
      setDiasDisponiveis([...diasDisponiveis, diaId]);
    }
  };

  // Divide agendamentos em ativos (futuros/marcados/solicitados/em análise/pendentes de documentos) e histórico (passados ou cancelados)
  const ativos = agendamentos.filter(a => a.status === "agendado" || a.status === "solicitado" || a.status === "em_analise" || a.status === "aguardando_documentacao");
  const historico = agendamentos.filter(a => a.status !== "agendado" && a.status !== "solicitado" && a.status !== "em_analise" && a.status !== "aguardando_documentacao");

  // Cômputos auxiliares de cancelamento
  const ubsDoAgendamento = agendamentoParaCancelar 
    ? todasUbs.find(u => u.id === agendamentoParaCancelar.ubsId)
    : null;

  const prazoLimite = ubsDoAgendamento?.prazoMinimoCancelamentoHoras;
  const diffHoras = agendamentoParaCancelar 
    ? calcularDiferencaHoras(agendamentoParaCancelar.data, agendamentoParaCancelar.horario)
    : 0;

  const bloqueadoPrazo = !!(agendamentoParaCancelar && prazoLimite !== undefined && diffHoras < prazoLimite);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Topo com botão de agendar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium">Consulte e gerencie seus horários</p>
        </div>
        <Link href="/agendamentos/novo">
          <Button className="font-semibold gap-2 shadow-sm cursor-pointer w-full sm:w-auto">
            <Plus className="h-4.5 w-4.5" />
            Novo Agendamento
          </Button>
        </Link>
      </div>

      {/* Seção 1: Agendamentos Ativos */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-primary" />
          Consultas e Exames Agendados ({ativos.length})
        </h3>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse bg-card rounded-2xl border border-border">
            Buscando compromissos marcados...
          </div>
        ) : ativos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ativos.map((a) => {
              const isSolicitado = a.status === "solicitado";
              const isEmAnalise = a.status === "em_analise";
              const isAguardandoDoc = a.status === "aguardando_documentacao";
              return (
                <Card
                  key={a.id}
                  className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                    isAguardandoDoc ? "border-l-red-500 bg-red-500/[0.01]" :
                    isEmAnalise ? "border-l-blue-500 bg-blue-500/[0.01]" :
                    isSolicitado ? "border-l-amber-500 bg-amber-500/[0.01]" : "border-l-blue-500"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-3 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 uppercase shrink-0">
                            {a.tipo}
                          </span>
                          {isAguardandoDoc ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/10 text-red-600 border border-red-500/20 uppercase tracking-wide shrink-0 animate-pulse">
                              Ação Necessária: Doc. Pendente
                            </span>
                          ) : isEmAnalise ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase tracking-wide shrink-0 animate-pulse">
                              Em Análise
                            </span>
                          ) : isSolicitado ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wide shrink-0">
                              Aguardando Regulação
                            </span>
                          ) : null}
                          <span className="text-sm font-bold text-foreground capitalize truncate">
                            {a.especialidade}
                          </span>
                        </div>
 
                        <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="truncate">Profissional: <strong className="text-foreground">{a.profissionalNome}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="truncate">Unidade: <strong className="text-foreground">{a.ubsNome}</strong></span>
                          </div>
                        </div>
                      </div>
 
                      <div className={`flex flex-col items-center justify-center rounded-xl p-3.5 shrink-0 text-center min-w-[100px] ${
                        isSolicitado ? "bg-amber-500/5" : "bg-blue-50/50 dark:bg-blue-950/20"
                      }`}>
                        <Calendar className={`h-4.5 w-4.5 mb-1 ${isSolicitado ? "text-amber-500" : "text-blue-600 dark:text-blue-400"}`} />
                        <span className="text-xs font-bold text-foreground">{formatarDataBr(a.data)}</span>
                        <span className={`text-xs font-bold mt-0.5 ${isSolicitado ? "text-amber-500" : "text-blue-600 dark:text-blue-400"}`}>{a.horario}</span>
                      </div>
                    </div>
 
                     {/* Alerta de Documentação Complementar Pendente (R021) */}
                     {isAguardandoDoc && (
                      <div className="mt-3.5 p-3.5 rounded-xl bg-red-500/[0.03] border border-red-500/20 text-xs space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold block">Documentação Complementar Solicitada</span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              O regulador identificou pendências nos documentos enviados. Regularize o envio para que a triagem possa ser concluída.
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-card border border-red-500/10 rounded-lg space-y-1.5">
                          <span className="block text-[9px] uppercase font-bold text-muted-foreground">Documentos Solicitados:</span>
                          <span className="block text-foreground italic font-semibold">"{a.motivoSolicitacaoComplementar}"</span>
                          {a.prazoEnvioDocumentacao && (
                            <span className="block text-[9px] text-muted-foreground mt-1 font-semibold">
                              Prazo Limite de Envio: <strong className="text-red-600 dark:text-red-400">{formatarDataBr(a.prazoEnvioDocumentacao)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Exibição dos Documentos Anexados (R018 e R021) */}
                    {(isSolicitado || isAguardandoDoc) && (
                      <div className="mt-3.5 p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 text-amber-500 shrink-0" />
                          <div className="min-w-0 leading-tight">
                            <span className="block font-semibold text-foreground">Documentos da Solicitação</span>
                            <span className="block text-[10px] text-muted-foreground">
                              {a.documentos && a.documentos.length > 0
                                ? `${a.documentos.length} arquivo(s) enviado(s)`
                                : "Nenhum arquivo enviado"}
                            </span>
                          </div>
                        </div>
                        {a.documentos && a.documentos.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {a.documentos.slice(0, 3).map((doc) => (
                              <span
                                key={doc.id}
                                className="text-[9px] bg-background border px-1.5 py-0.5 rounded-md font-bold text-muted-foreground uppercase truncate max-w-[60px]"
                                title={doc.nome}
                              >
                                {doc.tipo}
                              </span>
                            ))}
                            {a.documentos.length > 3 && (
                              <span className="text-[9px] bg-background border px-1.5 py-0.5 rounded-md font-bold text-muted-foreground">
                                +{a.documentos.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
 
                    {/* Detalhes do Remanejamento R017 */}
                    {(() => {
                      const sol = solicitacoes.find(
                        (s) => s.agendamentoId === a.id && s.status !== "cancelado" && s.status !== "aceito"
                      );
 
                      if (sol) {
                        const statusLabel = sol.status === "disponibilizado" ? "Vaga disponível!" : "Aguardando vaga...";
                        const periodText = sol.preferenciaPeriodo ? `Período: ${sol.preferenciaPeriodo.toUpperCase()}` : "Qualquer período";
                        const daysText = sol.diasDisponiveis && sol.diasDisponiveis.length > 0
                          ? `Dias: ${sol.diasDisponiveis.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")}`
                          : "Qualquer dia";
 
                        return (
                          <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="flex items-center gap-1.5 font-bold text-primary">
                                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                                Fila de Remanejamento • {statusLabel}
                              </span>
                              <span className="block text-muted-foreground text-[10px]">
                                {periodText} • {daysText}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRemanejamento(sol.id)}
                              className="h-8 text-[11px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer px-2"
                            >
                              Cancelar Fila
                            </Button>
                          </div>
                        );
                      } else {
                        return null;
                      }
                    })()}

                    {/* Linha do Tempo de Status R022 */}
                    {a.historicoStatus && a.historicoStatus.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-dashed space-y-2">
                        <button
                          onClick={() => setHistoricoStatusExpandido(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                          className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0 outline-none"
                        >
                          <span className="flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-primary" />
                            Histórico de Status ({a.historicoStatus.length})
                          </span>
                          <span className="text-[10px] text-primary font-bold">
                            {historicoStatusExpandido[a.id] ? "Ocultar Detalhes" : "Ver Linha do Tempo"}
                          </span>
                        </button>

                        {historicoStatusExpandido[a.id] && (
                          <div className="relative border-l border-muted pl-4 ml-2 space-y-4 pt-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                            {a.historicoStatus.map((h, hIdx) => {
                              const isLast = hIdx === (a.historicoStatus?.length || 0) - 1;
                              const statusLabels: Record<string, string> = {
                                solicitado: "Pendente (Fila de Triagem)",
                                em_analise: "Em Análise",
                                agendado: "Aprovada & Confirmada",
                                cancelado: "Cancelada ou Recusada",
                                realizado: "Atendido",
                                ausente: "Ausente",
                                aguardando_documentacao: "Aguardando Documentação",
                                reagendado: "Reagendada"
                              };

                              return (
                                <div key={hIdx} className="relative text-xs">
                                  <span className={`absolute -left-6.5 top-1 rounded-full h-3 w-3 border-2 border-background ${
                                    isLast ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                                  }`} />
                                  <div className="flex justify-between items-center text-[10px] text-muted-foreground flex-wrap gap-1">
                                    <span className="font-bold text-foreground">
                                      {statusLabels[h.status] || h.status}
                                    </span>
                                    <span>{formatarDataBr(h.data)} às {h.horario}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Por: <strong>{h.usuarioNome}</strong>
                                  </p>
                                  {h.observacao && (
                                    <p className="text-[11px] bg-muted/40 border border-dashed rounded-lg p-2.5 mt-1.5 italic text-muted-foreground">
                                      "{h.observacao}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
 
                    <div className="border-t border-border mt-5 pt-4 flex justify-between items-center gap-2 flex-wrap">
                      <div>
                        {isAguardandoDoc ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenDocumentosModal(a)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer gap-1.5 text-xs rounded-xl shadow-xs animate-pulse"
                          >
                            <Paperclip className="h-4 w-4" />
                            Enviar Documentos Pendentes
                          </Button>
                        ) : isSolicitado ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDocumentosModal(a)}
                            className="text-amber-600 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-700 font-bold cursor-pointer gap-1.5 text-xs rounded-xl"
                          >
                            <Paperclip className="h-4 w-4" />
                            Gerenciar Documentos
                          </Button>
                        ) : (
                          !solicitacoes.some(s => s.agendamentoId === a.id && s.status !== "cancelado" && s.status !== "aceito") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRemanejarModal(a)}
                              className="text-primary border-primary/20 hover:bg-primary/10 hover:text-primary font-bold cursor-pointer gap-1.5 text-xs rounded-xl"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                              Solicitar Remanejamento
                            </Button>
                          )
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCancelModal(a)}
                        className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive font-semibold cursor-pointer text-xs rounded-xl"
                      >
                        Desmarcar Horário
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-border bg-transparent">
            <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <p className="text-xs text-muted-foreground max-w-sm">
                Você não tem nenhuma consulta ou exame agendado no momento.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Seção 2: Histórico (Passados/Cancelados) */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-primary" />
          Histórico e Consultas Anteriores
        </h3>

        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground animate-pulse">
            Carregando histórico...
          </div>
        ) : historico.length > 0 ? (
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {historico.map((a) => {
                  const isRealizado = a.status === "realizado";
                  const isCancelado = a.status === "cancelado";
                  const isReagendado = a.status === "reagendado";

                  return (
                    <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {isRealizado && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                          {isCancelado && <XCircle className="h-5 w-5 text-destructive" />}
                          {isReagendado && <CalendarDays className="h-5 w-5 text-blue-500" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-foreground text-sm">
                              {a.especialidade}
                            </h4>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                              ({a.tipo})
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full capitalize ${
                              isRealizado 
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                                : isReagendado
                                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400"
                                  : "bg-destructive/10 text-destructive"
                            }`}>
                              {a.status === "cancelado" ? (a.decisaoRegulacao === "rejeitado" ? "rejeitada" : "cancelada") : 
                               a.status === "reagendado" ? "reagendada" : 
                               a.status === "realizado" ? "atendida" : a.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Profissional: {a.profissionalNome} • Unidade: {a.ubsNome}
                          </p>
                          {isCancelado && a.motivoCancelamento && (
                            <p className="text-xs text-destructive font-medium bg-destructive/5 rounded-lg p-2 mt-1.5 flex items-start gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>Motivo: {a.motivoCancelamento}</span>
                            </p>
                          )}
                          
                          {/* Histórico timeline compacta R022 */}
                          {a.historicoStatus && a.historicoStatus.length > 0 && (
                            <div className="mt-2 text-xs">
                              <button
                                onClick={() => setHistoricoStatusExpandido(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer bg-transparent border-0 outline-none p-0 mt-1.5"
                              >
                                {historicoStatusExpandido[a.id] ? "Ocultar Histórico" : "Exibir Histórico de Alterações"}
                              </button>
                              
                              {historicoStatusExpandido[a.id] && (
                                <div className="border-l pl-3 ml-1.5 space-y-2 mt-2 pt-1.5 animate-in fade-in duration-200">
                                  {a.historicoStatus.map((h, hIdx) => {
                                    const statusLabels: Record<string, string> = {
                                      solicitado: "Pendente",
                                      em_analise: "Em Análise",
                                      agendado: "Aprovada",
                                      cancelado: "Cancelada/Recusada",
                                      realizado: "Atendido",
                                      ausente: "Ausente",
                                      aguardando_documentacao: "Aguardando Documentação",
                                      reagendado: "Reagendada"
                                    };
                                    return (
                                      <div key={hIdx} className="text-[10px] text-muted-foreground leading-tight">
                                        <strong>{statusLabels[h.status] || h.status}</strong> em {formatarDataBr(h.data)} {h.horario} por {h.usuarioNome}
                                        {h.observacao && <span className="block text-[9px] italic text-muted-foreground/85 mt-0.5 font-medium">"{h.observacao}"</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-muted/40 sm:bg-transparent rounded-lg p-3 sm:p-0">
                        <span className="block text-xs font-bold text-foreground">{formatarDataBr(a.data)}</span>
                        <span className="block text-xs text-muted-foreground font-medium mt-0.5">{a.horario}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-muted/10">
            <CardContent className="p-8 text-center text-xs text-muted-foreground">
              Nenhum registro no histórico de agendamentos.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Modal de Cancelamento */}
      <Dialog open={!!agendamentoParaCancelar} onOpenChange={() => setAgendamentoParaCancelar(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-bold text-foreground text-lg">Confirmar Cancelamento</DialogTitle>
            <DialogDescription className="text-xs">
              Confirme as informações abaixo antes de cancelar seu agendamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Detalhes Estruturados do Atendimento */}
            {agendamentoParaCancelar && (
              <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center pb-1 border-b border-border/50">
                  <span className="font-semibold text-muted-foreground">Tipo de Atendimento:</span>
                  <span className="capitalize font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">
                    {agendamentoParaCancelar.tipo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Especialidade:</span>
                  <span className="font-bold text-foreground">{agendamentoParaCancelar.especialidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Profissional:</span>
                  <span className="font-bold text-foreground">{agendamentoParaCancelar.profissionalNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Data e Horário:</span>
                  <span className="font-bold text-foreground">
                    {formatarDataBr(agendamentoParaCancelar.data)} às {agendamentoParaCancelar.horario}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Unidade (UBS):</span>
                  <span className="font-bold text-foreground">{agendamentoParaCancelar.ubsNome}</span>
                </div>
              </div>
            )}

            {/* Aviso de Prazo Mínimo de Cancelamento */}
            {prazoLimite !== undefined && (
              <div className="p-2.5 bg-muted/60 border rounded-lg flex items-center gap-2 text-[10px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Esta unidade de saúde exige antecedência mínima de <strong>{prazoLimite} horas</strong> para cancelamentos.</span>
              </div>
            )}

            {/* Bloqueio de Prazo Restrito */}
            {bloqueadoPrazo ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex gap-2.5 items-start">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Cancelamento Não Permitido</p>
                  <p className="leading-relaxed">
                    Antecedência inferior às {prazoLimite} horas exigidas pela unidade de saúde (restam {diffHoras > 0 ? diffHoras.toFixed(1) : 0} horas).
                  </p>
                  <p className="leading-relaxed text-[11px] opacity-90">
                    Entre em contato direto com a UBS para obter auxílio no cancelamento ou remanejamento.
                  </p>
                </div>
              </div>
            ) : (
              /* Motivo do Cancelamento (Opcional) */
              <div className="space-y-2">
                <label htmlFor="motivo" className="text-xs font-bold text-foreground block">
                  Motivo do Cancelamento (opcional)
                </label>
                <Input
                  id="motivo"
                  placeholder="Ex: Terei um compromisso neste horário."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  disabled={isCanceling}
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground">
                  Seu motivo ajuda a UBS na otimização de vagas e gestão das filas de espera.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-3.5">
            <Button
              variant="outline"
              onClick={() => setAgendamentoParaCancelar(null)}
              disabled={isCanceling}
              className="cursor-pointer text-xs"
            >
              {bloqueadoPrazo ? "Fechar" : "Voltar"}
            </Button>
            {!bloqueadoPrazo && (
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="cursor-pointer font-bold text-xs"
              >
                {isCanceling ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Remanejamento R017 */}
      <Dialog open={!!agendamentoParaRemanejar} onOpenChange={() => setAgendamentoParaRemanejar(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-bold text-foreground text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Solicitar Remanejamento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Deseja entrar na fila de remanejamento para a consulta de **{agendamentoParaRemanejar?.especialidade}**?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Mensagem explicativa clara (Critério de Aceitação) */}
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-800 dark:text-blue-400 rounded-xl space-y-1.5 flex gap-2">
              <Info className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Como funciona a lista de remanejamento?</p>
                <p className="leading-relaxed text-[11px] font-medium">
                  Se outro paciente desmarcar uma consulta ou se um novo horário livre surgir, o sistema buscará os pacientes da fila. 
                  Você será notificado imediatamente e poderá aceitar ou recusar a nova vaga. 
                  <strong> A inclusão na lista não garante atendimento imediato.</strong> Seu horário original continua reservado.
                </p>
              </div>
            </div>

            {/* Preferência de Período */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Preferência de Período do Dia
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "qualquer", label: "Qualquer Período" },
                  { id: "manha", label: "Manhã (08h - 12h)" },
                  { id: "tarde", label: "Tarde (12h - 18h)" },
                  { id: "noite", label: "Noite (18h - 22h)" }
                ].map((p) => {
                  const isSel = periodoPreferencia === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriodoPreferencia(p.id as any)}
                      className={`h-9 border rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isSel
                          ? "border-primary bg-primary text-white shadow-xs"
                          : "border-border hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dias da Semana */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Dias Disponíveis
              </label>
              <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
                Selecione os dias em que você pode comparecer (se nenhum for marcado, vale qualquer dia).
              </p>
              <div className="grid grid-cols-3 gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                {DIAS_SEMANA_OPCOES.map((d) => {
                  const isChecked = diasDisponiveis.includes(d.id);
                  return (
                    <label key={d.id} className="flex items-center gap-2 cursor-pointer py-1 group select-none text-[11px] font-semibold text-foreground">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleDiaDisponivel(d.id)}
                      />
                      <span className="group-hover:text-primary transition-colors">{d.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setAgendamentoParaRemanejar(null)}
              disabled={isSubmittingRemanejamento}
              className="cursor-pointer text-xs h-10 rounded-xl"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirmRemanejar}
              disabled={isSubmittingRemanejamento}
              className="cursor-pointer font-bold text-xs h-10 rounded-xl"
            >
              {isSubmittingRemanejamento ? "Registrando..." : "Entrar na Lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Gerenciamento de Documentos R018 */}
      <Dialog open={!!agendamentoParaDocumentos} onOpenChange={() => setAgendamentoParaDocumentos(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-bold text-foreground text-lg flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              Documentos da Solicitação
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Gerencie os encaminhamentos e comprovantes anexados para a consulta de **{agendamentoParaDocumentos?.especialidade}**.
            </DialogDescription>
          </DialogHeader>
 
          <div className="space-y-4 py-3 text-xs">
            {/* Input de Upload de Arquivo */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Adicionar Novo Arquivo</label>
                <span className="text-[9px] text-muted-foreground font-semibold">PDF, PNG, JPG (Máx 5MB)</span>
              </div>
              <label className="border-2 border-dashed border-sky-100 hover:border-primary bg-muted/10 transition-all rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1 group">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleTempFileUpload}
                  className="hidden"
                />
                <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-200" />
                <span className="block text-[11px] font-bold text-foreground">Selecionar ou arrastar novos arquivos</span>
              </label>
            </div>
 
            {/* Lista dos Documentos Temporários */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Arquivos Anexados ({tempDocumentos.length})</label>
              
              {tempDocumentos.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-border border border-border bg-white dark:bg-slate-900 rounded-xl p-3">
                  {tempDocumentos.map((doc, idx) => {
                    const isImage = doc.tipo !== "PDF";
                    return (
                      <div key={doc.id} className={`flex items-center justify-between gap-3 pt-2 ${idx === 0 && "pt-0"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          {isImage ? (
                            <img
                              src={doc.url}
                              alt={doc.nome}
                              className="h-8 w-8 rounded-lg object-cover border shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/10">
                              <FileText className="h-4.5 w-4.5" />
                            </div>
                          )}
                          <div className="min-w-0 leading-tight">
                            <span className="block font-bold text-foreground truncate max-w-[180px]" title={doc.nome}>
                              {doc.nome}
                            </span>
                            <span className="block text-[9px] text-muted-foreground uppercase">
                              {doc.tipo} • {(doc.tamanho / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
 
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTempDocumento(doc.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground text-[11px] bg-muted/5">
                  Nenhum documento anexado a esta solicitação.
                </div>
              )}
            </div>
          </div>
 
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setAgendamentoParaDocumentos(null)}
              disabled={isSavingDocumentos}
              className="cursor-pointer text-xs h-10 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDocumentos}
              disabled={isSavingDocumentos}
              className="cursor-pointer font-bold text-xs h-10 rounded-xl"
            >
              {isSavingDocumentos ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
