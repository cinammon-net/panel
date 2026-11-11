@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
@endphp
<tr>
<td class="footer footer-cell" style="padding: 22px 36px 26px; border-top: 1px solid #1a2236; background-color: #0a0e19; text-align: center;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center" style="font-size: 12px; line-height: 1.6; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
{{ Illuminate\Mail\Markdown::parse($slot) }}
</td>
</tr>
<tr>
<td align="center" style="padding-top: 14px; font-size: 11px; color: #64748b; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
Cinammon Network &middot; <span style="color: {{ $theme['primary'] }}; font-weight: 700;">{{ $theme['tag'] }}</span>
</td>
</tr>
</table>
</td>
</tr>
