import { UBS } from "@/core/domain/entities/UBS";
import { IUbsRepository } from "@/core/domain/repositories/IUbsRepository";

const MOCK_UBSS: UBS[] = [
  {
    id: "ubs-centro",
    nome: "UBS Centro - Dr. José de Alencar",
    cnes: "1234567",
    telefone: "(11) 4002-8922",
    endereco: {
      cep: "01001-000",
      logradouro: "Praça da Sé",
      numero: "100",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP"
    },
    latitude: -23.55052,
    longitude: -46.633308,
    horarioFuncionamento: "07:00 - 19:00"
  },
  {
    id: "ubs-vila-nova",
    nome: "UBS Vila Nova - Enf. Maria Souza",
    cnes: "2345678",
    telefone: "(11) 4002-8923",
    endereco: {
      cep: "04533-000",
      logradouro: "Rua Joaquim Floriano",
      numero: "450",
      bairro: "Itaim Bibi",
      cidade: "São Paulo",
      uf: "SP"
    },
    latitude: -23.584347,
    longitude: -46.677568,
    horarioFuncionamento: "07:00 - 17:00"
  },
  {
    id: "ubs-jardim-flores",
    nome: "UBS Jardim das Flores",
    cnes: "3456789",
    telefone: "(11) 4002-8924",
    endereco: {
      cep: "05835-005",
      logradouro: "Avenida das Flores",
      numero: "1200",
      bairro: "Jardim das Flores",
      cidade: "São Paulo",
      uf: "SP"
    },
    latitude: -23.65593,
    longitude: -46.75932,
    horarioFuncionamento: "08:00 - 18:00"
  },
  {
    id: "ubs-parque-nacoes",
    nome: "UBS Parque das Nações - Dr. Nelson Mandela",
    cnes: "4567890",
    telefone: "(11) 4002-8925",
    endereco: {
      cep: "09210-000",
      logradouro: "Avenida dos Estados",
      numero: "5000",
      bairro: "Parque das Nações",
      cidade: "Santo André",
      uf: "SP"
    },
    latitude: -23.62678,
    longitude: -46.51234,
    horarioFuncionamento: "07:00 - 17:00"
  }
];

export class MockUbsRepository implements IUbsRepository {
  async listarTodas(): Promise<UBS[]> {
    // Simula latência de rede
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_UBSS;
  }

  async obterPorId(id: string): Promise<UBS | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const ubs = MOCK_UBSS.find(u => u.id === id);
    return ubs || null;
  }

  async obterPorCnes(cnes: string): Promise<UBS | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const ubs = MOCK_UBSS.find(u => u.cnes === cnes);
    return ubs || null;
  }

  async buscarPorNomeOuFiltro(query: string): Promise<UBS[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
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
