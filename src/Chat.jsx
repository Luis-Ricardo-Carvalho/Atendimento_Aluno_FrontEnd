import React, { useEffect, useRef, useState } from "react";
import { request } from "./api.js";
import { Avatar, Badge, ConfirmModal, Erro, useAsync } from "./ui.jsx";
import { categorias, dataHora, disponibilidade, encerrado } from "./format.js";

export default function Chat({ id, eu }) {
  const at = useAsync(() => request(`/atendimentos/${id}`), [id]);
  const msgs = useAsync(() => request(`/atendimentos/${id}/mensagens`), [id]);
  const aluno = eu.perfil === "ALUNO";
  const profs = useAsync(() => (aluno ? request("/atendimentos/profissionais") : Promise.resolve([])), [id]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [conf, setConf] = useState(null);
  const fim = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      msgs.reload();
      at.reload();
    }, 6000);
    return () => clearInterval(t);
  }, [id]);
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [msgs.data?.length]);

  if (at.error && !at.data) return <Erro texto={at.error} onRetry={at.reload} />;
  const a = at.data;
  if (!a) return <div className="card skeleton alto" aria-busy="true" />;

  const souAtendente = a.atendente.id === eu.id;
  const outro = souAtendente ? a.aluno : a.atendente;
  const fechado = encerrado(a.status);
  const prof = (profs.data || []).find((p) => p.id === outro.id);
  const d = prof && disponibilidade(prof);

  async function enviar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      await request(`/atendimentos/${id}/mensagens`, { method: "POST", body: { conteudo: texto } });
      setTexto("");
      msgs.reload();
      at.reload();
    } catch (e) {
      setErro(e.message);
    }
    setEnviando(false);
  }
  async function agir(path, body) {
    setErro("");
    try {
      await request(`/atendimentos/${id}/${path}`, { method: "PATCH", body });
      at.reload();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <section className="chat">
      <header className="chat-topo">
        <a href="#/meus" className="voltar" aria-label="Voltar">‹</a>
        <Avatar nome={outro.nome} grande />
        <div className="chat-info">
          <h2>{outro.nome}</h2>
          <small>{a.assunto} · {categorias[a.categoria]}</small>
          {d && <small className={`disp ${d.tom}`}><span className="ponto" aria-hidden="true" /> {d.titulo} · {d.detalhe}</small>}
        </div>
        <Badge status={a.status} />
      </header>

      {!fechado && (
        <div className="controles">
          {souAtendente ? (
            <>
              <label className="inline">
                Status
                <select value={a.status} onChange={(e) => agir("status", { status: e.target.value })}>
                  <option value="ABERTO" disabled>Aguardando resposta</option>
                  <option value="EM_ATENDIMENTO">Em atendimento</option>
                  <option value="AGUARDANDO_ALUNO">Aguardando aluno</option>
                </select>
              </label>
              <button onClick={() => setConf({ titulo: "Finalizar atendimento", texto: "Finalizar este atendimento? O histórico continua disponível.", rotulo: "Finalizar", run: () => agir("finalizar") })}>Finalizar</button>
            </>
          ) : (
            <button className="sec" onClick={() => setConf({ titulo: "Cancelar atendimento", texto: "Cancelar este atendimento? Esta ação não pode ser desfeita.", rotulo: "Cancelar atendimento", perigo: true, run: () => agir("status", { status: "CANCELADO" }) })}>Cancelar atendimento</button>
          )}
        </div>
      )}

      <div className="mensagens" aria-live="polite">
        {msgs.error && !msgs.data ? (
          <Erro texto={msgs.error} onRetry={msgs.reload} />
        ) : (
          (msgs.data || []).map((m) => (
            <div key={m.id} className={`msg ${m.minha ? "minha" : "outra"}`}>
              <p>{m.conteudo}</p>
              <small>{dataHora(m.dataEnvio)}</small>
            </div>
          ))
        )}
        <div ref={fim} />
      </div>

      {erro && <p className="erro-texto" role="alert">{erro}</p>}
      {fechado ? (
        <p className="aviso">Este atendimento foi {a.status === "FINALIZADO" ? "finalizado" : "cancelado"}. O histórico continua disponível.</p>
      ) : (
        <form className="compositor" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
          <label className="sr" htmlFor="msg">Digite sua mensagem</label>
          <textarea
            id="msg"
            rows={1}
            maxLength={2000}
            value={texto}
            placeholder="Digite sua mensagem..."
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          />
          <button disabled={!texto.trim() || enviando} aria-label="Enviar mensagem">{enviando ? "…" : "➤"}</button>
        </form>
      )}
      {conf && (
        <ConfirmModal {...conf} onClose={() => setConf(null)} onConfirm={() => { const r = conf.run; setConf(null); r(); }} />
      )}
    </section>
  );
}
