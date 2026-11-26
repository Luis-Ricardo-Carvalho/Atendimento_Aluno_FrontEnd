import React, { useEffect, useRef, useState } from "react";
import { iniciais, statusAtendimento } from "./format.js";

export function useAsync(fn, deps) {
  const [s, setS] = useState({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setS((x) => ({ ...x, loading: true, error: null }));
    fn()
      .then((data) => vivo && setS({ data, loading: false }))
      .catch((e) => vivo && setS((x) => ({ data: x.data, error: e.message, loading: false })));
    return () => {
      vivo = false;
    };
  }, [...deps, n]);
  return { ...s, reload: () => setN((v) => v + 1) };
}

export const Avatar = ({ nome, grande }) => (
  <span className={`avatar${grande ? " grande" : ""}`} aria-hidden="true">
    {iniciais(nome)}
  </span>
);

export function Badge({ status }) {
  const [texto, tom] = statusAtendimento[status] || [status, "off"];
  return <span className={`badge ${tom}`}>{texto}</span>;
}

export const Skeleton = ({ n = 3 }) => (
  <div className="grade" aria-busy="true" aria-label="Carregando">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="card skeleton" />
    ))}
  </div>
);

export const Erro = ({ texto, onRetry }) => (
  <div className="aviso erro" role="alert">
    <p>{texto}</p>
    {onRetry && <button onClick={onRetry}>Tentar novamente</button>}
  </div>
);

export const Vazio = ({ titulo, texto, acao }) => (
  <div className="vazio">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
    <h2>{titulo}</h2>
    {texto && <p>{texto}</p>}
    {acao}
  </div>
);

const zona = "America/Sao_Paulo";
export const perfis = { ADMINISTRADOR: "Administrador", SERVIDOR: "Servidor", PROFESSOR: "Professor", ALUNO: "Aluno" };
const mesAno = () =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: zona, year: "numeric", month: "long" })
    .format(new Date())
    .toLocaleUpperCase("pt-BR");

export const Heading = ({ eu, titulo, texto }) => (
  <div className="heading">
    <div>
      <span className="eyebrow">{mesAno()}</span>
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </div>
    <span className="perfil-tag">{perfis[eu.perfil]}</span>
  </div>
);

export function Modal({ titulo, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    ref.current?.querySelector("input,select,textarea,button")?.focus();
    return () => removeEventListener("keydown", esc);
  }, []);
  return (
    <div className="fundo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-dialogo" ref={ref}>
        <h2 id="titulo-dialogo">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export const ConfirmModal = ({ titulo, texto, rotulo = "Confirmar", perigo, onConfirm, onClose }) => (
  <Modal titulo={titulo} onClose={onClose}>
    <p>{texto}</p>
    <div className="acoes">
      <button className="sec" onClick={onClose}>Voltar</button>
      <button className={perigo ? "perigo" : ""} onClick={onConfirm}>{rotulo}</button>
    </div>
  </Modal>
);
