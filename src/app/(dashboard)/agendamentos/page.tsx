"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { CancelarAgendamento } from "@/core/use-cases/CancelarAgendamento";
import { Agendamento } from "@/core/domain/entities/Agendamento";
import { formatarDataBr } from "@/utils/formatters";
import { toast } from "sonner";
import { 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Plus
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const agendamentoRepository = new LocalStorageAgendamentoRepository();
const cancelarAgendamentoUseCase = new CancelarAgendamento(agendamentoRepository);

export default function AgendamentosPage() {
  const { paciente } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de cancelamento
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);

  const carregarAgendamentos = () => {
    if (paciente) {
      setLoading(true);
      agendamentoRepository
        .listarPorPaciente(paciente.id)
        .then(setAgendamentos)
        .catch((err) => console.error("Erro ao obter agendamentos:", err))
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
      await cancelarAgendamentoUseCase.executar({
        agendamentoId: agendamentoParaCancelar.id,
        motivoCancelamento,
      });

      toast.success("Agendamento cancelado com sucesso!");
      setAgendamentoParaCancelar(null);
      carregarAgendamentos(); // recarrega a lista
    } catch (err: any) {
      toast.error(err.message || "Não foi possível cancelar o agendamento.");
    } finally {
      setIsCanceling(false);
    }
  };

  // Divide agendamentos em ativos (futuros/marcados) e histórico (passados ou cancelados)
  const ativos = agendamentos.filter(a => a.status === "agendado");
  const historico = agendamentos.filter(a => a.status !== "agendado");

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
            {ativos.map((a) => (
              <Card key={a.id} className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 uppercase">
                          {a.tipo}
                        </span>
                        <span className="text-sm font-bold text-foreground capitalize">
                          {a.especialidade}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span>Profissional: <strong className="text-foreground">{a.profissionalNome}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span>Unidade: <strong className="text-foreground">{a.ubsNome}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-3.5 shrink-0 text-center min-w-[100px]">
                      <Calendar className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 mb-1" />
                      <span className="text-xs font-bold text-foreground">{formatarDataBr(a.data)}</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{a.horario}</span>
                    </div>
                  </div>

                  <div className="border-t border-border mt-5 pt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCancelModal(a)}
                      className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive font-semibold cursor-pointer"
                    >
                      Desmarcar Horário
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
}
