import { Paciente } from "../domain/entities/Paciente";
import { IPacienteRepository } from "../domain/repositories/IPacienteRepository";
import { validarCPF, validarCNS, validarEmail } from "@/utils/validators";

export interface CadastrarPacienteInput {
  nomeCompleto: string;
  cpf: string;
  cns: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  genero: 'masculino' | 'feminino' | 'outro';
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
}

export class CadastrarPaciente {
  constructor(private pacienteRepository: IPacienteRepository) {}

  async executar(input: CadastrarPacienteInput): Promise<Paciente> {
    // 1. Validações de formato básicas
    if (!input.nomeCompleto || input.nomeCompleto.trim().split(' ').length < 2) {
      throw new Error("Por favor, insira seu nome completo (nome e sobrenome).");
    }

    if (!validarCPF(input.cpf)) {
      throw new Error("CPF inválido.");
    }

    if (!validarCNS(input.cns)) {
      throw new Error("Cartão Nacional de Saúde (CNS) inválido.");
    }

    if (!validarEmail(input.email)) {
      throw new Error("Formato de e-mail inválido.");
    }

    if (!input.dataNascimento) {
      throw new Error("Data de nascimento é obrigatória.");
    }

    // 2. Validações de unicidade no repositório
    const cpfExistente = await this.pacienteRepository.obterPorCpf(input.cpf);
    if (cpfExistente) {
      throw new Error("Já existe um cadastro com este CPF.");
    }

    const cnsExistente = await this.pacienteRepository.obterPorCns(input.cns);
    if (cnsExistente) {
      throw new Error("Já existe um cadastro com este Cartão do SUS.");
    }

    // 3. Criação da entidade e salvamento
    const novoPaciente: Paciente = {
      ...input,
      id: `paciente-${Math.random().toString(36).substring(2, 9)}`,
      cpf: input.cpf.replace(/\D/g, ''),
      cns: input.cns.replace(/\D/g, ''),
      dataCriacao: new Date().toISOString()
    };

    return await this.pacienteRepository.salvar(novoPaciente);
  }
}
