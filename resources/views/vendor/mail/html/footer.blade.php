@php
    $theme = $theme ?? \App\Support\Seasons::emailTheme();
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    $html = preg_replace('/<a href="([^"]*)">/', '<a href="$1" style="color: '.$theme['primary'].'; font-weight: 700; text-decoration: none;">', (string) Illuminate\Mail\Markdown::parse($slot));
@endphp
<tr>
<td class="footer footer-cell" bgcolor="#080911" style="padding: 24px 40px 26px; border-top: 1px solid #ffffff14; background-color: #080911; text-align: center; font-size: 12px; line-height: 1.6; color: #8a86a0; font-family: {!! $font !!};">
{!! $html !!}
</td>
</tr>
