@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
@endphp
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
<title>{{ config('app.name') }}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark" />
<style>
:root {
    color-scheme: dark;
    supported-color-schemes: dark;
}
body {
    margin: 0;
    padding: 0;
    width: 100% !important;
    background-color: #070913 !important;
    color: #cbd5e1 !important;
    -webkit-text-size-adjust: none;
    -ms-text-size-adjust: none;
}
@media only screen and (max-width: 600px) {
    .inner-body {
        width: 100% !important;
        border-left: none !important;
        border-right: none !important;
        border-radius: 0 !important;
    }
    .content-cell {
        padding: 24px 18px !important;
    }
    .header-cell {
        padding: 18px 18px !important;
    }
    .footer-cell {
        padding: 20px 18px !important;
    }
}
@media only screen and (max-width: 500px) {
    .button {
        width: 100% !important;
        text-align: center !important;
    }
}
</style>
{{ $head ?? '' }}
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #070913; color: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

<table class="wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; margin: 0; padding: 32px 0 40px; background-color: #070913;">
<tr>
<td align="center">
<table class="content" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; margin: 0; padding: 0;">

<!-- Card Container -->
<tr>
<td align="center" style="padding: 0 12px;">
<table class="inner-body" align="center" width="580" cellpadding="0" cellspacing="0" role="presentation" style="width: 580px; max-width: 580px; margin: 0 auto; background-color: #0d111d; border: 1px solid #1e2640; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);">

<!-- Festive Top Accent Bar -->
<tr>
<td height="4" style="background-color: {{ $theme['primary'] }}; font-size: 0; line-height: 0; height: 4px;">&nbsp;</td>
</tr>

{{ $header ?? '' }}

<!-- Email Body -->
<tr>
<td class="content-cell" style="padding: 32px 36px; background-color: #0d111d; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
{{ Illuminate\Mail\Markdown::parse($slot) }}

{{ $subcopy ?? '' }}
</td>
</tr>

{{ $footer ?? '' }}

</table>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
