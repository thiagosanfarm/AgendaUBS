import { Profissional, HorarioAtendimento } from "../domain/entities/Profissional";
import { IProfissionalRepository } from "../domain/repositories/IProfissionalRepository";

export interface CadastrarProfissionalInput {
  nome: string;
  registroProfissional: {
    tipo: 'CRM' | 'COREN' | 'CRO' | 'OUTRO';
    numero: string;
    uf: string;
  };
  especialidade: string;
  ubsId: string;
  cpf: string;
  horariosAtendimento: HorarioAtendimento[];
}

export class CadastrarProfissional {
  constructor(private profissionalRepository: IProfissionalRepository) {}

  async executar(input: CadastrarProfissionalInput): Promise<void> {
    // 1. Validações de campos obrigatórios
    if (!input.nome.trim()) {
      throw new Error("O nome completo é obrigatório.");
    }
    if (!input.especialidade.trim()) {
      throw new Error("A especialidade é obrigatória.");
    }
    if (!input.ubsId) {
      throw new Error("A unidade vinculada (UBS) é obrigatória.");
    }
    if (!input.cpf.trim()) {
      throw new Error("O CPF é obrigatório.");
    }
    if (!input.registroProfissional.numero.trim() || !input.registroProfissional.uf.trim()) {
      throw new Error("O número e a UF do registro profissional são obrigatórios.");
    }
    if (!input.horariosAtendimento || input.horariosAtendimento.length === 0) {
      throw new Error("É necessário informar ao menos um horário de atendimento.");
    }

    // 2. Validar CPFs e Registros numéricos/formato básico
    const cpfLimpo = input.cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      throw new Error("O CPF informado deve conter 11 dígitos.");
    }

    // 3. Validar consistência dos horários (horaInicio < horaFim)
    for (const h of input.horariosAtendimento) {
      if (!h.diaSemana) {
        throw new Error("O dia da semana do horário de atendimento é obrigatório.");
      }
      
      const parseHora = (hStr: string) => {
        const [horas, minutos] = hStr.split(":").map(Number);
        return horas * 60 + minutos;
      };

      const minInicio = parseHora(h.horaInicio);
      const minFim = parseHora(h.horaFim);

      if (isNaN(minInicio) || isNaN(minFim)) {
        throw new Error("Formato de hora inválido. Utilize o formato HH:MM.");
      }

      if (minInicio >= minFim) {
        throw new Error(`O horário de início (${h.horaInicio}) deve ser menor que o de término (${h.horaFim}) na ${h.diaSemana}.`);
      }
    }

    // 4. Impedir duplicidade de CPF ou Registro Profissional
    const duplicado = await this.profissionalRepository.obterPorCpfOuRegistro(
      cpfLimpo,
      input.registroProfissional.numero.trim()
    );

    if (duplicado) {
      if (duplicado.cpf === cpfLimpo) {
        throw new Error("Já existe um profissional cadastrado com este CPF.");
      }
      throw new Error(`Já existe um profissional cadastrado com este registro profissional (${input.registroProfissional.tipo} ${input.registroProfissional.numero}).`);
    }

    // 5. Salva o profissional no repositório
    const novoProfissional: Profissional = {
      id: `prof-${Date.now()}`,
      nome: input.nome.trim(),
      registroProfissional: {
        tipo: input.registroProfissional.tipo,
        numero: input.registroProfissional.numero.trim(),
        uf: input.registroProfissional.uf.trim().toUpperCase()
      },
      especialidade: input.especialidade.trim(),
      ubsId: input.ubsId,
      cpf: cpfLimpo,
      horariosAtendimento: input.horariosAtendimento
    };

    await this.profissionalRepository.cadastrar(novoProfissional);
  }
}
