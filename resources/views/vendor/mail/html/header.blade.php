@props(['url'])
@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
@endphp
<tr>
<td class="header header-cell" style="padding: 22px 36px 20px; background-color: #0d111d; border-bottom: 1px solid #1a2236;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="left" valign="middle">
<a href="{{ $url }}" class="wordmark" style="display: inline-block; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
cinammon<span style="color: {{ $theme['primary'] }};">.net</span>
</a>
</td>
<td align="right" valign="middle">
<span class="season-badge" style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: {{ $theme['badge_text'] }}; background-color: {{ $theme['badge_bg'] }}; border: 1px solid {{ $theme['badge_border'] }}; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
{{ $theme['tag'] }}
</span>
</td>
</tr>
</table>
</td>
</tr>
