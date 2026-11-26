import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import logo from "./assets/brand/ifconect.png";
import { demo, entrarDemo, loginSso, request, sair, sessaoDemo } from "./api.js";
import { perfis } from "./ui.jsx";
import Profissionais from "./Profissionais.jsx";
import Meus from "./Meus.jsx";
import Chat from "./Chat.jsx";
import Horarios from "./Horarios.jsx";
import Usuarios, { TrocarMinhaSenha } from "./Usuarios.jsx";

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
  const [lento, setLento] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLento(true), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className="sso-neutral" aria-busy={!erro}>
      <img src="/brand/ifconect.png" alt="IFConect" />
      {!erro && <div className="sso-spinner" role="status" aria-label="Conectando" />}
      {!erro && lento && <p>Conectando ao IFSISTEM…</p>}
      {erro && (
        <>
          <p role="alert">{erro}</p>
          <button onClick={() => loginSso()}>Tentar novamente</button>
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
  const [menu, setMenu] = useState(false);
  const [senha, setSenha] = useState(false);
  const rota = useRota();
  useEffect(() => {
    if (demo) return;
    window.IfsistemSSO.getToken()
      .then((token) => (token ? setEu(window.IfsistemSSO.usuario()) : loginSso()))
      .catch((e) => setErroSso(e.message));
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [rota.join("/")]);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setMenu(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);
  if (!eu) {
    return demo ? (
      <DemoLogin onEntrar={(u) => { entrarDemo(u); location.hash = "#/"; setEu(u); }} />
    ) : (
      <Splash erro={erroSso} />
    );
  }
  const aluno = eu.perfil === "ALUNO";
  const profissional = eu.perfil === "PROFESSOR" || eu.perfil === "SERVIDOR";
  const secretaria = !demo && (eu.perfil === "SERVIDOR" || eu.perfil === "ADMINISTRADOR");
  const r = rota[0];
  const chat = r === "chat";
  const usuarios = r === "usuarios" && secretaria;
  const horarios = r === "horarios" && profissional;
  const meus = !chat && !usuarios && !horarios && (r === "meus" || !aluno);
  const tela = chat ? <Chat key={rota[1]} id={rota[1]} eu={eu} />
    : usuarios ? <Usuarios eu={eu} />
    : horarios ? <Horarios eu={eu} />
    : meus ? <Meus eu={eu} />
    : <Profissionais eu={eu} />;
  const nome = chat ? "Conversa" : usuarios ? "Usuários" : horarios ? "Meus horários" : meus ? "Meus atendimentos" : "Professores";
  const item = (href, rotulo, icone, ativo) => (
    <a key={href} href={href} className={`nav-link${ativo ? " active" : ""}`} aria-current={ativo ? "page" : undefined}>
      <span aria-hidden="true">{icone}</span>{rotulo}
    </a>
  );
  return (
    <div className="app-shell">
      {menu && <div className="overlay" onClick={() => setMenu(false)} aria-hidden="true" />}
      <aside className={`sidebar${menu ? " aberto" : ""}`} aria-label="Menu lateral">
        <Brand />
        {portal && (
          <a className="portal-link" href={portal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>
            Voltar ao portal
          </a>
        )}
        <p className="nav-caption">ATENDIMENTO AO ALUNO</p>
        <nav aria-label="Principal">
          {aluno && item("#/", "Professores e servidores", "♙", !chat && !meus && !usuarios && !horarios)}
          {item("#/meus", aluno ? "Meus atendimentos" : "Atendimentos recebidos", "▤", meus)}
          {profissional && item("#/horarios", "Meus horários", "◷", horarios)}
        </nav>
        {secretaria && (
          <>
            <p className="nav-caption">ÁREA DA SECRETARIA</p>
            <nav aria-label="Secretaria">{item("#/usuarios", "Usuários", "♟", usuarios)}</nav>
          </>
        )}
        <div className="sidebar-module">
          <strong>Atendimento ao aluno</strong>
          <p>Canal oficial para falar com professores e servidores e acompanhar suas solicitações.</p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">{eu.nome.slice(0, 1)}</div>
          <strong>{eu.nome}</strong>
          <small>{perfis[eu.perfil]}</small>
          {!demo && <button className="logout" onClick={() => setSenha(true)}>Trocar minha senha</button>}
          <button className="logout" onClick={sair}>Sair da conta</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="hamburguer sec" onClick={() => setMenu(!menu)} aria-label="Abrir menu" aria-expanded={menu}>☰</button>
          <span className="trilha">
            Atendimento ao aluno <span className="muted">/ {nome}</span>
          </span>
          <time className="header-date">{demo && <span className="perfil-tag">Modo demonstração</span>} {data()}</time>
        </header>
        <main className="content">{tela}</main>
      </div>
      {senha && <TrocarMinhaSenha onClose={() => setSenha(false)} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
