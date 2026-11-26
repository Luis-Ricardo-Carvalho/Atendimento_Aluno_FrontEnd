import React, { useEffect, useState } from "react";
import { request } from "./api.js";
import { Avatar, Erro, Heading, Skeleton, Vazio, useAsync } from "./ui.jsx";
import { categorias, dias, disponibilidade, encerrado, hhmm } from "./format.js";

const filtros = [
  ["TODOS", "Todos"],
  ["DISPONIVEIS", "Disponíveis agora"],
  ["MEUS", "Meus professores"],
  ["PROFESSORES", "Professores"],
  ["SERVIDORES", "Servidores"],
];

export default function Profissionais({ eu }) {
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [alvo, setAlvo] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(busca), 250);
    return () => clearTimeout(t);
  }, [busca]);

  const painel = useAsync(() => request("/atendimentos/painel"), []);
  const meus = useAsync(() => request("/atendimentos/meus"), []);
  const lista = useAsync(
    () => request(`/atendimentos/profissionais?filtro=${filtro}&busca=${encodeURIComponent(q)}`),
    [q, filtro],
  );
  const p = painel.data;
  const cards = [
    ["Professores disponíveis agora", p?.profissionaisDisponiveis],
    ["Atendimentos em andamento", p?.emAndamento],
    ["Aguardando resposta", p?.aguardandoResposta],
    ["Atendimentos finalizados", p?.finalizados],
  ];
  const ativo = (prof) =>
    (meus.data || []).find((a) => a.atendente.id === prof.id && !encerrado(a.status));

  return (
    <>
      <Heading eu={eu} titulo={`Olá, ${eu.nome.split(" ")[0]}! 👋`} texto="Encontre seus professores e tire suas dúvidas de forma rápida e organizada." />

      <section className="stats" aria-label="Resumo dos seus atendimentos">
        {cards.map(([rotulo, valor]) => (
          <article key={rotulo}>
            <strong>{valor ?? "–"}</strong>
            <span>{rotulo}</span>
          </article>
        ))}
      </section>

      <section className="ferramentas">
        <label className="busca">
          <span className="sr">Buscar por nome, disciplina ou área</span>
          <input
            type="search"
            placeholder="Buscar por nome, disciplina ou área"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <div className="chips" role="group" aria-label="Filtros">
          {filtros.map(([v, rotulo]) => (
            <button key={v} className={`chip${filtro === v ? " ativo" : ""}`} aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
              {rotulo}
            </button>
          ))}
        </div>
      </section>

      {lista.error && !lista.data ? (
        <Erro texto={lista.error} onRetry={lista.reload} />
      ) : lista.loading && !lista.data ? (
        <Skeleton />
      ) : lista.data.length === 0 ? (
        filtro === "DISPONIVEIS" ? (
          <Vazio
            titulo="Nenhum professor está disponível neste momento."
            texto="Veja todos os profissionais para consultar os próximos horários."
            acao={<button onClick={() => setFiltro("TODOS")}>Ver todos</button>}
          />
        ) : (
          <Vazio titulo="Nenhum profissional encontrado." texto="Tente outro nome, disciplina ou filtro." />
        )
      ) : (
        <div className="grade">
          {lista.data.map((prof) => {
            const d = disponibilidade(prof);
            const em = ativo(prof);
            return (
              <article className="card prof" key={prof.id}>
                <header>
                  <Avatar nome={prof.nome} grande />
                  <div>
                    <h3>{prof.nome}</h3>
                    <small>{prof.area}</small>
                  </div>
                </header>
                <p className={`disp ${d.tom}`}>
                  <span className="ponto" aria-hidden="true" />
                  <strong>{d.titulo}</strong>
                  <small>{d.detalhe}</small>
                </p>
                {em ? (
                  <a className="botao" href={`#/chat/${em.id}`}>Continuar atendimento</a>
                ) : (
                  <button onClick={() => setAlvo(prof)}>Abrir atendimento</button>
                )}
              </article>
            );
          })}
        </div>
      )}
      {alvo && <NovoAtendimento prof={alvo} onClose={() => setAlvo(null)} />}
    </>
  );
}

function NovoAtendimento({ prof, onClose }) {
  const [f, setF] = useState({ categoria: "DUVIDA_DISCIPLINA", assunto: "", mensagemInicial: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const d = disponibilidade(prof);
  const fora = prof.status !== "DISPONIVEL_AGORA";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);
  const valido = f.assunto.trim() && f.mensagemInicial.trim();

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const a = await request("/atendimentos", { method: "POST", body: { ...f, profissionalId: prof.id } });
      location.hash = `#/chat/${a.id}`;
    } catch (x) {
      setErro(x.message);
      setEnviando(false);
    }
  }

  return (
    <div className="fundo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-modal" onSubmit={enviar}>
        <h2 id="titulo-modal">{fora ? "Criar solicitação" : "Abrir atendimento"} com {prof.nome}</h2>
        {fora && (
          <div className="aviso">
            <strong>Professor fora do horário de atendimento</strong>
            <p>
              {prof.horarios.length
                ? `Sua solicitação ficará registrada e será respondida no próximo horário (${d.detalhe}).`
                : "Sua solicitação ficará registrada e poderá ser respondida depois."}
            </p>
            {prof.horarios.length > 0 && (
              <ul>
                {prof.horarios.map((h) => (
                  <li key={h.id}>{dias[h.diaSemana]}, {hhmm(h.horarioInicio)}–{hhmm(h.horarioFim)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <label>
          Categoria
          <select value={f.categoria} onChange={set("categoria")}>
            {Object.entries(categorias).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label>
          Assunto
          <input value={f.assunto} onChange={set("assunto")} maxLength={150} placeholder="Resuma sua dúvida em poucas palavras" required />
        </label>
        <label>
          Mensagem inicial
          <textarea value={f.mensagemInicial} onChange={set("mensagemInicial")} maxLength={2000} placeholder="Explique sua dúvida" required />
        </label>
        {erro && <p className="erro-texto" role="alert">{erro}</p>}
        <div className="acoes">
          <button type="button" className="sec" onClick={onClose}>Voltar para profissionais</button>
          <button disabled={!valido || enviando}>{enviando ? "Enviando…" : fora ? "Criar solicitação" : "Iniciar atendimento"}</button>
        </div>
      </form>
    </div>
  );
}
