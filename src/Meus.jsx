import React, { useState } from "react";
import { request } from "./api.js";
import { Avatar, Badge, Erro, Heading, Skeleton, Vazio, useAsync } from "./ui.jsx";
import { categorias, dataHora } from "./format.js";

const FIM = ["FINALIZADO", "CANCELADO"];

export default function Meus({ eu }) {
  const aluno = eu.perfil === "ALUNO";
  const abas = aluno
    ? [["Em andamento", ["EM_ATENDIMENTO"]], ["Aguardando resposta", ["ABERTO", "AGUARDANDO_ALUNO"]], ["Finalizados", FIM]]
    : [["Novas solicitações", ["ABERTO"]], ["Em andamento", ["EM_ATENDIMENTO", "AGUARDANDO_ALUNO"]], ["Finalizados", FIM]];
  const [escolhida, setAba] = useState(null);
  const { data, error, loading, reload } = useAsync(() => request("/atendimentos/meus"), []);
  // Abre na primeira aba que tenha itens, a menos que a pessoa já tenha escolhido outra.
  const primeira = abas.findIndex(([, st]) => (data || []).some((a) => st.includes(a.status)));
  const aba = escolhida ?? Math.max(0, primeira);
  const itens = (data || []).filter((a) => abas[aba][1].includes(a.status));

  return (
    <>
      <Heading
        eu={eu}
        titulo={aluno ? "Meus atendimentos" : "Atendimentos recebidos"}
        texto={aluno ? "Acompanhe o status e o histórico das suas solicitações." : "Responda, acompanhe e finalize as solicitações destinadas a você."}
      />
      <div className="abas" role="tablist">
        {abas.map(([nome, status], i) => (
          <button key={nome} role="tab" aria-selected={aba === i} className={`aba${aba === i ? " ativo" : ""}`} onClick={() => setAba(i)}>
            {nome} <span>{(data || []).filter((a) => status.includes(a.status)).length}</span>
          </button>
        ))}
      </div>
      {error && !data ? (
        <Erro texto={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton n={2} />
      ) : itens.length === 0 ? (
        aluno && (data || []).length === 0 ? (
          <Vazio titulo="Você ainda não possui nenhum atendimento." acao={<a className="botao" href="#/">Encontrar um professor</a>} />
        ) : (
          <Vazio titulo="Nada por aqui." texto="Nenhum atendimento nesta aba." />
        )
      ) : (
        <ul className="lista">
          {itens.map((a) => {
            const outro = a.aluno.id === eu.id ? a.atendente : a.aluno;
            return (
              <li key={a.id}>
                <a className="item" href={`#/chat/${a.id}`}>
                  <Avatar nome={outro.nome} />
                  <div className="corpo">
                    <div className="linha">
                      <strong>{outro.nome}</strong>
                      <Badge status={a.status} />
                    </div>
                    <span>{a.assunto} · <small>{categorias[a.categoria]}</small></span>
                    {a.ultimaMensagem && <p className="previa">{a.ultimaMensagem}</p>}
                    <small>Criado em {dataHora(a.dataCriacao)} · Atualizado em {dataHora(a.dataAtualizacao)}</small>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
