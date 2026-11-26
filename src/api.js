const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
// Modo demonstração (npm run dev:demo): sem SSO; envia "Authorization: Demo <uuid>" ao backend de perfil demo/dev.
export const demo = import.meta.env.VITE_DEMO_AUTH === "true";
const CHAVE = "ifconect.atendimento.demo";

export const sessaoDemo = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE));
  } catch {
    return null;
  }
};
export const entrarDemo = (u) => sessionStorage.setItem(CHAVE, JSON.stringify(u));

export function sair() {
  if (demo) {
    sessionStorage.removeItem(CHAVE);
    location.reload();
  } else {
    window.IfsistemSSO.logout().catch(() => location.assign("/"));
  }
}

const padrao = {
  400: "Confira os dados informados.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem acesso a esta ação.",
  404: "Não encontramos o que você procurava.",
  409: "Esta ação não é possível no estado atual.",
};

// path é relativo a /api (ex.: "/atendimentos/meus").
export async function request(path, { method = "GET", body } = {}) {
  const url = `${base}/api${path}`;
  const opcoes = { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined };
  let r;
  try {
    if (demo) {
      const s = sessaoDemo();
      if (s) opcoes.headers.Authorization = `Demo ${s.id}`;
      r = await fetch(url, opcoes);
    } else {
      r = await window.IfsistemSSO.fetch(url, opcoes); // renova o token e envia Bearer
    }
  } catch (e) {
    throw new Error(e.message === "Não autenticado." ? e.message : "Não foi possível conectar ao servidor.");
  }
  if (!r.ok) {
    if (r.status === 401) sair();
    let msg = "";
    try {
      const j = await r.json();
      msg = j.detail || j.message || "";
    } catch {}
    throw new Error(msg || padrao[r.status] || "Algo deu errado. Tente novamente.");
  }
  return r.status === 204 ? null : r.json();
}
