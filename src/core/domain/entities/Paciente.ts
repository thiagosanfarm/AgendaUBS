export interface Paciente {
  id: string;
  nomeCompleto: string;
  cpf: string;
  cns: string; // Cartão Nacional de Saúde (SUS)
  dataNascimento: string; // ISO 8601 (YYYY-MM-DD)
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
  senha: string; // Senha criptografada/armazenada
  dataCriacao: string;
  papel?: 'paciente' | 'administrador';
  ubsId?: string; // ID da UBS vinculada (para administradores/gestores)
}
