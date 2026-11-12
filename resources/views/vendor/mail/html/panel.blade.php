@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
@endphp
<table class="panel" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 22px 0;">
<tr>
<td class="panel-content" bgcolor="#11121f" style="background-color: #11121f; border: 1px solid #23243a; border-left: 3px solid {{ $theme['primary'] }}; border-radius: 10px; padding: 16px 20px; color: #c9c6d6; font-size: 14px; line-height: 1.6;">
{{ Illuminate\Mail\Markdown::parse($slot) }}
</td>
</tr>
</table>
