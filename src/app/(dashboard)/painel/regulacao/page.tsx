"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { LocalStorageSolicitacaoRemanejamentoRepository } from "@/infra/api/repositories/LocalStorageSolicitacaoRemanejamentoRepository";
import { MockProfissionalRepository } from "@/infra/api/repositories/MockProfissionalRepository";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { formatarDataBr, formatarCPF, formatarTelefone, formatarCNS, formatarCEP } from "@/utils/formatters";
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
  Info,
  Paperclip,
  Eye
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [visualizarDoc, setVisualizarDoc] = useState<{ url: string; nome: string; tipo: string } | null>(null);
  const [remanejamentos, setRemanejamentos] = useState<SolicitacaoRemanejamento[]>([]);
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Filtro e Ordenação R019
  const [filtroUbs, setFiltroUbs] = useState<string>("todas");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("todas");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [ordenacao, setOrdenacao] = useState<"dataAsc" | "dataDesc" | "prioridade" | "especialidade">("prioridade");

  // Estado de Ficha Detalhada R019 e Parecer Técnico R020
  const [solicitacaoDetalhada, setSolicitacaoDetalhada] = useState<Agendamento | null>(null);
  const [decisaoSel, setDecisaoSel] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [observacoesAnalise, setObservacoesAnalise] = useState<string>("");

  // Tratamento de Erros R019
  const [erroCarregamento, setErroCarregamento] = useState(false);

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
    setLoading(true);
    setErroCarregamento(false);
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
      setErroCarregamento(true);
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
  const concluidos = agendamentos.filter((a) => a.decisaoRegulacao !== undefined);

  const handleAprovar = async (id: string, obs: string = "") => {
    try {
      await agendamentoRepository.atualizarStatus(id, "agendado", undefined, reguladorNome, obs);
      toast.success("Solicitação de agendamento homologada e confirmada!");
      carregarDados();
    } catch (err) {
      toast.error("Erro ao aprovar o agendamento.");
    }
  };

  const handleRejeitar = async (id: string, obs: string = "Rejeitado pela regulação central da UBS.") => {
    try {
      await agendamentoRepository.atualizarStatus(id, "cancelado", obs, reguladorNome, obs);
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

  const obterHistoricoPaciente = (pacienteId: string) => {
    return agendamentos.filter(a => a.pacienteId === pacienteId && a.id !== solicitacaoDetalhada?.id);
  };

  const obterSolicitacoesFiltradasEOrdenadas = () => {
    let result = [...pendentes];

    // Filtro por UBS
    if (filtroUbs !== "todas") {
      result = result.filter((a) => a.ubsId === filtroUbs);
    }
    // Filtro por Especialidade
    if (filtroEspecialidade !== "todas") {
      result = result.filter((a) => a.especialidade === filtroEspecialidade);
    }
    // Filtro por Prioridade
    if (filtroPrioridade !== "todas") {
      result = result.filter((a) => a.prioridade === filtroPrioridade);
    }
    // Filtro por Período
    if (filtroDataInicio) {
      result = result.filter((a) => a.data >= filtroDataInicio);
    }
    if (filtroDataFim) {
      result = result.filter((a) => a.data <= filtroDataFim);
    }

    // Ordenações
    result.sort((a, b) => {
      if (ordenacao === "dataAsc") {
        return new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime();
      }
      if (ordenacao === "dataDesc") {
        return new Date(`${b.data}T${b.horario}`).getTime() - new Date(`${a.data}T${a.horario}`).getTime();
      }
      if (ordenacao === "especialidade") {
        return a.especialidade.localeCompare(b.especialidade);
      }
      if (ordenacao === "prioridade") {
        const peso = { urgente: 3, preferencial: 2, normal: 1 };
        const pesoA = peso[a.prioridade || "normal"] || 1;
        const pesoB = peso[b.prioridade || "normal"] || 1;
        
        if (pesoB !== pesoA) {
          return pesoB - pesoA;
        }
        // Desempate por data de criação mais antiga (FIFO)
        return new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime();
      }
      return 0;
    });

    return result;
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
      </div>      {abaAtiva === "aprovações" && (
        <div className="space-y-6">
          
          {erroCarregamento ? (
            <Card className="border-destructive/30 bg-destructive/5 text-center p-8 space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto animate-bounce" />
              <div className="space-y-1">
                <h4 className="font-bold text-destructive">Erro de Conexão</h4>
                <p className="text-xs text-muted-foreground">Não foi possível carregar as solicitações pendentes da UBS central.</p>
              </div>
              <Button
                onClick={() => carregarDados()}
                className="font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
              >
                Tentar Novamente
              </Button>
            </Card>
          ) : (
            <>
              {/* Barra de Filtros e Ordenação R019 */}
              <Card className="border-border shadow-xs bg-card">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Info className="h-4.5 w-4.5 text-primary" />
                      Painel de Filtros e Triagem de Solicitações
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFiltroUbs("todas");
                        setFiltroEspecialidade("todas");
                        setFiltroPrioridade("todas");
                        setFiltroDataInicio("");
                        setFiltroDataFim("");
                        setOrdenacao("prioridade");
                      }}
                      className="h-7 px-2 text-[10px] font-bold text-primary cursor-pointer hover:bg-primary/5 rounded-lg"
                    >
                      Limpar Filtros
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {/* Unidade Básica */}
                    <div className="space-y-1">
                      <label className="font-bold text-muted-foreground uppercase text-[10px]">Unidade (UBS)</label>
                      <select
                        value={filtroUbs}
                        onChange={(e) => setFiltroUbs(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2.5 outline-none font-medium text-foreground cursor-pointer"
                      >
                        <option value="todas">Todas as UBSs</option>
                        {todasUbs.map(u => (
                          <option key={u.id} value={u.id}>{u.nome}</option>
                        ))}
                      </select>
                    </div>

                    {/* Especialidade */}
                    <div className="space-y-1">
                      <label className="font-bold text-muted-foreground uppercase text-[10px]">Especialidade</label>
                      <select
                        value={filtroEspecialidade}
                        onChange={(e) => setFiltroEspecialidade(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2.5 outline-none font-medium text-foreground cursor-pointer"
                      >
                        <option value="todas">Todas as especialidades</option>
                        <option value="Cardiologia">Cardiologia</option>
                        <option value="Clínico Geral">Clínico Geral</option>
                        <option value="Pediatria">Pediatria</option>
                        <option value="Ginecologia e Obstetrícia">Ginecologia e Obstetrícia</option>
                        <option value="Odontologia Geral">Odontologia Geral</option>
                      </select>
                    </div>

                    {/* Prioridade */}
                    <div className="space-y-1">
                      <label className="font-bold text-muted-foreground uppercase text-[10px]">Prioridade</label>
                      <select
                        value={filtroPrioridade}
                        onChange={(e) => setFiltroPrioridade(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2.5 outline-none font-medium text-foreground cursor-pointer"
                      >
                        <option value="todas">Todas as prioridades</option>
                        <option value="normal">Normal (Eletiva)</option>
                        <option value="preferencial">Preferencial</option>
                        <option value="urgente">Urgência</option>
                      </select>
                    </div>

                    {/* Data Início */}
                    <div className="space-y-1">
                      <label className="font-bold text-muted-foreground uppercase text-[10px]">Data Inicial</label>
                      <input
                        type="date"
                        value={filtroDataInicio}
                        onChange={(e) => setFiltroDataInicio(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2.5 outline-none font-medium text-foreground cursor-pointer"
                      />
                    </div>

                    {/* Data Fim */}
                    <div className="space-y-1">
                      <label className="font-bold text-muted-foreground uppercase text-[10px]">Data Final</label>
                      <input
                        type="date"
                        value={filtroDataFim}
                        onChange={(e) => setFiltroDataFim(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2.5 outline-none font-medium text-foreground cursor-pointer"
                      />
                    </div>

                    {/* Ordenação */}
                    <div className="space-y-1">
                      <label className="font-bold text-muted-foreground uppercase text-[10px]">Ordenar por</label>
                      <select
                        value={ordenacao}
                        onChange={(e) => setOrdenacao(e.target.value as any)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2.5 outline-none font-bold text-primary cursor-pointer"
                      >
                        <option value="prioridade">Gravidade: Urgentes Primeiro</option>
                        <option value="dataAsc">Data: Mais antigos (FIFO)</option>
                        <option value="dataDesc">Data: Mais recentes</option>
                        <option value="especialidade">Especialidade (A-Z)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Solicitações Pendentes Triadas */}
              <section className="space-y-3.5">
                {(() => {
                  const filtrados = obterSolicitacoesFiltradasEOrdenadas();
                  return (
                    <>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4.5 w-4.5 text-primary" />
                          Filtrados / Aguardando Triagem ({filtrados.length})
                        </span>
                        {filtrados.length !== pendentes.length && (
                          <span className="text-[10px] text-muted-foreground lowercase">
                            (filtrado de {pendentes.length} no total)
                          </span>
                        )}
                      </h3>

                      {loading ? (
                        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Carregando solicitações...</div>
                      ) : filtrados.length > 0 ? (
                        <div className="space-y-4">
                          {filtrados.map((item) => {
                            const pac = obterPacienteDoAgendamento(item.pacienteId);
                            const isUrgente = item.prioridade === "urgente";
                            const isPreferencial = item.prioridade === "preferencial";
                            
                            return (
                              <Card
                                key={item.id}
                                className={`shadow-xs overflow-hidden border-l-4 transition-all ${
                                  isUrgente
                                    ? "border-l-red-500 bg-red-500/[0.01] border-red-500/20"
                                    : isPreferencial
                                      ? "border-l-amber-500 bg-amber-500/[0.01] border-amber-500/20"
                                      : "border-l-slate-400 border-border"
                                }`}
                              >
                                <CardHeader className="bg-muted/15 border-b p-4 flex flex-row items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 text-xs">
                                    <User className="h-4.5 w-4.5 text-primary" />
                                    <span className="font-bold text-foreground">{pac?.nomeCompleto || "Paciente SUS"}</span>
                                    
                                    {/* Badge da prioridade R019 */}
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      isUrgente
                                        ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                        : isPreferencial
                                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                          : "bg-slate-500/10 text-slate-600 border border-slate-500/20"
                                    }`}>
                                      {isUrgente && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                                      {item.prioridade || "normal"}
                                    </span>
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

                                  {/* Documentação de Encaminhamento Anexada (R018) */}
                                  <div className="pt-3 border-t border-dashed space-y-2">
                                    <span className="block text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                                      <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                                      Documentação Comprobatória Anexada
                                    </span>
           
                                    {item.documentos && item.documentos.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {item.documentos.map((doc) => {
                                          const isPdf = doc.tipo === "PDF";
                                          return (
                                            <div
                                              key={doc.id}
                                              className="p-2 border rounded-xl flex items-center justify-between gap-3 bg-card hover:bg-muted/10 transition-colors"
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                {isPdf ? (
                                                  <div className="h-9 w-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/10">
                                                    <FileText className="h-4.5 w-4.5" />
                                                  </div>
                                                ) : (
                                                  <img
                                                    src={doc.url}
                                                    alt={doc.nome}
                                                    className="h-9 w-9 rounded-lg object-cover border shrink-0 bg-muted"
                                                  />
                                                )}
                                                <div className="min-w-0 leading-tight">
                                                  <span className="block font-bold text-foreground truncate max-w-[120px]" title={doc.nome}>
                                                    {doc.nome}
                                                  </span>
                                                  <span className="block text-[9px] text-muted-foreground uppercase">
                                                    {doc.tipo} • {(doc.tamanho / (1024 * 1024)).toFixed(2)} MB
                                                  </span>
                                                </div>
                                              </div>
           
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setVisualizarDoc({ url: doc.url, nome: doc.nome, tipo: doc.tipo })}
                                                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg cursor-pointer shrink-0"
                                                title="Visualizar documento"
                                              >
                                                <Eye className="h-4.5 w-4.5" />
                                              </Button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-500/10 rounded-xl text-[11px] font-medium flex items-center gap-2">
                                        ⚠️ Nenhum documento foi anexado a esta solicitação.
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                                <CardFooter className="p-4 border-t justify-between gap-2 bg-muted/5 flex-wrap">
                                  {/* Botão de Análise R019 */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSolicitacaoDetalhada(item);
                                      setDecisaoSel(null);
                                      setObservacoesAnalise("");
                                    }}
                                    className="h-8 text-xs font-bold text-primary border-primary/20 hover:bg-primary/5 cursor-pointer gap-1.5"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Análise Completa / Ficha
                                  </Button>
 
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSolicitacaoDetalhada(item);
                                        setDecisaoSel('rejeitar');
                                        setObservacoesAnalise("");
                                      }}
                                      className="h-8 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/10 cursor-pointer gap-1"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Recusar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSolicitacaoDetalhada(item);
                                        setDecisaoSel('aprovar');
                                        setObservacoesAnalise("");
                                      }}
                                      className="h-8 text-xs font-semibold cursor-pointer gap-1"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Aprovar Vaga
                                    </Button>
                                  </div>
                                </CardFooter>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg bg-card/50">
                          Nenhuma solicitação atende aos critérios dos filtros aplicados.
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>
            </>
          )}

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
                            <p className="text-[9px] text-muted-foreground mt-1">
                              Regulado por: <span className="font-bold text-foreground">{item.reguladorNome || "Regulador"}</span> em {item.dataRegulacao ? formatarDataBr(item.dataRegulacao) : ""} às {item.horarioRegulacao || ""}
                            </p>
                            {item.observacaoRegulacao && (
                              <p className="text-[10px] p-2 bg-muted/40 border rounded-lg text-foreground italic mt-1.5 leading-relaxed max-w-xl">
                                Parecer: "{item.observacaoRegulacao}"
                              </p>
                            )}
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


      {/* Ficha de Análise Detalhada da Solicitação R019 */}
      <Dialog open={!!solicitacaoDetalhada} onOpenChange={() => setSolicitacaoDetalhada(null)}>
        <DialogContent className="max-w-3xl rounded-2xl p-6 border bg-card scrollbar-thin overflow-y-auto max-h-[90vh]">
          {(() => {
            if (!solicitacaoDetalhada) return null;
            const pac = obterPacienteDoAgendamento(solicitacaoDetalhada.pacienteId);
            const isUrgente = solicitacaoDetalhada.prioridade === "urgente";
            const isPreferencial = solicitacaoDetalhada.prioridade === "preferencial";
            const historico = obterHistoricoPaciente(solicitacaoDetalhada.pacienteId);
            
            return (
              <>
                <DialogHeader className="text-left border-b pb-4 mb-4">
                  <div className="flex items-center gap-2 flex-wrap justify-between">
                    <DialogTitle className="text-base font-bold text-foreground">
                      Ficha Médica de Triagem & Regulação
                    </DialogTitle>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isUrgente
                        ? "bg-red-500/10 text-red-600 border border-red-500/20"
                        : isPreferencial
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          : "bg-slate-500/10 text-slate-600 border border-slate-500/20"
                    }`}>
                      {isUrgente && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                      Prioridade: {solicitacaoDetalhada.prioridade || "normal"}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Analise os dados cadastrais, histórico e documentos anexados antes de aprovar.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 text-xs">
                  {/* Ficha Cadastral do Paciente */}
                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-bold text-primary tracking-wider">
                      1. Informações Pessoais do Paciente
                    </span>
                    <div className="p-3 bg-muted/30 border rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 leading-relaxed">
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">Nome Completo</span>
                        <span className="font-bold text-foreground">{pac?.nomeCompleto || "Não informado"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">CPF</span>
                        <span className="font-bold text-foreground">{pac ? formatarCPF(pac.cpf) : "Não informado"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">CNS (Cartão SUS)</span>
                        <span className="font-bold text-foreground">{pac ? formatarCNS(pac.cns) : "Não informado"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">Contato / Telefone</span>
                        <span className="font-semibold text-foreground">{pac ? formatarTelefone(pac.telefone) : "Não informado"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">E-mail</span>
                        <span className="font-semibold text-foreground">{pac?.email || "Não informado"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">UBS de Vínculo</span>
                        <span className="font-semibold text-foreground">{solicitacaoDetalhada.ubsNome}</span>
                      </div>
                      {pac?.endereco && (
                        <div className="col-span-1 sm:col-span-2 md:col-span-3">
                          <span className="block text-[9px] text-muted-foreground uppercase">Endereço Residencial</span>
                          <span className="font-medium text-foreground">
                            {pac.endereco.logradouro}, {pac.endereco.numero} - {pac.endereco.bairro} ({formatarCEP(pac.endereco.cep)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dados da Consulta Solicitada */}
                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-bold text-primary tracking-wider">
                      2. Detalhes da Solicitação Atual
                    </span>
                    <div className="p-3 bg-muted/30 border rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 leading-relaxed">
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">Tipo e Especialidade</span>
                        <span className="font-bold text-foreground capitalize">{solicitacaoDetalhada.tipo} de {solicitacaoDetalhada.especialidade}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">Profissional Solicitado</span>
                        <span className="font-bold text-foreground">{solicitacaoDetalhada.profissionalNome}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">Data e Horário</span>
                        <span className="font-bold text-primary">{formatarDataBr(solicitacaoDetalhada.data)} às {solicitacaoDetalhada.horario}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase">Data de Entrada na Fila</span>
                        <span className="font-semibold text-foreground">{formatarDataBr(solicitacaoDetalhada.dataCriacao.split("T")[0])} às {solicitacaoDetalhada.dataCriacao.split("T")[1]?.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Documentos Anexados */}
                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-bold text-primary tracking-wider">
                      3. Documentos e Comprovantes de Triagem ({solicitacaoDetalhada.documentos?.length || 0})
                    </span>
                    {solicitacaoDetalhada.documentos && solicitacaoDetalhada.documentos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {solicitacaoDetalhada.documentos.map((doc) => {
                          const isPdf = doc.tipo === "PDF";
                          return (
                            <div
                              key={doc.id}
                              className="p-2.5 border rounded-xl flex items-center justify-between gap-3 bg-card hover:bg-muted/10 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isPdf ? (
                                  <div className="h-9 w-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/10">
                                    <FileText className="h-4.5 w-4.5" />
                                  </div>
                                ) : (
                                  <img
                                    src={doc.url}
                                    alt={doc.nome}
                                    className="h-9 w-9 rounded-lg object-cover border shrink-0 bg-muted"
                                  />
                                )}
                                <div className="min-w-0 leading-tight">
                                  <span className="block font-bold text-foreground truncate max-w-[150px]" title={doc.nome}>
                                    {doc.nome}
                                  </span>
                                  <span className="block text-[9px] text-muted-foreground uppercase">
                                    {doc.tipo} • {(doc.tamanho / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setVisualizarDoc({ url: doc.url, nome: doc.nome, tipo: doc.tipo })}
                                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg cursor-pointer shrink-0"
                                title="Visualizar documento"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-500/10 rounded-xl text-[11px] font-medium flex items-center gap-2">
                        ⚠️ Atenção: Paciente não anexou nenhum documento comprobatório.
                      </div>
                    )}
                  </div>

                  {/* Histórico do Paciente na Rede */}
                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-bold text-primary tracking-wider">
                      4. Histórico Clínico de Agendamentos / Solicitações
                    </span>
                    <div className="border rounded-xl bg-card overflow-hidden max-h-48 overflow-y-auto">
                      {historico.length > 0 ? (
                        <div className="divide-y divide-border">
                          {historico.map((hDoc) => {
                            const statusTraduzido = {
                              solicitado: "Aguardando Regulação",
                              agendado: "Agendado",
                              cancelado: "Cancelado",
                              realizado: "Atendido",
                              ausente: "Falta/Ausente"
                            }[hDoc.status] || hDoc.status;

                            return (
                              <div key={hDoc.id} className="p-2.5 flex items-center justify-between text-[11px] gap-2 hover:bg-muted/10 transition-colors">
                                <div className="leading-tight">
                                  <span className="font-bold text-foreground capitalize block">{hDoc.tipo} de {hDoc.especialidade}</span>
                                  <span className="text-[9px] text-muted-foreground block mt-0.5">
                                    Profissional: {hDoc.profissionalNome} • Unidade: {hDoc.ubsNome}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-semibold text-foreground block">{formatarDataBr(hDoc.data)} às {hDoc.horario}</span>
                                  <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase mt-1 ${
                                    hDoc.status === "realizado"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : hDoc.status === "agendado"
                                        ? "bg-sky-500/10 text-sky-600"
                                        : hDoc.status === "cancelado"
                                          ? "bg-red-500/10 text-red-600"
                                          : "bg-slate-500/10 text-slate-600"
                                  }`}>
                                    {statusTraduzido}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-muted-foreground text-[11px]">
                          Este paciente não possui outras solicitações no histórico.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form de Parecer R020 */}
                <div className="space-y-3.5 pt-4 border-t border-dashed">
                  <span className="block text-[10px] uppercase font-bold text-primary tracking-wider">
                    5. Parecer Técnico & Decisão da Regulação
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecisaoSel('aprovar')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        decisaoSel === 'aprovar'
                          ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 text-emerald-600'
                          : 'border-border bg-card hover:bg-muted/10 text-foreground'
                      }`}
                    >
                      <Check className="h-4.5 w-4.5" />
                      <span className="text-xs font-bold">Homologar / Aprovar Vaga</span>
                      <span className="text-[9px] text-muted-foreground leading-tight">Documentação em conformidade</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisaoSel('rejeitar')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        decisaoSel === 'rejeitar'
                          ? 'border-destructive bg-destructive/5 ring-1 ring-destructive text-destructive'
                          : 'border-border bg-card hover:bg-muted/10 text-foreground'
                      }`}
                    >
                      <X className="h-4.5 w-4.5" />
                      <span className="text-xs font-bold">Recusar / Rejeitar Solicitação</span>
                      <span className="text-[9px] text-muted-foreground leading-tight">Documento inválido ou ausente</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Justificativa Parecer Técnico {decisaoSel === 'rejeitar' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={observacoesAnalise}
                      onChange={(e) => setObservacoesAnalise(e.target.value)}
                      placeholder={
                        decisaoSel === 'rejeitar'
                          ? "Descreva detalhadamente o motivo da inconsistência ou falta de encaminhamento (obrigatório)..."
                          : "Observações adicionais do parecer de homologação (opcional)..."
                      }
                      className="w-full min-h-[75px] max-h-[120px] rounded-xl border border-border bg-background p-3 outline-none text-xs text-foreground resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4 mt-6 gap-3 flex-wrap">
                  <Button
                    onClick={() => {
                      setSolicitacaoDetalhada(null);
                      setDecisaoSel(null);
                      setObservacoesAnalise("");
                    }}
                    variant="ghost"
                    className="text-xs h-10 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </Button>

                  <Button
                    onClick={async () => {
                      if (!decisaoSel) {
                        toast.error("Por favor, selecione uma decisão (Aprovar ou Recusar) para concluir a análise.");
                        return;
                      }
                      if (decisaoSel === 'rejeitar' && !observacoesAnalise.trim()) {
                        toast.error("Para recusar a solicitação, é obrigatório registrar a justificativa.");
                        return;
                      }

                      try {
                        if (decisaoSel === 'aprovar') {
                          await handleAprovar(solicitacaoDetalhada.id, observacoesAnalise);
                        } else {
                          await handleRejeitar(solicitacaoDetalhada.id, observacoesAnalise);
                        }
                        setSolicitacaoDetalhada(null);
                        setDecisaoSel(null);
                        setObservacoesAnalise("");
                      } catch (e) {
                        toast.error("Erro ao salvar o parecer técnico.");
                      }
                    }}
                    className="text-xs h-10 rounded-xl cursor-pointer gap-1.5 font-bold px-6"
                  >
                    <Check className="h-4 w-4" />
                    Registrar Parecer & Concluir
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Lightbox de Visualização de Documentos R018 */}
      <Dialog open={!!visualizarDoc} onOpenChange={() => setVisualizarDoc(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-5 border bg-card">
          <DialogHeader className="text-left border-b pb-3 mb-3">
            <DialogTitle className="text-base font-bold text-foreground truncate" title={visualizarDoc?.nome}>
              {visualizarDoc?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Visualização de documento comprobatório anexado pelo paciente.
            </DialogDescription>
          </DialogHeader>
 
          <div className="flex items-center justify-center p-2 bg-muted/20 border rounded-xl overflow-hidden min-h-[300px]">
            {visualizarDoc?.tipo === "PDF" ? (
              <div className="text-center space-y-4 p-8">
                <FileText className="h-16 w-16 text-red-500 mx-auto" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">Documento PDF anexado</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Como este é um ambiente local simulado, você pode baixar o arquivo original ou abri-lo localmente.
                  </p>
                </div>
                <a
                  href={visualizarDoc.url}
                  download={visualizarDoc.nome}
                  className="inline-flex items-center gap-2 h-10 px-5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  Download / Abrir PDF
                </a>
              </div>
            ) : (
              <img
                src={visualizarDoc?.url}
                alt={visualizarDoc?.nome}
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-xs"
              />
            )}
          </div>
 
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setVisualizarDoc(null)}
              className="text-xs h-10 rounded-xl cursor-pointer"
            >
              Fechar Visualização
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
