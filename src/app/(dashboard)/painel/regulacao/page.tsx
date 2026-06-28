"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { formatarDataBr, formatarCPF, formatarTelefone, formatarCNS } from "@/utils/formatters";
import { Agendamento } from "@/core/domain/entities/Agendamento";
import { Paciente } from "@/core/domain/entities/Paciente";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Calendar, 
  Check, 
  X, 
  ChevronLeft,
  FileText,
  User,
  ArrowRight,
  AlertCircle,
  Clock,
  Building,
  UserCheck,
  ClipboardList
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const agendamentoRepository = new LocalStorageAgendamentoRepository();
const pacienteRepository = new LocalStoragePacienteRepository();

export default function RegulacaoVagasPage() {
  const router = useRouter();
  const { paciente: usuarioLogadoPaciente, profissional: usuarioLogadoProfissional } = useAuth();

  // Apenas gestores (administradores) ou profissionais atuando como reguladores têm acesso (R014)
  const isAdmin = usuarioLogadoPaciente?.papel === "administrador";
  const autorizado = isAdmin || usuarioLogadoProfissional !== null;

  const reguladorNome = usuarioLogadoProfissional?.nome || usuarioLogadoPaciente?.nomeCompleto || "Regulador de Saúde";
  const reguladorId = usuarioLogadoProfissional?.id || usuarioLogadoPaciente?.id || "reg-1";

  // Estados de dados
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega agendamentos e pacientes
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const listAgendamentos = await agendamentoRepository.listarTodos();
        setAgendamentos(listAgendamentos);
        const listPacientes = await pacienteRepository.listarTodos();
        setPacientes(listPacientes);
      } catch (err) {
        console.error("Erro ao carregar dados de regulação:", err);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  const pendentes = agendamentos.filter((a) => a.status === "solicitado");
  const concluidos = agendamentos.filter((a) => a.status === "agendado" || (a.status === "cancelado" && a.observacoes?.includes("Rejeitado pela regulação")));

  const handleAprovar = async (id: string) => {
    try {
      // Modifica o status para 'agendado' (Aprovado)
      await agendamentoRepository.atualizarStatus(id, "agendado");
      toast.success("Solicitação de agendamento homologada e confirmada!");
      
      // Recarrega lista
      const list = await agendamentoRepository.listarTodos();
      setAgendamentos(list);
    } catch (err) {
      toast.error("Erro ao aprovar o agendamento.");
    }
  };

  const handleRejeitar = async (id: string) => {
    try {
      // Modifica o status para 'cancelado' (Rejeitado) e salva observação de auditoria
      await agendamentoRepository.atualizarStatus(id, "cancelado", "Rejeitado pela regulação central da UBS.");
      toast.warning("Solicitação de agendamento recusada.");
      
      // Recarrega lista
      const list = await agendamentoRepository.listarTodos();
      setAgendamentos(list);
    } catch (err) {
      toast.error("Erro ao recusar o agendamento.");
    }
  };

  const obterPacienteDoAgendamento = (pacienteId: string) => {
    return pacientes.find(p => p.id === pacienteId);
  };

  if (!usuarioLogadoPaciente && !usuarioLogadoProfissional) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Barreira de Segurança
  if (!autorizado) {
    return (
      <div className="max-w-md mx-auto py-12 animate-in fade-in duration-300">
        <Card className="border-border shadow-md">
          <CardContent className="p-6 text-center space-y-6">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading font-bold text-xl text-foreground">Acesso Restrito</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Esta funcionalidade é restrita para **Gestores, Reguladores** e profissionais autorizados da regulação de vagas.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/painel")}
              className="w-full text-xs font-semibold cursor-pointer"
            >
              Voltar ao Painel Geral
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-2 sm:px-0 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/painel")}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao Painel
        </Button>
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Regulação e Aprovação de Vagas
        </span>
      </div>

      {/* Solicitações Pendentes */}
      <section className="space-y-3.5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-primary" />
          Solicitações Aguardando Homologação ({pendentes.length})
        </h3>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Carregando solicitações...</div>
        ) : pendentes.length > 0 ? (
          <div className="space-y-4">
            {pendentes.map((item) => {
              const pac = obterPacienteDoAgendamento(item.pacienteId);
              
              return (
                <Card key={item.id} className="border-border shadow-xs overflow-hidden">
                  <CardHeader className="bg-muted/15 border-b p-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-4.5 w-4.5 text-primary" />
                      <span className="font-bold text-foreground">{pac?.nomeCompleto || "Paciente SUS"}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Solicitado em: {formatarDataBr(item.dataCriacao.split("T")[0])}
                    </span>
                  </CardHeader>
                  
                  <CardContent className="p-4 space-y-3 text-xs">
                    {/* Dados Básicos Paciente */}
                    {pac && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2.5 border-b border-dashed">
                        <div>CPF: <span className="font-semibold text-foreground">{formatarCPF(pac.cpf)}</span></div>
                        <div>CNS: <span className="font-semibold text-foreground">{formatarCNS(pac.cns)}</span></div>
                      </div>
                    )}

                    {/* Dados Atendimento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">Especialidade / Serviço:</span>
                        <span className="block text-foreground font-semibold text-sm capitalize">{item.tipo} de {item.especialidade}</span>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">Profissional de Saúde:</span>
                        <span className="block text-foreground font-semibold">{item.profissionalNome}</span>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">Unidade Básica (UBS):</span>
                        <span className="block text-foreground font-semibold">{item.ubsNome}</span>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">Data e Horário Solicitado:</span>
                        <span className="block text-primary font-bold">{formatarDataBr(item.data)} às {item.horario}</span>
                      </div>
                    </div>

                    {/* Metadados de Criação */}
                    {item.observacoes && item.observacoes.includes("realizado por:") && (
                      <div className="bg-sky-50 dark:bg-slate-900 p-2.5 rounded-lg border text-[10px] text-sky-800 dark:text-sky-400 font-semibold mt-2">
                        💡 {item.observacoes}
                      </div>
                    )}

                  </CardContent>

                  <CardFooter className="p-4 border-t justify-end gap-2 bg-muted/5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejeitar(item.id)}
                      className="h-8 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/10 cursor-pointer gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Recusar Vaga
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAprovar(item.id)}
                      className="h-8 text-xs font-semibold cursor-pointer gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Homologar / Aprovar
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg bg-card/50">
            Nenhuma solicitação de agendamento pendente de aprovação pela regulação.
          </div>
        )}
      </section>

      {/* Histórico das Validações Concluídas */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ClipboardList className="h-4.5 w-4.5 text-primary" />
          Histórico de Regulações Concluídas ({concluidos.length})
        </h3>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            {concluidos.length > 0 ? (
              <div className="space-y-4 divide-y divide-border">
                {concluidos.slice(0, 10).map((item, idx) => {
                  const pac = obterPacienteDoAgendamento(item.pacienteId);
                  const aprovada = item.status === "agendado";

                  return (
                    <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${idx > 0 && "pt-3.5"}`}>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{pac?.nomeCompleto || "Paciente SUS"}</span>
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            aprovada ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                            "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}>
                            {aprovada ? "Homologada" : "Recusada"}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          Especialidade: {item.especialidade} • Profissional: {item.profissionalNome}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-semibold">
                          Consulta: {formatarDataBr(item.data)} às {item.horario}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Nenhuma regulação arquivada no histórico local.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
