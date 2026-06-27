"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, AlertCircle, User, Stethoscope, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Estados dos campos
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [tipoUsuarioForm, setTipoUsuarioForm] = useState<"paciente" | "profissional" | "administrador">("paciente");
  
  // Controle de UX e segurança
  const [showSenha, setShowSenha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recupera o usuário salvo na opção "Lembrar Acesso"
  useEffect(() => {
    if (typeof window !== "undefined") {
      const usuarioSalvo = localStorage.getItem("agendaubs_lembrar_usuario");
      if (usuarioSalvo) {
        setIdentificador(usuarioSalvo);
        setLembrar(true);
      }
    }
  }, []);

  const validarCampos = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!identificador.trim()) {
      if (tipoUsuarioForm === "paciente") {
        novosErros.identificador = "Por favor, informe seu CPF ou E-mail.";
      } else if (tipoUsuarioForm === "profissional") {
        novosErros.identificador = "Por favor, informe seu Registro Profissional, CPF ou E-mail.";
      } else {
        novosErros.identificador = "Por favor, informe seu CPF ou E-mail corporativo.";
      }
    }

    if (!senha) {
      novosErros.senha = "Por favor, digite sua senha.";
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarCampos()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(identificador, senha, tipoUsuarioForm, lembrar);
      toast.success("Login efetuado com sucesso!");
      router.push("/painel");
    } catch (err: any) {
      setErrors({
        loginError: err.message || "Usuário ou senha incorretos. Verifique suas credenciais e tente novamente."
      });
      toast.error("Falha na autenticação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-lg shadow-black/5 bg-card/75 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Abas Superiores de Seleção de Tipo de Login */}
      <div className="flex border-b border-border bg-muted/40 rounded-t-xl overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setTipoUsuarioForm("paciente");
            setSenha("");
            setErrors({});
          }}
          className={`flex-1 py-3.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            tipoUsuarioForm === "paciente"
              ? "bg-card border-b-primary text-primary"
              : "border-b-transparent text-muted-foreground hover:bg-muted/65 hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          Paciente
        </button>
        
        <button
          type="button"
          onClick={() => {
            setTipoUsuarioForm("profissional");
            setSenha("");
            setErrors({});
          }}
          className={`flex-1 py-3.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            tipoUsuarioForm === "profissional"
              ? "bg-card border-b-primary text-primary"
              : "border-b-transparent text-muted-foreground hover:bg-muted/65 hover:text-foreground"
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          Profissional
        </button>

        <button
          type="button"
          onClick={() => {
            setTipoUsuarioForm("administrador");
            setSenha("");
            setErrors({});
          }}
          className={`flex-1 py-3.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            tipoUsuarioForm === "administrador"
              ? "bg-card border-b-primary text-primary"
              : "border-b-transparent text-muted-foreground hover:bg-muted/65 hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          Gestor / Admin
        </button>
      </div>

      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight text-center sm:text-left">
          {tipoUsuarioForm === "paciente" && "Portal do Paciente"}
          {tipoUsuarioForm === "profissional" && "Área do Profissional"}
          {tipoUsuarioForm === "administrador" && "Portal de Gestão & TI"}
        </CardTitle>
        <CardDescription className="text-center sm:text-left">
          {tipoUsuarioForm === "paciente" && "Faça login com seu CPF ou E-mail para marcar consultas e exames."}
          {tipoUsuarioForm === "profissional" && "Acesse a agenda de atendimento médico/enfermagem com seu Registro Profissional."}
          {tipoUsuarioForm === "administrador" && "Acesse as configurações da UBS e cadastro de equipes de saúde."}
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          
          {/* Banner de Erro Genérico */}
          {errors.loginError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium flex items-start gap-2.5 border border-destructive/20 animate-in shake duration-300">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errors.loginError}</span>
            </div>
          )}

          {/* Campo Identificador */}
          <div className="space-y-1.5">
            <label htmlFor="identificador" className="text-xs font-semibold text-foreground">
              {tipoUsuarioForm === "paciente" && "CPF ou E-mail *"}
              {tipoUsuarioForm === "profissional" && "Nº Registro, CPF ou E-mail *"}
              {tipoUsuarioForm === "administrador" && "CPF ou E-mail Corporativo *"}
            </label>
            <Input
              id="identificador"
              type="text"
              placeholder={
                tipoUsuarioForm === "paciente" ? "Digite seu CPF ou E-mail" :
                tipoUsuarioForm === "profissional" ? "Ex: 123456 (CRM/COREN/CRO) ou e-mail" :
                "Digite seu CPF ou e-mail corporativo"
              }
              value={identificador}
              onChange={(e) => {
                setIdentificador(e.target.value);
                if (errors.identificador) setErrors(prev => ({ ...prev, identificador: "" }));
              }}
              aria-invalid={!!errors.identificador}
              disabled={isSubmitting}
              autoFocus
            />
            {errors.identificador && (
              <p className="text-[11px] font-semibold text-destructive mt-1">
                {errors.identificador}
              </p>
            )}
          </div>

          {/* Campo Senha */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="senha" className="text-xs font-semibold text-foreground">
                Senha *
              </label>
              <Link
                href="/recuperar-senha"
                className="text-[11px] font-semibold text-primary hover:underline hover:opacity-90"
              >
                Esqueceu a senha?
              </Link>
            </div>
            
            <div className="relative">
              <Input
                id="senha"
                type={showSenha ? "text" : "password"}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  if (errors.senha) setErrors(prev => ({ ...prev, senha: "" }));
                }}
                className="pr-10"
                aria-invalid={!!errors.senha}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                disabled={isSubmitting}
              >
                {showSenha ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
            {errors.senha && (
              <p className="text-[11px] font-semibold text-destructive mt-1">
                {errors.senha}
              </p>
            )}
          </div>

          {/* Lembrar Acesso & Banner Informativo de senha para Mocks de profissional */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="lembrar"
                checked={lembrar}
                onCheckedChange={(checked) => setLembrar(!!checked)}
                disabled={isSubmitting}
              />
              <label
                htmlFor="lembrar"
                className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Lembrar acesso
              </label>
            </div>
          </div>

          {tipoUsuarioForm === "profissional" && (
            <div className="p-3 bg-muted/40 rounded-lg border text-[11px] text-muted-foreground leading-normal">
              💡 **Dica de Teste (Profissional):** Para logar com um profissional do banco simulado (ex: Dr. Carlos Silva - Clínico Geral), use o identificador **`123456`** e a senha **`123456`**.
            </div>
          )}

        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 border-t border-border/50 p-6 bg-muted/5">
          <Button
            type="submit"
            className="w-full font-semibold cursor-pointer shadow-xs"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Autenticando..." : "Entrar no Sistema"}
          </Button>

          {tipoUsuarioForm === "paciente" && (
            <p className="text-xs text-center text-muted-foreground">
              Ainda não tem cadastro?{" "}
              <Link href="/cadastro" className="font-semibold text-primary hover:underline">
                Cadastre-se aqui
              </Link>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
