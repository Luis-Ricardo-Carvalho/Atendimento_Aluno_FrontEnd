/*
 * Login unico do IFSISTEM (OAuth2 authorization_code + PKCE) para os fronts dos sistemas.
 * Uso e exemplos: docs/INTEGRACAO.md do repositorio ifsistem-auth.
 *
 *   IfsistemSSO.init({ authUrl, clientId, redirectUri, postLogoutRedirectUri? });
 *   IfsistemSSO.login();                    // redireciona para o login
 *   await IfsistemSSO.handleCallback();     // na redirectUri: troca o codigo pelo token
 *   await IfsistemSSO.getToken();           // renova sozinho; null se nao ha sessao
 *   await IfsistemSSO.fetch('/api/...');    // fetch com Authorization: Bearer
 *   IfsistemSSO.usuario();                  // { id, cpf, nome, perfil } ou null
 *   await IfsistemSSO.logout();             // encerra no sistema e no servidor de login
 */
const IfsistemSSO = (() => {
    'use strict';

    const FOLGA_SEGUNDOS = 30;
    let cfg = null;
    let renovando = null;

    const agora = () => Math.floor(Date.now() / 1000);
    const chave = nome => 'ifsistem-sso.' + cfg.clientId + '.' + nome;

    function ler(nome) {
        try { return JSON.parse(sessionStorage.getItem(chave(nome))); } catch (e) { return null; }
    }
    const gravar = (nome, valor) => sessionStorage.setItem(chave(nome), JSON.stringify(valor));
    const apagar = nome => sessionStorage.removeItem(chave(nome));

    function base64url(bytes) {
        return btoa(String.fromCharCode(...new Uint8Array(bytes)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    const aleatorio = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
    const sha256 = texto => crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));

    /* So le as claims para exibir na tela; quem valida a assinatura e o backend. */
    function claims(jwt) {
        const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    }

    function exigirInit() {
        if (!cfg) throw new Error('Chame IfsistemSSO.init() antes.');
    }

    function init({ authUrl, clientId, redirectUri, postLogoutRedirectUri }) {
        if (!authUrl || !clientId || !redirectUri)
            throw new Error('IfsistemSSO.init: authUrl, clientId e redirectUri são obrigatórios.');
        cfg = { authUrl: authUrl.replace(/\/+$/, ''), clientId, redirectUri, postLogoutRedirectUri };
    }

    async function login() {
        exigirInit();
        const pedido = { state: aleatorio(), nonce: aleatorio(), verifier: aleatorio() };
        const challenge = base64url(await sha256(pedido.verifier));
        gravar('pedido', pedido);
        location.assign(cfg.authUrl + '/oauth2/authorize?' + new URLSearchParams({
            response_type: 'code', client_id: cfg.clientId, redirect_uri: cfg.redirectUri,
            scope: 'openid profile', state: pedido.state, nonce: pedido.nonce,
            code_challenge: challenge, code_challenge_method: 'S256'
        }));
    }

    /* Devolve o usuario; null se a URL nao e um retorno do login. Lanca Error se o retorno for invalido. */
    async function handleCallback() {
        exigirInit();
        const q = new URLSearchParams(location.search);
        if (!q.has('code') && !q.has('error')) return null;
        const pedido = ler('pedido');
        apagar('pedido');
        history.replaceState(null, '', location.pathname); // tira code e state do historico
        if (!pedido || q.get('state') !== pedido.state) throw new Error('Retorno de login inválido (state).');
        if (q.has('error')) throw new Error('Login recusado: ' + (q.get('error_description') || q.get('error')));
        const r = await pedirToken({
            grant_type: 'authorization_code', code: q.get('code'),
            redirect_uri: cfg.redirectUri, code_verifier: pedido.verifier
        });
        if (!r.ok) throw new Error('Não foi possível concluir o login (erro ' + r.status + ').');
        const dados = await r.json();
        if (claims(dados.id_token).nonce !== pedido.nonce) throw new Error('Retorno de login inválido (nonce).');
        guardar(dados);
        return usuario();
    }

    function pedirToken(parametros) {
        return fetch(cfg.authUrl + '/oauth2/token', {
            method: 'POST', body: new URLSearchParams({ client_id: cfg.clientId, ...parametros })
        });
    }

    function guardar(d) {
        gravar('tokens', {
            access: d.access_token, refresh: d.refresh_token, id: d.id_token, expiraEm: agora() + d.expires_in
        });
    }

    /* O refresh token e de uso unico: chamadas simultaneas compartilham a mesma renovacao. */
    function renovar(refresh) {
        renovando ??= (async () => {
            const r = await pedirToken({ grant_type: 'refresh_token', refresh_token: refresh });
            if (r.ok) guardar(await r.json());
            else if (r.status < 500) apagar('tokens'); // vencido, revogado ou usuario inativo
            else throw new Error('Servidor de login indisponível (erro ' + r.status + ').');
        })().finally(() => { renovando = null; });
        return renovando;
    }

    /* Token valido, renovado se preciso; null = nao autenticado (chame login()). */
    async function getToken() {
        exigirInit();
        let t = ler('tokens');
        if (t && t.expiraEm - FOLGA_SEGUNDOS <= agora()) {
            await renovar(t.refresh);
            t = ler('tokens');
        }
        return t ? t.access : null;
    }

    /* Use so com URLs dos seus backends: o token vai no cabecalho. */
    async function fetchComToken(url, opcoes = {}) {
        const token = await getToken();
        if (!token) throw new Error('Não autenticado.');
        const headers = new Headers(opcoes.headers);
        headers.set('Authorization', 'Bearer ' + token);
        return fetch(url, { ...opcoes, headers });
    }

    function usuario() {
        exigirInit();
        const t = ler('tokens');
        if (!t) return null;
        const c = claims(t.access);
        return { id: c.sub, cpf: c.cpf, nome: c.nome, perfil: c.perfil };
    }

    async function logout() {
        exigirInit();
        const t = ler('tokens');
        apagar('tokens');
        const destino = cfg.postLogoutRedirectUri || new URL('/', cfg.redirectUri).href;
        if (!t) return location.assign(destino);
        try {
            await fetch(cfg.authUrl + '/oauth2/revoke', {
                method: 'POST', keepalive: true,
                body: new URLSearchParams({ client_id: cfg.clientId, token: t.refresh, token_type_hint: 'refresh_token' })
            });
        } catch (e) { /* melhor esforco: o logout abaixo encerra a sessao de qualquer forma */ }
        location.assign(cfg.authUrl + '/connect/logout?' + new URLSearchParams({
            id_token_hint: t.id, client_id: cfg.clientId, post_logout_redirect_uri: destino
        }));
    }

    return { init, login, handleCallback, getToken, fetch: fetchComToken, logout, usuario };
})();
