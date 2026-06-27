"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { MockProfissionalRepository } from "@/infra/api/repositories/MockProfissionalRepository";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { CriarAgendamento } from "@/core/use-cases/CriarAgendamento";
import { UBS } from "@/core/domain/entities/UBS";
import { Profissional } from "@/core/domain/entities/Profissional";
import { TipoAgendamento } from "@/core/domain/entities/Agendamento";
import { obterProximosDias, obterNomeDiaSemana, obterDataPorExtenso } from "@/utils/date-helpers";
import { formatarDataBr } from "@/utils/formatters";
import { toast } from "sonner";
import { 
  Building, 
  Search, 
  Stethoscope, 
  CalendarCheck, 
  Clock, 
  User, 
  Activity, 
  ChevronRight, 
  ChevronLeft,
  Info,
  AlertTriangle,
  RefreshCw,
  Zap,
  Users,
  Check
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ubsRepository = new MockUbsRepository();
const profissionalRepository = new MockProfissionalRepository();
const agendamentoRepository = new LocalStorageAgendamentoRepository();
const criarAgendamentoUseCase = new CriarAgendamento(agendamentoRepository);

// Dicionário de descrições e categorizações de especialidades para Consultas (R011)
const DESCRICOES_ESPECIALIDADES: Record<string, { nomeExibicao: string; descricao: string; categoria: string }> = {
  "Clínico Geral": {
    nomeExibicao: "Clínico Geral",
    descricao: "Consultas de rotina, check-ups, receitas médicas e encaminhamento para especialistas.",
    categoria: "Consultas Médicas"
  },
  "Médico de Família e Comunidade": {
    nomeExibicao: "Médico de Família e Comunidade (MFC)",
    descricao: "Atendimento integral e contínuo ao indivíduo e à família na comunidade.",
    categoria: "Consultas Médicas"
  },
  "Pediatria": {
    nomeExibicao: "Pediatria",
    descricao: "Atendimento voltado para a saúde e desenvolvimento de bebês, crianças e adolescentes.",
    categoria: "Consultas Médicas"
  },
  "Ginecologia e Obstetrícia": {
    nomeExibicao: "Ginecologia e Obstetrícia",
    descricao: "Saúde reprodutiva da mulher, exames preventivos, acompanhamento gestacional e parto.",
    categoria: "Consultas Médicas"
  },
  "Cardiologia": {
    nomeExibicao: "Cardiologia",
    descricao: "Diagnóstico, tratamento e prevenção de doenças cardíacas e do sistema circulatório.",
    categoria: "Consultas Médicas"
  },
  "Dermatologia": {
    nomeExibicao: "Dermatologia",
    descricao: "Cuidados com a pele, cabelos e unhas, diagnóstico de lesões e alergias cutâneas.",
    categoria: "Consultas Médicas"
  },
  "Psiquiatria": {
    nomeExibicao: "Psiquiatria",
    descricao: "Apoio à saúde mental, diagnóstico e tratamento de transtornos emocionais ou químicos.",
    categoria: "Consultas Médicas"
  },
  "Geriatria": {
    nomeExibicao: "Geriatria",
    descricao: "Atendimento médico preventivo e terapêutico para idosos e envelhecimento saudável.",
    categoria: "Consultas Médicas"
  },
  "Endocrinologia": {
    nomeExibicao: "Endocrinologia",
    descricao: "Diagnóstico e tratamento de desordens hormonais, diabetes, tireoide e obesidade.",
    categoria: "Consultas Médicas"
  },
  "Infectologia": {
    nomeExibicao: "Infectologia",
    descricao: "Tratamento de infecções bacterianas, virais, parasitárias e acompanhamento epidemiológico.",
    categoria: "Consultas Médicas"
  },
  "Consulta de Enfermagem": {
    nomeExibicao: "Consulta de Enfermagem",
    descricao: "Acolhimento de enfermagem, acompanhamento de dores crônicas, pressão e diabetes.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Imunização (Vacinação)": {
    nomeExibicao: "Imunização (Vacinação)",
    descricao: "Aplicação de vacinas do calendário nacional e orientações de imunização preventiva.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Acompanhamento Pré-Natal": {
    nomeExibicao: "Acompanhamento Pré-Natal",
    descricao: "Consultas periódicas de acompanhamento da gestante e saúde do bebê na gravidez.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Curativos": {
    nomeExibicao: "Curativos e Suturas",
    descricao: "Limpeza, higienização, curativos em feridas e retirada de pontos cirúrgicos.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Coleta de Exames": {
    nomeExibicao: "Coleta de Exames",
    descricao: "Retirada de amostras de sangue, urina e fezes para análises laboratoriais.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Testes Rápidos (HIV, Sífilis, Hepatites)": {
    nomeExibicao: "Testes Rápidos (DST/Aids/Hepatites)",
    descricao: "Exames rápidos de triagem para ISTs com entrega de resultado sigiloso em 15 minutos.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Puericultura": {
    nomeExibicao: "Puericultura (Acompanhamento Infantil)",
    descricao: "Monitoramento de crescimento, desenvolvimento, peso e vacinação de bebês.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Hiperdia (Hipertensão e Diabetes)": {
    nomeExibicao: "Hiperdia (Hipertensos e Diabéticos)",
    descricao: "Acompanhamento clínico continuado e entrega de medicamentos para pressão e diabetes.",
    categoria: "Enfermagem e Procedimentos"
  },
  "Odontologia Geral": {
    nomeExibicao: "Saúde Bucal (Dentista Geral)",
    descricao: "Tratamentos dentários preventivos, restaurações, extrações e limpeza bucal geral.",
    categoria: "Saúde Bucal"
  },
  "Odontopediatria": {
    nomeExibicao: "Odontologia Infantil",
    descricao: "Tratamento dentário infantil voltado para a saúde e prevenção de cáries em crianças.",
    categoria: "Saúde Bucal"
  },
  "Periodontia": {
    nomeExibicao: "Tratamento de Gengiva (Periodontia)",
    descricao: "Prevenção, diagnóstico e tratamento de inflamações na gengiva e tecidos de suporte.",
    categoria: "Saúde Bucal"
  },
  "Endodontia": {
    nomeExibicao: "Tratamento de Canal (Endodontia)",
    descricao: "Diagnóstico e tratamento de polpa dentária infeccionada ou com dor de dente.",
    categoria: "Saúde Bucal"
  },
  "Cirurgia Oral Menor": {
    nomeExibicao: "Cirurgia Oral Menor",
    descricao: "Pequenos procedimentos cirúrgicos orais na UBS, como remoção de dentes inclusos.",
    categoria: "Saúde Bucal"
  },
  "Psicologia Clínica": {
    nomeExibicao: "Psicologia Clínica (Psicólogo)",
    descricao: "Sessões de terapia, acolhimento e escuta clínica individual sobre saúde mental.",
    categoria: "Equipe Multiprofissional"
  },
  "Psicologia Infantil": {
    nomeExibicao: "Psicologia Infantil",
    descricao: "Apoio psicológico infantil focado no desenvolvimento comportamental e de aprendizado.",
    categoria: "Equipe Multiprofissional"
  },
  "Atendimento em Grupo": {
    nomeExibicao: "Atendimento Psicoterapêutico em Grupo",
    descricao: "Rodas de conversa estruturadas, apoio mútuo e terapia em grupo da comunidade.",
    categoria: "Equipe Multiprofissional"
  },
  "Consulta Nutricional": {
    nomeExibicao: "Consulta Nutricional (Nutricionista)",
    descricao: "Avaliação alimentar, reeducação de hábitos e planos de emagrecimento ou ganho de peso.",
    categoria: "Equipe Multiprofissional"
  },
  "Reeducação Alimentar": {
    nomeExibicao: "Reeducação Alimentar",
    descricao: "Orientações para mudança de hábitos alimentares visando prevenção e saúde digestiva.",
    categoria: "Equipe Multiprofissional"
  },
  "Atenção Farmacêutica": {
    nomeExibicao: "Atenção Farmacêutica (Farmacêutico)",
    descricao: "Consulta com farmacêutico para alinhamento de remédios de uso crônico.",
    categoria: "Equipe Multiprofissional"
  },
  "Orientação sobre Uso Correto de Medicamentos": {
    nomeExibicao: "Orientação e Uso de Medicamentos",
    descricao: "Tira-dúvidas sobre horários, efeitos colaterais e interações medicamentosas.",
    categoria: "Equipe Multiprofissional"
  },
  "Atendimento Social": {
    nomeExibicao: "Serviço Social (Assistente Social)",
    descricao: "Acolhimento sobre direitos civis, benefícios sociais do governo e vulnerabilidade familiar.",
    categoria: "Equipe Multiprofissional"
  },
  "Encaminhamento para Benefícios": {
    nomeExibicao: "Encaminhamento e Programas Sociais",
    descricao: "Triagem para inclusão no Bolsa Família, BPC (LOAS) e programas habitacionais.",
    categoria: "Equipe Multiprofissional"
  },
  "Fisioterapia Ortopédica": {
    nomeExibicao: "Fisioterapia Ortopédica",
    descricao: "Reabilitação de fraturas, entorses, dores na coluna, dores articulares e tendinite.",
    categoria: "Equipe Multiprofissional"
  },
  "Fisioterapia Neurológica": {
    nomeExibicao: "Fisioterapia Neurológica",
    descricao: "Reabilitação motora pós-AVC, Parkinson, Alzheimer e outras disfunções do sistema nervoso.",
    categoria: "Equipe Multiprofissional"
  },
  "Avaliação Física": {
    nomeExibicao: "Educação Física (Avaliação Corporal)",
    descricao: "Medição de IMC, percentual de gordura e prescrição de treinos preventivos na UBS.",
    categoria: "Equipe Multiprofissional"
  },
  "Grupos de Caminhada": {
    nomeExibicao: "Grupo de Caminhada Orientada",
    descricao: "Caminhadas coletivas com orientação física, aferição de pressão e alongamentos.",
    categoria: "Equipe Multiprofissional"
  },
  "Avaliação da Fala": {
    nomeExibicao: "Fonoaudiologia (Avaliação da Fala e Voz)",
    descricao: "Diagnóstico e tratamento de distúrbios da fala, gagueira, rouquidão e audição.",
    categoria: "Equipe Multiprofissional"
  },
  "Linguagem Infantil": {
    nomeExibicao: "Linguagem e Aprendizado Infantil",
    descricao: "Tratamento fonoaudiológico para atrasos de fala, leitura e escrita in crianças.",
    categoria: "Equipe Multiprofissional"
  },
  "Desenvolvimento Infantil": {
    nomeExibicao: "Terapia Ocupacional (Desenvolvimento)",
    descricao: "Terapia ocupacional para estímulo motor e cognitivo de crianças com atrasos de desenvolvimento.",
    categoria: "Equipe Multiprofissional"
  },
  "Estimulação Cognitiva": {
    nomeExibicao: "Terapia Ocupacional (Cognição e Memória)",
    descricao: "Atendimento terapêutico para idosos e adultos com perda de memória ou declínio cognitivo.",
    categoria: "Equipe Multiprofissional"
  }
};

// Mapeamento e descrições de Exames Clínicos, Diagnósticos e Procedimentos (R012)
const EXAMES_SUGERIDOS: Record<string, { nome: string; categoria: string; desc: string }> = {
  // --- Exames Laboratoriais ---
  "Hemograma Completo": { nome: "Hemograma Completo", categoria: "Exames Laboratoriais", desc: "Avaliação de glóbulos vermelhos, brancos e plaquetas do sangue para triagem de anemia e infecções." },
  "Glicemia de Jejum": { nome: "Glicemia de Jejum", categoria: "Exames Laboratoriais", desc: "Medição da glicose sanguínea em jejum para triagem e controle de diabetes." },
  "Hemoglobina Glicada (HbA1c)": { nome: "Hemoglobina Glicada (HbA1c)", categoria: "Exames Laboratoriais", desc: "Média do controle glicêmico no sangue referente aos últimos 90 dias." },
  "Colesterol Total e Frações": { nome: "Colesterol Total e Frações", categoria: "Exames Laboratoriais", desc: "Níveis de HDL, LDL, VLDL e triglicerídeos para saúde cardiovascular." },
  "Creatinina e Ureia": { nome: "Creatinina e Ureia", categoria: "Exames Laboratoriais", desc: "Avaliação do funcionamento renal e capacidade de filtração." },
  "TGO e TGP": { nome: "Função Hepática (TGO/TGP)", categoria: "Exames Laboratoriais", desc: "Exame de sangue para avaliar a saúde e enzimas do fígado." },
  "TSH e T4 Livre": { nome: "TSH e T4 Livre", categoria: "Exames Laboratoriais", desc: "Dosagem hormonal para acompanhamento da tireoide." },
  "Vitamina D e B12": { nome: "Vitamina D e B12", categoria: "Exames Laboratoriais", desc: "Níveis vitamínicos no sangue para suporte imunológico e nervoso." },

  // --- Exames de Urina ---
  "Urina Tipo I (EAS)": { nome: "Urina Tipo I (EAS)", categoria: "Exames de Urina", desc: "Análise física e química da urina para detectar infecções ou problemas renais." },
  "Urocultura com Antibiograma": { nome: "Urocultura com Antibiograma", categoria: "Exames de Urina", desc: "Cultura biológica para identificar bactérias causadoras de infecção urinária." },

  // --- Exames de Fezes ---
  "Parasitológico de Fezes": { nome: "Parasitológico de Fezes (EPF)", categoria: "Exames de Fezes", desc: "Pesquisa de vermes e parasitas intestinais nas fezes." },
  "Pesquisa de Sangue Oculto": { nome: "Pesquisa de Sangue Oculto nas Fezes", categoria: "Exames de Fezes", desc: "Triagem preventiva para sangramentos internos no trato digestório." },

  // --- Testes Rápidos ---
  "Teste Rápido HIV": { nome: "Teste Rápido HIV", categoria: "Testes Rápidos", desc: "Exame rápido e sigiloso de sangue para triagem de infecção por HIV." },
  "Teste Rápido Sífilis": { nome: "Teste Rápido Sífilis", categoria: "Testes Rápidos", desc: "Diagnóstico rápido da infecção por sífilis via punção digital." },
  "Teste Rápido Hepatites (B e C)": { nome: "Teste Rápido Hepatite B e C", categoria: "Testes Rápidos", desc: "Detecção rápida de anticorpos ou antígenos para hepatites virais." },
  "Teste Rápido COVID-19": { nome: "Teste Rápido COVID-19 / Dengue", categoria: "Testes Rápidos", desc: "Triagem rápida de antígenos para infecção ativa por vírus respiratórios ou dengue." },

  // --- Cardiologia ---
  "Eletrocardiograma (ECG)": { nome: "Eletrocardiograma (ECG)", categoria: "Cardiologia", desc: "Avaliação rápida do ritmo cardíaco e condução elétrica do coração." },
  "Holter 24h": { nome: "Holter 24h", categoria: "Cardiologia", desc: "Registro contínuo do eletrocardiograma durante as atividades diárias por 24 horas." },
  "MAPA 24h": { nome: "Monitoramento de Pressão (MAPA)", categoria: "Cardiologia", desc: "Monitorização automática da pressão arterial ao longo de 24 horas." },

  // --- Pneumologia ---
  "Espirometria": { nome: "Espirometria (Sopro)", categoria: "Pneumologia", desc: "Medição de volumes de ar soprados para triagem de asma ou bronquite crônica." },

  // --- Radiologia ---
  "Raio-X de Tórax": { nome: "Raio-X de Tórax", categoria: "Radiologia", desc: "Exame de imagem dos pulmões, costelas e silhueta cardíaca." },
  "Raio-X de Coluna": { nome: "Raio-X de Coluna", categoria: "Radiologia", desc: "Avaliação das vértebras da coluna cervical, torácica ou lombar." },
  "Raio-X de Extremidades": { nome: "Raio-X de Articulações (Mão/Pé/Joelho)", categoria: "Radiologia", desc: "Avaliação de ossos e articulações periféricas." },

  // --- Ultrassonografia ---
  "Ultrassom de Abdome Total": { nome: "Ultrassom de Abdome Total", categoria: "Ultrassonografia", desc: "Visualização por imagem dos órgãos da cavidade abdominal." },
  "Ultrassom Transvaginal": { nome: "Ultrassom Transvaginal", categoria: "Ultrassonografia", desc: "Exame ginecológico interno para saúde reprodutiva, útero e ovários." },
  "Ultrassom Obstétrico": { nome: "Ultrassom Obstétrico (Gestante)", categoria: "Ultrassonografia", desc: "Exame de ultrassom gestacional para acompanhamento de desenvolvimento fetal." },
  "Ultrassom de Mamas": { nome: "Ultrassom de Mamas", categoria: "Ultrassonografia", desc: "Avaliação de nódulos ou cistos nas mamas." },
  "Ultrassom de Tireoide": { nome: "Ultrassom de Tireoide", categoria: "Ultrassonografia", desc: "Visualização anatômica por imagem de nódulos na tireoide." },

  // --- Oftalmologia ---
  "Acuidade Visual": { nome: "Acuidade Visual (Tabela)", categoria: "Oftalmologia", desc: "Teste de leitura de letras em diferentes tamanhos para verificar foco e visão." },

  // --- Otorrinolaringologia ---
  "Audiometria": { nome: "Audiometria", categoria: "Otorrinolaringologia", desc: "Avaliação auditiva em cabine acústica para medição dos limiares de audição." },

  // --- Odontologia ---
  "Radiografia Panorâmica": { nome: "Radiografia Panorâmica Dentária", categoria: "Odontologia", desc: "Imagem panorâmica completa da arcada dentária para diagnóstico odontológico." },

  // --- Saúde da Mulher ---
  "Preventivo (Papanicolau)": { nome: "Preventivo (Papanicolau)", categoria: "Saúde da Mulher", desc: "Coleta ginecológica preventiva periódica contra o câncer de colo de útero." },
  "Mamografia Bilateral": { nome: "Mamografia Bilateral de Rastreamento", categoria: "Saúde da Mulher", desc: "Exame de raio-x das mamas para rastreamento precoce do câncer de mama." },

  // --- Saúde do Homem ---
  "PSA Total e Livre": { nome: "PSA (Antígeno Prostático)", categoria: "Saúde do Homem", desc: "Exame de sangue para avaliação preventiva da glândula da próstata." },

  // --- Ortopedia ---
  "Densitometria Óssea": { nome: "Densitometria Óssea", categoria: "Ortopedia", desc: "Avaliação por imagem da masa e minerais dos ossos contra osteoporose." },

  // --- Exames Neonatais ---
  "Teste do Pezinho": { nome: "Teste do Pezinho", categoria: "Exames Neonatais", desc: "Triagem metabólica em recém-nascidos feita nos primeiros dias de vida." },
  "Teste da Orelhinha": { nome: "Teste da Orelhinha / Olhinho", categoria: "Exames Neonatais", desc: "Triagem auditiva e visual neonatal preventiva de cegueira ou surdez." },

  // --- Procedimentos de Enfermagem e Ambulatoriais (Novo Módulo) ---
  "Vacinação": { nome: "Vacinação", categoria: "Procedimentos", desc: "Aplicação de imunizantes e atualização da Caderneta de Vacinação." },
  "Curativos": { nome: "Curativos", categoria: "Procedimentos", desc: "Tratamento, assepsia e higienização de feridas ou lesões crônicas." },
  "Retirada de Pontos": { nome: "Retirada de Pontos", categoria: "Procedimentos", desc: "Retirada de suturas cirúrgicas pós-procedimentos ou alta médica." },
  "Nebulização": { nome: "Nebulização (Inalação)", categoria: "Procedimentos", desc: "Administração de medicamentos inalatórios para vias aéreas." },
  "Administração de Medicamentos": { nome: "Administração de Medicamentos", categoria: "Procedimentos", desc: "Aplicação de remédios injetáveis (intramuscular ou intravenoso) receitados." },
  "Aferição de Pressão Arterial": { nome: "Aferição de Pressão Arterial", categoria: "Procedimentos", desc: "Medição da pressão arterial sistólica e diastólica." },
  "Teste de Glicemia Capilar": { nome: "Teste de Glicemia Capilar", categoria: "Procedimentos", desc: "Pequena punção digital para medição imediata do nível de açúcar no sangue." },
  "Coleta de Material para Exames": { nome: "Coleta de Material para Exames", categoria: "Procedimentos", desc: "Coletas biológicas gerais para envio laboratorial." },
  "Lavagem de Ouvido": { nome: "Lavagem de Ouvido (Cerúmen)", categoria: "Procedimentos", desc: "Remoção de excesso de cera de ouvido com solução morna sob indicação médica." },
  "Inserção de DIU": { nome: "Inserção de DIU", categoria: "Procedimentos", desc: "Procedimento médico para inserção de Dispositivo Intrauterino contraceptivo." },
  "Retirada de DIU": { nome: "Retirada de DIU", categoria: "Procedimentos", desc: "Retirada do Dispositivo Intrauterino do útero." },
  "Troca de Sonda": { nome: "Troca de Sonda Vesical/Alimentar", categoria: "Procedimentos", desc: "Substituição programada de cateteres vesicais de demora ou sondas alimentares." },
  "Cateterismo Vesical": { nome: "Cateterismo Vesical (Alívio)", categoria: "Procedimentos", desc: "Esvaziamento da bexiga por meio de introdução de sonda estéril." },
  "Oxigenoterapia": { nome: "Oxigenoterapia", categoria: "Procedimentos", desc: "Suplementação de oxigênio sob prescrição médica na unidade." },
  "Pequenas Cirurgias Ambulatoriais": { nome: "Pequenas Cirurgias Ambulatoriais", desc: "Pequenos procedimentos cirúrgicos locais (ex: remoção de verrugas, cistos sebáceos).", categoria: "Procedimentos" }
};

// Categorias/Módulos de Exames e Procedimentos para o R012
const CATEGORIAS_EXAMES = [
  { id: "Todos", nome: "Todos os Serviços", desc: "Visualização unificada de todo o catálogo.", icon: Users },
  { id: "Procedimentos", nome: "Procedimentos Clínicos", desc: "Vacinas, curativos, DIU, etc.", icon: Zap },
  { id: "Exames Laboratoriais", nome: "Laboratoriais (Sangue)", desc: "Hemograma, Glicose, Vitaminas.", icon: Activity },
  { id: "Exames de Urina", nome: "Exames de Urina", desc: "EAS, Urocultura.", icon: Info },
  { id: "Exames de Fezes", nome: "Exames de Fezes", desc: "Parasitológico, Sangue Oculto.", icon: Info },
  { id: "Testes Rápidos", nome: "Testes Rápidos", desc: "HIV, Sífilis, Hepatites, Dengue.", icon: Zap },
  { id: "Cardiologia", nome: "Cardiologia", desc: "ECG, MAPA, Holter.", icon: Stethoscope },
  { id: "Pneumologia", nome: "Respiratórios", desc: "Espirometria e Capacidade.", icon: Activity },
  { id: "Radiologia", nome: "Radiologia (Raio-X)", desc: "Tórax, Coluna, Articulações.", icon: Building },
  { id: "Ultrassonografia", nome: "Ultrassonografia", desc: "Obstétrico, Transvaginal, Mamas.", icon: Users },
  { id: "Oftalmologia", nome: "Oftalmologia", desc: "Acuidade Visual e Exame de Vista.", icon: User },
  { id: "Saúde da Mulher", nome: "Saúde da Mulher", desc: "Preventivo, Mamografia.", icon: Users },
  { id: "Saúde do Homem", nome: "Saúde do Homem", desc: "PSA Total e Livre.", icon: User }
];

// Categorias Profissionais para Consultas (R011)
const CATEGORIAS_PROFISSIONAIS = [
  { id: "Consultas Médicas", nome: "Consultas Médicas", desc: "Consultas com médicos especialistas e generalistas.", icon: Stethoscope },
  { id: "Enfermagem e Procedimentos", nome: "Enfermagem e Procedimentos", desc: "Acolhimento, vacinas e monitoramento de saúde.", icon: Activity },
  { id: "Saúde Bucal", nome: "Saúde Bucal", desc: "Consultas e procedimentos dentários.", icon: User },
  { id: "Equipe Multiprofissional", nome: "Equipe Multiprofissional", desc: "Psicólogos, fisioterapeutas, assistentes sociais e outros.", icon: Users },
];

// Função auxiliadora que resolve o profissional que realiza o exame ou procedimento (R012)
const mapearProfissionalParaExame = (exame: string, profissionaisDaUbs: Profissional[]): Profissional | null => {
  if (profissionaisDaUbs.length === 0) return null;
  
  const nomeExame = exame.toLowerCase();
  
  // Trata procedimentos médicos específicos
  if (nomeExame.includes("diu")) {
    return profissionaisDaUbs.find(p => p.especialidade === "Ginecologia e Obstetrícia" || p.especialidade === "Acompanhamento Pré-Natal" || p.especialidade === "Consulta de Enfermagem") || profissionaisDaUbs[0];
  }
  if (nomeExame.includes("pequenas cirurgias")) {
    return profissionaisDaUbs.find(p => p.especialidade === "Clínico Geral") || profissionaisDaUbs[0];
  }
  if (nomeExame.includes("lavagem de ouvido")) {
    return profissionaisDaUbs.find(p => p.especialidade === "Clínico Geral" || p.especialidade === "Consulta de Enfermagem") || profissionaisDaUbs[0];
  }
  
  // Trata exames e procedimentos cardiológicos
  if (nomeExame.includes("eletrocardiograma") || nomeExame.includes("cardio") || nomeExame.includes("mapa") || nomeExame.includes("holter")) {
    return profissionaisDaUbs.find(p => p.especialidade === "Cardiologia" || p.especialidade === "Clínico Geral") || profissionaisDaUbs[0];
  }
  if (nomeExame.includes("preventivo") || nomeExame.includes("papanicolau") || nomeExame.includes("mamografia") || nomeExame.includes("transvaginal") || nomeExame.includes("obstétrico")) {
    return profissionaisDaUbs.find(p => p.especialidade === "Ginecologia e Obstetrícia" || p.especialidade === "Acompanhamento Pré-Natal" || p.especialidade === "Consulta de Enfermagem") || profissionaisDaUbs[0];
  }
  if (nomeExame.includes("panorâmica") || nomeExame.includes("odontologia") || nomeExame.includes("gengiva") || nomeExame.includes("periodontia") || nomeExame.includes("endodontia")) {
    return profissionaisDaUbs.find(p => p.especialidade === "Odontologia Geral" || p.especialidade === "Odontopediatria" || p.especialidade === "Periodontia") || profissionaisDaUbs[0];
  }
  if (nomeExame.includes("fisioterapia")) {
    return profissionaisDaUbs.find(p => p.especialidade.includes("Fisioterapia")) || profissionaisDaUbs[0];
  }
  if (nomeExame.includes("fala") || nomeExame.includes("linguagem") || nomeExame.includes("audiometria")) {
    return profissionaisDaUbs.find(p => p.especialidade.includes("Fala") || p.especialidade.includes("Linguagem")) || profissionaisDaUbs[0];
  }
  
  // Para procedimentos de enfermagem, vacinas, coletas, curativos, testes rápidos, nebulização, etc. -> Enfermagem
  return profissionaisDaUbs.find(p => p.especialidade === "Consulta de Enfermagem" || p.especialidade === "Imunização (Vacinação)" || p.especialidade === "Acompanhamento Pré-Natal")
    || profissionaisDaUbs.find(p => p.especialidade === "Clínico Geral")
    || profissionaisDaUbs[0];
};

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const { paciente } = useAuth();
  
  // Controle de Etapa (1 a 4)
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de dados selecionados
  const [tipo, setTipo] = useState<TipoAgendamento>("consulta");
  const [ubs, setUbs] = useState<UBS | null>(null);
  const [especialidade, setEspecialidade] = useState(""); // Guarda Especialidade de Consulta OU Nome do Exame/Procedimento
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [dataSel, setDataSel] = useState(""); // YYYY-MM-DD
  const [horarioSel, setHorarioSel] = useState(""); // HH:MM
  const [observacoes, setObservacoes] = useState("");

  // Estados específicos de filtros de especialidade (R011)
  const [categoriaSel, setCategoriaSel] = useState<string>("Consultas Médicas");
  const [buscaEspecialidade, setBuscaEspecialidade] = useState("");

  // Estados específicos para seleção de exames e procedimentos (R012)
  const [categoriaExameSel, setCategoriaExameSel] = useState<string>("Todos");
  const [buscaExame, setBuscaExame] = useState("");
  const [examesSelecionados, setExamesSelecionados] = useState<string[]>([]);

  // Listas de opções
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [ubsFiltradas, setUbsFiltradas] = useState<UBS[]>([]);
  const [termoBuscaUbs, setTermoBuscaUbs] = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);

  // Estados específicos para consulta de agenda reativa (R010)
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState(false);
  const [datasAlternativas, setDatasAlternativas] = useState<string[]>([]);
  const [buscandoAlternativas, setBuscandoAlternativas] = useState(false);

  // Datas disponíveis (próximos 14 dias úteis)
  const datasDisponiveis = obterProximosDias(14, false);

  // Carrega as UBSs inicialmente
  useEffect(() => {
    ubsRepository.listarTodas().then((list) => {
      setTodasUbs(list);
      setUbsFiltradas(list);
    });
  }, []);

  // Filtra as UBSs ao digitar (Etapa 1)
  useEffect(() => {
    const clean = termoBuscaUbs.toLowerCase();
    setUbsFiltradas(
      todasUbs.filter(
        u => u.nome.toLowerCase().includes(clean) || u.endereco.bairro.toLowerCase().includes(clean)
      )
    );
  }, [termoBuscaUbs, todasUbs]);

  // Carrega as especialidades quando a UBS é selecionada (Reativo)
  useEffect(() => {
    if (ubs) {
      profissionalRepository
        .listarEspecialidadesDisponiveis(ubs.id)
        .then((list) => {
          setEspecialidades(list);
          // Se a especialidade/exame atual não pertence a essa UBS, limpa
          if (list.length > 0 && !list.includes(especialidade) && tipo === "consulta") {
            setEspecialidade("");
            setProfissional(null);
            setDataSel("");
            setHorarioSel("");
          }
        });
    }
  }, [ubs, tipo]);

  // Carrega os profissionais quando a especialidade ou o exame/procedimento é selecionado (Reativo)
  useEffect(() => {
    if (ubs && especialidade) {
      if (tipo === "exame") {
        profissionalRepository
          .listarPorUbs(ubs.id)
          .then((list) => {
            const primeiroExame = especialidade.split(", ")[0];
            const resolvedProf = mapearProfissionalParaExame(primeiroExame, list);
            setProfissional(resolvedProf);
          });
      } else {
        // Para consultas normais, puxa apenas daquela especialidade
        profissionalRepository
          .listarPorUbsEEspecialidade(ubs.id, especialidade)
          .then((list) => {
            setProfissionais(list);
            if (profissional && !list.find(p => p.id === profissional.id)) {
              setProfissional(null);
              setDataSel("");
              setHorarioSel("");
            }
          });
      }
    } else {
      setProfissionais([]);
      setProfissional(null);
    }
  }, [ubs, especialidade, tipo]);

  // Função para buscar datas próximas alternativas caso não haja vaga na data atual (R010)
  const buscarDatasAlternativas = async (ubsId: string, profId: string, dataAtual: string) => {
    setBuscandoAlternativas(true);
    setDatasAlternativas([]);
    try {
      const alternativas: string[] = [];
      const outrasDatas = datasDisponiveis.filter(d => d !== dataAtual);
      
      // Testa disponibilidade nas próximas 5 datas úteis da agenda
      for (const d of outrasDatas.slice(0, 5)) {
        const slots = await agendamentoRepository.obterHorariosDisponiveis(ubsId, profId, d);
        if (slots.length > 0) {
          alternativas.push(d);
          if (alternativas.length >= 3) break; // Recomenda até 3 datas alternativas
        }
      }
      setDatasAlternativas(alternativas);
    } catch (err) {
      console.error("Erro ao obter sugestões de data:", err);
    } finally {
      setBuscandoAlternativas(false);
    }
  };

  // Carrega horários disponíveis e simula tratamento de falha de conexão (R010)
  const obterHorariosDisponiveisAgenda = async (
    ubsId: string, 
    profId: string, 
    data: string,
    ignorarErroSimulado = false
  ) => {
    setLoadingHorarios(true);
    setErroHorarios(false);
    setDatasAlternativas([]);
    
    try {
      // Simula uma falha temporária com 15% de chance para cobrir o critério de erro de rede
      const simularErro = !ignorarErroSimulado && Math.random() < 0.15;
      if (simularErro) {
        throw new Error("Erro de conexão ao carregar a agenda.");
      }

      const slots = await agendamentoRepository.obterHorariosDisponiveis(ubsId, profId, data);
      setHorariosDisponiveis(slots);

      if (slots.length === 0) {
        await buscarDatasAlternativas(ubsId, profId, data);
      }
    } catch (err) {
      console.error("Erro no carregamento da agenda:", err);
      setErroHorarios(true);
      setHorariosDisponiveis([]);
      toast.error("Ocorreu um erro ao carregar a agenda.");
    } finally {
      setLoadingHorarios(false);
    }
  };

  // Carrega os horários disponíveis reativamente (R010)
  useEffect(() => {
    if (ubs && profissional && dataSel) {
      setHorarioSel("");
      obterHorariosDisponiveisAgenda(ubs.id, profissional.id, dataSel);
    }
  }, [ubs, profissional, dataSel]);

  const handleConfirmarAgendamento = async () => {
    if (!paciente || !ubs || !profissional || !dataSel || !horarioSel) {
      toast.error("Por favor, certifique-se de preencher todos os dados do agendamento.");
      return;
    }

    setIsSubmitting(true);

    try {
      await criarAgendamentoUseCase.executar({
        pacienteId: paciente.id,
        ubsId: ubs.id,
        ubsNome: ubs.nome,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        data: dataSel,
        horario: horarioSel,
        tipo,
        especialidade, // Contém os nomes dos exames/procedimentos concatenados
        observacoes
      });

      toast.success("Agendamento realizado com sucesso!");
      router.push("/agendamentos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao efetuar o agendamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtra as especialidades de Consulta (R011)
  const especialidadesFiltradas = especialidades.filter(esp => {
    const config = DESCRICOES_ESPECIALIDADES[esp];
    const categoriaDoEsp = config ? config.categoria : "Outros";
    const bateCategoria = categoriaDoEsp === categoriaSel;
    
    const termo = buscaEspecialidade.trim().toLowerCase();
    if (!termo) return bateCategoria;

    const bateNome = esp.toLowerCase().includes(termo);
    const bateDesc = config ? config.descricao.toLowerCase().includes(termo) : false;
    
    return bateCategoria && (bateNome || bateDesc);
  });

  // Filtra os Exames/Procedimentos baseados na categoria de exame selecionada (ou Todos) e na busca (R012)
  const examesFiltrados = Object.keys(EXAMES_SUGERIDOS).filter(key => {
    const exame = EXAMES_SUGERIDOS[key];
    const bateCategoria = categoriaExameSel === "Todos" || exame.categoria === categoriaExameSel;

    const termo = buscaExame.trim().toLowerCase();
    if (!termo) return bateCategoria;

    const bateNome = exame.nome.toLowerCase().includes(termo);
    const bateDesc = exame.desc.toLowerCase().includes(termo);

    return bateCategoria && (bateNome || bateDesc);
  });

  // Lista com todos os exames mapeados para fins de select na Etapa 3
  const todosExamesDisponiveisSelect = Object.keys(EXAMES_SUGERIDOS).map(key => EXAMES_SUGERIDOS[key].nome);

  // Alterna a seleção de um exame/procedimento (R012 múltiplo)
  const toggleExame = (nomeExame: string) => {
    setExamesSelecionados(prev => {
      if (prev.includes(nomeExame)) {
        return prev.filter(e => e !== nomeExame);
      } else {
        return [...prev, nomeExame];
      }
    });
  };

  // Função para avançar a tela de seleção de exames/procedimentos múltiplos resolvendo o profissional qualificado
  const handleAvancarStep2Exame = () => {
    if (examesSelecionados.length === 0) {
      toast.error("Por favor, selecione pelo menos um exame ou procedimento para agendar.");
      return;
    }

    const examesTexto = examesSelecionados.join(", ");
    setEspecialidade(examesTexto);
    
    // Resolve o profissional qualificado para o primeiro exame selecionado
    profissionalRepository
      .listarPorUbs(ubs?.id || "")
      .then((list) => {
        const resolvedProf = mapearProfissionalParaExame(examesSelecionados[0], list);
        setProfissional(resolvedProf);
        setStep(3);
      });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Indicador de Passos */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
        {[1, 2, 3, 4].map((s) => (
          <div className="flex items-center gap-2 flex-1 justify-center last:flex-initial" key={s}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s 
                ? "bg-primary text-primary-foreground" 
                : step > s 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
            }`}>
              {s}
            </div>
            <span className={`hidden md:inline text-xs font-semibold ${
              step === s ? "text-foreground" : "text-muted-foreground"
            }`}>
              {s === 1 && "Unidade & Tipo"}
              {s === 2 && (tipo === "consulta" ? "Profissional" : "Exames & Proc.")}
              {s === 3 && "Data & Hora"}
              {s === 4 && "Confirmação"}
            </span>
            {s < 4 && <ChevronRight className="hidden md:block h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Conteúdo da Etapa */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          
          {/* ETAPA 1: Tipo e UBS */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-lg text-foreground">Selecione o Tipo de Agendamento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setTipo("consulta");
                      setEspecialidade("");
                      setProfissional(null);
                      setExamesSelecionados([]);
                    }}
                    className={`p-4 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      tipo === "consulta"
                        ? "border-primary bg-primary/5 text-primary shadow-xs"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Stethoscope className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span>Consulta Médica</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipo("exame");
                      setEspecialidade("");
                      setProfissional(null);
                      setExamesSelecionados([]);
                    }}
                    className={`p-4 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      tipo === "exame"
                        ? "border-primary bg-primary/5 text-primary shadow-xs"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span>Exames & Procedimentos</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-heading font-bold text-lg text-foreground">Escolha a Unidade de Saúde (UBS)</h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou bairro..."
                      value={termoBuscaUbs}
                      onChange={(e) => setTermoBuscaUbs(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {ubsFiltradas.length > 0 ? (
                    ubsFiltradas.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUbs(u)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                          ubs?.id === u.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex gap-3">
                          <Building className={`h-5 w-5 mt-0.5 ${ubs?.id === u.id ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <h4 className="font-bold text-foreground text-sm">{u.nome}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {u.endereco.logradouro}, {u.endereco.numero} - {u.endereco.bairro}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              CNES: {u.cnes} • Funcionamento: {u.horarioFuncionamento}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma Unidade Básica de Saúde encontrada.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2 (Consulta): Especialidade e Profissional (R011) */}
          {step === 2 && tipo === "consulta" && (
            <div className="space-y-6">
              
              {/* Escolha de Categoria Profissional */}
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide text-muted-foreground">
                  Selecione a Categoria Profissional
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIAS_PROFISSIONAIS.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = categoriaSel === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoriaSel(cat.id);
                          setEspecialidade("");
                          setProfissional(null);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-xs"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <CatIcon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <span className="block font-bold text-sm text-foreground">{cat.nome}</span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5 leading-tight">{cat.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Escolha da Especialidade (R011) */}
              {categoriaSel && (
                <div className="space-y-4 pt-4 border-t border-border animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="font-heading font-bold text-lg text-foreground">
                      Selecione a Especialidade de {categoriaSel}
                    </h3>
                    
                    {/* Filtro por Palavras-chave */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar especialidade..."
                        value={buscaEspecialidade}
                        onChange={(e) => setBuscaEspecialidade(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>

                  {especialidadesFiltradas.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {especialidadesFiltradas.map((esp) => {
                        const isSelected = especialidade === esp;
                        const config = DESCRICOES_ESPECIALIDADES[esp] || {
                          nomeExibicao: esp,
                          descricao: "Atendimento de saúde especializado da Unidade Básica de Saúde."
                        };

                        return (
                          <button
                            key={esp}
                            type="button"
                            onClick={() => {
                              setEspecialidade(esp);
                              setProfissional(null);
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <span className="font-bold text-sm text-foreground">{config.nomeExibicao}</span>
                            <span className="text-xs text-muted-foreground leading-normal mt-1">{config.descricao}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Sugestões de alternativas se não houver na categoria selecionada */
                    <div className="p-5 rounded-2xl bg-muted/40 border text-center space-y-4">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Info className="h-8 w-8 text-primary" />
                        <h4 className="font-bold text-sm text-foreground">Sem Especialidades Disponíveis</h4>
                        <p className="text-xs max-w-sm leading-relaxed">
                          Não encontramos especialidades de <strong>{categoriaSel}</strong> ativas na {ubs?.nome} no momento.
                        </p>
                      </div>
                      
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCategoriaSel("Consultas Médicas");
                            setEspecialidade("");
                          }}
                          className="text-xs cursor-pointer"
                        >
                          Ir para Consultas Médicas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStep(1)}
                          className="text-xs cursor-pointer"
                        >
                          Trocar UBS/Unidade
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Escolha do Profissional (com redirecionamento automático) */}
              {especialidade && (
                <div className="space-y-4 border-t border-border pt-6 animate-in fade-in duration-200">
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    Escolha o Profissional de Saúde para {especialidade}
                  </h3>
                  <div className="space-y-3">
                    {profissionais.length > 0 ? (
                      profissionais.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProfissional(p);
                            setStep(3);
                            toast.success(`Profissional ${p.nome} selecionado.`);
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer hover:border-primary/50 ${
                            profissional?.id === p.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              profissional?.id === p.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            }`}>
                              {p.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground text-sm">{p.nome}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {p.registroProfissional.tipo}: {p.registroProfissional.numero}/{p.registroProfissional.uf}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        Nenhum profissional disponível para esta especialidade.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2 (Exame/Procedimento): Múltipla Seleção de Exames/Procedimentos e Categoria "Todos" (R012) */}
          {step === 2 && tipo === "exame" && (
            <div className="space-y-6">
              
              {/* Seleção de Categoria do Exame/Procedimento (incluindo "Todos os Serviços") */}
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide text-muted-foreground">
                  Selecione a Categoria de Exame ou Procedimento
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CATEGORIAS_EXAMES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = categoriaExameSel === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoriaExameSel(cat.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-xs"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <CatIcon className={`h-4.5 w-4.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <span className="block font-bold text-xs text-foreground truncate">{cat.nome}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lista de Exames com Múltipla Seleção e Busca por Palavra-chave */}
              {categoriaExameSel && (
                <div className="space-y-4 pt-4 border-t border-border animate-in fade-in duration-200">
                  
                  {/* Banner Verde Claro de Exames/Procedimentos Selecionados */}
                  {examesSelecionados.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-2 border border-emerald-500/20 animate-in slide-in-from-top-2 duration-300">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{examesSelecionados.length} {examesSelecionados.length === 1 ? "serviço selecionado" : "serviços selecionados"}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="font-heading font-bold text-lg text-foreground">
                      Selecione um ou mais Serviços
                    </h3>
                    
                    {/* Barra de Busca */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar exames ou procedimentos..."
                        value={buscaExame}
                        onChange={(e) => setBuscaExame(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>

                  {/* Exibição dos exames do catálogo */}
                  {examesFiltrados.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                      {examesFiltrados.map((key) => {
                        const exame = EXAMES_SUGERIDOS[key];
                        const isSelected = examesSelecionados.includes(exame.nome);

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleExame(exame.nome)}
                            className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-4 cursor-pointer hover:border-primary/50 relative ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <div className="space-y-1">
                              <span className="block font-bold text-sm text-foreground">{exame.nome}</span>
                              <span className="block text-xs text-muted-foreground leading-normal">{exame.desc}</span>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-muted/40 border text-center space-y-4">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Info className="h-8 w-8 text-primary" />
                        <h4 className="font-bold text-sm text-foreground">Nenhum Serviço Encontrado</h4>
                        <p className="text-xs max-w-sm leading-relaxed">
                          Nenhum exame ou procedimento corresponde à sua pesquisa na categoria selecionada.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 3: Data e Horário (Consultar Agenda - R010) */}
          {step === 3 && (
            <div className="space-y-6">
              
              {/* Filtros Rápidos integrados na mesma tela para consulta instantânea sem repetir info */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 mb-6 select-none">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-primary" />
                    Filtros Rápidos da Agenda
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Ajuste diretamente na agenda
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Tipo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Tipo</label>
                    <select
                      value={tipo}
                      onChange={(e: any) => {
                        setTipo(e.target.value);
                        setEspecialidade("");
                        setProfissional(null);
                        setExamesSelecionados([]);
                        setDataSel("");
                        setHorarioSel("");
                      }}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                    >
                      <option value="consulta">Consulta</option>
                      <option value="exame">Exame</option>
                    </select>
                  </div>

                  {/* UBS */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Unidade (UBS)</label>
                    <select
                      value={ubs?.id || ""}
                      onChange={(e) => {
                        const selectedUbs = todasUbs.find(u => u.id === e.target.value);
                        if (selectedUbs) setUbs(selectedUbs);
                      }}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                    >
                      {todasUbs.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Especialidade ou Exame/Procedimento (Conforme tipo) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      {tipo === "consulta" ? "Especialidade" : "Exame/Procedimento"}
                    </label>
                    {tipo === "consulta" ? (
                      <select
                        value={especialidade}
                        onChange={(e) => {
                          setEspecialidade(e.target.value);
                        }}
                        className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                        disabled={especialidades.length === 0}
                      >
                        <option value="" disabled>Selecione...</option>
                        {especialidades.map(esp => (
                          <option key={esp} value={esp}>{esp}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={especialidade}
                        onChange={(e) => {
                          setEspecialidade(e.target.value);
                        }}
                        className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                      >
                        <option value="" disabled>Selecione...</option>
                        {todosExamesDisponiveisSelect.map(ex => (
                          <option key={ex} value={ex}>{ex}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Profissional (Oculto ou desabilitado para exames, já que é resolvido pelo exame) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Profissional</label>
                    <select
                      value={profissional?.id || ""}
                      onChange={(e) => {
                        const selectedProf = profissionais.find(p => p.id === e.target.value);
                        if (selectedProf) setProfissional(selectedProf);
                      }}
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus:border-ring"
                      disabled={tipo === "exame" || profissionais.length === 0}
                    >
                      {tipo === "exame" ? (
                        <option value={profissional?.id || ""}>{profissional?.nome || "Carregando..."}</option>
                      ) : (
                        <>
                          <option value="" disabled>Selecione...</option>
                          {profissionais.map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seletor de Dia da Semana */}
              <div className="space-y-3">
                <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide text-muted-foreground">
                  Escolha o Dia do Atendimento
                </h3>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {datasDisponiveis.map((d) => {
                    const diaSemana = obterNomeDiaSemana(d).split("-")[0]; // Seg, Ter, etc.
                    const diaMes = d.split("-")[2]; // 27, 28, etc.
                    const mes = obterDataPorExtenso(d).split(" ")[2].slice(0, 3); // Jun, Jul, etc.
                    const isSelected = dataSel === d;

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDataSel(d);
                          setHorarioSel("");
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[70px] transition-all text-center cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-105"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold opacity-75">{diaSemana}</span>
                        <span className="text-lg font-bold my-0.5">{diaMes}</span>
                        <span className="text-[10px] uppercase font-semibold">{mes}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Horários com Tratamento de Carregamento, Erro e Vaga Vazia (R010) */}
              {dataSel && (
                <div className="space-y-4 border-t border-border pt-6 animate-in fade-in duration-200">
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    Horários para {formatarDataBr(dataSel)} ({dataSel && obterNomeDiaSemana(dataSel)})
                  </h3>
                  
                  {loadingHorarios ? (
                    /* Skeleton de Carregamento */
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 animate-pulse">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-9 bg-muted rounded-lg" />
                      ))}
                    </div>
                  ) : erroHorarios ? (
                    /* Tratamento de Erro Conforme R010 */
                    <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20 text-center space-y-4">
                      <div className="flex flex-col items-center gap-2 text-destructive">
                        <AlertTriangle className="h-8 w-8 animate-bounce" />
                        <h4 className="font-bold text-sm">Erro ao carregar a agenda de horários</h4>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Não conseguimos contato com o servidor da UBS no momento para obter as vagas livres.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => ubs && profissional && obterHorariosDisponiveisAgenda(ubs.id, profissional.id, dataSel, true)}
                        className="font-semibold gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Tentar Novamente
                      </Button>
                    </div>
                  ) : horariosDisponiveis.length > 0 ? (
                    /* Exibição de Vagas com Destaque do Mais Cedo/Urgente */
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                      {horariosDisponiveis.map((h, idx) => {
                        const ehPrimeiro = idx === 0;
                        const isSelected = horarioSel === h;

                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setHorarioSel(h)}
                            className={`p-2.5 rounded-lg border text-sm font-bold text-center transition-all cursor-pointer relative ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs scale-105"
                                : ehPrimeiro
                                  ? "border-emerald-500 bg-emerald-500/5 text-foreground hover:bg-emerald-500/10 dark:border-emerald-500/70"
                                  : "border-border hover:bg-muted text-foreground"
                            }`}
                          >
                            {h}
                            {ehPrimeiro && !isSelected && (
                              <span className="absolute -top-2 -right-1 text-[8px] font-extrabold uppercase px-1 rounded-sm bg-emerald-500 text-white leading-none py-0.5 tracking-wider scale-90 flex items-center gap-0.5 shadow-sm">
                                <Zap className="h-2 w-2 fill-current" />
                                Rápido
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Informa indisponibilidade e sugere datas alternativas (R010) */
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-xl flex items-start gap-2.5 text-xs">
                        <Info className="h-4.5 w-4.5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block mb-0.5 font-bold">Sem vagas para esta data</strong>
                          <span>
                            Todos os horários para este profissional estão ocupados no dia {formatarDataBr(dataSel)}.
                          </span>
                        </div>
                      </div>

                      {/* Datas Alternativas com Vagas */}
                      {buscandoAlternativas ? (
                        <p className="text-xs text-muted-foreground animate-pulse">Buscando datas alternativas...</p>
                      ) : datasAlternativas.length > 0 ? (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <span className="block text-xs font-semibold text-foreground">
                            Sugestões de datas próximas com vagas disponíveis:
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {datasAlternativas.map(d => (
                              <Button
                                key={d}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDataSel(d);
                                  setHorarioSel("");
                                }}
                                className="text-xs font-semibold hover:border-primary cursor-pointer"
                              >
                                {formatarDataBr(d)} ({obterNomeDiaSemana(d).split("-")[0]})
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border">
                          Nenhuma data próxima com horários disponíveis foi encontrada nas próximas duas semanas.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 4: Revisão e Confirmação */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="font-heading font-bold text-lg text-foreground border-b border-border pb-2">
                Revisão do Agendamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-5 rounded-2xl border border-border/50 text-sm">
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Tipo do Compromisso</span>
                    <span className="text-sm font-bold text-foreground capitalize">{tipo} de {especialidade}</span>
                  </div>

                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Local</span>
                    <span className="text-sm font-bold text-foreground">{ubs?.nome}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {ubs?.endereco.logradouro}, {ubs?.endereco.numero} - {ubs?.endereco.bairro}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Profissional de Saúde</span>
                    <span className="text-sm font-bold text-foreground">{profissional?.nome}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {profissional?.registroProfissional.tipo}: {profissional?.registroProfissional.numero}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold uppercase">Data e Horário</span>
                    <span className="text-sm font-bold text-primary">
                      {dataSel && formatarDataBr(dataSel)} ({dataSel && obterNomeDiaSemana(dataSel)}) às {horarioSel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label htmlFor="observacoes" className="text-sm font-semibold text-foreground">
                  Informações Adicionais / Sintomas (Opcional)
                </label>
                <textarea
                  id="observacoes"
                  rows={3}
                  placeholder="Se desejar, informe sintomas básicos ou observações para o profissional."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                />
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Navegação entre Etapas */}
      <div className="flex justify-between items-center">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={isSubmitting}
            className="font-semibold gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
            Anterior
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push("/painel")}
            className="font-semibold cursor-pointer"
          >
            Cancelar
          </Button>
        )}

        {step < 4 ? (
          <Button
            onClick={() => {
              if (step === 2 && tipo === "exame") {
                handleAvancarStep2Exame();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={
              (step === 1 && !ubs) ||
              (step === 2 && tipo === "consulta" && (!especialidade || !profissional)) ||
              (step === 2 && tipo === "exame" && examesSelecionados.length === 0) ||
              (step === 3 && (!dataSel || !horarioSel || loadingHorarios || erroHorarios))
            }
            className="font-semibold gap-1.5 cursor-pointer"
          >
            Próximo
            <ChevronRight className="h-4.5 w-4.5" />
          </Button>
        ) : (
          <Button
            onClick={handleConfirmarAgendamento}
            disabled={isSubmitting}
            className="font-semibold bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-sm shadow-primary/20"
          >
            {isSubmitting ? "Finalizando..." : "Confirmar Agendamento"}
          </Button>
        )}
      </div>
    </div>
  );
}
