<?php

namespace App\Traits;

trait EnvironmentWriterTrait
{
    protected array $variables = [];

    /**
     * Write the given variables to the .env file.
     *
     * @param array $variables
     * @return void
     */
    protected function writeToEnvironment(array $variables): void
    {
        $envPath = base_path('.env');
        $envContent = file_exists($envPath) ? file_get_contents($envPath) : '';

        foreach ($variables as $key => $value) {
            $pattern = "/^{$key}=.*$/m";
            $replacement = "{$key}={$value}";
            if (preg_match($pattern, $envContent)) {
                $envContent = preg_replace($pattern, $replacement, $envContent);
            } else {
                $envContent .= PHP_EOL . $replacement;
            }
        }

        file_put_contents($envPath, $envContent);
    }
}