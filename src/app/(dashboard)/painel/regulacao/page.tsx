"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { LocalStorageSolicitacaoRemanejamentoRepository } from "@/infra/api/repositories/LocalStorageSolicitacaoRemanejamentoRepository";
import { MockProfissionalRepository } from "@/infra/api/repositories/MockProfissionalRepository";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { formatarDataBr, formatarCPF, formatarTelefone, formatarCNS } from "@/utils/formatters";
import { Agendamento } from "@/core/domain/entities/Agendamento";
import { Paciente } from "@/core/domain/entities/Paciente";
import { SolicitacaoRemanejamento } from "@/core/domain/entities/SolicitacaoRemanejamento";
import { UBS } from "@/core/domain/entities/UBS";
import { Profissional } from "@/core/domain/entities/Profissional";
import { verificarELiberarVaga } from "@/utils/remanejamento-helper";
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
  ClipboardList,
  Sparkles,
  Timer,
  Activity,
  ListTodo,
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const agendamentoRepository = new LocalStorageAgendamentoRepository();
const pacienteRepository = new LocalStoragePacienteRepository();
const remanejamentoRepository = new LocalStorageSolicitacaoRemanejamentoRepository();
const profissionalRepository = new MockProfissionalRepository();
const ubsRepo = new MockUbsRepository();

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
  const [remanejamentos, setRemanejamentos] = useState<SolicitacaoRemanejamento[]>([]);
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados das Abas R017
  const [abaAtiva, setAbaAtiva] = useState<'aprovações' | 'remanejamentos' | 'simulador'>('aprovações');

  // Estados do Simulador de Vagas R017
  const [simUbs, setSimUbs] = useState<UBS | null>(null);
  const [simEspecialidade, setSimEspecialidade] = useState("Cardiologia");
  const [simProfissionais, setSimProfissionais] = useState<Profissional[]>([]);
  const [simProfissional, setSimProfissional] = useState<Profissional | null>(null);
  const [simData, setSimData] = useState("2026-04-15");
  const [simHorario, setSimHorario] = useState("09:30");
  const [isSimulando, setIsSimulando] = useState(false);

  const carregarDados = async () => {
    try {
      const listAgendamentos = await agendamentoRepository.listarTodos();
      setAgendamentos(listAgendamentos);
      const listPacientes = await pacienteRepository.listarTodos();
      setPacientes(listPacientes);
      const listRemanejamentos = await remanejamentoRepository.listarTodos();
      setRemanejamentos(listRemanejamentos);
      const listUbs = await ubsRepo.listarTodas();
      setTodasUbs(listUbs);

      if (listUbs.length > 0 && !simUbs) {
        setSimUbs(listUbs[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de regulação:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega agendamentos, pacientes e remanejamentos
  useEffect(() => {
    carregarDados();
  }, []);

  // Atualiza profissionais do simulador quando UBS ou Especialidade mudam
  useEffect(() => {
    if (simUbs && simEspecialidade) {
      profissionalRepository
        .listarPorUbsEEspecialidade(simUbs.id, simEspecialidade)
        .then((list) => {
          setSimProfissionais(list);
          if (list.length > 0) {
            setSimProfissional(list[0]);
          } else {
            setSimProfissional(null);
          }
        });
    }
  }, [simUbs, simEspecialidade]);

  const pendentes = agendamentos.filter((a) => a.status === "solicitado");
  const concluidos = agendamentos.filter((a) => a.status === "agendado" || (a.status === "cancelado" && a.observacoes?.includes("Rejeitado pela regulação")));

  const handleAprovar = async (id: string) => {
    try {
      await agendamentoRepository.atualizarStatus(id, "agendado");
      toast.success("Solicitação de agendamento homologada e confirmada!");
      carregarDados();
    } catch (err) {
      toast.error("Erro ao aprovar o agendamento.");
    }
  };

  const handleRejeitar = async (id: string) => {
    try {
      await agendamentoRepository.atualizarStatus(id, "cancelado", "Rejeitado pela regulação central da UBS.");
      toast.warning("Solicitação de agendamento recusada.");
      carregarDados();
    } catch (err) {
      toast.error("Erro ao recusar o agendamento.");
    }
  };

  const handleSimularVaga = async () => {
    if (!simUbs || !simProfissional || !simData || !simHorario) {
      toast.error("Preencha todos os campos do simulador.");
      return;
    }

    setIsSimulando(true);
    try {
      const match = await verificarELiberarVaga({
        ubsId: simUbs.id,
        ubsNome: simUbs.nome,
        profissionalId: simProfissional.id,
        profissionalNome: simProfissional.nome,
        especialidade: simEspecialidade,
        tipo: 'consulta',
        data: simData,
        horario: simHorario
      });

      if (match) {
        toast.success(`Match de remanejamento! Vaga disponibilizada para o paciente ${match.pacienteNome}.`);
      } else {
        toast.info("Vaga liberada com sucesso! Porém, nenhum paciente na fila atendeu aos critérios.");
      }
      
      await carregarDados();
    } catch (err: any) {
      toast.error(err.message || "Erro ao simular liberação de vaga.");
    } finally {
      setIsSimulando(false);
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

      {/* Menu de Abas Premium */}
      <div className="flex border-b border-border bg-card rounded-t-xl overflow-hidden shadow-xs">
        {[
          { id: "aprovações", label: "Aprovações Gerais", icon: ShieldCheck },
          { id: "remanejamentos", label: "Fila de Remanejamento", icon: ListTodo },
          { id: "simulador", label: "Simulador de Vagas", icon: Sparkles }
        ].map((aba) => {
          const ActiveIcon = aba.icon;
          const isAtiva = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id as any)}
              className={`flex-1 py-3.5 px-4 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                isAtiva
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent hover:bg-muted/30 text-muted-foreground"
              }`}
            >
              <ActiveIcon className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">{aba.label}</span>
              {aba.id === "aprovações" && pendentes.length > 0 && (
                <span className="bg-amber-500 text-white font-extrabold text-[9px] h-4 w-4 rounded-full flex items-center justify-center ml-1">
                  {pendentes.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ABA 1: APROVAÇÕES GERAIS */}
      {abaAtiva === "aprovações" && (
        <div className="space-y-6">
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
      )}

      {/* ABA 2: FILA DE REMANEJAMENTO */}
      {abaAtiva === "remanejamentos" && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ListTodo className="h-4.5 w-4.5 text-primary" />
            Fila Ativa de Pacientes para Remanejamento ({remanejamentos.length})
          </h3>

          <Card className="border-border shadow-xs">
            <CardContent className="p-4 sm:p-6">
              {remanejamentos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-2">Data Solicitação</th>
                        <th className="py-3 px-2">Paciente</th>
                        <th className="py-3 px-2">Especialidade / Tipo</th>
                        <th className="py-3 px-2">Preferências</th>
                        <th className="py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {remanejamentos.map((sol) => {
                        const pac = obterPacienteDoAgendamento(sol.pacienteId);
                        return (
                          <tr key={sol.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-2 font-semibold text-foreground">
                              {formatarDataBr(sol.dataSolicitacao)}
                            </td>
                            <td className="py-3.5 px-2">
                              <span className="font-bold text-foreground block">{sol.pacienteNome}</span>
                              <span className="text-[10px] text-muted-foreground">CNS: {pac ? formatarCNS(pac.cns) : "Não informado"}</span>
                            </td>
                            <td className="py-3.5 px-2">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary capitalize mr-1.5">
                                {sol.tipo}
                              </span>
                              <span className="font-semibold text-foreground">{sol.especialidade}</span>
                            </td>
                            <td className="py-3.5 px-2 space-y-0.5">
                              <span className="block font-medium">Período: <strong className="text-foreground">{sol.preferenciaPeriodo ? sol.preferenciaPeriodo.toUpperCase() : "QUALQUER"}</strong></span>
                              <span className="block text-[10px] text-muted-foreground">
                                Dias: {sol.diasDisponiveis && sol.diasDisponiveis.length > 0
                                  ? sol.diasDisponiveis.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")
                                  : "Qualquer dia"}
                              </span>
                            </td>
                            <td className="py-3.5 px-2">
                              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                sol.status === "pendente" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                sol.status === "disponibilizado" ? "bg-blue-50 text-blue-600 border border-blue-200 animate-pulse" :
                                sol.status === "aceito" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                                "bg-destructive/10 text-destructive border border-destructive/20"
                              }`}>
                                {sol.status}
                              </span>
                              {sol.status === "disponibilizado" && sol.vagaDisponibilizada && (
                                <span className="block text-[9px] text-blue-500 font-semibold mt-1">
                                  Oferta: {formatarDataBr(sol.vagaDisponibilizada.data)} às {sol.vagaDisponibilizada.horario}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center gap-3">
                  <ListTodo className="h-10 w-10 text-muted-foreground opacity-55" />
                  <div>
                    <h4 className="font-semibold text-foreground">Fila de remanejamento vazia</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Nenhum paciente solicitou antecipação de agendamentos no momento.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ABA 3: SIMULADOR DE VAGAS */}
      {abaAtiva === "simulador" && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            Simulador de Liberação de Vagas (Remanejamento)
          </h3>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 space-y-4">
              
              <div className="p-3.5 bg-sky-500/5 border border-sky-500/20 text-sky-800 dark:text-sky-400 rounded-xl space-y-1.5 flex gap-2">
                <Info className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Sobre o Simulador de Matching</p>
                  <p className="leading-relaxed font-medium">
                    Utilize este painel para criar uma nova vaga livre no sistema (simulando a desistência de outro paciente ou abertura de plantão). 
                    O sistema buscará na <strong>Fila de Remanejamento</strong> o paciente mais antigo com preferências compatíveis e disparará o status de oferta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Seleção de UBS */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase">Unidade Básica de Saúde</label>
                  <select
                    value={simUbs?.id || ""}
                    onChange={(e) => {
                      const u = todasUbs.find(item => item.id === e.target.value);
                      if (u) setSimUbs(u);
                    }}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 outline-none font-medium text-foreground cursor-pointer"
                  >
                    {todasUbs.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Seleção de Especialidade */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase">Especialidade</label>
                  <select
                    value={simEspecialidade}
                    onChange={(e) => setSimEspecialidade(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 outline-none font-medium text-foreground cursor-pointer"
                  >
                    <option value="Cardiologia">Cardiologia</option>
                    <option value="Clínico Geral">Clínico Geral</option>
                    <option value="Pediatria">Pediatria</option>
                    <option value="Ginecologia e Obstetrícia">Ginecologia e Obstetrícia</option>
                    <option value="Odontologia Geral">Odontologia Geral</option>
                  </select>
                </div>

                {/* Seleção de Profissional */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase">Profissional de Saúde</label>
                  <select
                    value={simProfissional?.id || ""}
                    onChange={(e) => {
                      const p = simProfissionais.find(item => item.id === e.target.value);
                      if (p) setSimProfissional(p);
                    }}
                    disabled={simProfissionais.length === 0}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 outline-none font-medium text-foreground cursor-pointer disabled:bg-muted/40"
                  >
                    {simProfissionais.length > 0 ? (
                      simProfissionais.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))
                    ) : (
                      <option value="">Não há profissionais para esta seleção</option>
                    )}
                  </select>
                </div>

                {/* Data e Horário */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-muted-foreground uppercase">Data da Vaga</label>
                    <input
                      type="date"
                      value={simData}
                      onChange={(e) => setSimData(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 outline-none font-medium text-foreground cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-muted-foreground uppercase">Horário</label>
                    <select
                      value={simHorario}
                      onChange={(e) => setSimHorario(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 outline-none font-medium text-foreground cursor-pointer"
                    >
                      {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="pt-2 border-t flex justify-end">
                <Button
                  onClick={handleSimularVaga}
                  disabled={isSimulando || !simProfissional}
                  className="font-bold gap-2 rounded-xl h-11 px-6 shadow-sm cursor-pointer w-full sm:w-auto text-xs"
                >
                  <Sparkles className="h-4 w-4" />
                  {isSimulando ? "Processando..." : "Simular Liberação de Vaga"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </section>
      )}

    </div>
  );
}
