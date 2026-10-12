fetch('/api/me').then(response => {
  if (!response.ok || response.redirected) { location.replace('/login'); return null; }
  return response.json();
}).then(profile => {
  if (profile) {
    document.querySelector('#greeting').textContent = `Hola, ${profile.name}. ¿Qué hacemos hoy?`;
    document.querySelector('#identity').textContent = profile.role === 'guest' ? 'Perfil de invitado' : 'Cuenta familiar';
    if (profile.role === 'guest') document.querySelector('#storageNote').textContent = 'Tu sesión de invitado dura 24 horas. Al volver a entrar se crea un perfil nuevo; el progreso no se transfiere.';
  }
}).catch(() => {});
