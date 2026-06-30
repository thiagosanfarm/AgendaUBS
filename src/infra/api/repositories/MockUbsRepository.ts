import { UBS } from "@/core/domain/entities/UBS";
import { IUbsRepository } from "@/core/domain/repositories/IUbsRepository";

const MOCK_UBSS: UBS[] = [
  {
    id: "ubs-centro", // ID mantido para compatibilidade com logins padrão de teste
    nome: "Clínica de Saúde Maroto (Urgência Centro) [José Antônio Maroto]",
    cnes: "2503808",
    telefone: "(79) 3631-0001",
    endereco: {
      cep: "49300-000",
      logradouro: "Avenida Contorno",
      numero: "3000",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    latitude: -10.9168,
    longitude: -37.6534,
    horarioFuncionamento: "24 Horas (Emergência)",
    prazoMinimoCancelamentoHoras: 24
  },
  {
    id: "ubs-vila-nova", // ID mantido para compatibilidade
    nome: "Clínica de Saúde Bairro Matinha",
    cnes: "5551455",
    telefone: "(79) 3631-0016",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua do Campo, S/N",
      numero: "S/N",
      bairro: "Matinha",
      cidade: "Lagarto",
      uf: "SE"
    },
    latitude: -10.9201,
    longitude: -37.6612,
    horarioFuncionamento: "07:00 - 17:00",
    prazoMinimoCancelamentoHoras: 24
  },
  {
    id: "ubs-jardim-flores", // ID mantido para compatibilidade
    nome: "Clínica de Saúde Bairro Pratas",
    cnes: "5551765",
    telefone: "(79) 3631-0017",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Principal de Pratas",
      numero: "S/N",
      bairro: "Pratas",
      cidade: "Lagarto",
      uf: "SE"
    },
    latitude: -10.9254,
    longitude: -37.6432,
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-parque-nacoes", // ID mantido para compatibilidade
    nome: "Clínica de Saúde Colônia Treze [Padre Almeida]",
    cnes: "2420554",
    telefone: "(79) 3631-0031",
    endereco: {
      cep: "49300-000",
      logradouro: "Pista da Granja",
      numero: "264",
      bairro: "Colônia Treze",
      cidade: "Lagarto",
      uf: "SE"
    },
    latitude: -10.9842,
    longitude: -37.5812,
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-fisioterapia-lagarto",
    nome: "Centro de Fisioterapia de Lagarto",
    cnes: "5314836",
    telefone: "(79) 3631-0002",
    endereco: {
      cep: "49300-000",
      logradouro: "Avenida Santo Antônio",
      numero: "348",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-residencia-terapeutica",
    nome: "Residência Terapêutica",
    cnes: "9900001",
    telefone: "(79) 3631-0003",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Dr. Nilo Romero",
      numero: "109",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-melhor-em-casa",
    nome: "Programa Melhor em Casa",
    cnes: "9900002",
    telefone: "(79) 3631-0004",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Hipólito Santos",
      numero: "43",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-chmc",
    nome: "CHMC - Centro Humanizado da Mulher e da Criança",
    cnes: "2420635",
    telefone: "(79) 3631-0005",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Hipólito Santos",
      numero: "43",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-ambulatorio-integrar",
    nome: "Ambulatório Integrar",
    cnes: "9900003",
    telefone: "(79) 3631-0006",
    endereco: {
      cep: "49300-000",
      logradouro: "Avenida Contorno",
      numero: "S/N",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-santo-antonio",
    nome: "Clínica de Saúde Santo Antônio [Antônio Viana do Nascimento]",
    cnes: "5548799",
    telefone: "(79) 3631-0007",
    endereco: {
      cep: "49300-000",
      logradouro: "Avenida Contorno",
      numero: "S/N",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-caraibas",
    nome: "Clínica de Saúde Caraíbas [Francisco Hora Alves]",
    cnes: "2420759",
    telefone: "(79) 3631-0008",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Caraíbas",
      numero: "S/N",
      bairro: "Caraíbas",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-crioulo",
    nome: "Clínica de Saúde Crioulo [José Antônio de Menezes - Meroba]",
    cnes: "2420775",
    telefone: "(79) 3631-0009",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Crioulo",
      numero: "S/N",
      bairro: "Crioulo",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-especialidades-otacilia",
    nome: "Centro de Especialidades Médicas Otacília Modesto Ribeiro",
    cnes: "3093743",
    telefone: "(79) 3631-0010",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Padre Álvares Pitangueira",
      numero: "26",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-cer-iii",
    nome: "CER III - Centro Especializado em Reabilitação",
    cnes: "9900004",
    telefone: "(79) 3631-0011",
    endereco: {
      cep: "49300-000",
      logradouro: "Avenida Senador Lourival Baptista",
      numero: "750",
      bairro: "Estação",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-ceo",
    nome: "CEO - Centro de Especialidades Odontológicas",
    cnes: "3976149",
    telefone: "(79) 3631-0012",
    endereco: {
      cep: "49300-000",
      logradouro: "Avenida Contorno",
      numero: "422",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-caps-ad",
    nome: "CAPS AD João Rosendo dos Santos",
    cnes: "6359825",
    telefone: "(79) 3631-0013",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Anísio José de Almeida",
      numero: "S/N",
      bairro: "Estação",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-capii-aconchego",
    nome: "CAPII Aconchego",
    cnes: "8015295",
    telefone: "(79) 3631-0014",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Nilo Romero",
      numero: "109",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-acolher",
    nome: "Acolher - Espaço Integrado de Saúde Mental",
    cnes: "4827961",
    telefone: "(79) 3631-0015",
    endereco: {
      cep: "49300-000",
      logradouro: "Travessa Anchieta",
      numero: "288",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-mariquita",
    nome: "Clínica de Saúde Mariquita [Cecília Maria da Conceição]",
    cnes: "9900005",
    telefone: "(79) 3631-0018",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Mariquita",
      numero: "S/N",
      bairro: "Mariquita",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-araca",
    nome: "Clínica de Saúde Araçá [Cecília Bezerra da Silva]",
    cnes: "2680149",
    telefone: "(79) 3631-0019",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Araçá",
      numero: "S/N",
      bairro: "Araçá",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-academia-saude",
    nome: "Academia da Saúde",
    cnes: "9900006",
    telefone: "(79) 3631-0020",
    endereco: {
      cep: "49300-000",
      logradouro: "Praça Geremias Monteiro de Carvalho",
      numero: "S/N",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-acuzinho",
    nome: "Clínica de Saúde Açuzinho [Margarida do Espírito Santo]",
    cnes: "2420740",
    telefone: "(79) 3631-0021",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Açuzinho",
      numero: "S/N",
      bairro: "Açuzinho",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-dr-davi",
    nome: "Clínica de Saúde Dr. Davi Marcos de Lima",
    cnes: "2680122",
    telefone: "(79) 3631-0022",
    endereco: {
      cep: "49300-000",
      logradouro: "Avenida Francisco Antônio de Figueiredo",
      numero: "1052",
      bairro: "São José",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-alto-boa-vista",
    nome: "Clínica de Saúde Alto da Boa Vista [Jailton Patrício do Nascimento]",
    cnes: "3048039",
    telefone: "(79) 3631-0023",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua do Alto, S/N",
      numero: "S/N",
      bairro: "Alto da Boa Vista",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-brasilia",
    nome: "Clínica de Saúde Brasília [Raimunda Reis]",
    cnes: "2420511",
    telefone: "(79) 3631-0024",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Brasília",
      numero: "S/N",
      bairro: "Brasília",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-jenipapo",
    nome: "Clínica de Saúde Jenipapo [Givaldo dos Santos Almeida]",
    cnes: "9900007",
    telefone: "(79) 3631-0025",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Jenipapo",
      numero: "S/N",
      bairro: "Jenipapo",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-olhos-dagua",
    nome: "Clínica de Saúde Olhos D'Água [Alcino Correia dos Santos]",
    cnes: "2420821",
    telefone: "(79) 3631-0026",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Olhos D'Água",
      numero: "S/N",
      bairro: "Olhos D'Água",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-brejo",
    nome: "Clínica de Saúde Brejo [José Serafim dos Santos]",
    cnes: "2420546",
    telefone: "(79) 3631-0027",
    endereco: {
      cep: "49300-000",
      logradouro: "Estrada Principal",
      numero: "S/N",
      bairro: "Brejo",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-cidade-nova",
    nome: "Clínica de Saúde Cidade Nova [José Bispo de Souza]",
    cnes: "2420805",
    telefone: "(79) 3631-0028",
    endereco: {
      cep: "49300-000",
      logradouro: "Estrada Sítio de Jason",
      numero: "S/N",
      bairro: "Cidade Nova",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-posto-leite",
    nome: "Clínica de Saúde Posto do Leite [Leandro Maciel]",
    cnes: "2420767",
    telefone: "(79) 3631-0029",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Nilo Romero",
      numero: "92",
      bairro: "Centro",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-pururuca",
    nome: "Clínica de Saúde Pururuca [Pedro Félix dos Santos]",
    cnes: "2503794",
    telefone: "(79) 3631-0030",
    endereco: {
      cep: "49300-000",
      logradouro: "Povoado Pururuca",
      numero: "S/N",
      bairro: "Pururuca",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-campo-vila",
    nome: "Clínica de Saúde Campo da Vila [Josefa Barbosa Reis Romão]",
    cnes: "2420538",
    telefone: "(79) 3631-0032",
    endereco: {
      cep: "49300-000",
      logradouro: "Rua Treze",
      numero: "90",
      bairro: "Ademar de Carvalho",
      cidade: "Lagarto",
      uf: "SE"
    },
    horarioFuncionamento: "07:00 - 17:00"
  }
];

export class MockUbsRepository implements IUbsRepository {
  async listarTodas(): Promise<UBS[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return MOCK_UBSS;
  }

  async obterPorId(id: string): Promise<UBS | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const ubs = MOCK_UBSS.find(u => u.id === id);
    return ubs || null;
  }

  async obterPorCnes(cnes: string): Promise<UBS | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const ubs = MOCK_UBSS.find(u => u.cnes === cnes);
    return ubs || null;
  }

  async buscarPorNomeOuFiltro(query: string): Promise<UBS[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const cleanQuery = query.toLowerCase();
    return MOCK_UBSS.filter(
      ubs =>
        ubs.nome.toLowerCase().includes(cleanQuery) ||
        ubs.endereco.cidade.toLowerCase().includes(cleanQuery) ||
        ubs.endereco.bairro.toLowerCase().includes(cleanQuery) ||
        ubs.cnes.includes(cleanQuery)
    );
  }
}
