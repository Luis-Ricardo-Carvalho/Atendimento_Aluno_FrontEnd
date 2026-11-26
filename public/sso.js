const local = location.hostname === 'localhost';
IfsistemSSO.init({
  authUrl: local ? 'http://localhost:9000' : 'https://ifsistem-auth.onrender.com',
  // Cliente "atendimento": a equipe do auth precisa cadastrá-lo (ver README). Para testar antes
  // do cadastro, é possível usar temporariamente o cliente 'chaves' (mesmas URIs de localhost:5173).
  clientId: 'atendimento',
  redirectUri: location.origin + '/callback.html',
  postLogoutRedirectUri: location.origin + '/'
});
window.IfsistemSSO = IfsistemSSO;
