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
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Estados dos campos
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  
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
      novosErros.identificador = "Por favor, informe seu CPF ou E-mail.";
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
    // Limpa erros anteriores de login
    setErrors(prev => {
      const { loginError, ...rest } = prev;
      return rest;
    });

    try {
      await login(identificador, senha, lembrar);
      toast.success("Login efetuado com sucesso!");
      router.push("/painel");
    } catch (err: any) {
      // Critério de Aceitação: Exibir mensagem genérica de erro sem informar qual dado está incorreto
      setErrors(prev => ({
        ...prev,
        loginError: "Usuário ou senha incorretos. Verifique suas credenciais e tente novamente."
      }));
      toast.error("Falha na autenticação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-lg shadow-black/5 bg-card/75 backdrop-blur-md animate-in fade-in duration-300">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight text-center sm:text-left">
          Acesse sua Conta
        </CardTitle>
        <CardDescription className="text-center sm:text-left">
          Entre com seu CPF ou E-mail e senha para gerenciar seus agendamentos.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          
          {/* Banner de Erro Genérico (Segurança e UX) */}
          {errors.loginError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium flex items-start gap-2.5 border border-destructive/20 animate-in shake duration-300">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errors.loginError}</span>
            </div>
          )}

          {/* Campo Identificador */}
          <div className="space-y-1.5">
            <label htmlFor="identificador" className="text-xs font-semibold text-foreground">
              CPF ou E-mail *
            </label>
            <Input
              id="identificador"
              type="text"
              placeholder="Digite seu CPF ou E-mail"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                disabled={isSubmitting}
                tabIndex={-1}
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

          {/* Opção Lembrar Acesso */}
          <div className="flex items-center space-x-2 pt-1 select-none">
            <Checkbox
              id="lembrar"
              checked={lembrar}
              onCheckedChange={(checked) => setLembrar(checked === true)}
              disabled={isSubmitting}
            />
            <label
              htmlFor="lembrar"
              className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Lembrar meu acesso neste dispositivo
            </label>
          </div>

        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border pt-4">
          <Button 
            type="submit" 
            className="w-full font-semibold cursor-pointer shadow-sm shadow-primary/10" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Entrando..." : "Entrar no Sistema"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ainda não tem cadastro?{" "}
            <Link 
              href="/cadastro" 
              className="text-primary font-semibold hover:underline"
            >
              Criar Cartão SUS Digital
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
