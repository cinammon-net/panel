@props(['url'])
@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
@endphp
<!-- Cabecera oscura con el logo (como la web) -->
<tr>
<td class="header header-cell" bgcolor="#0d0a17" style="padding: 26px 40px; background-color: #0d0a17; background-image: linear-gradient(135deg, #0d0a17 0%, #1c1030 55%, {{ $theme['secondary'] }}55 100%);">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="left" valign="middle">
<a href="{{ $url }}" style="text-decoration: none;"><img src="https://panel.cinammon.net/mail/wordmark.png" width="150" height="27" alt="cinammon" style="display: block; width: 150px; height: auto; border: 0; outline: none; color: #e879f9; font-size: 22px; font-weight: 800; font-family: {!! $font !!};" /></a>
</td>
<td align="right" valign="middle">
<span class="season-badge" style="display: inline-block; padding: 5px 11px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: {{ $theme['badge_text'] }}; background-color: {{ $theme['badge_bg'] }}; border: 1px solid {{ $theme['badge_border'] }}; border-radius: 999px; font-family: {!! $font !!};">{{ $theme['tag'] }}</span>
</td>
</tr>
</table>
</td>
</tr>
