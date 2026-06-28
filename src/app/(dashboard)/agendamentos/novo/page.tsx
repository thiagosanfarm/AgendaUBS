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
import { formatarDataBr, formatarCEP, formatarTelefone } from "@/utils/formatters";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Clock, 
  MapPin, 
  User, 
  Calendar,
  Building,
  Check,
  AlertTriangle,
  Info,
  CalendarDays
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const { paciente } = useAuth();

  // Estados principais
  const [ubs, setUbs] = useState<UBS | null>(null);
  const [especialidade, setEspecialidade] = useState("Cardiologia");
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [dataSel, setDataSel] = useState("2026-04-11"); // Inicia selecionado no dia 11 do calendário do layout
  const [horarioSel, setHorarioSel] = useState("09:00");
  
  // Estado de navegação do calendário (inicia em Abril de 2026 de acordo com a imagem)
  const [dataNavegacao, setDataNavegacao] = useState(new Date(2026, 3, 1)); // Abril = Mês 3 (0-indexed)

  // Coleções de banco
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>(["09:00", "10:00", "11:00"]);

  // Estados de carregamento e UX
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Carrega todas as UBSs do município e define a UBS vinculada do paciente como padrão (R007)
  useEffect(() => {
    ubsRepository.listarTodas().then((list) => {
      setTodasUbs(list);
      if (paciente && paciente.ubsId) {
        const ubsPadrao = list.find((u) => u.id === paciente.ubsId);
        if (ubsPadrao) setUbs(ubsPadrao);
      } else if (list.length > 0) {
        setUbs(list[0]); // Fallback se não tiver UBS vinculada
      }
    });
  }, [paciente]);

  // 2. Carrega profissionais quando a UBS ou a especialidade muda (Reativo)
  useEffect(() => {
    if (ubs && especialidade) {
      profissionalRepository
        .listarPorUbsEEspecialidade(ubs.id, especialidade)
        .then((list) => {
          setProfissionais(list);
          if (list.length > 0) {
            setProfissional(list[0]); // Pré-seleciona o primeiro profissional disponível
          } else {
            setProfissional(null);
          }
        });
    }
  }, [ubs, especialidade]);

  // 3. Carrega os horários disponíveis da agenda (Reativo)
  useEffect(() => {
    const obterHorarios = async () => {
      if (ubs && profissional && dataSel) {
        setLoadingHorarios(true);
        setErroHorarios(false);
        try {
          const slots = await agendamentoRepository.obterHorariosDisponiveis(ubs.id, profissional.id, dataSel);
          setHorariosDisponiveis(slots);
          
          // Se o horário anteriormente selecionado ainda existir, mantém, senão pega o primeiro
          if (slots.length > 0) {
            if (!slots.includes(horarioSel)) {
              setHorarioSel(slots[0]);
            }
          } else {
            setHorarioSel("");
          }
        } catch (err) {
          console.error("Falha ao obter agenda do profissional:", err);
          setErroHorarios(true);
        } finally {
          setLoadingHorarios(false);
        }
      }
    };
    obterHorarios();
  }, [ubs, profissional, dataSel]);

  // Navegação do calendário
  const anteriorMes = () => {
    setDataNavegacao(new Date(dataNavegacao.getFullYear(), dataNavegacao.getMonth() - 1, 1));
  };

  const proximoMes = () => {
    setDataNavegacao(new Date(dataNavegacao.getFullYear(), dataNavegacao.getMonth() + 1, 1));
  };

  // Matemática dos dias do calendário
  const anoNav = dataNavegacao.getFullYear();
  const mesNav = dataNavegacao.getMonth();
  const totalDiasMes = new Date(anoNav, mesNav + 1, 0).getDate();
  
  let diaSemanaInicial = new Date(anoNav, mesNav, 1).getDay();
  // Converte Domingo=0, Segunda=1 para Segunda=0, ..., Domingo=6
  diaSemanaInicial = diaSemanaInicial === 0 ? 6 : diaSemanaInicial - 1;

  const nomeMesNav = dataNavegacao.toLocaleDateString("pt-BR", { month: "long" });

  const handleConfirmarFinal = async () => {
    if (!paciente || !ubs || !profissional || !dataSel || !horarioSel) {
      toast.error("Por favor, preencha todos os dados necessários.");
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
        tipo: "consulta" as const,
        especialidade,
        observacoes: ""
      });

      toast.success("Agendamento realizado com sucesso!");
      setConfirmacaoAberta(false);
      router.push("/agendamentos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao efetuar o agendamento de consulta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hojeFormatado = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-sky-50/20 dark:bg-slate-950 pb-20 select-none animate-in fade-in duration-300">
      
      {/* Cabeçalho da Tela com Seta e Título */}
      <header className="flex items-center h-14 px-4 border-b border-sky-100 bg-white/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur-xs">
        <button 
          onClick={() => router.push("/painel")}
          className="h-8 w-8 rounded-full flex items-center justify-center text-primary hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
        </button>
        <h1 className="ml-2 font-heading font-bold text-base text-foreground">
          Agendamento de consulta
        </h1>
      </header>

      <div className="p-4 space-y-5">
        
        {/* UBS Vinculada (Exibe informação territorial do paciente R007) */}
        {ubs && (
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Building className="h-4.5 w-4.5 text-primary" />
              <div className="space-y-0.5">
                <span className="block text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-none">Unidade de Saúde</span>
                <span className="block text-xs font-bold text-foreground leading-tight">{ubs.nome}</span>
              </div>
            </div>
            
            {/* Seletor discreto de UBS caso queira trocar a unidade de cobertura */}
            <select
              value={ubs.id}
              onChange={(e) => {
                const selecionada = todasUbs.find(u => u.id === e.target.value);
                if (selecionada) setUbs(selecionada);
              }}
              className="text-[10px] font-bold text-primary bg-sky-50 dark:bg-slate-800 border-none outline-none rounded-md px-2 py-1 cursor-pointer"
            >
              {todasUbs.map(u => (
                <option key={u.id} value={u.id}>Alterar UBS</option>
              ))}
            </select>
          </div>
        )}

        {/* Formulário de Seleção */}
        <div className="space-y-3.5">
          {/* Especialidade */}
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

          {/* Profissional de Saúde */}
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
        </div>

        {/* Calendário Grid Premium */}
        <Card className="border border-sky-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
          <CardContent className="p-4 space-y-4">
            
            {/* Header do Mês e Navegação */}
            <div className="flex items-center justify-between text-foreground">
              <button 
                onClick={anteriorMes} 
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4.5 w-4.5 text-primary stroke-[2.5]" />
              </button>
              <span className="font-heading font-extrabold text-sm capitalize">
                {nomeMesNav} {anoNav}
              </span>
              <button 
                onClick={proximoMes} 
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4.5 w-4.5 text-primary stroke-[2.5]" />
              </button>
            </div>

            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sab</span>
              <span>Dom</span>
            </div>

            {/* Grid dos Dias do Mês */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1.5 text-center text-xs font-semibold">
              {/* Células em branco */}
              {Array.from({ length: diaSemanaInicial }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-8 w-8" />
              ))}

              {/* Botões dos Dias */}
              {Array.from({ length: totalDiasMes }, (_, i) => i + 1).map((dia) => {
                const dataBotao = `${anoNav}-${String(mesNav + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const isSelected = dataSel === dataBotao;
                const noPassado = dataBotao < hojeFormatado;

                // Destaca alguns dias como padrão (ex: dia 24 do layout da imagem)
                const ehDiaDestacado = dia === 24 && mesNav === 3 && anoNav === 2026;

                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => {
                      if (!noPassado) {
                        setDataSel(dataBotao);
                      }
                    }}
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

        {/* Seleção de Horários Horizontais */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Horários Disponíveis</span>
          
          {loadingHorarios ? (
            <div className="flex gap-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-24 bg-muted rounded-xl" />
              ))}
            </div>
          ) : erroHorarios ? (
            <div className="p-3 rounded-xl bg-destructive/5 border text-center text-xs text-destructive">
              Erro de conexão ao obter a agenda de horários.
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
              Sem vagas disponíveis para este profissional na data selecionada.
            </div>
          )}
        </div>

        {/* Botão de Confirmação no Rodapé */}
        <Button
          onClick={() => {
            if (!dataSel || !horarioSel || !profissional) {
              toast.error("Por favor, selecione data e horário.");
              return;
            }
            setConfirmacaoAberta(true);
          }}
          disabled={!dataSel || !horarioSel || !profissional}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-primary/10 mt-6"
        >
          Confirmar Agendamento
        </Button>
      </div>

      {/* Modal de Confirmação R013 */}
      <Dialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl p-5 border">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CalendarDays className="h-5 w-5 text-primary" />
              Revisar Agendamento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Confirme os dados da sua consulta abaixo antes de realizar o agendamento no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/40 rounded-xl text-xs space-y-3.5 border border-border">
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Especialidade</span>
              <span className="block text-foreground font-semibold">{especialidade}</span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Profissional</span>
              <span className="block text-foreground font-semibold">{profissional?.nome}</span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Local / Unidade</span>
              <span className="block text-foreground font-semibold">{ubs?.nome}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {ubs?.endereco.logradouro}, {ubs?.endereco.numero} - {ubs?.endereco.bairro}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground">Data e Horário</span>
              <span className="block text-primary font-bold">
                {formatarDataBr(dataSel)} às {horarioSel}
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmacaoAberta(false)}
              className="flex-1 text-xs font-semibold cursor-pointer h-10 rounded-xl"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarFinal}
              disabled={isSubmitting}
              className="flex-1 text-xs font-bold cursor-pointer h-10 rounded-xl"
            >
              {isSubmitting ? "Finalizando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
