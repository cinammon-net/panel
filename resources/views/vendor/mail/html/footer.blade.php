@php
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
@endphp
<tr>
<td class="footer footer-cell" bgcolor="#faf9fc" style="padding: 24px 40px 26px; border-top: 1px solid #eeeaf5; background-color: #faf9fc; text-align: center; font-size: 12px; line-height: 1.6; color: #6b6478; font-family: {!! $font !!};">
{{ Illuminate\Mail\Markdown::parse($slot) }}
</td>
</tr>
