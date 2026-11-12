@props(['url'])
@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
@endphp
<!-- Cabecera con el logo de la web (cinammon .net en los colores de la temporada), como su barra -->
<tr>
<td class="header header-cell" bgcolor="#000000" style="padding: 22px 40px; background-color: #000000; background-image: linear-gradient(135deg, #000000 0%, #0b0712 60%, {{ $theme['secondary'] }}2e 100%); border-bottom: 1px solid {{ $theme['primary'] }}66;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="left" valign="middle">
<a href="https://cinammon.net" style="text-decoration: none;"><img src="https://cinammon.net/season-favicon.png?v={{ \Illuminate\Support\Str::slug($theme['name']) }}" width="168" height="48" alt="cinammon.net" style="display: block; width: 168px; height: auto; border: 0; outline: none; color: #e879f9; font-size: 22px; font-weight: 800; font-family: 'Orbitron', {!! $font !!};" /></a>
</td>
<td align="right" valign="middle">
<span class="season-badge" style="display: inline-block; padding: 5px 11px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: {{ $theme['badge_text'] }}; background-color: {{ $theme['badge_bg'] }}; border: 1px solid {{ $theme['badge_border'] }}; border-radius: 999px; box-shadow: 0 0 12px {{ $theme['primary'] }}40; font-family: 'Orbitron', {!! $font !!};">{{ $theme['tag'] }}</span>
</td>
</tr>
</table>
</td>
</tr>
