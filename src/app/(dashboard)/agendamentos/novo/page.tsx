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
  Info
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

  // Datas disponíveis (próximos 14 dias úteis)
  const datasDisponiveis = obterProximosDias(14, false);

  // Carrega as UBSs inicialmente
  useEffect(() => {
    ubsRepository.listarTodas().then((list) => {
      setTodasUbs(list);
      setUbsFiltradas(list);
    });
  }, []);

  // Filtra as UBSs ao digitar
  useEffect(() => {
    const clean = termoBuscaUbs.toLowerCase();
    setUbsFiltradas(
      todasUbs.filter(
        u => u.nome.toLowerCase().includes(clean) || u.endereco.bairro.toLowerCase().includes(clean)
      )
    );
  }, [termoBuscaUbs, todasUbs]);

  // Carrega as especialidades quando a UBS é selecionada
  useEffect(() => {
    if (ubs) {
      setEspecialidade("");
      setProfissional(null);
      setDataSel("");
      setHorarioSel("");
      
      profissionalRepository
        .listarEspecialidadesDisponiveis(ubs.id)
        .then(setEspecialidades);
    }
  }, [ubs]);

  // Carrega os profissionais quando a especialidade é selecionada
  useEffect(() => {
    if (ubs && especialidade) {
      setProfissional(null);
      setDataSel("");
      setHorarioSel("");

      profissionalRepository
        .listarPorUbsEEspecialidade(ubs.id, especialidade)
        .then(setProfissionais);
    }
  }, [ubs, especialidade]);

  // Carrega os horários disponíveis ao selecionar profissional e data
  useEffect(() => {
    if (ubs && profissional && dataSel) {
      setHorarioSel("");
      agendamentoRepository
        .obterHorariosDisponiveis(ubs.id, profissional.id, dataSel)
        .then(setHorariosDisponiveis);
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
          <div key={s} className="flex items-center gap-2 flex-1 justify-center last:flex-initial">
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

          {/* ETAPA 3: Data e Horário */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-lg text-foreground">Escolha o Dia do Atendimento</h3>
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
                        onClick={() => setDataSel(d)}
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

              {dataSel && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    Selecione um Horário Disponível para {formatarDataBr(dataSel)}
                  </h3>
                  
                  {horariosDisponiveis.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                      {horariosDisponiveis.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHorarioSel(h)}
                          className={`p-2.5 rounded-lg border text-sm font-bold text-center transition-all cursor-pointer ${
                            horarioSel === h
                              ? "border-primary bg-primary text-primary-foreground shadow-xs"
                              : "border-border hover:bg-muted text-foreground"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/40 rounded-xl flex items-start gap-2.5 text-xs text-muted-foreground">
                      <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        Não há vagas disponíveis neste dia para o profissional selecionado. 
                        Por favor, selecione outra data.
                      </span>
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
              (step === 3 && (!dataSel || !horarioSel))
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
