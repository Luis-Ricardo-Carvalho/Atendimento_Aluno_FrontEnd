import test from "node:test";
import assert from "node:assert/strict";
import { disponibilidade, encerrado, iniciais } from "./format.js";

test("iniciais usa primeiro e último nome", () => {
  assert.equal(iniciais("Emerson Carvalho"), "EC");
  assert.equal(iniciais("Lucia Helena Souza"), "LS");
  assert.equal(iniciais("Ana"), "A");
});

test("status de disponibilidade", () => {
  const j = { data: "2099-01-05", diaSemana: "MONDAY", inicio: "14:00:00", fim: "16:00:00" };
  assert.deepEqual(disponibilidade({ status: "DISPONIVEL_AGORA", janela: j }), {
    tom: "ok", titulo: "Disponível agora", detalhe: "Atendimento até 16:00",
  });
  assert.equal(disponibilidade({ status: "PROXIMO_ATENDIMENTO", janela: j }).detalhe, "segunda-feira, às 14:00");
  assert.equal(disponibilidade({ status: "FORA_DO_HORARIO", janela: null }).tom, "off");
});

test("atendimento encerrado", () => {
  assert.ok(encerrado("FINALIZADO") && encerrado("CANCELADO"));
  assert.ok(!encerrado("ABERTO"));
});
