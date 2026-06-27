"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { MockProfissionalRepository } from "@/infra/api/repositories/MockProfissionalRepository";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { CriarAgendamento } from "@/core/use-cases/CriarAgendamento";
import { UBS } from "@/core/domain/entities/UBS";
import { Profissional } from "@/core/domain/entities/Profissional";
import { TipoAgendamento } from "@/core/domain/entities/Agendamento";
import { obterProximosDias, obterNomeDiaSemana, obterDataPorExtenso } from "@/utils/date-helpers";
import { formatarDataBr } from "@/utils/formatters";
import { toast } from "sonner";
import { 
  Building, 
  Search, 
  Stethoscope, 
  CalendarCheck, 
  Clock, 
  User, 
  Activity, 
  ChevronRight, 
  ChevronLeft,
  Info,
  AlertTriangle,
  RefreshCw,
  Zap
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ubsRepository = new MockUbsRepository();
const profissionalRepository = new MockProfissionalRepository();
const agendamentoRepository = new LocalStorageAgendamentoRepository();
const criarAgendamentoUseCase = new CriarAgendamento(agendamentoRepository);

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const { paciente } = useAuth();
  
  // Controle de Etapa (1 a 4)
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de dados selecionados
  const [tipo, setTipo] = useState<TipoAgendamento>("consulta");
  const [ubs, setUbs] = useState<UBS | null>(null);
  const [especialidade, setEspecialidade] = useState("");
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [dataSel, setDataSel] = useState(""); // YYYY-MM-DD
  const [horarioSel, setHorarioSel] = useState(""); // HH:MM
  const [observacoes, setObservacoes] = useState("");

  // Listas de opções
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [ubsFiltradas, setUbsFiltradas] = useState<UBS[]>([]);
  const [termoBuscaUbs, setTermoBuscaUbs] = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);

  // Estados específicos para consulta de agenda reativa (R010)
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState(false);
  const [datasAlternativas, setDatasAlternativas] = useState<string[]>([]);
  const [buscandoAlternativas, setBuscandoAlternativas] = useState(false);

  // Datas disponíveis (próximos 14 dias úteis)
  const datasDisponiveis = obterProximosDias(14, false);

  // Carrega as UBSs inicialmente
  useEffect(() => {
    ubsRepository.listarTodas().then((list) => {
      setTodasUbs(list);
      setUbsFiltradas(list);
    });
  }, []);

  // Filtra as UBSs ao digitar (Etapa 1)
  useEffect(() => {
    const clean = termoBuscaUbs.toLowerCase();
    setUbsFiltradas(
      todasUbs.filter(
        u => u.nome.toLowerCase().includes(clean) || u.endereco.bairro.toLowerCase().includes(clean)
      )
    );
  }, [termoBuscaUbs, todasUbs]);

  // Carrega as especialidades quando a UBS é selecionada (Reativo)
  useEffect(() => {
    if (ubs) {
      profissionalRepository
        .listarEspecialidadesDisponiveis(ubs.id)
        .then((list) => {
          setEspecialidades(list);
          // Se a especialidade atual não pertence a essa UBS, limpa
          if (list.length > 0 && !list.includes(especialidade)) {
            setEspecialidade("");
            setProfissional(null);
            setDataSel("");
            setHorarioSel("");
          }
        });
    }
  }, [ubs]);

  // Carrega os profissionais quando a especialidade é selecionada (Reativo)
  useEffect(() => {
    if (ubs && especialidade) {
      profissionalRepository
        .listarPorUbsEEspecialidade(ubs.id, especialidade)
        .then((list) => {
          setProfissionais(list);
          // Se o profissional atual não pertence a essa lista, limpa
          if (profissional && !list.find(p => p.id === profissional.id)) {
            setProfissional(null);
            setDataSel("");
            setHorarioSel("");
          }
        });
    } else {
      setProfissionais([]);
      setProfissional(null);
    }
  }, [ubs, especialidade]);

  // Função para buscar datas próximas alternativas caso não haja vaga na data atual (R010)
  const buscarDatasAlternativas = async (ubsId: string, profId: string, dataAtual: string) => {
    setBuscandoAlternativas(true);
    setDatasAlternativas([]);
    try {
      const alternativas: string[] = [];
      const outrasDatas = datasDisponiveis.filter(d => d !== dataAtual);
      
      // Testa disponibilidade nas próximas 5 datas úteis da agenda
      for (const d of outrasDatas.slice(0, 5)) {
        const slots = await agendamentoRepository.obterHorariosDisponiveis(ubsId, profId, d);
        if (slots.length > 0) {
          alternativas.push(d);
          if (alternativas.length >= 3) break; // Recomenda até 3 datas alternativas
        }
      }
      setDatasAlternativas(alternativas);
    } catch (err) {
      console.error("Erro ao obter sugestões de data:", err);
    } finally {
      setBuscandoAlternativas(false);
    }
  };

  // Carrega horários disponíveis e simula tratamento de falha de conexão (R010)
  const obterHorariosDisponiveisAgenda = async (
    ubsId: string, 
    profId: string, 
    data: string,
    ignorarErroSimulado = false
  ) => {
    setLoadingHorarios(true);
    setErroHorarios(false);
    setDatasAlternativas([]);
    
    try {
      // Simula uma falha temporária com 15% de chance para cobrir o critério de erro de rede
      const simularErro = !ignorarErroSimulado && Math.random() < 0.15;
      if (simularErro) {
        throw new Error("Erro de comunicação ao carregar a agenda.");
      }

      const slots = await agendamentoRepository.obterHorariosDisponiveis(ubsId, profId, data);
      setHorariosDisponiveis(slots);

      if (slots.length === 0) {
        await buscarDatasAlternativas(ubsId, profId, data);
      }
    } catch (err) {
      console.error("Erro no carregamento da agenda:", err);
      setErroHorarios(true);
      setHorariosDisponiveis([]);
      toast.error("Ocorreu um erro ao carregar a agenda.");
    } finally {
      setLoadingHorarios(false);
    }
  };

  // Carrega os horários disponíveis reativamente (R010)
  useEffect(() => {
    if (ubs && profissional && dataSel) {
      setHorarioSel("");
      obterHorariosDisponiveisAgenda(ubs.id, profissional.id, dataSel);
    }
  }, [ubs, profissional, dataSel]);

  const handleConfirmarAgendamento = async () => {
    if (!paciente || !ubs || !profissional || !dataSel || !horarioSel) {
      toast.error("Por favor, certifique-se de preencher todos os dados da consulta.");
      return;
    }

    setIsSubmitting(true);

    try {
      await criarAgendamentoUseCase.executar({
        pacienteId: paciente.id,
        ubsId: ubs.id,
        ubsNome: ubs.nome,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        data: dataSel,
        horario: horarioSel,
        tipo,
        especialidade,
        observacoes
      });

      toast.success("Consulta agendada com sucesso!");
      router.push("/agendamentos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar consulta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Indicador de Passos */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
        {[1, 2, 3, 4].map((s) => (
          <div className="flex items-center gap-2 flex-1 justify-center last:flex-initial" key={s}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s 
                ? "bg-primary text-primary-foreground" 
                : step > s 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
            }`}>
              {s}
            </div>
            <span className={`hidden md:inline text-xs font-semibold ${
              step === s ? "text-foreground" : "text-muted-foreground"
            }`}>
              {s === 1 && "Unidade & Tipo"}
              {s === 2 && "Profissional"}
              {s === 3 && "Data & Hora"}
              {s === 4 && "Confirmação"}
            </span>
            {s < 4 && <ChevronRight className="hidden md:block h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Conteúdo da Etapa */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          
          {/* ETAPA 1: Tipo e UBS */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-lg text-foreground">Selecione o Tipo de Agendamento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTipo("consulta")}
                    className={`p-4 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      tipo === "consulta"
                        ? "border-primary bg-primary/5 text-primary shadow-xs"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Stethoscope className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span>Consulta Médica</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("exame")}
                    className={`p-4 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      tipo === "exame"
                        ? "border-primary bg-primary/5 text-primary shadow-xs"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span>Exame Clínico</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-heading font-bold text-lg text-foreground">Escolha a Unidade de Saúde (UBS)</h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou bairro..."
                      value={termoBuscaUbs}
                      onChange={(e) => setTermoBuscaUbs(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {ubsFiltradas.length > 0 ? (
                    ubsFiltradas.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUbs(u)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                          ubs?.id === u.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex gap-3">
                          <Building className={`h-5 w-5 mt-0.5 ${ubs?.id === u.id ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <h4 className="font-bold text-foreground text-sm">{u.nome}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {u.endereco.logradouro}, {u.endereco.numero} - {u.endereco.bairro}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              CNES: {u.cnes} • Funcionamento: {u.horarioFuncionamento}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma Unidade Básica de Saúde encontrada.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: Especialidade e Profissional */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-lg text-foreground">
                  Selecione a Especialidade ({tipo === "consulta" ? "Consulta" : "Exame"})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {especialidades.map((esp) => (
                    <button
                      key={esp}
                      type="button"
                      onClick={() => setEspecialidade(esp)}
                      className={`p-3 rounded-lg border text-xs font-semibold text-center truncate transition-all cursor-pointer ${
                        especialidade === esp
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>
              </div>

              {especialidade && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-heading font-bold text-lg text-foreground">Escolha o Profissional de Saúde</h3>
                  <div className="space-y-3">
                    {profissionais.length > 0 ? (
                      profissionais.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProfissional(p)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                            profissional?.id === p.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              profissional?.id === p.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            }`}>
                              {p.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground text-sm">{p.nome}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {p.registroProfissional.tipo}: {p.registroProfissional.numero}/{p.registroProfissional.uf}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        Nenhum profissional disponível para esta especialidade.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 3: Data e Horário (Consultar Agenda - R010) */}
          {step === 3 && (
            <div className="space-y-6">
              
              {/* Filtros Rápidos integrados na mesma tela para consulta instantânea sem repetir info */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 mb-6 select-none">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-primary" />
                    Filtros Rápidos da Agenda
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Ajuste diretamente na agenda
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Tipo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Tipo</label>
                    <select
                      value={tipo}
                      onChange={(e: any) => {
                        setTipo(e.target.value);
                        setDataSel("");
                        setHorarioSel("");
                      }}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                    >
                      <option value="consulta">Consulta</option>
                      <option value="exame">Exame</option>
                    </select>
                  </div>

                  {/* UBS */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Unidade (UBS)</label>
                    <select
                      value={ubs?.id || ""}
                      onChange={(e) => {
                        const selectedUbs = todasUbs.find(u => u.id === e.target.value);
                        if (selectedUbs) setUbs(selectedUbs);
                      }}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                    >
                      {todasUbs.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Especialidade */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Especialidade</label>
                    <select
                      value={especialidade}
                      onChange={(e) => {
                        setEspecialidade(e.target.value);
                      }}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                      disabled={especialidades.length === 0}
                    >
                      <option value="" disabled>Selecione...</option>
                      {especialidades.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Profissional */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Profissional</label>
                    <select
                      value={profissional?.id || ""}
                      onChange={(e) => {
                        const selectedProf = profissionais.find(p => p.id === e.target.value);
                        if (selectedProf) setProfissional(selectedProf);
                      }}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                      disabled={profissionais.length === 0}
                    >
                      <option value="" disabled>Selecione...</option>
                      {profissionais.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seletor de Dia da Semana */}
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide text-muted-foreground">
                  Escolha o Dia do Atendimento
                </h3>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {datasDisponiveis.map((d) => {
                    const diaSemana = obterNomeDiaSemana(d).split("-")[0]; // Seg, Ter, etc.
                    const diaMes = d.split("-")[2]; // 27, 28, etc.
                    const mes = obterDataPorExtenso(d).split(" ")[2].slice(0, 3); // Jun, Jul, etc.
                    const isSelected = dataSel === d;

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDataSel(d);
                          setHorarioSel("");
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[70px] transition-all text-center cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-105"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold opacity-75">{diaSemana}</span>
                        <span className="text-lg font-bold my-0.5">{diaMes}</span>
                        <span className="text-[10px] uppercase font-semibold">{mes}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Horários com Tratamento de Carregamento, Erro e Vaga Vazia (R010) */}
              {dataSel && (
                <div className="space-y-4 border-t border-border pt-6 animate-in fade-in duration-200">
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    Horários para {formatarDataBr(dataSel)} ({dataSel && obterNomeDiaSemana(dataSel)})
                  </h3>
                  
                  {loadingHorarios ? (
                    /* Skeleton de Carregamento */
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 animate-pulse">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-9 bg-muted rounded-lg" />
                      ))}
                    </div>
                  ) : erroHorarios ? (
                    /* Tratamento de Erro Conforme R010 */
                    <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20 text-center space-y-4">
                      <div className="flex flex-col items-center gap-2 text-destructive">
                        <AlertTriangle className="h-8 w-8 animate-bounce" />
                        <h4 className="font-bold text-sm">Erro ao carregar a agenda de horários</h4>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Não conseguimos contato com o servidor da UBS no momento para obter as vagas livres.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => ubs && profissional && obterHorariosDisponiveisAgenda(ubs.id, profissional.id, dataSel, true)}
                        className="font-semibold gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Tentar Novamente
                      </Button>
                    </div>
                  ) : horariosDisponiveis.length > 0 ? (
                    /* Exibição de Vagas com Destaque do Mais Cedo/Urgente */
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                      {horariosDisponiveis.map((h, idx) => {
                        const ehPrimeiro = idx === 0;
                        const isSelected = horarioSel === h;

                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setHorarioSel(h)}
                            className={`p-2.5 rounded-lg border text-sm font-bold text-center transition-all cursor-pointer relative ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs scale-105"
                                : ehPrimeiro
                                  ? "border-emerald-500 bg-emerald-500/5 text-foreground hover:bg-emerald-500/10 dark:border-emerald-500/70"
                                  : "border-border hover:bg-muted text-foreground"
                            }`}
                          >
                            {h}
                            {ehPrimeiro && !isSelected && (
                              <span className="absolute -top-2 -right-1 text-[8px] font-extrabold uppercase px-1 rounded-sm bg-emerald-500 text-white leading-none py-0.5 tracking-wider scale-90 flex items-center gap-0.5 shadow-sm">
                                <Zap className="h-2 w-2 fill-current" />
                                Rápido
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Informa indisponibilidade e sugere datas alternativas (R010) */
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-xl flex items-start gap-2.5 text-xs">
                        <Info className="h-4.5 w-4.5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block mb-0.5 font-bold">Sem vagas para esta data</strong>
                          <span>
                            Todos os horários para este profissional estão ocupados no dia {formatarDataBr(dataSel)}.
                          </span>
                        </div>
                      </div>

                      {/* Datas Alternativas com Vagas */}
                      {buscandoAlternativas ? (
                        <p className="text-xs text-muted-foreground animate-pulse">Buscando datas alternativas...</p>
                      ) : datasAlternativas.length > 0 ? (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <span className="block text-xs font-semibold text-foreground">
                            Sugestões de datas próximas com vagas disponíveis:
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {datasAlternativas.map(d => (
                              <Button
                                key={d}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDataSel(d);
                                  setHorarioSel("");
                                }}
                                className="text-xs font-semibold hover:border-primary cursor-pointer"
                              >
                                {formatarDataBr(d)} ({obterNomeDiaSemana(d).split("-")[0]})
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border">
                          Nenhuma data próxima com horários disponíveis foi encontrada nas próximas duas semanas.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 4: Revisão e Confirmação */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="font-heading font-bold text-lg text-foreground border-b border-border pb-2">
                Revisão do Agendamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-5 rounded-2xl border border-border/50 text-sm">
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Tipo do Compromisso</span>
                    <span className="text-sm font-bold text-foreground capitalize">{tipo} de {especialidade}</span>
                  </div>

                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Local</span>
                    <span className="text-sm font-bold text-foreground">{ubs?.nome}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {ubs?.endereco.logradouro}, {ubs?.endereco.numero} - {ubs?.endereco.bairro}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Profissional de Saúde</span>
                    <span className="text-sm font-bold text-foreground">{profissional?.nome}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {profissional?.registroProfissional.tipo}: {profissional?.registroProfissional.numero}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Data e Horário</span>
                    <span className="text-sm font-bold text-primary">
                      {dataSel && formatarDataBr(dataSel)} ({dataSel && obterNomeDiaSemana(dataSel)}) às {horarioSel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label htmlFor="observacoes" className="text-sm font-semibold text-foreground">
                  Informações Adicionais / Sintomas (Opcional)
                </label>
                <textarea
                  id="observacoes"
                  rows={3}
                  placeholder="Se desejar, informe sintomas básicos ou observações para o profissional."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                />
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Navegação entre Etapas */}
      <div className="flex justify-between items-center">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={isSubmitting}
            className="font-semibold gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
            Anterior
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push("/painel")}
            className="font-semibold cursor-pointer"
          >
            Cancelar
          </Button>
        )}

        {step < 4 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && !ubs) ||
              (step === 2 && (!especialidade || !profissional)) ||
              (step === 3 && (!dataSel || !horarioSel || loadingHorarios || erroHorarios))
            }
            className="font-semibold gap-1.5 cursor-pointer"
          >
            Próximo
            <ChevronRight className="h-4.5 w-4.5" />
          </Button>
        ) : (
          <Button
            onClick={handleConfirmarAgendamento}
            disabled={isSubmitting}
            className="font-semibold bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-sm shadow-primary/20"
          >
            {isSubmitting ? "Finalizando..." : "Confirmar Agendamento"}
          </Button>
        )}
      </div>
    </div>
  );
}
