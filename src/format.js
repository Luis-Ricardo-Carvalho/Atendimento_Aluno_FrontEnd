const zona = "America/Sao_Paulo";

export const dias = {
  MONDAY: "segunda-feira",
  TUESDAY: "terça-feira",
  WEDNESDAY: "quarta-feira",
  THURSDAY: "quinta-feira",
  FRIDAY: "sexta-feira",
  SATURDAY: "sábado",
  SUNDAY: "domingo",
};
export const hhmm = (t) => String(t || "").slice(0, 5);
export const iniciais = (nome) => {
  const p = (nome || "?").trim().split(/\s+/);
  return ((p[0][0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};
export const statusAtendimento = {
  ABERTO: ["Aguardando resposta", "warn"],
  EM_ATENDIMENTO: ["Em atendimento", "ok"],
  AGUARDANDO_ALUNO: ["Aguardando aluno", "info"],
  FINALIZADO: ["Finalizado", "off"],
  CANCELADO: ["Cancelado", "off"],
};
export const encerrado = (s) => s === "FINALIZADO" || s === "CANCELADO";
export const categorias = {
  DUVIDA_DISCIPLINA: "Dúvida sobre disciplina",
  DUVIDA_ATIVIDADE: "Dúvida sobre atividade",
  DUVIDA_ACADEMICA: "Dúvida acadêmica",
  SOLICITACAO_ADMINISTRATIVA: "Solicitação administrativa",
  OUTROS: "Outros",
};
const hojeIso = () => new Date().toLocaleDateString("en-CA", { timeZone: zona });

export function disponibilidade(p) {
  const j = p.janela;
  if (p.status === "DISPONIVEL_AGORA")
    return { tom: "ok", titulo: "Disponível agora", detalhe: `Atendimento até ${hhmm(j.fim)}` };
  if (p.status === "PROXIMO_ATENDIMENTO") {
    const quando = j.data === hojeIso() ? "hoje" : dias[j.diaSemana];
    return { tom: "warn", titulo: "Próximo atendimento", detalhe: `${quando}, às ${hhmm(j.inicio)}` };
  }
  return { tom: "off", titulo: "Fora do horário", detalhe: "Nenhum horário programado" };
}
export const dataHora = (v) =>
  v
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: zona,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(v))
    : "—";
