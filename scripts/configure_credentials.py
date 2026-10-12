"""Create ignored local hashes and a signing key; never print passwords or secrets."""
import getpass
import hashlib
import json
import pathlib
import secrets
import warnings

ROOT = pathlib.Path(__file__).resolve().parents[1]

def main():
    if (ROOT / '.secrets.local.json').exists():
        answer = input('Ya hay credenciales locales. Reemplazarlas cerrará las sesiones. Escribe REEMPLAZAR: ')
        if answer != 'REEMPLAZAR':
            return
    users = {}
    for user in ('ane', 'haizea'):
        while True:
            password = getpass.getpass(f'Contraseña para {user} (mínimo 12 caracteres): ')
            confirm = getpass.getpass('Repite la contraseña: ')
            if len(password) >= 12 and len(password) <= 256 and password == confirm:
                break
            print('Usa entre 12 y 256 caracteres y repite la misma contraseña.')
        salt = secrets.token_bytes(16)
        users[user] = {'salt': salt.hex(), 'iterations': 100000,
                       'hash': hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000).hex()}
    values = {'USER_CREDENTIALS': json.dumps(users, separators=(',', ':')),
              'SESSION_SECRET': secrets.token_hex(32)}
    (ROOT / '.secrets.local.json').write_text(json.dumps(values), encoding='utf-8')
    (ROOT / '.dev.vars').write_text('\n'.join(f'{key}={json.dumps(value)}' for key, value in values.items()) + '\n', encoding='utf-8')
    print('Configuración guardada en archivos locales ignorados por Git. No se han guardado las contraseñas en texto.')

if __name__ == '__main__':
    # Abort rather than falling back to an echoed password when no terminal is available.
    warnings.simplefilter('error', getpass.GetPassWarning)
    main()
