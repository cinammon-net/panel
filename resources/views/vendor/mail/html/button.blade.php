@props([
    'url',
    'color' => 'primary',
    'align' => 'center',
])
@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
    // Botón «a prueba de clientes»: tabla con bgcolor (Outlook) + enlace con relleno
    $btnBg = match ($color) {
        'success', 'green' => '#059669',
        'error', 'red' => '#dc2626',
        'secondary' => '#1a1b2e',
        default => $theme['button_bg'],
    };
    $btnText = in_array($color, ['success', 'green', 'error', 'red', 'secondary'], true) ? '#ffffff' : $theme['button_text'];
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
@endphp
<table class="action" align="{{ $align }}" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px 0;">
<tr>
<td align="{{ $align }}">
<table border="0" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center" bgcolor="{{ $btnBg }}" style="border-radius: 10px; background-color: {{ $btnBg }}; box-shadow: 0 0 22px {{ $btnBg }}66;">
<a href="{{ $url }}" class="button button-{{ $color }}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 30px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; background-color: {{ $btnBg }}; color: {{ $btnText }}; line-height: 1.2; letter-spacing: 0.04em; font-family: 'Orbitron', {!! $font !!};">{{ $slot }}</a>
</td>
</tr>
</table>
</td>
</tr>
</table>
