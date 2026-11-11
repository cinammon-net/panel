@props([
    'url',
    'color' => 'primary',
    'align' => 'center',
])
@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
    $btnBg = $color === 'primary' ? $theme['button_bg'] : match($color) {
        'success', 'green' => '#10b981',
        'error', 'red' => '#ef4444',
        default => $theme['button_bg'],
    };
    $btnText = $color === 'primary' ? $theme['button_text'] : '#ffffff';
@endphp
<table class="action" align="{{ $align }}" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px auto; text-align: {{ $align }};">
<tr>
<td align="{{ $align }}">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
<tr>
<td align="center" style="border-radius: 8px; background-color: {{ $btnBg }};">
<a href="{{ $url }}" class="button button-{{ $color }}" target="_blank" rel="noopener" style="display: inline-block; padding: 12px 26px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; background-color: {{ $btnBg }}; color: {{ $btnText }}; border: 1px solid {{ $btnBg }}; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
{{ $slot }}
</a>
</td>
</tr>
</table>
</td>
</tr>
</table>
