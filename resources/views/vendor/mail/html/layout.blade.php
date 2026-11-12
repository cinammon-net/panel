@php
    // Diseño de los correos (igual en panel y billing), con la estética de la web: fondo casi negro, tarjeta con borde
    // y brillo en el color de la temporada o festivo (Seasons::emailTheme()) y títulos en Orbitron. Todo va en línea
    // y con bgcolor, porque Gmail y Outlook ignoran gran parte del <style>.
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
    $kicker = $kicker ?? null;
    $archiveUrl = $archiveUrl ?? null;
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    $p = $theme['primary'];
    $s = $theme['secondary'];
    // Enlaces del texto en el color de la temporada (el tema CSS es fijo, esto va en línea)
    $body = preg_replace('/<a href="([^"]*)">/', '<a href="$1" style="color: '.$p.'; font-weight: 700; text-decoration: underline;">', (string) Illuminate\Mail\Markdown::parse($slot));
@endphp
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
<title>{{ config('app.name') }}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&amp;display=swap" rel="stylesheet" />
<style>
:root { color-scheme: dark; supported-color-schemes: dark; }
@media only screen and (max-width: 620px) {
    .inner-body { width: 100% !important; border-radius: 0 !important; }
    .content-cell { padding: 28px 22px !important; }
    .header-cell { padding: 22px 22px !important; }
    .footer-cell { padding: 22px 22px !important; }
    .wrapper-cell { padding: 0 !important; }
}
@media only screen and (max-width: 480px) {
    .button { display: block !important; text-align: center !important; }
    .season-badge { display: none !important; }
}
</style>
{{ $head ?? '' }}
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #000000; color: #c9c6d6; font-family: {!! $font !!}; -webkit-text-size-adjust: none;">

<!-- Fondo de la web: negro con la rejilla de puntos y destellos, y un brillo de la temporada -->
<table class="wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#000000" background="https://panel.cinammon.net/mail/bg-dots.png" style="width: 100%; margin: 0; padding: 0; background-color: #000000; background-image: radial-gradient(circle at 20% 0%, {{ $s }}24 0%, transparent 45%), radial-gradient(circle at 85% 100%, {{ $p }}1f 0%, transparent 45%), url('https://panel.cinammon.net/mail/bg-dots.png'); background-repeat: repeat;">
<tr>
<td class="wrapper-cell" align="center" style="padding: 36px 12px 40px;">

<table class="inner-body" align="center" width="600" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#0a0a12" style="width: 600px; max-width: 600px; margin: 0 auto; background-color: #0a0a12; border: 1px solid {{ $p }}66; border-radius: 18px; overflow: hidden; box-shadow: 0 0 0 1px #00000080, 0 0 40px {{ $p }}26, 0 20px 50px #00000099;">

<!-- Franja de la temporada -->
<tr>
<td height="3" bgcolor="{{ $p }}" style="background-color: {{ $p }}; background-image: linear-gradient(90deg, {{ $s }} 0%, {{ $p }} 50%, {{ $s }} 100%); font-size: 0; line-height: 0; height: 3px;">&nbsp;</td>
</tr>

{{ $header ?? '' }}

<!-- Cuerpo -->
<tr>
<td class="content-cell" bgcolor="#0a0a12" style="padding: 36px 40px 32px; background-color: #0a0a12; color: #c9c6d6; font-size: 15px; line-height: 1.65; font-family: {!! $font !!};">
@if ($kicker)
<table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 0 16px;">
<tr>
<td bgcolor="{{ $theme['badge_bg'] }}" style="padding: 5px 12px; border-radius: 999px; background-color: {{ $theme['badge_bg'] }}; border: 1px solid {{ $theme['badge_border'] }}; color: {{ $theme['badge_text'] }}; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; font-family: 'Orbitron', {!! $font !!};">{{ $kicker }}</td>
</tr>
</table>
@endif
{!! $body !!}

{{ $subcopy ?? '' }}
</td>
</tr>

{{ $footer ?? '' }}

</table>

<!-- Debajo de la tarjeta -->
<table align="center" width="600" cellpadding="0" cellspacing="0" role="presentation" style="width: 600px; max-width: 100%; margin: 0 auto;">
<tr>
<td align="center" style="padding: 20px 16px 0; font-size: 12px; line-height: 1.6; color: #6f6b85; font-family: {!! $font !!};">
@if ($archiveUrl)
¿No se ve bien? <a href="{{ $archiveUrl }}" style="color: {{ $p }}; text-decoration: underline;">Ábrelo en el navegador</a>, siempre con el diseño más nuevo.<br />
@endif
<span style="font-family: 'Orbitron', {!! $font !!}; letter-spacing: 0.08em;">CINAMMON NETWORK</span> &middot; Hosting de juegos, bots y webs
</td>
</tr>
</table>

</td>
</tr>
</table>
</body>
</html>
