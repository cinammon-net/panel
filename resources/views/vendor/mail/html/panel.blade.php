@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
@endphp
<table class="panel" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 22px 0;">
<tr>
<td class="panel-content" bgcolor="#f7f5fb" style="background-color: #f7f5fb; border: 1px solid #ece7f5; border-left: 4px solid {{ $theme['primary'] }}; border-radius: 10px; padding: 16px 20px; color: #374151; font-size: 14px; line-height: 1.6;">
{{ Illuminate\Mail\Markdown::parse($slot) }}
</td>
</tr>
</table>
