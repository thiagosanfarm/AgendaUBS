/**
 * Retorna o nome do dia da semana em português.
 * @param dataIso string no formato YYYY-MM-DD
 */
export function obterNomeDiaSemana(dataIso: string): string {
  const date = new Date(dataIso + 'T12:00:00'); // T12:00:00 evita desvio de fuso horário
  const dias = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];
  return dias[date.getDay()];
}

/**
 * Retorna a data formatada por extenso.
 * Exemplo: "27 de Junho de 2026"
 * @param dataIso string no formato YYYY-MM-DD
 */
export function obterDataPorExtenso(dataIso: string): string {
  if (!dataIso) return '';
  const date = new Date(dataIso + 'T12:00:00');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Verifica se a data e o horário informados já passaram em relação ao momento atual.
 */
export function verificarHorarioNoPassado(dataIso: string, horario: string): boolean {
  const agora = new Date();
  const dataComparacao = new Date(`${dataIso}T${horario}:00`);
  return dataComparacao < agora;
}

/**
 * Retorna uma lista de datas (formato YYYY-MM-DD) dos próximos N dias,
 * permitindo opcionalmente excluir domingos (quando a maioria das UBSs fecha).
 */
export function obterProximosDias(totalDias: number, incluirDomingo = false): string[] {
  const datas: string[] = [];
  const hoje = new Date();

  for (let i = 0; i < totalDias; i++) {
    const dataAlvo = new Date(hoje);
    dataAlvo.setDate(hoje.getDate() + i);
    
    // Se não for para incluir domingo (dia 0), pula
    if (!incluirDomingo && dataAlvo.getDay() === 0) {
      totalDias++; // estende o loop para garantir o número total de dias úteis desejado
      continue;
    }

    const yyyy = dataAlvo.getFullYear();
    const mm = String(dataAlvo.getMonth() + 1).padStart(2, '0');
    const dd = String(dataAlvo.getDate()).padStart(2, '0');
    datas.push(`${yyyy}-${mm}-${dd}`);
  }

  return datas;
}
