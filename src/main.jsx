import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import logo from "./assets/brand/ifconect.png";
import { demo, entrarDemo, request, sair, sessaoDemo } from "./api.js";
import { perfis } from "./ui.jsx";
import Profissionais from "./Profissionais.jsx";
import Meus from "./Meus.jsx";
import Chat from "./Chat.jsx";

const portal = import.meta.env.VITE_PORTAL_URL;

function useRota() {
  const [h, setH] = useState(location.hash || "#/");
  useEffect(() => {
    const f = () => setH(location.hash || "#/");
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return h.slice(2).split("/");
}

const Brand = () => (
  <a className="brand brand-with-logo" href="#/" aria-label="IFConect · Início">
    <span className="brand-symbol" aria-hidden="true">
      <img className="brand-logo" src={logo} alt="" />
    </span>
    <span className="brand-wordmark">IF <span>Conect</span></span>
  </a>
);

function Splash({ erro }) {
  return (
    <main className="sso-neutral" aria-busy={!erro}>
      <img src="/brand/ifconect.png" alt="IFConect" />
      {!erro && <div className="sso-spinner" role="status" aria-label="Conectando" />}
      {erro && (
        <>
          <p role="alert">{erro}</p>
          <button onClick={() => window.IfsistemSSO.login()}>Tentar novamente</button>
        </>
      )}
    </main>
  );
}

// Somente no modo demonstração: escolhe um usuário do banco fictício.
function DemoLogin({ onEntrar }) {
  const [usuarios, setUsuarios] = useState(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    request("/demo/usuarios").then(setUsuarios).catch((e) => setErro(e.message));
  }, []);
  return (
    <main className="login">
      <img src="/brand/ifconect.png" alt="IF Conect" />
      <section className="card">
        <div>
          <h2>Modo demonstração</h2>
          <small>Banco fictício. Escolha com quem entrar.</small>
        </div>
        {erro && <p className="erro-texto" role="alert">{erro}</p>}
        {!usuarios && !erro && <div className="skeleton" aria-busy="true" />}
        <div className="demo-lista">
          {(usuarios || []).map((u) => (
            <button key={u.id} className="sec" onClick={() => onEntrar(u)}>
              <span className="avatar">{u.nome.slice(0, 1)}</span>
              <span>{u.nome}<small>{perfis[u.perfil]}</small></span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

const data = () =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric", weekday: "long" }).format(new Date());

function App() {
  const [eu, setEu] = useState(demo ? sessaoDemo() : null);
  const [erroSso, setErroSso] = useState("");
  const rota = useRota();
  useEffect(() => {
    if (demo) return;
    window.IfsistemSSO.getToken()
      .then((token) => (token ? setEu(window.IfsistemSSO.usuario()) : window.IfsistemSSO.login()))
      .catch((e) => setErroSso(e.message));
  }, []);
  if (!eu) {
    return demo ? (
      <DemoLogin onEntrar={(u) => { entrarDemo(u); location.hash = "#/"; setEu(u); }} />
    ) : (
      <Splash erro={erroSso} />
    );
  }
  const aluno = eu.perfil === "ALUNO";
  const chat = rota[0] === "chat";
  const meus = rota[0] === "meus" || (!aluno && !chat);
  const tela = chat ? <Chat key={rota[1]} id={rota[1]} eu={eu} /> : meus ? <Meus eu={eu} /> : <Profissionais eu={eu} />;
  const itens = [
    ...(aluno ? [["#/", "Professores e servidores", "♙", !chat && !meus]] : []),
    ["#/meus", aluno ? "Meus atendimentos" : "Atendimentos recebidos", "▤", meus],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        {portal && (
          <a className="portal-link" href={portal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>
            Voltar ao portal
          </a>
        )}
        <p className="nav-caption">ATENDIMENTO AO ALUNO</p>
        <nav aria-label="Principal">
          {itens.map(([href, rotulo, icone, ativo]) => (
            <a key={href} href={href} className={`nav-link${ativo ? " active" : ""}`} aria-current={ativo ? "page" : undefined}>
              <span aria-hidden="true">{icone}</span>
              {rotulo}
            </a>
          ))}
        </nav>
        <div className="sidebar-module">
          <strong>Canal institucional</strong>
          <p>Converse com professores e servidores e acompanhe suas solicitações.</p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">{eu.nome.slice(0, 1)}</div>
          <strong>{eu.nome}</strong>
          <small>{perfis[eu.perfil]}</small>
          <button className="logout" onClick={sair}>Sair da conta</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Atendimento ao aluno <span className="muted">/ {chat ? "Conversa" : meus ? "Meus atendimentos" : "Professores"}</span>
          </span>
          <time className="header-date">{demo && <span className="perfil-tag">Modo demonstração</span>} {data()}</time>
        </header>
        <main className="content">{tela}</main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
