<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Guía de instalación de Cinammon Panel y Wings en un servidor Linux.">
    <title>Instalación del panel · Cinammon Docs</title>
    <style>
        :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#080c18;color:#e9edf8;line-height:1.65}*{box-sizing:border-box}body{margin:0}a{color:#73d9ee}header{position:sticky;top:0;background:#0c1220ed;border-bottom:1px solid #26304a;z-index:2;padding:14px max(24px,calc((100vw - 1160px)/2));display:flex;justify-content:space-between;gap:20px;align-items:center}header a{text-decoration:none}header strong{color:#fff;letter-spacing:.04em}header span{color:#93a5c8}main{max-width:1160px;margin:auto;padding:48px 24px;display:grid;grid-template-columns:235px minmax(0,1fr);gap:56px}nav{position:sticky;top:90px;align-self:start}nav a{display:block;padding:8px 12px;text-decoration:none;color:#aebbd3;border-left:2px solid transparent}nav a:hover{color:#77dce9;border-color:#77dce9}article{max-width:780px}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.15;margin:8px 0 16px}h2{margin-top:64px;border-top:1px solid #26304a;padding-top:28px;font-size:1.65rem}h3{margin-top:30px}p,li{color:#b8c3d8}.eyebrow{color:#79d7e8;font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.16em}.lead{font-size:1.15rem}.notice{border:1px solid #35516b;background:#111f32;padding:16px 20px;border-radius:12px;margin:24px 0}.notice strong{color:#9be9f3}pre{background:#10182a;border:1px solid #293850;border-radius:12px;overflow:auto;padding:20px;color:#d9eff4;line-height:1.5}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}p code,li code{background:#1d2940;padding:2px 5px;border-radius:4px}ol{padding-left:24px}li{margin:8px 0}.next{margin:60px 0;padding:24px;border:1px solid #35516b;border-radius:14px;background:#101a2a}@media(max-width:760px){main{display:block;padding-top:30px}nav{position:static;display:flex;overflow:auto;white-space:nowrap;margin-bottom:35px}nav a{border-left:0;border-bottom:2px solid transparent}header span{display:none}}
    </style>
</head>
<body>
<header><a href="/"><strong>✦ CINAMMON</strong> <span>/ DOCUMENTACIÓN</span></a><a href="https://github.com/cinammon-net/panel">GitHub ↗</a></header>
<main>
    <nav aria-label="Contenido">
        <a href="#inicio">Introducción</a><a href="#requisitos">Requisitos</a><a href="#archivos">Archivos</a><a href="#entorno">Entorno y base de datos</a><a href="#web">Servidor web</a><a href="#procesos">Colas y tareas</a><a href="#wings">Wings</a><a href="#comprobar">Comprobación</a><a href="#actualizar">Actualizaciones</a>
    </nav>
    <article>
        <div class="eyebrow">Guía de instalación · Linux</div>
        <h1 id="inicio">Instala Cinammon Panel</h1>
        <p class="lead">Despliega el panel de gestión de servidores y conecta un nodo Wings. Esta guía usa Ubuntu o Debian, Nginx y SQLite como punto de partida.</p>
        <div class="notice"><strong>Antes de empezar:</strong> necesitas acceso administrativo al servidor, un dominio que apunte a su IP y un certificado TLS. Sustituye los dominios y rutas de ejemplo por los tuyos.</div>

        <h2 id="requisitos">1. Requisitos</h2>
        <ul><li>Linux de 64 bits, PHP 8.2 o posterior con extensiones habituales de Laravel: CLI, FPM, SQLite o MySQL, mbstring, XML, cURL, ZIP y BCMath.</li><li>Composer 2, Node.js 20 o posterior, npm, Git y Nginx.</li><li>Docker Engine en cada máquina que vaya a ejecutar Wings.</li></ul>
        <p>El panel usa Laravel 12 y compila la interfaz con Vite. Comprueba las versiones instaladas antes de seguir:</p>
        <pre><code>php -v
composer --version
node --version
npm --version</code></pre>

        <h2 id="archivos">2. Descarga y dependencias</h2>
        <p>Usa una copia del repositorio. La ruta mostrada coincide con la usada por el actualizador del proyecto.</p>
        <pre><code>sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/cinammon-net/panel.git cinammon-panel
cd cinammon-panel
sudo composer install --no-dev --optimize-autoloader
sudo npm ci
sudo npm run build</code></pre>
        <p>Si instalas desde un release que ya incluye <code>vendor/</code> y <code>public/build/</code>, no necesitas repetir esos pasos de compilación.</p>

        <h2 id="entorno">3. Entorno y base de datos</h2>
        <pre><code>cd /var/www/cinammon-panel
sudo cp .env.example .env
sudo php artisan key:generate</code></pre>
        <p>Edita <code>.env</code> y configura al menos <code>APP_NAME</code>, <code>APP_ENV=production</code>, <code>APP_DEBUG=false</code>, <code>APP_URL=https://panel.tudominio.com</code> y <code>DB_CONNECTION</code>. Para comenzar con SQLite:</p>
        <pre><code>sudo touch database/database.sqlite
sudo php artisan migrate --force
sudo php artisan storage:link
sudo chown -R www-data:www-data storage bootstrap/cache database/database.sqlite
sudo chmod -R ug+rwX storage bootstrap/cache</code></pre>
        <p>Para MySQL o MariaDB, crea antes una base de datos y un usuario propios y configura <code>DB_HOST</code>, <code>DB_PORT</code>, <code>DB_DATABASE</code>, <code>DB_USERNAME</code> y <code>DB_PASSWORD</code> en <code>.env</code>. Configura también un transporte de correo real para enviar mensajes.</p>

        <h2 id="web">4. Nginx y HTTPS</h2>
        <p>Apunta la raíz web a <code>public/</code>; nunca a la raíz del repositorio. Ajusta la versión del socket PHP-FPM a la instalada en tu sistema.</p>
        <pre><code>server {
    listen 80;
    server_name panel.tudominio.com;
    root /var/www/cinammon-panel/public;
    index index.php;

    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
    }
    location ~ /\. { deny all; }
}</code></pre>
        <p>Activa el sitio, comprueba <code>nginx -t</code> y configura HTTPS antes de abrir el panel al público. Establece la URL HTTPS definitiva en <code>APP_URL</code> y ejecuta <code>php artisan config:clear</code>.</p>

        <h2 id="procesos">5. Colas y tareas programadas</h2>
        <p>El entorno de ejemplo usa colas y sesiones en base de datos. Mantén un worker en ejecución mediante systemd o Supervisor:</p>
        <pre><code>cd /var/www/cinammon-panel
sudo -u www-data php artisan queue:work --sleep=3 --tries=3</code></pre>
        <p>Programa el scheduler cada minuto con el usuario del servidor web:</p>
        <pre><code>* * * * * cd /var/www/cinammon-panel &amp;&amp; php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1</code></pre>

        <h2 id="wings">6. Conecta Wings</h2>
        <ol><li>Instala Docker Engine en el nodo y descarga una versión compatible de <a href="https://github.com/cinammon-net/wings/releases">Cinammon Wings</a>.</li><li>En el panel, crea un nodo y descarga su archivo de configuración desde <strong>Configuration File</strong>.</li><li>Guárdalo como <code>/etc/cinammon/config.yml</code> en el nodo y configura Wings como servicio systemd. Protege el archivo: contiene credenciales del nodo.</li><li>Abre únicamente los puertos de API, SFTP y juegos que hayas configurado y comprueba que el panel puede alcanzar el nodo.</li></ol>
        <p>La configuración y el ejemplo de servicio están en el <a href="https://github.com/cinammon-net/wings#readme">repositorio de Wings</a>. El nodo puede residir en otra máquina.</p>

        <h2 id="comprobar">7. Comprueba la instalación</h2>
        <pre><code>cd /var/www/cinammon-panel
php artisan about
php artisan migrate:status
php artisan queue:failed
sudo nginx -t</code></pre>
        <p>Abre la URL HTTPS, inicia sesión y confirma que el nodo aparece conectado antes de crear un servidor de juego.</p>

        <h2 id="actualizar">Actualizaciones</h2>
        <p>Haz una copia de <code>.env</code>, la base de datos y <code>storage/</code> antes de actualizar. Los releases oficiales pueden incluir <code>panel.tar.gz</code> listo para desplegar. Después de actualizar, ejecuta las migraciones y limpia la caché:</p>
        <pre><code>sudo php artisan migrate --force
sudo php artisan optimize:clear
sudo php artisan queue:restart</code></pre>
        <div class="next">¿Necesitas ayuda con un nodo? Consulta <a href="https://github.com/cinammon-net/wings">Cinammon Wings</a> o vuelve al <a href="/">panel</a>.</div>
    </article>
</main>
</body>
</html>
