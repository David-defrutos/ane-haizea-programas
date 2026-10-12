fetch('/api/me').then(response => {
  if (!response.ok || response.redirected) { location.replace('/login'); return null; }
  return response.json();
}).then(profile => {
  if (profile) document.querySelector('#greeting').textContent = `Hola, ${profile.name}. ¿Qué hacemos hoy?`;
}).catch(() => {});
