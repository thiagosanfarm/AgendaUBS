"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { MockProfissionalRepository } from "@/infra/api/repositories/MockProfissionalRepository";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { CadastrarProfissional } from "@/core/use-cases/CadastrarProfissional";
import { UBS } from "@/core/domain/entities/UBS";
import { HorarioAtendimento } from "@/core/domain/entities/Profissional";
import { toast } from "sonner";
import { 
  UserPlus, 
  User, 
  Building, 
  Clock, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Check, 
  ChevronLeft,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ubsRepository = new MockUbsRepository();
const profissionalRepository = new MockProfissionalRepository();
const cadastrarProfissionalUseCase = new CadastrarProfissional(profissionalRepository);
const pacienteRepository = new LocalStoragePacienteRepository();

const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

const REGISTROS = ["CRM", "COREN", "CRO", "OUTRO"];

export default function CadastrarProfissionalPage() {
  const router = useRouter();
  const { paciente } = useAuth();

  // Estados de dados do formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [registroTipo, setRegistroTipo] = useState<"CRM" | "COREN" | "CRO" | "OUTRO">("CRM");
  const [registroNumero, setRegistroNumero] = useState("");
  const [registroUf, setRegistroUf] = useState("SP");
  const [especialidade, setEspecialidade] = useState("");
  const [ubsId, setUbsId] = useState("");
  
  // Lista de horários dinâmicos
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>([
    { diaSemana: "Segunda-feira", horaInicio: "08:00", horaFim: "17:00" }
  ]);

  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carrega as UBSs disponíveis
  useEffect(() => {
    ubsRepository.listarTodas().then(setTodasUbs);
  }, []);

  const handleSimularAdmin = async () => {
    if (paciente) {
      try {
        const atualizado = { ...paciente, papel: "administrador" as const };
        // Salva localmente
        const key = `agendaubs_pacientes`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const pacientes = JSON.parse(saved);
          const index = pacientes.findIndex((p: any) => p.id === paciente.id);
          if (index !== -1) {
            pacientes[index] = atualizado;
            localStorage.setItem(key, JSON.stringify(pacientes));
          }
        }
        toast.success("Sua conta agora tem privilégios de Administrador!");
        // Dá refresh para carregar com a nova role
        window.location.reload();
      } catch (err) {
        toast.error("Falha ao simular perfil de administrador.");
      }
    }
  };

  const addHorario = () => {
    setHorarios([
      ...horarios,
      { diaSemana: "Segunda-feira", horaInicio: "08:00", horaFim: "17:00" }
    ]);
  };

  const removeHorario = (index: number) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const updateHorario = (index: number, field: keyof HorarioAtendimento, value: string) => {
    const updated = [...horarios];
    updated[index] = { ...updated[index], [field]: value };
    setHorarios(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await cadastrarProfissionalUseCase.executar({
        nome,
        cpf,
        registroProfissional: {
          tipo: registroTipo,
          numero: registroNumero,
          uf: registroUf
        },
        especialidade,
        ubsId,
        horariosAtendimento: horarios
      });

      toast.success("Profissional de saúde cadastrado com sucesso!");
      
      // Limpa formulário
      setNome("");
      setCpf("");
      setRegistroNumero("");
      setEspecialidade("");
      setUbsId("");
      setHorarios([{ diaSemana: "Segunda-feira", horaInicio: "08:00", horaFim: "17:00" }]);
      
      // Redireciona de volta ao painel
      router.push("/painel");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar profissional.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se a sessão ainda está carregando, exibe loader
  if (!paciente) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Verifica se o usuário tem privilégio administrativo (R002)
  const isAdm = paciente.papel === "administrador";

  if (!isAdm) {
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
                Você tentou acessar a página de cadastro de profissional de saúde. 
                Esta funcionalidade é exclusiva para gestores e administradores da Unidade Básica de Saúde.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-xl text-left border space-y-3">
              <span className="block text-xs font-bold text-foreground">Simulação para Testes e Validação:</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Para fins de demonstração dos critérios de aceitação do requisito **R002**, 
                clique no botão abaixo para adicionar temporariamente a permissão de administrador ao seu perfil.
              </p>
              <Button
                type="button"
                onClick={handleSimularAdmin}
                className="w-full text-xs font-bold cursor-pointer gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Simular Acesso de Administrador
              </Button>
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
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Botão de Voltar & Alternador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/painel")}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Painel
          </Button>
          <span className="text-muted-foreground text-xs">/</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push("/painel/administradores/novo")}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer p-0 h-auto"
          >
            Cadastrar Gestor de UBS
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full self-start sm:self-auto flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Modo Administrador
        </span>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="p-6 border-b border-border">
          <CardTitle className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
            <UserPlus className="h-5.5 w-5.5 text-primary" />
            Cadastrar Profissional de Saúde
          </CardTitle>
          <CardDescription>
            Insira os dados do profissional e os horários em que ele atenderá na UBS vinculada.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            
            {/* Seção 1: Identificação Básica */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">
                1. Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="nome" className="text-xs font-bold text-foreground">Nome Completo *</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      placeholder="Dr(a). Nome do Profissional"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cpf" className="text-xs font-bold text-foreground">CPF do Profissional *</label>
                  <Input
                    id="cpf"
                    placeholder="Apenas números (11 dígitos)"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    maxLength={11}
                    className="text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Registro e Especialidade */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">
                2. Registro & Especialidade
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tipo de Conselho */}
                <div className="space-y-1.5">
                  <label htmlFor="regTipo" className="text-xs font-bold text-foreground">Conselho *</label>
                  <select
                    id="regTipo"
                    value={registroTipo}
                    onChange={(e: any) => setRegistroTipo(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus:border-ring"
                  >
                    {REGISTROS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Número do Registro */}
                <div className="space-y-1.5">
                  <label htmlFor="regNum" className="text-xs font-bold text-foreground">Número de Registro *</label>
                  <Input
                    id="regNum"
                    placeholder="Número"
                    value={registroNumero}
                    onChange={(e) => setRegistroNumero(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                {/* UF */}
                <div className="space-y-1.5">
                  <label htmlFor="regUf" className="text-xs font-bold text-foreground">UF *</label>
                  <Input
                    id="regUf"
                    placeholder="UF (ex: SP)"
                    value={registroUf}
                    onChange={(e) => setRegistroUf(e.target.value)}
                    maxLength={2}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Especialidade */}
                <div className="space-y-1.5">
                  <label htmlFor="especialidade" className="text-xs font-bold text-foreground">Especialidade / Função *</label>
                  <Input
                    id="especialidade"
                    placeholder="Ex: Clínico Geral, Vacinação, Odontologia..."
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                {/* UBS Vinculada */}
                <div className="space-y-1.5">
                  <label htmlFor="ubs" className="text-xs font-bold text-foreground">Unidade Vinculada (UBS) *</label>
                  <select
                    id="ubs"
                    value={ubsId}
                    onChange={(e) => setUbsId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus:border-ring"
                    required
                  >
                    <option value="" disabled>Selecione a unidade...</option>
                    {todasUbs.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção 3: Horários de Atendimento */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  3. Horários de Atendimento *
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHorario}
                  className="h-7 text-[10px] font-bold gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar Dia
                </Button>
              </div>

              <div className="space-y-3">
                {horarios.map((h, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/40 animate-in fade-in duration-200">
                    {/* Dia da Semana */}
                    <div className="w-full sm:flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Dia da Semana</label>
                      <select
                        value={h.diaSemana}
                        onChange={(e) => updateHorario(index, "diaSemana", e.target.value)}
                        className="h-8.5 w-full rounded-md border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                      >
                        {DIAS_SEMANA.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Hora Início */}
                    <div className="w-full sm:w-32 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Início</label>
                      <Input
                        type="time"
                        value={h.horaInicio}
                        onChange={(e) => updateHorario(index, "horaInicio", e.target.value)}
                        className="h-8.5 text-xs"
                        required
                      />
                    </div>

                    {/* Hora Fim */}
                    <div className="w-full sm:w-32 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Término</label>
                      <Input
                        type="time"
                        value={h.horaFim}
                        onChange={(e) => updateHorario(index, "horaFim", e.target.value)}
                        className="h-8.5 text-xs"
                        required
                      />
                    </div>

                    {/* Botão Remover */}
                    {horarios.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHorario(index)}
                        className="h-8.5 w-8.5 text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </CardContent>

          <CardFooter className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/painel")}
              disabled={isSubmitting}
              className="font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-semibold text-xs cursor-pointer shadow-sm shadow-primary/20"
            >
              {isSubmitting ? "Cadastrando..." : "Concluir Cadastro"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
