<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@yield('title', 'Error | Algo salió mal')</title>

    <!-- Fuente Orbitron -->
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #0a0a0a;
            color: #ffffff;
            font-family: 'Orbitron', sans-serif;
            text-align: center;
        }

        .error-container {
            max-width: 650px;
            padding: 30px;
            border: 1px solid #c084fc44;
            border-radius: 12px;
            background: linear-gradient(145deg, #141414, #1a1a1a);
            box-shadow: 0 0 30px #c084fc33;
            animation: fadeIn 1s ease-in-out;
        }

        h1 {
            font-size: 90px;
            font-weight: 800;
            color: #ff3cac;
            letter-spacing: 4px;
            animation: glitch 1s infinite alternate;
            text-shadow: 0 0 10px #ff3cac99;
        }

        h3 {
            font-size: 20px;
            color: #eeeeee;
            margin-top: 8px;
            text-shadow: 0 0 5px #8a2be2;
        }

        p {
            font-size: 20px;
            color: #ff8800;
            font-weight: bold;
            text-shadow: 1px 1px 10px rgba(255, 136, 0, 0.7), -1px -1px 10px rgba(255, 136, 0, 0.7);
            margin: 20px 0;
            font-style: italic;
            animation: pulse 2s infinite alternate;
        }

        .error-code {
            font-size: 18px;
            font-weight: bold;
            color: #f1c40f;
            text-shadow: 0 0 6px #f1c40f99;
        }

        a {
            text-decoration: none;
            padding: 12px 26px;
            background-color: #00bcd4;
            color: #000;
            border-radius: 6px;
            font-weight: bold;
            box-shadow: 0 0 15px #00bcd499;
            transition: all 0.3s ease-in-out;
        }

        a:hover {
            background-color: #00acc1;
            color: #fff;
            box-shadow: 0 0 25px #00e5ff;
        }

        @keyframes glitch {
            0% {
                text-shadow: 2px 0 #ff00c8, -2px 0 #00ffe1;
            }

            100% {
                text-shadow: -2px 0 #ff00c8, 2px 0 #00ffe1;
            }
        }

        @keyframes pulse {
            0% {
                transform: scale(1);
                opacity: 0.85;
            }

            50% {
                transform: scale(1.05);
                opacity: 1;
            }

            100% {
                transform: scale(1);
                opacity: 0.85;
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>

<body>
    <div class="error-container">
        <h1>¡Oops!</h1>
        <h3>Algo salió mal. No podemos encontrar la página que buscas.</h3>

        <p>
            El enlace <span style="color:#00e0ff">{{ request()->url() }}</span> no existe o fue eliminado.
        </p>

        @hasSection('message')
        <p>@yield('message')</p>
        @endif

        <p class="error-code">Error: @yield('code', 'XXX')</p>

        <a href="/">Volver al inicio</a>
    </div>
</body>

</html>