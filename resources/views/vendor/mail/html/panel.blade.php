@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
@endphp
<table class="panel" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 22px 0;">
<tr>
<td class="panel-content" style="background-color: #12182b; border-left: 4px solid {{ $theme['primary'] }}; border-radius: 0 8px 8px 0; padding: 16px 20px; color: #cbd5e1; font-size: 14px; line-height: 1.5;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="panel-item" style="color: #cbd5e1; font-size: 14px;">
{{ Illuminate\Mail\Markdown::parse($slot) }}
</td>
</tr>
</table>
</td>
</tr>
</table>
