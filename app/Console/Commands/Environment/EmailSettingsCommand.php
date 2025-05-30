<?php

namespace App\Console\Commands\Environment;

use App\Traits\EnvironmentWriterTrait;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class EmailSettingsCommand extends Command
{
    use EnvironmentWriterTrait;

    protected $description = 'Set or update the email sending configuration for the Cinammon Panel.';

    protected $signature = 'p:environment:mail';

    protected array $variables = [];

    public function handle(): void
    {
        $this->renderCyberBanner();

        $driver = $this->hasGum()
            ? trim(shell_exec("gum choose smtp log sendmail mailgun mandrill postmark"))
            : $this->choice('Selecciona el driver de correo', ['smtp', 'log', 'sendmail', 'mailgun', 'mandrill', 'postmark'], 'smtp');

        $this->variables['MAIL_MAILER'] = $driver;

        $method = 'setup' . Str::studly($driver) . 'DriverVariables';
        if (method_exists($this, $method)) {
            $this->{$method}();
        }

        $fromEmail = $this->gumInput("Dirección de correo remitente", "soporte@cinammon.net");
        $fromName  = $this->gumInput("Nombre del remitente", "Cinammon Panel");

        $this->variables['MAIL_FROM_ADDRESS'] = "\"{$fromEmail}\"";
        $this->variables['MAIL_FROM_NAME'] = "\"{$fromName}\"";


        if ($this->gumConfirm("¿Guardar configuración en .env?")) {
            $this->writeToEnvironment($this->variables);
            $this->callSilent('queue:restart');
            $this->line("\033[1;92m[OK]\033[0m Configuración guardada correctamente.");
        } else {
            $this->error("No se guardó la configuración.");
        }
    }

    private function setupSmtpDriverVariables(): void
    {
        $this->variables['MAIL_HOST'] = $this->gumInput("SMTP Host", "smtp.example.com");
        $this->variables['MAIL_PORT'] = $this->gumInput("Puerto", "587");
        $this->variables['MAIL_USERNAME'] = $this->gumInput("Usuario SMTP");
        $this->variables['MAIL_PASSWORD'] = $this->gumInput("Contraseña SMTP", '', true);

        $this->variables['MAIL_SCHEME'] = $this->hasGum()
            ? trim(shell_exec("gum choose tls ssl none"))
            : $this->choice("Encriptación", ['tls', 'ssl', 'none'], 'tls');
    }

    private function setupMailgunDriverVariables(): void
    {
        $this->variables['MAILGUN_DOMAIN'] = $this->gumInput("Mailgun Domain");
        $this->variables['MAILGUN_SECRET'] = $this->gumInput("Mailgun Secret");
        $this->variables['MAILGUN_ENDPOINT'] = $this->gumInput("Mailgun Endpoint", "api.mailgun.net");
    }

    private function setupMandrillDriverVariables(): void
    {
        $this->variables['MANDRILL_SECRET'] = $this->gumInput("Mandrill Secret");
    }

    private function setupPostmarkDriverVariables(): void
    {
        $user = $this->gumInput("Postmark Token");
        $this->variables['MAIL_DRIVER'] = 'smtp';
        $this->variables['MAIL_HOST'] = 'smtp.postmarkapp.com';
        $this->variables['MAIL_PORT'] = 587;
        $this->variables['MAIL_USERNAME'] = $user;
        $this->variables['MAIL_PASSWORD'] = $user;
    }

    private function gumInput(string $label, string $default = '', bool $password = false): string
    {
        if ($this->hasGum()) {
            $cmd = $password
                ? "gum input --password --prompt \"$label\""
                : "gum input --placeholder \"$default\" --prompt \"$label\"";

            $result = trim(shell_exec($cmd));
            return $result !== '' ? $result : $default;
        }

        return $password
            ? $this->secret($label) ?? $default
            : $this->ask($label, $default);
    }

    private function gumConfirm(string $msg): bool
    {
        if ($this->hasGum()) {
            exec("gum confirm \"$msg\"", $_, $exitCode);
            return $exitCode === 0;
        }

        return $this->confirm($msg);
    }

    private function hasGum(): bool
    {
        return trim(shell_exec("command -v gum")) !== '';
    }

    private function renderCyberBanner(): void
    {
        if ($this->hasGum()) {
            system(<<<'EOD'
gum style \
--border double \
--margin "1 2" \
--padding "1 4" \
--align center \
--width 60 \
--border-foreground "#00ffe0" \
--foreground "#ff00ff" \
":: CINAMMON MAIL CONFIGURATION ::

> Protocol: MAIL_ENV_INIT
> Mode: INTERACTIVE
> Status: AWAITING INPUT"
EOD);
        } else {
            $cyan = "\033[1;96m";
            $magenta = "\033[1;95m";
            $reset = "\033[0m";

            $border = "{$magenta}╔" . str_repeat("═", 56) . "╗{$reset}";
            $empty  = "{$magenta}║{$reset}" . str_repeat(" ", 56) . "{$magenta}║{$reset}";

            $this->line($border);
            $this->line($empty);
            $this->line("{$magenta}║{$reset}" . str_pad(":: CINAMMON MAIL CONFIGURATION ::", 56, " ", STR_PAD_BOTH) . "{$magenta}║{$reset}");
            $this->line($empty);
            $this->line("{$magenta}║{$reset}{$cyan}  > Protocol: MAIL_ENV_INIT     {$reset}" . str_repeat(" ", 17) . "{$magenta}║{$reset}");
            $this->line("{$magenta}║{$reset}{$cyan}  > Mode: INTERACTIVE            {$reset}" . str_repeat(" ", 17) . "{$magenta}║{$reset}");
            $this->line("{$magenta}║{$reset}{$cyan}  > Status: AWAITING INPUT       {$reset}" . str_repeat(" ", 17) . "{$magenta}║{$reset}");
            $this->line($empty);
            $this->line("{$magenta}╚" . str_repeat("═", 56) . "╝{$reset}");
        }
    }
}
