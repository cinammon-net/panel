@php
    // Diseño de los correos (igual en panel y billing). Colores de la temporada o festivo: Seasons::emailTheme(). Todo va en línea y con bgcolor: Gmail y Outlook
    // ignoran gran parte del <style> y oscurecen a su manera los fondos oscuros, así que el cuerpo es claro.
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
    $kicker = $kicker ?? null;
    $archiveUrl = $archiveUrl ?? null;
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
@endphp
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
<title>{{ config('app.name') }}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
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
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f3f1f8; color: #374151; font-family: {!! $font !!}; -webkit-text-size-adjust: none;">

<table class="wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#f3f1f8" style="width: 100%; margin: 0; padding: 0; background-color: #f3f1f8;">
<tr>
<td class="wrapper-cell" align="center" style="padding: 32px 12px 40px;">

<table class="inner-body" align="center" width="600" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#ffffff" style="width: 600px; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e3f0; border-radius: 16px; overflow: hidden;">

{{ $header ?? '' }}

<!-- Franja de color de la temporada -->
<tr>
<td height="4" bgcolor="{{ $theme['primary'] }}" style="background-color: {{ $theme['primary'] }}; font-size: 0; line-height: 0; height: 4px;">&nbsp;</td>
</tr>

<!-- Cuerpo -->
<tr>
<td class="content-cell" bgcolor="#ffffff" style="padding: 36px 40px 32px; background-color: #ffffff; color: #374151; font-size: 15px; line-height: 1.65; font-family: {!! $font !!};">
@if ($kicker)
<table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 0 14px;">
<tr>
<td bgcolor="{{ $theme['badge_bg'] }}" style="padding: 5px 12px; border-radius: 999px; background-color: {{ $theme['badge_bg'] }}; border: 1px solid {{ $theme['badge_border'] }}; color: {{ $theme['badge_text'] }}; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; font-family: {!! $font !!};">{{ $kicker }}</td>
</tr>
</table>
@endif
{{ Illuminate\Mail\Markdown::parse($slot) }}

{{ $subcopy ?? '' }}
</td>
</tr>

{{ $footer ?? '' }}

</table>

<!-- Debajo de la tarjeta -->
<table align="center" width="600" cellpadding="0" cellspacing="0" role="presentation" style="width: 600px; max-width: 100%; margin: 0 auto;">
<tr>
<td align="center" style="padding: 18px 16px 0; font-size: 12px; line-height: 1.6; color: #8b8598; font-family: {!! $font !!};">
@if ($archiveUrl)
¿No se ve bien? <a href="{{ $archiveUrl }}" style="color: #6d28d9; text-decoration: underline;">Ábrelo en el navegador</a>, siempre con el diseño más nuevo.<br />
@endif
Cinammon Network &middot; Hosting de juegos, bots y webs
</td>
</tr>
</table>

</td>
</tr>
</table>
</body>
</html>
