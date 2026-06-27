import { Profissional } from "../domain/entities/Profissional";
import { IProfissionalRepository } from "../domain/repositories/IProfissionalRepository";

export interface AutenticarProfissionalInput {
  identificador: string; // Registro (ex: 123456), e-mail ou CPF
  senha: string;
}

export class AutenticarProfissional {
  constructor(private profissionalRepository: IProfissionalRepository) {}

  async executar(input: AutenticarProfissionalInput): Promise<Profissional> {
    if (!input.identificador.trim()) {
      throw new Error("O campo CPF, e-mail ou registro profissional é obrigatório.");
    }
    if (!input.senha) {
      throw new Error("A senha é obrigatória.");
    }

    // Busca o profissional na base
    const profissional = await this.profissionalRepository.obterPorIdentificador(input.identificador.trim());

    if (!profissional) {
      // Mensagem genérica por motivos de segurança
      throw new Error("Credenciais inválidas. Verifique os dados digitados.");
    }

    // Validação da senha
    let senhaValida = false;

    if (profissional.senha) {
      // Se houver senha cadastrada explicitamente, compara
      senhaValida = profissional.senha === input.senha;
    } else {
      // Regra de validação para profissionais do mock inicial:
      // A senha padrão aceita é o próprio número de registro dele (ex: "123456" para o Dr. Carlos) ou a senha comum de testes "123456"
      const regNumero = profissional.registroProfissional.numero;
      senhaValida = input.senha === regNumero || input.senha === "123456";
    }

    if (!senhaValida) {
      throw new Error("Credenciais inválidas. Verifique os dados digitados.");
    }

    return profissional;
  }
}
