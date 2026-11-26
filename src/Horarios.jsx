import React, { useState } from "react";
import { request } from "./api.js";
import { ConfirmModal, Erro, Heading, Skeleton, Vazio, useAsync } from "./ui.jsx";
import { dias, hhmm } from "./format.js";

const ordem = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function Horarios({ eu }) {
  const { data, error, loading, reload } = useAsync(() => request("/horarios-atendimento"), []);
  const [f, setF] = useState({ diaSemana: "MONDAY", horarioInicio: "14:00", horarioFim: "16:00", area: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [remover, setRemover] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function salvar(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await request("/horarios-atendimento", { method: "POST", body: f });
      reload();
    } catch (x) {
      setMsg(x.message);
    }
    setBusy(false);
  }
  async function excluir() {
    const id = remover.id;
    setRemover(null);
    try {
      await request(`/horarios-atendimento/${id}`, { method: "DELETE" });
      reload();
    } catch (x) {
      setMsg(x.message);
    }
  }
  const lista = [...(data || [])].sort((a, b) => ordem.indexOf(a.diaSemana) - ordem.indexOf(b.diaSemana) || a.horarioInicio.localeCompare(b.horarioInicio));

  return (
    <>
      <Heading eu={eu} titulo="Meus horários de atendimento" texto="Os alunos veem sua disponibilidade e o próximo horário com base nesta agenda." />
      <section className="card form-linha">
        <h2>Novo horário</h2>
        <form onSubmit={salvar} className="grade-form">
          <label>Dia da semana
            <select value={f.diaSemana} onChange={set("diaSemana")}>
              {ordem.map((d) => <option key={d} value={d}>{dias[d]}</option>)}
            </select>
          </label>
          <label>Início<input type="time" value={f.horarioInicio} onChange={set("horarioInicio")} required /></label>
          <label>Fim<input type="time" value={f.horarioFim} onChange={set("horarioFim")} required /></label>
          <label>Disciplina ou área (opcional)<input value={f.area} onChange={set("area")} maxLength={120} placeholder="Ex.: Banco de Dados" /></label>
          <button disabled={busy}>{busy ? "Salvando…" : "Adicionar horário"}</button>
        </form>
        {msg && <p className="erro-texto" role="alert">{msg}</p>}
      </section>
      <section className="card">
        <h2>Horários cadastrados</h2>
        {error && !data ? <Erro texto={error} onRetry={reload} /> : loading && !data ? <Skeleton n={1} /> : lista.length === 0 ? (
          <Vazio titulo="Nenhum horário cadastrado." texto="Adicione o primeiro para aparecer na lista de professores." />
        ) : (
          <ul className="lista">
            {lista.map((h) => (
              <li key={h.id} className="item linha">
                <strong>{dias[h.diaSemana]}, {hhmm(h.horarioInicio)}–{hhmm(h.horarioFim)}</strong>
                <button className="sec texto-perigo" onClick={() => setRemover(h)}>Remover</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {remover && (
        <ConfirmModal titulo="Remover horário" perigo rotulo="Remover" onClose={() => setRemover(null)} onConfirm={excluir}
          texto={`Remover ${dias[remover.diaSemana]}, ${hhmm(remover.horarioInicio)}–${hhmm(remover.horarioFim)}?`} />
      )}
    </>
  );
}
