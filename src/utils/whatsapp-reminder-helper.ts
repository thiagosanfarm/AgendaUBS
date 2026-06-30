import { Agendamento } from "@/core/domain/entities/Agendamento";
import { Paciente } from "@/core/domain/entities/Paciente";
import { validarTelefone } from "@/utils/validators";

export interface ResultadoVarreduraLembretes {
  enviados: number;
  falhas: number;
  novosAgendamentos: Agendamento[];
}

/**
 * Varre todos os agendamentos e dispara os lembretes do WhatsApp
 * respeitando as preferências de antecedência e validações de telefone.
 */
export async function verificarEEnviarLembretes(
  agendamentos: Agendamento[],
  pacientes: Paciente[],
  dataReferencia: Date = new Date("2026-06-30T19:25:53-03:00") // Sincronizado com a data do sistema
): Promise<ResultadoVarreduraLembretes> {
  let enviadosCount = 0;
  let falhasCount = 0;
  const novosAgendamentos = [...agendamentos];

  const dataAtualStr = dataReferencia.toISOString().split("T")[0];
  const horaAtualStr = dataReferencia.toTimeString().split(" ")[0].slice(0, 5);

  const dataReferenciaZero = new Date(dataAtualStr + "T00:00:00");

  for (let i = 0; i < novosAgendamentos.length; i++) {
    const a = novosAgendamentos[i];

    // Regra: Apenas agendamentos confirmados (status 'agendado')
    if (a.status !== "agendado") continue;

    // Impedir envio duplicado se já foi enviado com sucesso
    if (a.lembreteWhatsApp?.enviado) continue;

    const pac = pacientes.find(p => p.id === a.pacienteId);
    if (!pac) continue;

    // Verificar se o paciente desativou a notificação nas preferências
    if (pac.preferenciaWhatsApp === false) {
      // Registrar falha/aviso apenas se ainda não logamos
      if (!a.lembreteWhatsApp) {
        novosAgendamentos[i] = {
          ...a,
          lembreteWhatsApp: {
            enviado: false,
            dataEnvio: dataAtualStr,
            horarioEnvio: horaAtualStr,
            statusEntrega: "falha",
            motivoErro: "Notificações desativadas pelo paciente nas preferências do perfil."
          }
        };
        falhasCount++;
      }
      continue;
    }

    // Obter antecedência de dias configurada no perfil (padrão: 1 dia)
    const antecedenciaDias = pac.antecedenciaWhatsAppDias !== undefined ? pac.antecedenciaWhatsAppDias : 1;

    // Data do atendimento
    const dataAtendimentoZero = new Date(a.data + "T00:00:00");

    // Diferença em dias
    const diffTime = dataAtendimentoZero.getTime() - dataReferenciaZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Se estiver no dia do envio ou for hoje/passado (em caso de atraso na varredura)
    if (diffDays <= antecedenciaDias && diffDays >= 0) {
      // Validar telefone cadastrado
      const foneLimpo = pac.telefone.replace(/\D/g, "");
      if (!validarTelefone(foneLimpo)) {
        novosAgendamentos[i] = {
          ...a,
          lembreteWhatsApp: {
            enviado: false,
            dataEnvio: dataAtualStr,
            horarioEnvio: horaAtualStr,
            statusEntrega: "falha",
            motivoErro: `Número de telefone inválido no cadastro: "${pac.telefone}". Use o formato celular brasileiro.`
          }
        };
        falhasCount++;
        continue;
      }

      // Sucesso no envio do lembrete
      novosAgendamentos[i] = {
        ...a,
        lembreteWhatsApp: {
          enviado: true,
          dataEnvio: dataAtualStr,
          horarioEnvio: horaAtualStr,
          statusEntrega: "entregue",
          confirmadoPaciente: false
        }
      };
      enviadosCount++;
    }
  }

  return {
    enviados: enviadosCount,
    falhas: falhasCount,
    novosAgendamentos
  };
}

/**
 * Cria a mensagem do WhatsApp pré-formatada.
 */
export function formatarMensagemWhatsAppLembrete(a: Agendamento, pacNome: string): string {
  const dataBr = a.data.split("-").reverse().join("/");
  return `Olá, *${pacNome}*! Lembrete da sua consulta agendada:\n\n` +
         `🩺 *Serviço:* ${a.tipo === "consulta" ? "Consulta Médica" : "Exame Clínico"}\n` +
         `📋 *Especialidade:* ${a.especialidade}\n` +
         `📅 *Data:* ${dataBr}\n` +
         `🕒 *Horário:* ${a.horario}\n` +
         `🏢 *Local:* ${a.ubsNome}\n\n` +
         `Por favor, utilize os botões abaixo no painel para confirmar sua presença ou solicitar reagendamento, se necessário. Se cuide!`;
}
