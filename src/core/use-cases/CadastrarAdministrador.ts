import { Paciente } from "../domain/entities/Paciente";
import { IPacienteRepository } from "../domain/repositories/IPacienteRepository";
import { validarCPF, validarEmail } from "@/utils/validators";

export interface CadastrarAdministradorInput {
  nomeCompleto: string;
  cpf: string;
  email: string;
  telefone: string;
  ubsId: string;
}

export interface CadastrarAdministradorOutput {
  administrador: Paciente;
  senhaProvisoria: string;
  linkConfiguracao: string;
}

export class CadastrarAdministrador {
  constructor(private pacienteRepository: IPacienteRepository) {}

  async executar(input: CadastrarAdministradorInput): Promise<CadastrarAdministradorOutput> {
    // 1. Validações de campos obrigatórios
    if (!input.nomeCompleto.trim()) {
      throw new Error("O nome completo é obrigatório.");
    }
    if (!input.cpf.trim()) {
      throw new Error("O CPF é obrigatório.");
    }
    if (!input.email.trim()) {
      throw new Error("O e-mail é obrigatório.");
    }
    if (!input.telefone.trim()) {
      throw new Error("O telefone é obrigatório.");
    }
    if (!input.ubsId) {
      throw new Error("A unidade de saúde vinculada é obrigatória.");
    }

    // 2. Validar CPF e E-mail usando os utilitários do sistema
    const cpfLimpo = input.cpf.replace(/\D/g, "");
    if (!validarCPF(cpfLimpo)) {
      throw new Error("O CPF informado é inválido.");
    }
    if (!validarEmail(input.email)) {
      throw new Error("O formato do e-mail é inválido.");
    }

    // 3. Validar duplicidades na base de dados
    const cpfExistente = await this.pacienteRepository.obterPorCpf(cpfLimpo);
    if (cpfExistente) {
      throw new Error("Já existe um usuário cadastrado com este CPF.");
    }

    const emailExistente = await this.pacienteRepository.obterPorEmail(input.email.trim());
    if (emailExistente) {
      throw new Error("Já existe um usuário cadastrado com este e-mail.");
    }

    // 4. Gerar senha provisória segura (ex: SUS-XXXX)
    const caracteres = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789";
    let sufixo = "";
    for (let i = 0; i < 6; i++) {
      sufixo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    const senhaProvisoria = `SUS-${sufixo}`;

    // 5. Instanciar a entidade Paciente com papel de Administrador
    const novoAdmin: Paciente = {
      id: `admin-${Date.now()}`,
      nomeCompleto: input.nomeCompleto.trim(),
      cpf: cpfLimpo,
      cns: `898${Math.floor(100000000000 + Math.random() * 900000000000)}`, // CNS simulado para manter consistência
      dataNascimento: "1990-01-01", // Data genérica para admins
      email: input.email.trim().toLowerCase(),
      telefone: input.telefone.replace(/\D/g, ""),
      genero: "outro",
      endereco: {
        cep: "00000-000",
        logradouro: "Endereço Institucional",
        numero: "S/N",
        bairro: "Centro",
        cidade: "São Paulo",
        uf: "SP"
      },
      senha: senhaProvisoria, // Senha provisória para acesso inicial
      dataCriacao: new Date().toISOString(),
      papel: "administrador",
      ubsId: input.ubsId
    };

    // 6. Salvar na base de dados
    await this.pacienteRepository.salvar(novoAdmin);

    // 7. Gerar link seguro para criação de senha
    const linkConfiguracao = `${window.location.origin}/login?configurar=true&token=${novoAdmin.id}`;

    return {
      administrador: novoAdmin,
      senhaProvisoria,
      linkConfiguracao
    };
  }
}
