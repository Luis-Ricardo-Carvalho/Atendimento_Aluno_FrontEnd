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

const ROTA = "ifconect.atendimento.rota";
export const authUrl = location.hostname === "localhost" ? "http://localhost:9000" : "https://ifsistem-auth.onrender.com";

// Guarda a rota pretendida para restaurá-la após o callback do login único.
export function loginSso() {
  if (location.hash.startsWith("#/")) sessionStorage.setItem(ROTA, location.hash);
  return window.IfsistemSSO.login();
}

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
  403: "Seu perfil não tem acesso a esta ação.",
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
    if (r.status === 401) (demo ? sair() : loginSso());
    let msg = "";
    try {
      const j = await r.json();
      msg = j.detail || j.message || "";
    } catch {}
    throw new Error(msg || padrao[r.status] || "Algo deu errado. Tente novamente.");
  }
  return r.status === 204 ? null : r.json();
}

// API de usuários do auth (somente SERVIDOR/ADMINISTRADOR; PUT /me/senha vale para qualquer perfil).
export async function authRequest(path, { method = "GET", body } = {}) {
  let r;
  try {
    r = await window.IfsistemSSO.fetch(authUrl + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar ao IFSISTEM.");
  }
  if (!r.ok) {
    if (r.status === 401) loginSso();
    let msg = "";
    try {
      msg = (await r.json()).erro || "";
    } catch {}
    throw new Error(r.status === 403 ? "Seu perfil não tem acesso a esta ação." : msg || "Não foi possível concluir a ação.");
  }
  return r.status === 204 ? null : r.json();
}
