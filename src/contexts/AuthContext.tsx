"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Paciente } from "@/core/domain/entities/Paciente";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { CadastrarPaciente, CadastrarPacienteInput } from "@/core/use-cases/CadastrarPaciente";

interface AuthContextType {
  paciente: Paciente | null;
  loading: boolean;
  autenticado: boolean;
  loginComCpf: (cpf: string) => Promise<Paciente>;
  cadastrar: (input: CadastrarPacienteInput) => Promise<Paciente>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const pacienteRepository = new LocalStoragePacienteRepository();
const cadastrarPacienteUseCase = new CadastrarPaciente(pacienteRepository);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restaura a sessão do paciente do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const idSalvo = localStorage.getItem("agendaubs_sessao_paciente_id");
      if (idSalvo) {
        pacienteRepository
          .obterPorId(idSalvo)
          .then((dados) => {
            if (dados) setPaciente(dados);
          })
          .catch((err) => console.error("Erro ao restaurar sessão:", err))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, []);

  const loginComCpf = async (cpf: string): Promise<Paciente> => {
    setLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, "");
      const dados = await pacienteRepository.obterPorCpf(cleanCpf);
      if (!dados) {
        throw new Error("Nenhum paciente cadastrado com este CPF.");
      }
      setPaciente(dados);
      localStorage.setItem("agendaubs_sessao_paciente_id", dados.id);
      return dados;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cadastrar = async (input: CadastrarPacienteInput): Promise<Paciente> => {
    setLoading(true);
    try {
      const novoPaciente = await cadastrarPacienteUseCase.executar(input);
      setPaciente(novoPaciente);
      localStorage.setItem("agendaubs_sessao_paciente_id", novoPaciente.id);
      return novoPaciente;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setPaciente(null);
    localStorage.removeItem("agendaubs_sessao_paciente_id");
  };

  return (
    <AuthContext.Provider
      value={{
        paciente,
        loading,
        autenticado: !!paciente,
        loginComCpf,
        cadastrar,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
