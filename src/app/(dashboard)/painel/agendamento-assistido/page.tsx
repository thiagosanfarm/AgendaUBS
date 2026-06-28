"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { MockProfissionalRepository } from "@/infra/api/repositories/MockProfissionalRepository";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { CriarAgendamento } from "@/core/use-cases/CriarAgendamento";
import { Paciente } from "@/core/domain/entities/Paciente";
import { UBS } from "@/core/domain/entities/UBS";
import { Profissional } from "@/core/domain/entities/Profissional";
import { formatarDataBr, formatarCPF, formatarCNS, formatarCEP, formatarTelefone } from "@/utils/formatters";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  User, 
  CreditCard, 
  Phone, 
  Building, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  Check,
  Printer,
  CalendarCheck,
  Clock,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const pacienteRepository = new LocalStoragePacienteRepository();
const ubsRepository = new MockUbsRepository();
const profissionalRepository = new MockProfissionalRepository();
const agendamentoRepository = new LocalStorageAgendamentoRepository();
const criarAgendamentoUseCase = new CriarAgendamento(agendamentoRepository);

const ESPECIALIDADES_SUGERIDAS = [
  "Clínico Geral",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Cardiologia",
  "Dermatologia",
  "Odontologia Geral",
  "Consulta de Enfermagem",
  "Psicologia Clínica"
];

export default function AgendamentoAssistidoPage() {
  const router = useRouter();
  const { paciente: usuarioLogadoPaciente, profissional: usuarioLogadoProfissional } = useAuth();

  // Controle de permissão: Apenas administradores ou profissionais podem fazer agendamento assistido (R014)
  const isAcs = usuarioLogadoProfissional?.especialidade === "Agente Comunitário de Saúde";
  const isAdmin = usuarioLogadoPaciente?.papel === "administrador";
  const autorizado = isAdmin || usuarioLogadoProfissional !== null;

  const reguladorNome = usuarioLogadoProfissional?.nome || usuarioLogadoPaciente?.nomeCompleto || "Regulador de Saúde";
  const reguladorId = usuarioLogadoProfissional?.id || usuarioLogadoPaciente?.id || "reg-1";

  // Estados de busca
  const [busca, setBusca] = useState("");
  const [pacientesFiltrados, setPacientesFiltrados] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);

  // Estados de agendamento (unificado)
  const [ubs, setUbs] = useState<UBS | null>(null);
  const [especialidade, setEspecialidade] = useState("Cardiologia");
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [dataSel, setDataSel] = useState("2026-04-11");
  const [horarioSel, setHorarioSel] = useState("09:00");
  
  // Estado de navegação do calendário
  const [dataNavegacao, setDataNavegacao] = useState(new Date(2026, 3, 1)); // Abril de 2026

  // Listas locais
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>(["09:00", "10:00", "11:00"]);

  // Estados de controle e UX
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState(false);
  const [revisaoAberta, setRevisaoAberta] = useState(false);
  const [comprovanteAtivo, setComprovanteAtivo] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Carrega UBSs
  useEffect(() => {
    ubsRepository.listarTodas().then(setTodasUbs);
  }, []);

  // 2. Filtra pacientes com base na busca
  const handleBuscarPaciente = async () => {
    if (!busca.trim()) {
      toast.warning("Por favor, digite o nome ou CPF para buscar.");
      return;
    }
    const clean = busca.toLowerCase().trim();
    try {
      const lista = await pacienteRepository.listarTodos();
      const filtrados = lista.filter(p => {
        const bateNome = p.nomeCompleto.toLowerCase().includes(clean);
        const bateCpf = p.cpf.replace(/\D/g, "").includes(clean.replace(/\D/g, ""));
        const bateCns = p.cns && p.cns.includes(clean);
        return bateNome || bateCpf || bateCns;
      });
      setPacientesFiltrados(filtrados);
      if (filtrados.length === 0) {
        toast.info("Nenhum paciente localizado com estes termos.");
      }
    } catch (err) {
      toast.error("Erro ao buscar pacientes.");
    }
  };

  // 3. Ao selecionar um paciente
  const handleSelecionarPaciente = (p: Paciente) => {
    setPacienteSelecionado(p);
    setPacientesFiltrados([]);
    setBusca("");
    
    // Vincula reativamente à UBS do paciente
    if (p.ubsId) {
      const u = todasUbs.find(u => u.id === p.ubsId);
      if (u) setUbs(u);
    } else if (todasUbs.length > 0) {
      setUbs(todasUbs[0]);
    }
  };

  // 4. Carrega profissionais da especialidade daquela UBS
  useEffect(() => {
    if (ubs && especialidade) {
      profissionalRepository
        .listarPorUbsEEspecialidade(ubs.id, especialidade)
        .then(list => {
          setProfissionais(list);
          if (list.length > 0) {
            setProfissional(list[0]);
          } else {
            setProfissional(null);
          }
        });
    }
  }, [ubs, especialidade]);

  // 5. Carrega horários disponíveis
  useEffect(() => {
    if (ubs && profissional && dataSel) {
      setLoadingHorarios(true);
      setErroHorarios(false);
      agendamentoRepository
        .obterHorariosDisponiveis(ubs.id, profissional.id, dataSel)
        .then(slots => {
          setHorariosDisponiveis(slots);
          if (slots.length > 0) {
            if (!slots.includes(horarioSel)) {
              setHorarioSel(slots[0]);
            }
          } else {
            setHorarioSel("");
          }
        })
        .catch(() => setErroHorarios(true))
        .finally(() => setLoadingHorarios(false));
    }
  }, [ubs, profissional, dataSel]);

  // Navegação do calendário
  const anteriorMes = () => {
    setDataNavegacao(new Date(dataNavegacao.getFullYear(), dataNavegacao.getMonth() - 1, 1));
  };
  const proximoMes = () => {
    setDataNavegacao(new Date(dataNavegacao.getFullYear(), dataNavegacao.getMonth() + 1, 1));
  };

  const anoNav = dataNavegacao.getFullYear();
  const mesNav = dataNavegacao.getMonth();
  const totalDiasMes = new Date(anoNav, mesNav + 1, 0).getDate();
  let diaSemanaInicial = new Date(anoNav, mesNav, 1).getDay();
  diaSemanaInicial = diaSemanaInicial === 0 ? 6 : diaSemanaInicial - 1;
  const nomeMesNav = dataNavegacao.toLocaleDateString("pt-BR", { month: "long" });
  const hojeFormatado = new Date().toISOString().split("T")[0];

  const handleConfirmarAgendamento = async () => {
    if (!pacienteSelecionado || !ubs || !profissional || !dataSel || !horarioSel) {
      toast.error("Por favor, preencha todos os dados.");
      return;
    }

    setIsSubmitting(true);
    try {
      const agendado = await criarAgendamentoUseCase.executar({
        pacienteId: pacienteSelecionado.id,
        ubsId: ubs.id,
        ubsNome: ubs.nome,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        data: dataSel,
        horario: horarioSel,
        tipo: "consulta",
        especialidade,
        observacoes: `Agendamento assistido realizado por: ${reguladorNome}`,
        reguladorId,
        reguladorNome
      });

      toast.success(`Consulta agendada para ${pacienteSelecionado.nomeCompleto}!`);
      
      // Armazena os dados para exibição e impressão do comprovante (R014)
      setComprovanteAtivo({
        id: agendado.id,
        pacienteNome: pacienteSelecionado.nomeCompleto,
        pacienteCpf: pacienteSelecionado.cpf,
        pacienteCns: pacienteSelecionado.cns,
        especialidade,
        profissionalNome: profissional.nome,
        ubsNome: ubs.nome,
        ubsEndereco: `${ubs.endereco.logradouro}, nº ${ubs.endereco.numero} - ${ubs.endereco.bairro}`,
        data: dataSel,
        horario: horarioSel,
        reguladorNome,
        dataOperacao: new Date().toLocaleString("pt-BR")
      });

      setRevisaoAberta(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar consulta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImprimirComprovante = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (!usuarioLogadoPaciente && !usuarioLogadoProfissional) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Barreira de Privilégios (R014)
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
                Esta funcionalidade é restrita para **Gestores, Reguladores** e profissionais autorizados da unidade de saúde.
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
    <div className="max-w-xl mx-auto space-y-6 px-2 sm:px-0 animate-in fade-in duration-300">
      
      {/* Top Header */}
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
        <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Agendamento Assistido (Regulação)
        </span>
      </div>

      {/* Comprovante de Sucesso (Exibição Premium) R014 */}
      {comprovanteAtivo && (
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-md overflow-hidden print:border-none print:shadow-none print:bg-white animate-in zoom-in-95 duration-200">
          <CardHeader className="bg-emerald-500/10 border-b p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-emerald-800 flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                Agendamento Confirmado!
              </CardTitle>
              <CardDescription className="text-xs text-emerald-700">
                O agendamento assistido foi registrado com sucesso.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleImprimirComprovante}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 print:hidden"
            >
              <Printer className="h-4 w-4" />
              Imprimir Comprovante
            </Button>
          </CardHeader>
          
          <CardContent className="p-6 space-y-5 text-xs">
            <div className="border border-emerald-500/20 rounded-xl p-4 bg-white/50 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-[10px] uppercase text-emerald-800">Protocolo</span>
                <span className="font-mono font-bold text-foreground text-sm">{comprovanteAtivo.id}</span>
              </div>

              {/* Dados Paciente */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-muted-foreground">Paciente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground font-semibold">
                  <div>Nome: <span className="font-medium">{comprovanteAtivo.pacienteNome}</span></div>
                  <div>CPF: <span className="font-medium">{formatarCPF(comprovanteAtivo.pacienteCpf)}</span></div>
                  {comprovanteAtivo.pacienteCns && (
                    <div className="sm:col-span-2">CNS: <span className="font-medium">{formatarCNS(comprovanteAtivo.pacienteCns)}</span></div>
                  )}
                </div>
              </div>

              {/* Dados Atendimento */}
              <div className="space-y-2 border-t pt-2.5">
                <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-muted-foreground">Consulta de Saúde</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground font-semibold">
                  <div>Especialidade: <span className="font-medium">{comprovanteAtivo.especialidade}</span></div>
                  <div>Profissional: <span className="font-medium">{comprovanteAtivo.profissionalNome}</span></div>
                  <div className="sm:col-span-2">Local: <span className="font-medium">{comprovanteAtivo.ubsNome}</span></div>
                  <div className="sm:col-span-2 text-muted-foreground font-medium text-[10px] -mt-1">{comprovanteAtivo.ubsEndereco}</div>
                </div>
              </div>

              {/* Data/Horário */}
              <div className="space-y-1 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/15">
                <span className="block text-[8px] uppercase tracking-wider font-extrabold text-emerald-800">Dia e Horário</span>
                <span className="block text-sm font-bold text-emerald-900">
                  {formatarDataBr(comprovanteAtivo.data)} às {comprovanteAtivo.horario}
                </span>
              </div>

              {/* Rastreabilidade regulador */}
              <div className="border-t pt-2 text-[9px] text-muted-foreground font-semibold flex justify-between">
                <span>Efetuado por: {comprovanteAtivo.reguladorNome}</span>
                <span>Operação: {comprovanteAtivo.dataOperacao}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-4 border-t justify-center print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setComprovanteAtivo(null);
                setPacienteSelecionado(null);
              }}
              className="text-xs font-semibold cursor-pointer"
            >
              Realizar Novo Agendamento Assistido
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Busca e Identificação do Paciente (Se nenhum estiver selecionado) */}
      {!comprovanteAtivo && !pacienteSelecionado && (
        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-primary" />
              Localizar Paciente no Sistema
            </CardTitle>
            <CardDescription className="text-xs">
              Busque o paciente utilizando o Nome Completo, CPF ou número de CNS (Cartão SUS).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite nome ou documento do paciente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarPaciente()}
                  className="pl-9 text-xs h-10"
                />
              </div>
              <Button onClick={handleBuscarPaciente} className="h-10 text-xs font-semibold cursor-pointer shrink-0">
                Buscar
              </Button>
            </div>

            {/* Resultado da Busca */}
            {pacientesFiltrados.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <span className="block text-[10px] font-bold uppercase text-muted-foreground">Pacientes Localizados:</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pacientesFiltrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelecionarPaciente(p)}
                      className="w-full text-left p-3 border rounded-xl hover:bg-muted/40 transition flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">{p.nomeCompleto}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          CPF: {formatarCPF(p.cpf)} • CNS: {formatarCNS(p.cns)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulário de Agendamento (Caso paciente esteja selecionado) */}
      {!comprovanteAtivo && pacienteSelecionado && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Card de Identificação Básica R014 */}
          <Card className="border-sky-100 bg-sky-500/5 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {pacienteSelecionado.nomeCompleto.split(" ").slice(0,2).map(n => n[0]).join("")}
                </div>
                <div>
                  <span className="block font-bold text-foreground">{pacienteSelecionado.nomeCompleto}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    CPF: {formatarCPF(pacienteSelecionado.cpf)} • CNS: {formatarCNS(pacienteSelecionado.cns)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPacienteSelecionado(null)}
                className="h-8 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Trocar Paciente
              </Button>
            </CardContent>
          </Card>

          {/* UBS de Cobertura */}
          {ubs && (
            <div className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between gap-3 shadow-xs text-xs">
              <div className="flex items-center gap-2.5">
                <Building className="h-4.5 w-4.5 text-primary" />
                <div className="space-y-0.5">
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-none">Unidade de Saúde do Paciente</span>
                  <span className="block font-bold text-foreground leading-tight">{ubs.nome}</span>
                </div>
              </div>
              
              <select
                value={ubs.id}
                onChange={(e) => {
                  const selecionada = todasUbs.find(u => u.id === e.target.value);
                  if (selecionada) setUbs(selecionada);
                }}
                className="text-[10px] font-bold text-primary bg-muted px-2 py-1 rounded-md border-none outline-none cursor-pointer"
              >
                {todasUbs.map(u => (
                  <option key={u.id} value={u.id}>Alterar UBS</option>
                ))}
              </select>
            </div>
          )}

          {/* Select Especialidade */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Especialidade</label>
            <div className="relative">
              <select
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                className="w-full h-11 rounded-xl border border-sky-100 bg-white dark:bg-slate-900 px-3.5 text-xs outline-none focus:border-primary font-medium text-foreground cursor-pointer appearance-none shadow-xs"
              >
                {ESPECIALIDADES_SUGERIDAS.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-3.5 pointer-events-none text-muted-foreground">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Select Profissional */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Profissional disponível</label>
            <div className="relative">
              <select
                value={profissional?.id || ""}
                onChange={(e) => {
                  const p = profissionais.find(p => p.id === e.target.value);
                  if (p) setProfissional(p);
                }}
                disabled={profissionais.length === 0}
                className="w-full h-11 rounded-xl border border-sky-100 bg-white dark:bg-slate-900 px-3.5 text-xs outline-none focus:border-primary font-medium text-foreground cursor-pointer appearance-none disabled:bg-muted/40 shadow-xs"
              >
                {profissionais.length > 0 ? (
                  profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))
                ) : (
                  <option value="">Não há profissionais nesta UBS</option>
                )}
              </select>
              <div className="absolute right-3.5 top-3.5 pointer-events-none text-muted-foreground">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Calendário SUS */}
          <Card className="border border-sky-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between text-foreground">
                <button onClick={anteriorMes} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <ChevronLeft className="h-4.5 w-4.5 text-primary stroke-[2.5]" />
                </button>
                <span className="font-heading font-extrabold text-sm capitalize">
                  {nomeMesNav} {anoNav}
                </span>
                <button onClick={proximoMes} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <ChevronRight className="h-4.5 w-4.5 text-primary stroke-[2.5]" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
              </div>

              <div className="grid grid-cols-7 gap-y-2 gap-x-1.5 text-center text-xs font-semibold">
                {Array.from({ length: diaSemanaInicial }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-8 w-8" />
                ))}
                {Array.from({ length: totalDiasMes }, (_, i) => i + 1).map((dia) => {
                  const dataBotao = `${anoNav}-${String(mesNav + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                  const isSelected = dataSel === dataBotao;
                  const noPassado = dataBotao < hojeFormatado;
                  const ehDiaDestacado = dia === 24 && mesNav === 3 && anoNav === 2026;

                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => !noPassado && setDataSel(dataBotao)}
                      disabled={noPassado}
                      className={`h-8 w-8 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white font-extrabold shadow-sm scale-110"
                          : ehDiaDestacado
                            ? "bg-sky-200 text-sky-950 font-bold dark:bg-sky-950/60 dark:text-sky-300"
                            : noPassado
                              ? "text-muted-foreground/30 line-through cursor-not-allowed"
                              : "text-foreground hover:bg-sky-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Horários */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block font-heading">Horários Disponíveis</span>
            {loadingHorarios ? (
              <div className="flex gap-2 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 w-24 bg-muted rounded-xl" />)}
              </div>
            ) : erroHorarios ? (
              <div className="p-3 rounded-xl bg-destructive/5 border text-center text-xs text-destructive">
                Erro ao obter horários.
              </div>
            ) : horariosDisponiveis.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none select-none">
                {horariosDisponiveis.map((h) => {
                  const isSelected = horarioSel === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorarioSel(h)}
                      className={`h-10 px-6 rounded-xl border text-xs font-bold tracking-wider transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                          : "border-sky-100 bg-white dark:bg-slate-900 text-primary dark:text-sky-400 hover:bg-sky-50/50"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 bg-amber-500/10 text-amber-800 border border-amber-500/20 rounded-xl text-xs">
                Sem vagas disponíveis na data selecionada.
              </div>
            )}
          </div>

          <Button
            onClick={() => setRevisaoAberta(true)}
            disabled={!dataSel || !horarioSel || !profissional}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-primary/10 mt-6"
          >
            Confirmar e Revisar Agendamento
          </Button>

        </div>
      )}

      {/* Modal de Revisão do Regulador (R014) */}
      <Dialog open={revisaoAberta} onOpenChange={setRevisaoAberta}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl p-5 border">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Revisar Agendamento Assistido
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Confirme os dados da consulta abaixo antes de efetuar o agendamento em nome do paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/40 rounded-xl text-xs space-y-3 border border-border">
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Paciente</span>
              <span className="block text-foreground font-semibold">{pacienteSelecionado?.nomeCompleto}</span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Especialidade</span>
              <span className="block text-foreground font-semibold">{especialidade}</span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Profissional</span>
              <span className="block text-foreground font-semibold">{profissional?.nome}</span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Unidade de Saúde</span>
              <span className="block text-foreground font-semibold">{ubs?.nome}</span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Data e Horário</span>
              <span className="block text-primary font-bold">{formatarDataBr(dataSel)} às {horarioSel}</span>
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevisaoAberta(false)}
              className="flex-1 text-xs font-semibold cursor-pointer h-10 rounded-xl"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarAgendamento}
              disabled={isSubmitting}
              className="flex-1 text-xs font-bold cursor-pointer h-10 rounded-xl"
            >
              {isSubmitting ? "Gravando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
