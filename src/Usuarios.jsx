import React, { useEffect, useState } from "react";
import { authRequest } from "./api.js";
import { ConfirmModal, Erro, Heading, Modal, Skeleton, Vazio, perfis, useAsync } from "./ui.jsx";

const mascara = (v) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export default function Usuarios({ eu }) {
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [perfil, setPerfil] = useState("");
  const [ativo, setAtivo] = useState("");
  const [page, setPage] = useState(0);
  const [dlg, setDlg] = useState(null); // {tipo, usuario}
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setQ(busca); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [busca]);
  const url = `/usuarios?q=${encodeURIComponent(q)}&perfil=${perfil}&ativo=${ativo}&page=${page}&size=10&sort=nome`;
  const { data, error, loading, reload } = useAsync(() => authRequest(url), [url]);
  const fechar = (recarregar) => { setDlg(null); if (recarregar) reload(); };

  async function acao(fn) {
    setAviso("");
    try { await fn(); reload(); } catch (e) { setAviso(e.message); }
  }

  return (
    <>
      <Heading eu={eu} titulo="Usuários do IFSISTEM" texto="Cadastros e permissões compartilhados com os outros módulos." />
      <section className="card">
        <div className="linha">
          <div><h2>Usuários</h2><small>Aluno se cadastra sozinho na tela do login único.</small></div>
          <button onClick={() => setDlg({ tipo: "form" })}>Cadastrar usuário</button>
        </div>
        <div className="grade-form filtros">
          <label>Buscar nome ou CPF<input value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
          <label>Perfil
            <select value={perfil} onChange={(e) => { setPerfil(e.target.value); setPage(0); }}>
              <option value="">Todos</option>
              {Object.entries(perfis).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
          <label>Situação
            <select value={ativo} onChange={(e) => { setAtivo(e.target.value); setPage(0); }}>
              <option value="">Todas</option><option value="true">Ativos</option><option value="false">Inativos</option>
            </select>
          </label>
        </div>
        {aviso && <p className="erro-texto" role="alert">{aviso}</p>}
        {error && !data ? <Erro texto={error} onRetry={reload} /> : loading && !data ? <Skeleton n={1} /> : data.conteudo.length === 0 ? (
          <Vazio titulo="Nenhum usuário encontrado." />
        ) : (
          <>
            <table className="tabela">
              <thead><tr><th>Nome</th><th>Contato</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead>
              <tbody>
                {data.conteudo.map((u) => {
                  const eleMesmo = u.id === eu.id;
                  return (
                    <tr key={u.id}>
                      <td data-rotulo="Nome"><strong>{u.nome}</strong><small>{u.matricula || u.cpf}</small></td>
                      <td data-rotulo="Contato">{u.email}</td>
                      <td data-rotulo="Perfil">{perfis[u.perfil]}</td>
                      <td data-rotulo="Situação">{u.ativo ? "Ativo" : "Inativo"}</td>
                      <td className="acoes-linha">
                        <button className="sec peq" onClick={() => setDlg({ tipo: "form", usuario: u })}>Editar</button>
                        <button className="sec peq" onClick={() => setDlg({ tipo: "senha", usuario: u })}>Redefinir senha</button>
                        {!eleMesmo && (
                          <>
                            <button className="sec peq" onClick={() => acao(() => authRequest(`/usuarios/${u.id}/ativo`, { method: "PATCH", body: { ativo: !u.ativo } }))}>
                              {u.ativo ? "Inativar" : "Reativar"}
                            </button>
                            <button className="sec peq texto-perigo" onClick={() => setDlg({ tipo: "excluir", usuario: u })}>Excluir</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="paginacao">
              <button className="sec peq" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
              <small>Página {data.pagina + 1} de {Math.max(1, data.totalPaginas)} · {data.totalElementos} usuários</small>
              <button className="sec peq" disabled={page + 1 >= data.totalPaginas} onClick={() => setPage(page + 1)}>Próxima</button>
            </div>
          </>
        )}
      </section>
      {dlg?.tipo === "form" && <FormUsuario usuario={dlg.usuario} onClose={fechar} />}
      {dlg?.tipo === "senha" && <RedefinirSenha usuario={dlg.usuario} onClose={fechar} />}
      {dlg?.tipo === "excluir" && (
        <ConfirmModal titulo="Excluir usuário" perigo rotulo="Excluir" onClose={() => setDlg(null)}
          texto={`Excluir ${dlg.usuario.nome}? O histórico dos módulos é preservado, mas a pessoa perde o acesso.`}
          onConfirm={() => { const u = dlg.usuario; setDlg(null); acao(() => authRequest(`/usuarios/${u.id}`, { method: "DELETE" })); }} />
      )}
    </>
  );
}

function FormUsuario({ usuario, onClose }) {
  const novo = !usuario;
  const [f, setF] = useState(novo ? { cpf: "", nome: "", email: "", senhaInicial: "", perfil: "PROFESSOR" }
    : { nome: usuario.nome, email: usuario.email || "", telefone: usuario.telefone || "", curso: usuario.curso || "", periodo: usuario.periodo ?? "" });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: k === "cpf" ? mascara(e.target.value) : e.target.value });
  async function enviar(e) {
    e.preventDefault();
    setBusy(true);
    setErro("");
    try {
      if (novo) await authRequest("/usuarios", { method: "POST", body: { ...f, cpf: f.cpf.replace(/\D/g, "") } });
      else await authRequest(`/usuarios/${usuario.id}`, { method: "PUT", body: { ...f, periodo: f.periodo === "" ? null : Number(f.periodo) } });
      onClose(true);
    } catch (x) {
      setErro(x.message);
      setBusy(false);
    }
  }
  return (
    <Modal titulo={novo ? "Cadastrar usuário" : "Editar usuário"} onClose={() => onClose(false)}>
      <form className="grade-modal" onSubmit={enviar}>
        {novo && <label>CPF<input inputMode="numeric" value={f.cpf} onChange={set("cpf")} placeholder="000.000.000-00" required /></label>}
        <label>Nome<input value={f.nome} onChange={set("nome")} required /></label>
        <label>E-mail<input type="email" value={f.email} onChange={set("email")} required /></label>
        {novo ? (
          <>
            <label>Senha inicial<input type="password" autoComplete="new-password" value={f.senhaInicial} onChange={set("senhaInicial")} required /></label>
            <label>Perfil<select value={f.perfil} onChange={set("perfil")}><option value="PROFESSOR">Professor</option><option value="SERVIDOR">Servidor</option></select></label>
          </>
        ) : (
          <>
            <label>Telefone<input value={f.telefone} onChange={set("telefone")} /></label>
            <label>Curso<input value={f.curso} onChange={set("curso")} /></label>
            <label>Período<input type="number" min="1" value={f.periodo} onChange={set("periodo")} /></label>
          </>
        )}
        {erro && <p className="erro-texto" role="alert">{erro}</p>}
        <div className="acoes">
          <button type="button" className="sec" onClick={() => onClose(false)}>Cancelar</button>
          <button disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

function RedefinirSenha({ usuario, onClose }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  async function enviar(e) {
    e.preventDefault();
    try { await authRequest(`/usuarios/${usuario.id}/senha`, { method: "PUT", body: { senha } }); onClose(true); } catch (x) { setErro(x.message); }
  }
  return (
    <Modal titulo={`Redefinir senha de ${usuario.nome}`} onClose={() => onClose(false)}>
      <form className="grade-modal" onSubmit={enviar}>
        <label>Nova senha<input type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></label>
        <small>As sessões ativas da pessoa serão encerradas.</small>
        {erro && <p className="erro-texto" role="alert">{erro}</p>}
        <div className="acoes"><button type="button" className="sec" onClick={() => onClose(false)}>Cancelar</button><button>Redefinir</button></div>
      </form>
    </Modal>
  );
}

// Qualquer perfil: PUT /me/senha. 400 (senha atual errada) mostra o erro sem deslogar.
export function TrocarMinhaSenha({ onClose }) {
  const [f, setF] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function enviar(e) {
    e.preventDefault();
    if (f.novaSenha !== f.confirmar) return setErro("A confirmação não confere com a nova senha.");
    try {
      await authRequest("/me/senha", { method: "PUT", body: { senhaAtual: f.senhaAtual, novaSenha: f.novaSenha } });
      setOk(true);
    } catch (x) { setErro(x.message); }
  }
  return (
    <Modal titulo="Trocar minha senha" onClose={onClose}>
      {ok ? (
        <>
          <p>Senha alterada. As outras sessões da sua conta foram encerradas.</p>
          <div className="acoes"><button onClick={onClose}>Fechar</button></div>
        </>
      ) : (
        <form className="grade-modal" onSubmit={enviar}>
          <label>Senha atual<input type="password" autoComplete="current-password" value={f.senhaAtual} onChange={set("senhaAtual")} required /></label>
          <label>Nova senha<input type="password" autoComplete="new-password" value={f.novaSenha} onChange={set("novaSenha")} required /></label>
          <label>Confirmar nova senha<input type="password" autoComplete="new-password" value={f.confirmar} onChange={set("confirmar")} required /></label>
          {erro && <p className="erro-texto" role="alert">{erro}</p>}
          <div className="acoes"><button type="button" className="sec" onClick={onClose}>Cancelar</button><button>Trocar senha</button></div>
        </form>
      )}
    </Modal>
  );
}
