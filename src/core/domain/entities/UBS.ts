export interface UBS {
  id: string;
  nome: string;
  cnes: string; // Cadastro Nacional de Estabelecimentos de Saúde
  telefone: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  latitude?: number;
  longitude?: number;
  horarioFuncionamento: string; // Ex: "07:00 - 17:00"
  prazoMinimoCancelamentoHoras?: number; // Prazo mínimo em horas para cancelamento de agendamento
}
