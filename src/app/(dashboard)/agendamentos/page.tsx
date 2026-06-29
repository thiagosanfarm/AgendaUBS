"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStorageSolicitacaoRemanejamentoRepository } from "@/infra/api/repositories/LocalStorageSolicitacaoRemanejamentoRepository";
import { CancelarAgendamento } from "@/core/use-cases/CancelarAgendamento";
import { Agendamento, DocumentoAgendamento } from "@/core/domain/entities/Agendamento";
import { SolicitacaoRemanejamento, PeriodoPreferencia } from "@/core/domain/entities/SolicitacaoRemanejamento";
import { formatarDataBr } from "@/utils/formatters";
import { toast } from "sonner";
import { verificarELiberarVaga } from "@/utils/remanejamento-helper";
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
  Paperclip
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
const cancelarAgendamentoUseCase = new CancelarAgendamento(agendamentoRepository);

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
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRemanejamento[]>([]);
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
      toast.success("Documentação da solicitação atualizada com sucesso!");
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
  }, [paciente]);

  const handleOpenCancelModal = (agendamento: Agendamento) => {
    setAgendamentoParaCancelar(agendamento);
    setMotivoCancelamento("");
  };

  const handleConfirmCancel = async () => {
    if (!agendamentoParaCancelar) return;

    if (motivoCancelamento.trim().length < 5) {
      toast.error("O motivo do cancelamento deve ter pelo menos 5 caracteres.");
      return;
    }

    setIsCanceling(true);

    try {
      // 1. Cancela o agendamento
      await cancelarAgendamentoUseCase.executar({
        agendamentoId: agendamentoParaCancelar.id,
        motivoCancelamento,
      });

      // 2. Se houver remanejamento ativo para este agendamento, cancela ele também
      const solicitacaoRelacionada = solicitacoes.find(
        s => s.agendamentoId === agendamentoParaCancelar.id && s.status !== 'cancelado' && s.status !== 'aceito'
      );
      if (solicitacaoRelacionada) {
        await remanejamentoRepository.atualizarStatus(solicitacaoRelacionada.id, "cancelado");
      }

      toast.success("Agendamento cancelado com sucesso!");

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

  // Divide agendamentos em ativos (futuros/marcados/solicitados) e histórico (passados ou cancelados)
  const ativos = agendamentos.filter(a => a.status === "agendado" || a.status === "solicitado");
  const historico = agendamentos.filter(a => a.status !== "agendado" && a.status !== "solicitado");

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
              return (
                <Card
                  key={a.id}
                  className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${
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
                          {isSolicitado && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wide shrink-0">
                              Aguardando Regulação
                            </span>
                          )}
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
 
                    {/* Exibição dos Documentos Anexados (R018) */}
                    {isSolicitado && (
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
 
                    <div className="border-t border-border mt-5 pt-4 flex justify-between items-center gap-2 flex-wrap">
                      <div>
                        {isSolicitado ? (
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

                  return (
                    <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {isRealizado && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                          {isCancelado && <XCircle className="h-5 w-5 text-destructive" />}
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
                                : "bg-destructive/10 text-destructive"
                            }`}>
                              {a.status}
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
            <DialogDescription>
              Você está prestes a desmarcar o horário de **{agendamentoParaCancelar?.especialidade}** no dia **{agendamentoParaCancelar && formatarDataBr(agendamentoParaCancelar.data)}** às **{agendamentoParaCancelar?.horario}**.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label htmlFor="motivo" className="text-sm font-semibold text-foreground">
                Motivo do Cancelamento *
              </label>
              <Input
                id="motivo"
                placeholder="Ex: Terei um compromisso no trabalho neste horário."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                disabled={isCanceling}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Mínimo de 5 caracteres. Seu motivo ajuda a UBS no gerenciamento das filas de espera.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setAgendamentoParaCancelar(null)}
              disabled={isCanceling}
              className="cursor-pointer"
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCanceling || motivoCancelamento.trim().length < 5}
              className="cursor-pointer font-semibold"
            >
              {isCanceling ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
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
