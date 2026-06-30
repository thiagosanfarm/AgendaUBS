"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStorageSolicitacaoRemanejamentoRepository } from "@/infra/api/repositories/LocalStorageSolicitacaoRemanejamentoRepository";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { Agendamento } from "@/core/domain/entities/Agendamento";
import { SolicitacaoRemanejamento } from "@/core/domain/entities/SolicitacaoRemanejamento";
import { aceitarVagaRemanejamento, recusarVagaRemanejamento, verificarELiberarVaga } from "@/utils/remanejamento-helper";
import { UBS } from "@/core/domain/entities/UBS";
import { obterNomeDiaSemana, obterDataPorExtenso } from "@/utils/date-helpers";
import { formatarDataBr } from "@/utils/formatters";
import { 
  CalendarPlus, 
  CalendarRange, 
  User, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  UserPlus,
  ShieldCheck,
  Activity,
  Users,
  AlertCircle,
  FileCheck,
  Sparkles,
  Timer
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const agendamentoRepository = new LocalStorageAgendamentoRepository();
const remanejamentoRepository = new LocalStorageSolicitacaoRemanejamentoRepository();
const ubsRepository = new MockUbsRepository();

export default function PainelPage() {
  const { paciente, profissional, tipoUsuario } = useAuth();
  
  // Estados para dados de Paciente
  const [proximoAgendamento, setProximoAgendamento] = useState<Agendamento | null>(null);
  const [agendamentosRecentes, setAgendamentosRecentes] = useState<Agendamento[]>([]);
  
  // Estados para dados de Profissional
  const [agendaProfissional, setAgendaProfissional] = useState<Agendamento[]>([]);
  
  // Estados para dados de Administrador
  const [todosAgendamentosUbs, setTodosAgendamentosUbs] = useState<Agendamento[]>([]);
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);

  // Estados para Remanejamento R017
  const [remanejamentoPendente, setRemanejamentoPendente] = useState<SolicitacaoRemanejamento | null>(null);
  const [tempoRestante, setTempoRestante] = useState<string>("");
  const [isProcessandoVaga, setIsProcessandoVaga] = useState(false);

  const [loading, setLoading] = useState(true);

  const hojeIso = new Date().toISOString().split("T")[0];
  const diaSemana = obterNomeDiaSemana(hojeIso);
  const dataExtenso = obterDataPorExtenso(hojeIso);

  useEffect(() => {
    ubsRepository.listarTodas().then(setTodasUbs);
  }, []);

  const carregarDadosRemanejamento = () => {
    if (paciente && tipoUsuario === "paciente") {
      remanejamentoRepository.listarPorPaciente(paciente.id).then((lista) => {
        // Encontra se há alguma solicitação com status 'disponibilizado'
        const disp = lista.find(s => s.status === 'disponibilizado');
        if (disp) {
          // Verifica se o prazo já expirou
          const agora = new Date();
          const limite = new Date(disp.vagaDisponibilizada?.prazoRespostaLimite || "");
          if (limite < agora) {
            // Se expirou, marca de volta para pendente automaticamente
            remanejamentoRepository.atualizarStatus(disp.id, "pendente").then(() => {
              setRemanejamentoPendente(null);
            });
          } else {
            setRemanejamentoPendente(disp);
          }
        } else {
          setRemanejamentoPendente(null);
        }
      });
    }
  };

  useEffect(() => {
    if (!tipoUsuario) return;

    setLoading(true);

    if (tipoUsuario === "paciente" && paciente) {
      // Carrega dados específicos do Paciente
      agendamentoRepository
        .listarPorPaciente(paciente.id)
        .then((lista) => {
          // Inclui agendamentos ativos que estejam agendados, solicitados, em análise ou aguardando documentação
          const ativos = lista
            .filter((a) => a.status === "agendado" || a.status === "solicitado" || a.status === "em_analise" || a.status === "aguardando_documentacao")
            .sort((a, b) => {
              const dataA = new Date(`${a.data}T${a.horario}:00`);
              const dataB = new Date(`${b.data}T${b.horario}:00`);
              return dataA.getTime() - dataB.getTime();
            });

          setProximoAgendamento(ativos.length > 0 ? ativos[0] : null);
          setAgendamentosRecentes(lista.slice(0, 3));
          
          // Carrega remanejamento
          carregarDadosRemanejamento();
        })
        .catch((err) => console.error("Erro ao carregar dados do paciente:", err))
        .finally(() => setLoading(false));
    } 
    else if (tipoUsuario === "profissional" && profissional) {
      // Carrega dados específicos do Profissional
      agendamentoRepository
        .listarPorProfissional(profissional.id)
        .then((lista) => {
          setAgendaProfissional(lista);
        })
        .catch((err) => console.error("Erro ao carregar agenda do profissional:", err))
        .finally(() => setLoading(false));
    } 
    else if (tipoUsuario === "administrador" && paciente) {
      // Carrega dados do Administrador (agendamentos gerais da UBS vinculada)
      agendamentoRepository
        .listarTodos()
        .then((lista) => {
          // Filtra apenas agendamentos da UBS do administrador
          const filtrados = lista.filter(a => a.ubsId === paciente.ubsId);
          setTodosAgendamentosUbs(filtrados);
        })
        .catch((err) => console.error("Erro ao carregar dados administrativos:", err))
        .finally(() => setLoading(false));
    }
  }, [paciente, profissional, tipoUsuario]);

  // Hook para contador regressivo R017
  useEffect(() => {
    if (!remanejamentoPendente || !remanejamentoPendente.vagaDisponibilizada) return;

    const interval = setInterval(() => {
      const agora = new Date().getTime();
      const limite = new Date(remanejamentoPendente.vagaDisponibilizada!.prazoRespostaLimite).getTime();
      const diferenca = limite - agora;

      if (diferenca <= 0) {
        clearInterval(interval);
        setTempoRestante("Expirado");
        
        // Expira automaticamente voltando para a fila
        remanejamentoRepository.atualizarStatus(remanejamentoPendente.id, "pendente").then(() => {
          setRemanejamentoPendente(null);
          toast.warning("O prazo de resposta da vaga de remanejamento expirou.");
          if (paciente) {
            agendamentoRepository.listarPorPaciente(paciente.id).then((lista) => {
              const ativos = lista.filter((a) => a.status === "agendado" || a.status === "solicitado" || a.status === "em_analise" || a.status === "aguardando_documentacao");
              setProximoAgendamento(ativos.length > 0 ? ativos[0] : null);
              setAgendamentosRecentes(lista.slice(0, 3));
            });
          }
        });
      } else {
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
        setTempoRestante(`${String(minutos).padStart(2, "0")}m ${String(segundos).padStart(2, "0")}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [remanejamentoPendente]);

  const handleAceitarVaga = async () => {
    if (!remanejamentoPendente) return;
    setIsProcessandoVaga(true);
    try {
      await aceitarVagaRemanejamento(remanejamentoPendente.id);
      toast.success("Vaga de remanejamento aceita com sucesso!");
      setRemanejamentoPendente(null);
      // Recarrega todos os dados
      if (paciente) {
        const lista = await agendamentoRepository.listarPorPaciente(paciente.id);
        const ativos = lista.filter((a) => a.status === "agendado" || a.status === "solicitado" || a.status === "em_analise" || a.status === "aguardando_documentacao");
        setProximoAgendamento(ativos.length > 0 ? ativos[0] : null);
        setAgendamentosRecentes(lista.slice(0, 3));
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao aceitar vaga.");
    } finally {
      setIsProcessandoVaga(false);
    }
  };

  const handleRecusarVaga = async () => {
    if (!remanejamentoPendente) return;
    setIsProcessandoVaga(true);
    try {
      await recusarVagaRemanejamento(remanejamentoPendente.id);
      toast.warning("Vaga de remanejamento recusada. Você continua na fila de espera.");
      setRemanejamentoPendente(null);
      carregarDadosRemanejamento();
    } catch (err: any) {
      toast.error(err.message || "Erro ao recusar vaga.");
    } finally {
      setIsProcessandoVaga(false);
    }
  };

  const handleAtualizarStatusAgendamento = async (id: string, status: "realizado" | "cancelado") => {
    try {
      const agendamento = await agendamentoRepository.obterPorId(id);
      await agendamentoRepository.atualizarStatus(id, status);
      toast.success(`Agendamento atualizado para ${status}!`);
      
      if (status === "cancelado" && agendamento) {
        // Dispara o matching de remanejamento para a vaga que acabou de liberar!
        await verificarELiberarVaga({
          ubsId: agendamento.ubsId,
          ubsNome: agendamento.ubsNome,
          profissionalId: agendamento.profissionalId,
          profissionalNome: agendamento.profissionalNome,
          especialidade: agendamento.especialidade,
          tipo: agendamento.tipo,
          data: agendamento.data,
          horario: agendamento.horario
        });
      }

      // Recarrega a agenda
      if (profissional) {
        const lista = await agendamentoRepository.listarPorProfissional(profissional.id);
        setAgendaProfissional(lista);
      }
    } catch (err: any) {
      toast.error("Erro ao atualizar status do agendamento.");
    }
  };

  const ubsAdmin = todasUbs.find(u => u.id === paciente?.ubsId);

  // -------------------------------------------------------------
  // VISUALIZAÇÃO 1: PROFISSIONAL DE SAÚDE
  // -------------------------------------------------------------
  if (tipoUsuario === "profissional" && profissional) {
    const isAcs = profissional.especialidade === "Agente Comunitário de Saúde";

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Boas-vindas Profissional */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-blue-700 to-blue-600 rounded-2xl p-6 md:p-8 text-white shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Profissional de Saúde Autenticado
            </span>
            <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mt-1.5">
              Olá, {profissional.nome}!
            </h2>
            <p className="text-white/80 text-xs font-medium">
              Especialidade: **{profissional.especialidade}** • Reg: {profissional.registroProfissional.tipo} {profissional.registroProfissional.numero}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2 text-right self-start md:self-auto">
            <span className="block text-xs uppercase tracking-wider font-semibold opacity-75">{diaSemana}</span>
            <span className="block text-sm font-bold">{dataExtenso}</span>
          </div>
        </div>

        {/* Ações do Profissional (Agendamento Assistido R014) */}
        <section className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/painel/agendamento-assistido" className="group">
              <Card className="hover:border-blue-600 hover:bg-blue-500/5 transition-all duration-300 shadow-xs h-full">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
                      <CalendarPlus className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-foreground text-xs group-hover:text-blue-700 transition-colors flex items-center gap-1">
                        Agendamento Assistido (Regulação)
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Efetue agendamentos em nome dos pacientes de sua unidade.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Apenas ACS tem link direto para Visitas, Médicos podem acessar regulação de vagas */}
            {isAcs ? (
              <Link href="/acs" className="group">
                <Card className="hover:border-blue-600 hover:bg-blue-500/5 transition-all duration-300 shadow-xs h-full">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
                        <Users className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-foreground text-xs group-hover:text-blue-700 transition-colors flex items-center gap-1">
                          Visitas em Campo (ACS)
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Efetue o cadastramento residencial e acompanhamento territorial.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Link href="/painel/regulacao" className="group">
                <Card className="hover:border-blue-600 hover:bg-blue-500/5 transition-all duration-300 shadow-xs h-full">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
                        <FileCheck className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-foreground text-xs group-hover:text-blue-700 transition-colors flex items-center gap-1">
                          Regulação de Vagas
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Aprove ou recuse solicitações de agendamentos pendentes.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </section>

        {/* Agenda de Atendimentos */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CalendarRange className="h-4 w-4 text-blue-600" />
            Minha Agenda de Atendimentos
          </h3>

          <Card className="border-border shadow-xs">
            <CardContent className="p-4 sm:p-6">
              {loading ? (
                <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
                  Carregando atendimentos agendados...
                </div>
              ) : agendaProfissional.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-2">Data / Hora</th>
                        <th className="py-3 px-2">Paciente (ID)</th>
                        <th className="py-3 px-2">Serviço / Especialidade</th>
                        <th className="py-3 px-2">Status</th>
                        <th className="py-3 px-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {agendaProfissional.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-2 font-bold text-foreground">
                            {formatarDataBr(item.data)} às {item.horario}
                          </td>
                          <td className="py-3.5 px-2">
                            <span className="font-semibold text-foreground block">Paciente SUS</span>
                            <span className="text-[10px] text-muted-foreground">Cód: {item.pacienteId.slice(0, 10)}...</span>
                          </td>
                          <td className="py-3.5 px-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary capitalize mr-1.5">
                              {item.tipo}
                            </span>
                            <span className="font-medium text-foreground">{item.especialidade}</span>
                          </td>
                          <td className="py-3.5 px-2">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              item.status === "solicitado" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                              item.status === "em_analise" ? "bg-blue-50 text-blue-600 border border-blue-200 animate-pulse" :
                              item.status === "agendado" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                              item.status === "realizado" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                              item.status === "aguardando_documentacao" ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" :
                              item.status === "reagendado" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                              "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}>
                              {item.status === "solicitado" ? "pendente" : 
                               item.status === "em_analise" ? "em análise" : 
                               item.status === "aguardando_documentacao" ? "doc. pendente" : 
                               item.status === "reagendado" ? "reagendada" : 
                               item.status === "agendado" ? "aprovada" : 
                               item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            {item.status === "agendado" ? (
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAtualizarStatusAgendamento(item.id, "realizado")}
                                  className="h-7 text-[10px] font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                                >
                                  Concluir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAtualizarStatusAgendamento(item.id, "cancelado")}
                                  className="h-7 text-[10px] font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : item.status === "solicitado" ? (
                              <span className="text-[10px] text-amber-600 font-semibold italic">Aguardando Regulação</span>
                            ) : item.status === "em_analise" ? (
                              <span className="text-[10px] text-blue-600 font-semibold italic">Em Análise Técnica</span>
                            ) : item.status === "aguardando_documentacao" ? (
                              <span className="text-[10px] text-red-600 font-semibold italic">Documentação Pendente</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-semibold italic">Finalizado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center gap-3">
                  <Calendar className="h-10 w-10 text-muted-foreground opacity-55" />
                  <div>
                    <h4 className="font-semibold text-foreground">Sua agenda está livre</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Nenhum paciente agendou consultas para você nesta unidade no momento.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VISUALIZAÇÃO 2: GESTOR / ADMINISTRADOR DA UBS
  // -------------------------------------------------------------
  if (tipoUsuario === "administrador" && paciente) {
    const agendamentosHoje = todosAgendamentosUbs.filter(a => a.data === hojeIso && a.status === "agendado");
    const totalAtivos = todosAgendamentosUbs.filter(a => a.status === "agendado").length;
    const totalSolicitados = todosAgendamentosUbs.filter(a => a.status === "solicitado").length;
    const totalCancelados = todosAgendamentosUbs.filter(a => a.status === "cancelado").length;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Boas-vindas Admin */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-emerald-700 to-emerald-600 rounded-2xl p-6 md:p-8 text-white shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
              <ShieldCheck className="h-3.5 w-3.5" />
              Gestão de Unidade SUS
            </span>
            <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mt-1.5">
              Olá, {paciente.nomeCompleto.split(" ")[0]}!
            </h2>
            <p className="text-white/80 text-xs font-medium">
              UBS Vinculada: **{ubsAdmin?.nome || "Carregando..."}** • CNES: {ubsAdmin?.cnes}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2 text-right self-start md:self-auto">
            <span className="block text-xs uppercase tracking-wider font-semibold opacity-75">{diaSemana}</span>
            <span className="block text-sm font-bold">{dataExtenso}</span>
          </div>
        </div>

        {/* Estatísticas Rápidas de Gestão */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-muted-foreground uppercase">Atendimentos Hoje</span>
                <span className="block text-2xl font-bold text-foreground mt-1">{agendamentosHoje.length}</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-muted-foreground uppercase">Solicitações Pendentes</span>
                <span className="block text-2xl font-bold text-amber-600 mt-1">{totalSolicitados}</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-muted-foreground uppercase">Total de Agendas Ativas</span>
                <span className="block text-2xl font-bold text-foreground mt-1">{totalAtivos}</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <CalendarRange className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Atalhos Rápidos Administrativos */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Ações e Cadastros Administrativos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/painel/profissionais/novo" className="group">
              <Card className="hover:border-emerald-600 hover:bg-emerald-500/5 transition-all duration-300 h-full flex flex-col justify-between">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm mt-4 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    Cadastrar Profissional de Saúde
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Crie agendas para médicos, enfermeiros, dentistas e fisioterapeutas.</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/painel/administradores/novo" className="group">
              <Card className="hover:border-emerald-600 hover:bg-emerald-500/5 transition-all duration-300 h-full flex flex-col justify-between">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm mt-4 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    Cadastrar Gestor / Admin UBS
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Delegue permissões de TI e coordenação de UBS para novos gestores.</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/painel/regulacao" className="group">
              <Card className="hover:border-emerald-600 hover:bg-emerald-500/5 transition-all duration-300 h-full flex flex-col justify-between relative">
                {totalSolicitados > 0 && (
                  <span className="absolute -top-2.5 -right-2 bg-amber-500 text-white font-extrabold text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                    {totalSolicitados}
                  </span>
                )}
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm mt-4 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    Regulação de Vagas
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Aprove ou recuse solicitações de agendamentos pendentes de pacientes.</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Visão de Agendamentos da UBS */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Monitoramento de Consultas e Exames (UBS)
          </h3>

          <Card className="border-border">
            <CardContent className="p-4 sm:p-6">
              {todosAgendamentosUbs.length > 0 ? (
                <div className="space-y-4 divide-y divide-border">
                  {todosAgendamentosUbs.slice(0, 5).map((item, idx) => (
                    <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${idx > 0 && "pt-3.5"}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            item.status === "solicitado" ? "bg-amber-500/10 text-amber-600" : 
                            item.status === "em_analise" ? "bg-blue-500/10 text-blue-600 border border-blue-200 animate-pulse" : 
                            item.status === "aguardando_documentacao" ? "bg-red-500/10 text-red-600 border border-red-500/20 animate-pulse" : 
                            item.status === "reagendado" ? "bg-purple-500/10 text-purple-600 border border-purple-200" : 
                            "bg-emerald-500/10 text-emerald-600"
                          }`}>
                            {item.status === "solicitado" ? "pendente" : 
                             item.status === "em_analise" ? "em análise" : 
                             item.status === "aguardando_documentacao" ? "doc. pendente" : 
                             item.status === "reagendado" ? "reagendada" : 
                             item.status === "agendado" ? "aprovada" : 
                             item.status}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {item.especialidade}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Profissional: **{item.profissionalNome}** • Paciente: Cód {item.pacienteId.slice(0, 10)}...
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        {formatarDataBr(item.data)} às {item.horario}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum agendamento ativo monitorado nesta unidade de saúde.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VISUALIZAÇÃO 3: PACIENTE COMUM (Original)
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Boas-vindas Paciente */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-md">
        <div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
            Olá, {paciente?.nomeCompleto?.split(" ")[0]}!
          </h2>
          <p className="text-primary-foreground/80 text-xs mt-1.5 font-medium leading-relaxed">
            Seja bem-vindo ao portal digital de agendamentos. <br />
            Unidade Referenciada: **{todasUbs.find(u => u.id === paciente?.ubsId)?.nome || "Não identificada (Corrija seu endereço no Perfil)"}**
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2 text-right self-start md:self-auto">
          <span className="block text-xs uppercase tracking-wider font-semibold opacity-75">{diaSemana}</span>
          <span className="block text-sm font-bold">{dataExtenso}</span>
        </div>
      </div>

      {/* Banner de Vaga de Remanejamento Disponibilizada (R017) */}
      {remanejamentoPendente && remanejamentoPendente.vagaDisponibilizada && (
        <Card className="border-2 border-primary bg-primary/5 shadow-md overflow-hidden animate-in zoom-in duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="h-3.5 w-3.5" />
                    Oportunidade de Remanejamento
                  </span>
                  <span className="text-[10px] font-bold text-destructive flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded-full animate-pulse">
                    <Timer className="h-3.5 w-3.5" />
                    Expira em: {tempoRestante}
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground leading-snug">
                    Temos uma vaga antecipada para sua consulta/exame de <strong className="text-primary font-black capitalize">{remanejamentoPendente.especialidade}</strong>!
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A vaga foi disponibilizada na unidade <strong className="text-foreground">{remanejamentoPendente.vagaDisponibilizada.ubsNome}</strong> com o profissional <strong className="text-foreground">{remanejamentoPendente.vagaDisponibilizada.profissionalNome}</strong>.
                  </p>
                  <p className="text-xs font-bold text-primary bg-primary/10 w-fit px-2 py-0.5 rounded-md mt-1">
                    Novo Horário: {formatarDataBr(remanejamentoPendente.vagaDisponibilizada.data)} às {remanejamentoPendente.vagaDisponibilizada.horario}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                <Button
                  variant="outline"
                  onClick={handleRecusarVaga}
                  disabled={isProcessandoVaga}
                  className="h-10 text-xs font-bold border-destructive/20 hover:bg-destructive/10 text-destructive cursor-pointer rounded-xl"
                >
                  Recusar Vaga
                </Button>
                <Button
                  onClick={handleAceitarVaga}
                  disabled={isProcessandoVaga}
                  className="h-10 text-xs font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-md rounded-xl"
                >
                  {isProcessandoVaga ? "Processando..." : "Aceitar Nova Vaga"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Atalhos & Próximo Agendamento */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Atalhos Rápidos */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Acesso Rápido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/agendamentos/novo" className="group">
                <Card className="hover:border-primary hover:bg-primary/5 transition-all duration-300 h-full flex flex-col justify-between">
                  <CardHeader className="p-5 pb-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                      <CalendarPlus className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Novo Agendamento
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Marque uma nova consulta ou exame na UBS de sua escolha.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/agendamentos" className="group">
                <Card className="hover:border-primary hover:bg-primary/5 transition-all duration-300 h-full flex flex-col justify-between">
                  <CardHeader className="p-5 pb-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                      <CalendarRange className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Ver Meus Agendamentos
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Consulte detalhes e horários de compromissos marcados.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/perfil" className="group">
                <Card className="hover:border-primary hover:bg-primary/5 transition-all duration-300 h-full flex flex-col justify-between">
                  <CardHeader className="p-5 pb-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                      <User className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Visualizar Perfil
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Visualize seus dados cadastrais e o cartão digital do SUS.</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Próximo Compromisso */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Próximo Agendamento
            </h3>
            {loading ? (
              <Card className="border-border">
                <CardContent className="p-6 flex justify-center items-center h-32">
                  <span className="text-sm text-muted-foreground animate-pulse">Carregando compromissos...</span>
                </CardContent>
              </Card>
            ) : proximoAgendamento ? (
              <Card className="border-l-4 border-l-primary bg-card shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                          {proximoAgendamento.tipo}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {proximoAgendamento.especialidade}
                        </span>
                        {proximoAgendamento.status === "solicitado" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 uppercase animate-pulse">
                            Pendente de Regulação
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span>Profissional: <strong className="text-foreground">{proximoAgendamento.profissionalNome}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>Local: <strong className="text-foreground">{proximoAgendamento.ubsNome}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4 self-start md:self-auto">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground font-medium">Data e Horário</span>
                        <span className="block text-sm font-bold text-foreground">
                          {formatarDataBr(proximoAgendamento.data)} às {proximoAgendamento.horario}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border mt-5 pt-4">
                    <span className="text-xs text-muted-foreground">
                      * Compareça com 15 minutos de antecedência levando seu documento e cartão SUS.
                    </span>
                    <Link href="/agendamentos">
                      <Button variant="outline" size="sm" className="font-semibold cursor-pointer">
                        Gerenciar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-border bg-transparent">
                <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Nenhum compromisso marcado</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Você não tem consultas ou exames agendados para os próximos dias.
                    </p>
                  </div>
                  <Link href="/agendamentos/novo" className="mt-2">
                    <Button size="sm" className="font-semibold cursor-pointer">
                      Agendar Consulta/Exame
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {/* Lado Direito: Histórico de Atividades Recentes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Atividades Recentes
          </h3>
          
          <Card className="border-border">
            <CardContent className="p-4 space-y-4">
              {loading ? (
                <div className="text-center py-8 text-sm text-muted-foreground animate-pulse">
                  Carregando histórico...
                </div>
              ) : agendamentosRecentes.length > 0 ? (
                <div className="divide-y divide-border">
                  {agendamentosRecentes.map((agendamento) => {
                    const isSolicitado = agendamento.status === "solicitado";
                    const isAgendado = agendamento.status === "agendado";
                    const isRealizado = agendamento.status === "realizado";
                    const isCancelado = agendamento.status === "cancelado";

                    return (
                      <div key={agendamento.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                        <div className="mt-0.5">
                          {isSolicitado && <Clock className="h-4.5 w-4.5 text-amber-500" />}
                          {isAgendado && <Clock className="h-4.5 w-4.5 text-blue-500" />}
                          {isRealizado && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
                          {isCancelado && <XCircle className="h-4.5 w-4.5 text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground truncate block">
                              {agendamento.especialidade}
                            </span>
                            <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${
                              isSolicitado ? "bg-amber-100 text-amber-800" :
                              isAgendado ? "bg-blue-100 text-blue-800" :
                              isRealizado ? "bg-emerald-100 text-emerald-800" :
                              "bg-destructive/10 text-destructive"
                            }`}>
                              {isSolicitado ? "pendente" : agendamento.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {formatarDataBr(agendamento.data)} às {agendamento.horario} • {agendamento.ubsNome}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Nenhuma atividade recente registrada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
