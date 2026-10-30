# CINAMMON.NET

## Configuración del nodo

El panel genera la configuración desde la pestaña Configuration File del nodo.
La descarga requiere iniciar sesión y está disponible en
`/api/nodes/{id}/config-yaml` y `/nodes/{id}/config-yaml`.

1. Configura `APP_URL` en el `.env` del **panel** con su URL pública (por ejemplo,
   `https://panel.example.com`), accesible desde el servidor del nodo.
2. Ejecuta `php artisan config:clear` después de cambiar ese valor.
3. Guarda el dominio, puerto de API, modo TLS y puerto SFTP del nodo en el panel.
   `https` activa TLS en el daemon; `https-reverse` delega TLS al proxy y `http`
   usa HTTP. Si el daemon termina TLS, necesita los certificados indicados.
4. Descarga de nuevo el YAML. `remote` debe apuntar al panel y `api.port` al puerto
   del nodo. Para Wings, `system.sftp.bind_port` contiene el puerto SFTP.
5. Instala el archivo en la ubicación que use el servicio del daemon y reinícialo
   en el servidor donde esté instalado. Confirma primero qué daemon estás usando.

El `config.yml` de la raíz del repositorio contiene una página HTML de error 404;
no es una configuración utilizable. Descarga el archivo desde el panel autenticado.
No compartas el YAML completo: contiene el token del nodo.

La API remota autentica el nodo y entrega la configuración de sus servidores a
Cinammon Wings (`cinammon-net/wings`). Incluye el script de instalación y recibe
los estados de instalación y del proceso. Las comprobaciones del nodo usan
`/api/system` con autenticación y el puerto configurado cada minuto.

## Servidor Minecraft y consola

El servidor **Minecraft Paper Local** está instalado en el nodo local con Paper
26.3, build estable 230, Java 25, 2048 MB de RAM, 5 GiB de disco y 10 jugadores.
La descarga de Paper está fijada y se verifica mediante SHA-256.

- Consola: <http://localhost:8000/servers/1/console>
- Dirección en Minecraft Java **26.3**: `localhost:25565`.
- Logs actualizados cada 2 segundos, comandos y controles de inicio, parada y reinicio.
- Pestaña Archivos para explorar carpetas y previsualizar texto de hasta 1 MB.
  No permite abrir credenciales, rutas fuera del servidor ni enlaces simbólicos.
- El propietario y los roles Owner/Admin pueden acceder a la consola.
- El token de Wings permanece en el backend.
- La EULA fue aceptada por el usuario para este servidor. Otros servidores requieren
  su propia aceptación explícita desde la consola.
- La cuenta Minecraft se autentica con Microsoft (`online-mode=true`).

La instalación local reproducible usa `local/create-paper.php` y la imagen Java
de `local/paper/Dockerfile`. Para controlarlo desde terminal:

```sh
./local/dev php local/paper-control.php status
./local/dev php local/paper-control.php logs
./local/dev php local/paper-control.php start
./local/dev php local/paper-control.php stop
```

Los archivos y el mundo se conservan dentro de la VM en
`/var/lib/cinammon/volumes/<UUID-del-servidor>`; reiniciar el contenedor conserva
el mundo. El soporte de copias de seguridad, SFTP y la gestión avanzada del panel
no se ha verificado como parte de esta instalación.

## Servidor Discord Bot

- Servidor del panel: **Cinammon Discord Bot**, 512 MB de RAM, Node.js 24.
- Consola: <http://localhost:8000/servers/2/console>.
- Código: `local/discord-bot/`. Imagen: `cinammon-discord-bot:node24`.
- Sin puertos entrantes: mantiene una conexión saliente al Gateway de Discord.
- Comandos de Discord: `/ping`, `/ayuda`, `/estado`; respuestas privadas al usuario.
- Comandos de proceso en la consola: `status`, `test`, `stop`.
- El proceso puede estar arrancado mientras Discord permanece desconectado.
  La consola distingue ambos estados.

Para conectar de verdad, crea una aplicación en
<https://discord.com/developers/applications>, acepta sus condiciones y genera
el token desde la sección Bot. Pégalo exclusivamente en el campo privado
**Token del bot** de la consola y pulsa **Guardar token y conectar**. No lo
pegues en mensajes, commits ni comandos de consola.

El token se guarda en `bot-config.json`, dentro del volumen del servidor en la VM;
el proceso restringe ese archivo a permisos 0600. El panel no devuelve el token.
El bot usa únicamente el intent Guilds; no necesita Message Content ni permisos
administrativos. Tras conectar, la consola mostrará un enlace para invitarlo con
los scopes `bot` y `applications.commands` sin permisos administrativos.

El ID de un servidor existente de Discord es opcional: permite registrar los
comandos directamente allí. Si se omite, se registran globalmente para la propia
aplicación. La prueba real consiste en invitar el bot a un servidor que administras
y ejecutar `/ping`. Las pruebas locales **no** sustituyen esa comprobación.

```sh
./local/dev php local/discord-control.php status
./local/dev php local/discord-control.php test
./local/dev php local/discord-control.php logs
cd local/discord-bot
npm test
```

## Entorno local instalado en este Mac

- Panel: <http://localhost:8000/login>
- Cuenta local: `admin@cinammon.local`; contraseña en `local/admin.credentials`.
- Nodo: `Local Linux`, Wings en el puerto 8080 y SFTP en 2022.
- Máquina virtual Lima: `cinammon-local`, 4 CPU, 4 GiB de RAM y disco virtual de 30 GiB.
- PHP 8.4 y SQLite en Docker; Wings se compila desde el repositorio hermano `../wings`
  y se ejecuta como servicio dentro de Linux.
- Base de datos local: `database/local.sqlite`. Tokens y credenciales se excluyen de Git.
- El seeder original crea también cuentas de demostración; este entorno es exclusivamente
  local y no debe publicarse en Internet.

Desde la carpeta `panel`:

```sh
./local/dev status
./local/dev stop
./local/dev start
./local/dev logs
./local/dev php artisan test --filter=NodeConfigurationTest
```

`local/dev stop` apaga la VM para liberar sus recursos; conserva los datos.
El panel y el scheduler usan los contenedores `cinammon-panel` y
`cinammon-scheduler`. El nodo usa el servicio `cinammon-wings` de la VM.
Lima está en `../.local-runtime/lima`, y los datos Linux en
`~/.lima/cinammon-local`. El archivo `local/lima.yaml` conserva la configuración
para este Mac. No se ha conectado ni modificado la VPS.

## Comprobaciones

```sh
composer install
php artisan test --filter=NodeConfigurationTest
npm ci
npm run build
```
