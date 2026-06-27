"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { CadastrarAdministrador } from "@/core/use-cases/CadastrarAdministrador";
import { UBS } from "@/core/domain/entities/UBS";
import { Paciente } from "@/core/domain/entities/Paciente";
import { toast } from "sonner";
import { 
  UserPlus, 
  User, 
  Building, 
  ShieldAlert, 
  Check, 
  ChevronLeft,
  ShieldCheck,
  Mail,
  Phone,
  Copy,
  Lock,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ubsRepository = new MockUbsRepository();
const pacienteRepository = new LocalStoragePacienteRepository();
const cadastrarAdministradorUseCase = new CadastrarAdministrador(pacienteRepository);

export default function CadastrarAdministradorPage() {
  const router = useRouter();
  const { paciente } = useAuth();

  // Estados de dados do formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [ubsId, setUbsId] = useState("");

  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de sucesso do cadastro (Dados de Acesso Provisório)
  const [acessoCriado, setAcessoCriado] = useState<{
    admin: Paciente;
    senhaProvisoria: string;
    linkConfiguracao: string;
  } | null>(null);

  // Carrega as UBSs disponíveis
  useEffect(() => {
    ubsRepository.listarTodas().then(setTodasUbs);
  }, []);

  const handleSimularAdmin = async () => {
    if (paciente) {
      try {
        const atualizado = { ...paciente, papel: "administrador" as const };
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
        window.location.reload();
      } catch (err) {
        toast.error("Falha ao simular perfil de administrador.");
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const resultado = await cadastrarAdministradorUseCase.executar({
        nomeCompleto: nome,
        cpf,
        email,
        telefone,
        ubsId
      });

      setAcessoCriado({
        admin: resultado.administrador,
        senhaProvisoria: resultado.senhaProvisoria,
        linkConfiguracao: resultado.linkConfiguracao
      });

      toast.success("Administrador cadastrado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar administrador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setNome("");
    setCpf("");
    setEmail("");
    setTelefone("");
    setUbsId("");
    setAcessoCriado(null);
  };

  if (!paciente) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Verifica se o usuário tem privilégio administrativo (R003)
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
                Você tentou acessar o cadastro de administradores/gestores. 
                Esta funcionalidade é exclusiva para gestores autorizados do sistema de saúde.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-xl text-left border space-y-3">
              <span className="block text-xs font-bold text-foreground">Simulação de TI / Admin Central:</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Para fins de demonstração dos critérios de aceitação do requisito **R003**, 
                clique no botão abaixo para adicionar temporariamente privilégios administrativos à sua conta.
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
            onClick={() => router.push("/painel/profissionais/novo")}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer p-0 h-auto"
          >
            Cadastrar Profissional
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full self-start sm:self-auto flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Modo Administrador Central
        </span>
      </div>

      {!acessoCriado ? (
        /* Formulário de Cadastro */
        <Card className="border-border shadow-sm">
          <CardHeader className="p-6 border-b border-border">
            <CardTitle className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <UserPlus className="h-5.5 w-5.5 text-primary" />
              Cadastrar Gestor / Administrador de UBS
            </CardTitle>
            <CardDescription>
              Crie novas contas administrativas vinculadas a unidades específicas para gestão de agendas.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5">
              
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label htmlFor="nome" className="text-xs font-bold text-foreground">Nome Completo *</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome"
                    placeholder="Nome completo do novo gestor"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CPF */}
                <div className="space-y-1.5">
                  <label htmlFor="cpf" className="text-xs font-bold text-foreground">CPF *</label>
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

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label htmlFor="telefone" className="text-xs font-bold text-foreground">Telefone de Contato *</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telefone"
                      placeholder="Telefone celular (ex: 11999998888)"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* E-mail */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold text-foreground">E-mail Corporativo *</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemplo@gestao.sus.gov.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* UBS Vinculada */}
                <div className="space-y-1.5">
                  <label htmlFor="ubs" className="text-xs font-bold text-foreground">Unidade de Saúde Vinculada *</label>
                  <div className="relative">
                    <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <select
                      id="ubs"
                      value={ubsId}
                      onChange={(e) => setUbsId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-2.5 text-xs outline-none focus:border-ring"
                      required
                    >
                      <option value="" disabled>Selecione a UBS do gestor...</option>
                      {todasUbs.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
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
                {isSubmitting ? "Gravando..." : "Confirmar Cadastro"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        /* Confirmação e Exibição do Acesso Inicial Gerado (R003) */
        <Card className="border-emerald-500/20 shadow-md bg-card animate-in zoom-in duration-300">
          <CardHeader className="p-6 border-b border-border bg-emerald-500/5">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Check className="h-5 w-5 stroke-[2.5]" />
            </div>
            <CardTitle className="font-heading font-bold text-xl text-foreground">
              Acesso Inicial Gerado com Sucesso!
            </CardTitle>
            <CardDescription className="text-emerald-700 font-medium">
              A conta de administrador de **{acessoCriado.admin.nomeCompleto}** foi criada na base do SUS.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-1 bg-muted/40 p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Unidade Gerida</span>
              <span className="block text-sm font-bold text-foreground">
                {todasUbs.find(u => u.id === acessoCriado.admin.ubsId)?.nome || "UBS Vinculada"}
              </span>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                🔑 Credenciais de Acesso Temporárias (R003):
              </h4>
              
              {/* Senha Provisória */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Senha Provisória</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      readOnly
                      value={acessoCriado.senhaProvisoria}
                      className="pl-9 text-xs font-mono font-bold bg-muted/30 select-all"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(acessoCriado.senhaProvisoria, "Senha provisória")}
                    className="h-9 px-3 cursor-pointer shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Link Seguro */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Link Seguro de Ativação</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <ExternalLink className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      readOnly
                      value={acessoCriado.linkConfiguracao}
                      className="pl-9 text-xs text-primary font-mono bg-muted/30 select-all"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(acessoCriado.linkConfiguracao, "Link de ativação")}
                    className="h-9 px-3 cursor-pointer shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 text-blue-700 border border-blue-500/20 rounded-xl text-xs leading-relaxed">
              <strong>Próximos Passos:</strong> Copie as credenciais e envie-as de forma segura ao novo gestor da unidade. 
              Ao acessar o link, o gestor usará a senha provisória para efetuar o primeiro acesso e definir sua senha definitiva.
            </div>
          </CardContent>

          <CardFooter className="p-6 border-t border-border flex justify-between bg-muted/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/painel")}
              className="text-xs font-semibold cursor-pointer"
            >
              Ir para o Painel Geral
            </Button>
            
            <Button
              type="button"
              onClick={handleResetForm}
              className="text-xs font-bold cursor-pointer"
            >
              Cadastrar Outro Admin
            </Button>
          </CardFooter>
        </Card>
      )}

    </div>
  );
}
