"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputCPF } from "@/components/forms/InputCPF";
import { validarCPF } from "@/utils/validators";

export default function LoginPage() {
  const [cpf, setCpf] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginComCpf } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarCPF(cpf)) {
      toast.error("Por favor, insira um CPF válido.");
      return;
    }

    setIsSubmitting(true);

    try {
      await loginComCpf(cpf);
      toast.success("Acesso autorizado com sucesso!");
      router.push("/painel");
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao tentar entrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-lg shadow-black/5 bg-card/75 backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight">Acesse sua Agenda</CardTitle>
        <CardDescription>
          Informe o número do seu CPF para visualizar seus agendamentos e marcar consultas.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="cpf" className="text-sm font-semibold text-foreground">
              CPF do Paciente
            </label>
            <InputCPF
              id="cpf"
              value={cpf}
              onChange={setCpf}
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full font-semibold cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? "Autenticando..." : "Entrar no Sistema"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ainda não tem cadastro?{" "}
            <Link 
              href="/cadastro" 
              className="text-primary font-semibold hover:underline"
            >
              Criar cartão digital do SUS
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
