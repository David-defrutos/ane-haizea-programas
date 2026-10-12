# Ane y Haizea · Nuestros programas

Un portal móvil para reunir juegos y herramientas familiares. Incluye **Verb Quest**, el quiz de 52 verbos irregulares en castellano y euskera.

## Código público, acceso protegido

El repositorio es público: cualquiera puede leer o descargar los programas. El acceso al sitio alojado se verifica en un servidor Cloudflare Worker, con las cuentas `ane` y `haizea` y perfiles temporales de invitados. Las dos cuentas familiares y los invitados tienen acceso al portal y al quiz actual. Esto no hace privado el código ni sus recursos: no añadas fotos, información personal ni datos confidenciales al repositorio.

## Invitados y datos personales

La entrada ofrece dos opciones: cuenta familiar con contraseña, o invitado con un nombre o apodo de 2 a 24 caracteres sin contraseña. Los invitados reciben una sesión firmada de 24 horas y un identificador aleatorio propio; escribir «Ane» o «Haizea» como nombre no concede acceso a esas cuentas. Se aplica el mismo límite de entradas por IP a ambos formularios.

`/api/me` devuelve `user`, `name` y `role` (`member` o `guest`), validados por el servidor. Las rutas futuras de datos personales deben estar bajo `/api/private/`: el servidor rechaza visitantes sin sesión (401) e invitados (403). Cada operación de datos deberá comprobar además el propietario con `profile.user`; la existencia de una sesión familiar no autoriza consultar datos de otra cuenta. Nunca se debe decidir el permiso por un nombre, un campo del formulario o un indicador del navegador.

Los datos personales futuros deben guardarse en almacenamiento de servidor, fuera del repositorio y de `public/`. Un ranking público deberá guardar solo los datos que se decida mostrar, como apodo y puntos, y diferenciar invitados de cuentas familiares. **En esta versión no hay base de datos ni ranking compartido online**; los resultados siguen siendo locales.

El progreso de cada invitado queda separado por su identificador de sesión, incluso si dos invitados escriben el mismo nombre. Tras cerrar sesión o caducar y volver a entrar se crea un perfil nuevo: no se recupera progreso anterior ni se comprueba quién es dueño de un apodo. Un nombre sin contraseña no sirve para identificar de forma permanente a una persona.

Las contraseñas no están en HTML ni JavaScript del navegador. El servidor recibe hashes PBKDF2 con sal individual mediante secretos de Cloudflare. Las sesiones usan cookies firmadas, HttpOnly, Secure y SameSite, con una duración de siete días. Cambiar las credenciales invalida las sesiones correspondientes. Todos los archivos pasan por el Worker antes de servirse (`run_worker_first: true`); no publiques `public/` en GitHub Pages ni en otro alojamiento estático sin esta protección.

El progreso y el ranking del quiz se guardan separados por usuaria en el navegador. Se puede abrir el sitio desde cualquier terminal, pero **el progreso no se sincroniza entre dispositivos**. Los datos locales no son secretos frente a otra persona que use el mismo navegador.

## Configurar y publicar desde Windows

Requisitos: Node.js, Python y una cuenta de Cloudflare con Workers habilitado.

1. En una terminal situada en la carpeta del repositorio, instala las herramientas:

   ```powershell
   npm ci
   npx wrangler login
   ```

2. Elige las contraseñas de las niñas en tu propia terminal (mínimo 4 caracteres; pueden ser palabras fáciles de recordar). El programa pide cada contraseña sin mostrarla y no la almacena en texto:

   ```powershell
   python scripts/configure_credentials.py
   ```

   Genera `.dev.vars` y `.secrets.local.json`, ignorados por Git y fuera de `public/`. Son archivos sensibles aunque solo contengan hashes y una clave de sesión. No los compartas ni los añadas con `git add -f`. Si ya existen, el programa solicita confirmación antes de reemplazarlos.

3. Prueba y crea el Worker. Hasta cargar los secretos, la versión publicada responde con 503 y no entrega programas:

   ```powershell
   npm test
   npm run deploy
   npx wrangler secret bulk .secrets.local.json
   ```

4. Abre la dirección HTTPS `workers.dev` que devuelve Wrangler. Prueba ambos usuarios y comprueba que en una ventana privada la ruta `/haizea/irregular-verbs-quiz/` lleva al formulario de acceso.

Cloudflare asigna la dirección del sitio al desplegar; no requiere comprar un dominio. Revisa los límites del plan elegido en tu cuenta. El límite de intentos de acceso es de cinco por minuto por IP en cada ubicación de Cloudflare; no es un límite global estricto.

## Desarrollo y cambios

```powershell
npm run dev -- --local --local-protocol https
```

El navegador puede pedir aceptar el certificado local. Se usa HTTPS también en desarrollo porque la cookie de sesión es Secure. El limitador local lo simula Wrangler; su comportamiento en producción depende de Cloudflare.

Para añadir otro programa:

1. Crea `public/ane/nombre-del-programa/index.html` o `public/haizea/nombre-del-programa/index.html` y coloca los recursos a su lado.
2. Añade una tarjeta con su enlace en `public/index.html`.
3. Prueba, sube los cambios a GitHub y ejecuta `npm run deploy`.

Subir cambios a GitHub por sí solo no publica una nueva versión del sitio. No hay despliegue automático configurado.

Para cambiar contraseñas, repite el generador y `npx wrangler secret bulk .secrets.local.json`. El generador cambia también la clave de sesión y cierra las sesiones de ambas cuentas.

## Estructura

- `public/`: portada, estilos y programas. Solo esta carpeta se publica como recursos web.
- `src/worker.js`: validación de acceso, sesiones y entrega protegida de archivos.
- `src/views.js`: formulario de entrada.
- `scripts/configure_credentials.py`: creación local de credenciales.
- `tests/`: comprobaciones de autenticación y seguridad.
- `wrangler.jsonc`: alojamiento y límite de intentos; no contiene secretos.

Documentación: [recursos protegidos](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [secretos](https://developers.cloudflare.com/workers/configuration/secrets/), [límites de acceso](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
