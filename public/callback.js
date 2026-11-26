const statusMessage = document.getElementById('status');
const retry = document.getElementById('retry');
const waiting = setTimeout(() => { statusMessage.hidden = false; }, 5000);
retry.addEventListener('click', () => {
  retry.disabled = true;
  IfsistemSSO.login().catch(error => { statusMessage.textContent = error.message; retry.disabled = false; });
});
IfsistemSSO.handleCallback().then(user => {
  if (!user) throw new Error('Retorno de login sem código de autorização.');
  clearTimeout(waiting);
  location.replace('/');
}).catch(error => {
  clearTimeout(waiting);
  document.getElementById('transition').setAttribute('aria-busy', 'false');
  document.getElementById('spinner').hidden = true;
  statusMessage.setAttribute('role', 'alert');
  statusMessage.textContent = error.message;
  statusMessage.hidden = false;
  retry.hidden = false;
});
