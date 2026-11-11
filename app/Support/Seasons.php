<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Calendario de estaciones y festivos por país.
 *
 * Decide qué ambientación toca hoy para un país (estación + festivo activo) y qué
 * clave de promoción aplica. El porcentaje de cada promoción vive en la tabla
 * `promotions` (editable en /admin/promotions); aquí solo están las fechas.
 */
class Seasons
{
    /** Hemisferio sur: estaciones invertidas. */
    public const SOUTH = ['AR', 'CL', 'UY', 'PY', 'BO', 'PE', 'BR', 'AU', 'NZ', 'ZA'];

    /** Países tropicales: sin estaciones marcadas (solo festivos). */
    public const TROPICAL = ['CO', 'VE', 'EC', 'PA', 'CR', 'NI', 'HN', 'SV', 'GT', 'DO', 'CU', 'PR'];

    public const HISPANIC = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ'];

    public const SEASONS = [
        'winter' => ['name' => 'Invierno', 'emoji' => '❄️', 'theme' => 'snow'],
        'spring' => ['name' => 'Primavera', 'emoji' => '🌸', 'theme' => 'petals'],
        'summer' => ['name' => 'Verano', 'emoji' => '☀️', 'theme' => 'sun'],
        'autumn' => ['name' => 'Otoño', 'emoji' => '🍂', 'theme' => 'leaves'],
    ];

    /**
     * Festivos comunes. `countries` null = todos. Reglas:
     *  ['fixed', 'MM-DD', 'MM-DD']            rango fijo (puede cruzar el año)
     *  ['easter', desdeDías, hastaDías]         relativo al Domingo de Pascua
     *  ['nth', mes, díaSemana(0=dom), n, desde, hasta]  n-ésimo día de la semana del mes
     */
    public const HOLIDAYS = [
        'new_years_eve' => ['name' => 'Nochevieja · Fin de Año', 'emoji' => '🥂', 'theme' => 'confetti', 'priority' => 75, 'countries' => null, 'rule' => ['fixed', '12-27', '12-31']],
        'new_year' => ['name' => 'Año Nuevo', 'emoji' => '🎆', 'theme' => 'confetti', 'priority' => 75, 'countries' => null, 'rule' => ['fixed', '01-01', '01-03']],
        'reyes' => ['name' => 'Día de Reyes', 'emoji' => '👑', 'theme' => 'stars', 'priority' => 60, 'countries' => self::HISPANIC, 'rule' => ['fixed', '01-04', '01-06']],
        'valentine' => ['name' => 'San Valentín', 'emoji' => '💘', 'theme' => 'hearts', 'priority' => 50, 'countries' => null, 'rule' => ['fixed', '02-10', '02-14']],
        'carnival' => ['name' => 'Carnaval', 'emoji' => '🎭', 'theme' => 'confetti', 'priority' => 40, 'countries' => ['BR', 'ES', 'MX', 'AR', 'CO', 'UY', 'BO', 'PA', 'DO', 'PE', 'VE', 'IT', 'DE', 'PT'], 'rule' => ['easter', -52, -47]],
        'easter' => ['name' => 'Semana Santa', 'emoji' => '🐣', 'theme' => 'petals', 'priority' => 40, 'countries' => null, 'rule' => ['easter', -7, 1]],
        'book_day' => ['name' => 'Sant Jordi · Día del Libro', 'emoji' => '📚', 'theme' => 'roses', 'priority' => 30, 'countries' => ['ES'], 'rule' => ['fixed', '04-23', '04-23']],
        'star_wars' => ['name' => 'May the 4th', 'emoji' => '🚀', 'theme' => 'stars', 'priority' => 20, 'countries' => null, 'rule' => ['fixed', '05-04', '05-04']],
        'san_juan' => ['name' => 'Noche de San Juan', 'emoji' => '🔥', 'theme' => 'sparks', 'priority' => 30, 'countries' => ['ES', 'PT'], 'rule' => ['fixed', '06-23', '06-24']],
        'gamer_day' => ['name' => 'Día del Gamer', 'emoji' => '🎮', 'theme' => 'stars', 'priority' => 35, 'countries' => null, 'rule' => ['fixed', '08-29', '08-29']],
        'halloween' => ['name' => 'Halloween', 'emoji' => '🎃', 'theme' => 'spooky', 'priority' => 60, 'countries' => null, 'rule' => ['fixed', '10-24', '10-31']],
        'muertos' => ['name' => 'Día de Muertos', 'emoji' => '💀', 'theme' => 'marigold', 'priority' => 65, 'countries' => ['MX', 'GT', 'BO', 'EC', 'SV', 'HN'], 'rule' => ['fixed', '11-01', '11-02']],
        'thanksgiving' => ['name' => 'Acción de Gracias', 'emoji' => '🦃', 'theme' => 'leaves', 'priority' => 55, 'countries' => ['US'], 'rule' => ['nth', 11, 4, 4, 0, 0]],
        'black_friday' => ['name' => 'Black Friday', 'emoji' => '🛒', 'theme' => 'sparks', 'priority' => 100, 'countries' => null, 'rule' => ['fixed', '11-11', '12-01']],
        'christmas' => ['name' => 'Navidad', 'emoji' => '🎄', 'theme' => 'snow', 'priority' => 80, 'countries' => null, 'rule' => ['fixed', '12-15', '12-26']],
    ];

    /** Fiestas nacionales: país => [[desde, hasta, nombre]]. Todas usan la promoción `national`. */
    public const NATIONAL = [
        'ES' => [['10-12', '10-12', 'Fiesta Nacional de España'], ['12-06', '12-08', 'Puente de la Constitución']],
        'MX' => [['09-15', '09-16', 'Independencia de México'], ['11-20', '11-20', 'Día de la Revolución']],
        'AR' => [['05-25', '05-25', 'Revolución de Mayo'], ['07-09', '07-09', 'Día de la Independencia']],
        'CO' => [['07-20', '07-20', 'Independencia de Colombia'], ['08-07', '08-07', 'Batalla de Boyacá']],
        'CL' => [['09-17', '09-19', 'Fiestas Patrias']],
        'PE' => [['07-28', '07-29', 'Fiestas Patrias']],
        'VE' => [['07-05', '07-05', 'Independencia de Venezuela']],
        'EC' => [['08-10', '08-10', 'Primer Grito de Independencia']],
        'UY' => [['08-25', '08-25', 'Independencia de Uruguay']],
        'PY' => [['05-14', '05-15', 'Independencia del Paraguay']],
        'BO' => [['08-06', '08-06', 'Independencia de Bolivia']],
        'CR' => [['09-15', '09-15', 'Independencia de Costa Rica']],
        'GT' => [['09-15', '09-15', 'Independencia de Guatemala']],
        'HN' => [['09-15', '09-15', 'Independencia de Honduras']],
        'SV' => [['09-15', '09-15', 'Independencia de El Salvador']],
        'NI' => [['09-14', '09-15', 'Fiestas Patrias']],
        'PA' => [['11-03', '11-04', 'Fiestas Patrias'], ['11-28', '11-28', 'Independencia de España']],
        'DO' => [['02-27', '02-27', 'Independencia Dominicana']],
        'PR' => [['07-25', '07-25', 'Día de la Constitución']],
        'GQ' => [['10-12', '10-12', 'Día de la Independencia']],
        'BR' => [['09-07', '09-07', 'Independência do Brasil']],
        'PT' => [['06-10', '06-10', 'Dia de Portugal'], ['04-25', '04-25', 'Dia da Liberdade']],
        'US' => [['07-04', '07-04', 'Independence Day']],
        'CA' => [['07-01', '07-01', 'Canada Day']],
        'FR' => [['07-14', '07-14', 'Fête nationale']],
        'DE' => [['10-03', '10-03', 'Tag der Deutschen Einheit']],
        'IT' => [['06-02', '06-02', 'Festa della Repubblica']],
        'GB' => [['11-05', '11-05', 'Bonfire Night']],
        'IE' => [['03-17', '03-17', "St. Patrick's Day"]],
    ];

    /** Clave => nombre de cada promoción posible (para el admin y el seeder). */
    public static function promotionKeys(): array
    {
        return collect(self::HOLIDAYS)->map(fn ($h) => $h['name'])->all() + ['national' => 'Fiestas nacionales (cada país)'];
    }

    /** País del visitante según Cloudflare (CF-IPCountry); por defecto España. */
    public static function countryFrom(?string $header): string
    {
        $cc = strtoupper(trim((string) $header));

        return preg_match('/^[A-Z]{2}$/', $cc) && !in_array($cc, ['XX', 'T1'], true) ? $cc : 'ES';
    }

    /** Estación actual para el país (null en países tropicales). */
    public static function season(string $country, ?CarbonImmutable $date = null): ?string
    {
        if (in_array($country, self::TROPICAL, true)) {
            return null;
        }
        $month = ($date ?? CarbonImmutable::now())->month;
        $north = match (true) {
            in_array($month, [12, 1, 2], true) => 'winter',
            in_array($month, [3, 4, 5], true) => 'spring',
            in_array($month, [6, 7, 8], true) => 'summer',
            default => 'autumn',
        };
        if (!in_array($country, self::SOUTH, true)) {
            return $north;
        }

        return ['winter' => 'summer', 'summer' => 'winter', 'spring' => 'autumn', 'autumn' => 'spring'][$north];
    }

    /**
     * Festivos activos hoy para el país, de mayor a menor prioridad.
     *
     * @return array<int, array{key: string, promotion: string, name: string, emoji: string, theme: string, priority: int, ends: string}>
     */
    public static function activeHolidays(string $country, ?CarbonImmutable $date = null): array
    {
        // Solo cuenta el día del calendario local (sin zona), para no desfasar el inicio/fin del festivo.
        $today = CarbonImmutable::parse(($date ?? CarbonImmutable::now())->toDateString(), 'UTC');
        $active = [];

        foreach (self::HOLIDAYS as $key => $h) {
            if ($h['countries'] !== null && !in_array($country, $h['countries'], true)) {
                continue;
            }
            if ($end = self::matches($h['rule'], $today)) {
                $name = $key === 'easter' && !in_array($country, self::HISPANIC, true) ? 'Pascua' : $h['name'];
                $active[] = ['key' => $key, 'promotion' => $key, 'name' => $name, 'emoji' => $h['emoji'], 'theme' => $h['theme'], 'priority' => $h['priority'], 'ends' => $end];
            }
        }

        foreach (self::NATIONAL[$country] ?? [] as $i => [$from, $to, $name]) {
            if ($end = self::matches(['fixed', $from, $to], $today)) {
                $active[] = ['key' => "national_{$country}_{$i}", 'promotion' => 'national', 'name' => $name, 'emoji' => self::flag($country), 'theme' => 'confetti', 'priority' => 75, 'ends' => $end];
            }
        }

        usort($active, fn ($a, $b) => $b['priority'] <=> $a['priority']);

        return $active;
    }

    /** Devuelve la fecha (Y-m-d) en que termina el festivo si hoy cae dentro; si no, null. */
    /**
     * Paleta de correo electrónico según la fiesta o estación concurrente.
     * Colores seguros para todos los clientes (Gmail, Outlook, Apple Mail), modo oscuro cyberpunk,
     * cero emojis y cero tonos cyan/sky/teal.
     *
     * @return array{
     *     key: string,
     *     name: string,
     *     tag: string,
     *     primary: string,
     *     secondary: string,
     *     button_bg: string,
     *     button_text: string,
     *     badge_bg: string,
     *     badge_border: string,
     *     badge_text: string,
     *     bg_dark: string,
     *     card_bg: string,
     *     panel_bg: string,
     *     border: string,
     *     border_subtle: string,
     *     text: string,
     *     text_bright: string,
     *     text_muted: string
     * }
     */
    public static function emailTheme(?string $country = 'ES', ?CarbonImmutable $date = null): array
    {
        $themes = [
            'black_friday' => [
                'name' => 'Black Friday',
                'tag' => 'BLACK FRIDAY',
                'primary' => '#facc15',
                'secondary' => '#f59e0b',
                'button_bg' => '#facc15',
                'button_text' => '#070913',
                'badge_bg' => '#26200a',
                'badge_border' => '#eab308',
                'badge_text' => '#fef08a',
            ],
            'christmas' => [
                'name' => 'Navidad',
                'tag' => 'EDICION NAVIDAD',
                'primary' => '#ef4444',
                'secondary' => '#10b981',
                'button_bg' => '#ef4444',
                'button_text' => '#ffffff',
                'badge_bg' => '#2a0e14',
                'badge_border' => '#dc2626',
                'badge_text' => '#fca5a5',
            ],
            'new_years_eve' => [
                'name' => 'Fin de Año',
                'tag' => 'NOCHEVIEJA',
                'primary' => '#fbbf24',
                'secondary' => '#c084fc',
                'button_bg' => '#fbbf24',
                'button_text' => '#070913',
                'badge_bg' => '#281f08',
                'badge_border' => '#f59e0b',
                'badge_text' => '#fef3c7',
            ],
            'new_year' => [
                'name' => 'Año Nuevo',
                'tag' => 'AÑO NUEVO',
                'primary' => '#fbbf24',
                'secondary' => '#c084fc',
                'button_bg' => '#fbbf24',
                'button_text' => '#070913',
                'badge_bg' => '#281f08',
                'badge_border' => '#f59e0b',
                'badge_text' => '#fef3c7',
            ],
            'reyes' => [
                'name' => 'Día de Reyes',
                'tag' => 'REYES MAGOS',
                'primary' => '#fbbf24',
                'secondary' => '#a855f7',
                'button_bg' => '#fbbf24',
                'button_text' => '#070913',
                'badge_bg' => '#271e0b',
                'badge_border' => '#eab308',
                'badge_text' => '#fef08a',
            ],
            'valentine' => [
                'name' => 'San Valentín',
                'tag' => 'SAN VALENTIN',
                'primary' => '#f43f5e',
                'secondary' => '#ec4899',
                'button_bg' => '#f43f5e',
                'button_text' => '#ffffff',
                'badge_bg' => '#2b0f19',
                'badge_border' => '#e11d48',
                'badge_text' => '#fda4af',
            ],
            'carnival' => [
                'name' => 'Carnaval',
                'tag' => 'CARNAVAL',
                'primary' => '#a855f7',
                'secondary' => '#f59e0b',
                'button_bg' => '#a855f7',
                'button_text' => '#ffffff',
                'badge_bg' => '#220e36',
                'badge_border' => '#9333ea',
                'badge_text' => '#d8b4fe',
            ],
            'easter' => [
                'name' => 'Semana Santa',
                'tag' => 'SEMANA SANTA',
                'primary' => '#fbbf24',
                'secondary' => '#8b5cf6',
                'button_bg' => '#fbbf24',
                'button_text' => '#070913',
                'badge_bg' => '#261b0c',
                'badge_border' => '#d97706',
                'badge_text' => '#fde68a',
            ],
            'book_day' => [
                'name' => 'Día del Libro',
                'tag' => 'SANT JORDI · DIA DEL LIBRO',
                'primary' => '#e11d48',
                'secondary' => '#f59e0b',
                'button_bg' => '#e11d48',
                'button_text' => '#ffffff',
                'badge_bg' => '#2a0c16',
                'badge_border' => '#be123c',
                'badge_text' => '#fecdd3',
            ],
            'star_wars' => [
                'name' => 'May the 4th',
                'tag' => 'MAY THE 4TH',
                'primary' => '#eab308',
                'secondary' => '#a855f7',
                'button_bg' => '#eab308',
                'button_text' => '#070913',
                'badge_bg' => '#251e08',
                'badge_border' => '#ca8a04',
                'badge_text' => '#fef08a',
            ],
            'san_juan' => [
                'name' => 'Noche de San Juan',
                'tag' => 'NOCHE DE SAN JUAN',
                'primary' => '#f97316',
                'secondary' => '#ef4444',
                'button_bg' => '#f97316',
                'button_text' => '#ffffff',
                'badge_bg' => '#2c1208',
                'badge_border' => '#ea580c',
                'badge_text' => '#fed7aa',
            ],
            'gamer_day' => [
                'name' => 'Día del Gamer',
                'tag' => 'DIA DEL GAMER',
                'primary' => '#a855f7',
                'secondary' => '#ec4899',
                'button_bg' => '#a855f7',
                'button_text' => '#ffffff',
                'badge_bg' => '#230e37',
                'badge_border' => '#9333ea',
                'badge_text' => '#d8b4fe',
            ],
            'halloween' => [
                'name' => 'Halloween',
                'tag' => 'HALLOWEEN',
                'primary' => '#ea580c',
                'secondary' => '#9333ea',
                'button_bg' => '#ea580c',
                'button_text' => '#ffffff',
                'badge_bg' => '#2a1106',
                'badge_border' => '#c2410c',
                'badge_text' => '#fed7aa',
            ],
            'muertos' => [
                'name' => 'Día de Muertos',
                'tag' => 'DIA DE MUERTOS',
                'primary' => '#f59e0b',
                'secondary' => '#ec4899',
                'button_bg' => '#f59e0b',
                'button_text' => '#070913',
                'badge_bg' => '#291807',
                'badge_border' => '#d97706',
                'badge_text' => '#fde68a',
            ],
            'thanksgiving' => [
                'name' => 'Acción de Gracias',
                'tag' => 'ACCION DE GRACIAS',
                'primary' => '#d97706',
                'secondary' => '#b45309',
                'button_bg' => '#d97706',
                'button_text' => '#ffffff',
                'badge_bg' => '#271506',
                'badge_border' => '#b45309',
                'badge_text' => '#fde68a',
            ],
            'autumn' => [
                'name' => 'Otoño',
                'tag' => 'EDICION OTOÑO',
                'primary' => '#f59e0b',
                'secondary' => '#ea580c',
                'button_bg' => '#f59e0b',
                'button_text' => '#070913',
                'badge_bg' => '#291708',
                'badge_border' => '#d97706',
                'badge_text' => '#fde68a',
            ],
            'winter' => [
                'name' => 'Invierno',
                'tag' => 'EDICION INVIERNO',
                'primary' => '#c084fc',
                'secondary' => '#a855f7',
                'button_bg' => '#c084fc',
                'button_text' => '#070913',
                'badge_bg' => '#220f35',
                'badge_border' => '#a855f7',
                'badge_text' => '#e9d5ff',
            ],
            'spring' => [
                'name' => 'Primavera',
                'tag' => 'EDICION PRIMAVERA',
                'primary' => '#ec4899',
                'secondary' => '#10b981',
                'button_bg' => '#ec4899',
                'button_text' => '#ffffff',
                'badge_bg' => '#2b0f20',
                'badge_border' => '#db2777',
                'badge_text' => '#fbcfe8',
            ],
            'summer' => [
                'name' => 'Verano',
                'tag' => 'EDICION VERANO',
                'primary' => '#f59e0b',
                'secondary' => '#f43f5e',
                'button_bg' => '#f59e0b',
                'button_text' => '#070913',
                'badge_bg' => '#291708',
                'badge_border' => '#d97706',
                'badge_text' => '#fde68a',
            ],
            'cinammon' => [
                'name' => 'Cinammon',
                'tag' => 'CINAMMON NETWORK',
                'primary' => '#ec4899',
                'secondary' => '#a855f7',
                'button_bg' => '#ec4899',
                'button_text' => '#ffffff',
                'badge_bg' => '#290f1f',
                'badge_border' => '#db2777',
                'badge_text' => '#fbcfe8',
            ],
        ];

        $cc = self::countryFrom($country);
        $holidays = self::activeHolidays($cc, $date);
        $holiday = $holidays[0] ?? null;

        $key = 'cinammon';
        $customName = null;
        $customTag = null;

        if ($holiday) {
            $hKey = $holiday['key'];
            if (isset($themes[$hKey])) {
                $key = $hKey;
            } elseif (str_starts_with($hKey, 'national_')) {
                $key = 'book_day';
                $clean = preg_replace('/[^\p{L}\p{N}\s\.\-]/u', '', (string) $holiday['name']);
                $customName = trim((string) $clean);
                $customTag = mb_strtoupper($customName);
            }
        } else {
            $sKey = self::season($cc, $date);
            if ($sKey && isset($themes[$sKey])) {
                $key = $sKey;
            }
        }

        $chosen = $themes[$key] ?? $themes['cinammon'];
        if ($customName) {
            $chosen['name'] = $customName;
        }
        if ($customTag) {
            $chosen['tag'] = $customTag;
        }

        return [
            'key' => $key,
            ...$chosen,
            'bg_dark' => '#070913',
            'card_bg' => '#0d111d',
            'panel_bg' => '#12182b',
            'border' => '#1e2640',
            'border_subtle' => '#161e33',
            'text' => '#cbd5e1',
            'text_bright' => '#ffffff',
            'text_muted' => '#94a3b8',
        ];
    }

    private static function matches(array $rule, CarbonImmutable $today): ?string
    {
        foreach ([$today->year - 1, $today->year] as $year) {
            [$start, $end] = match ($rule[0]) {
                'fixed' => self::fixedRange($year, $rule[1], $rule[2]),
                'easter' => [self::easter($year)->addDays($rule[1]), self::easter($year)->addDays($rule[2])],
                'nth' => [self::nth($year, $rule[1], $rule[2], $rule[3])->addDays($rule[4]), self::nth($year, $rule[1], $rule[2], $rule[3])->addDays($rule[5])],
            };
            if ($today->betweenIncluded($start, $end)) {
                return $end->toDateString();
            }
        }

        return null;
    }

    private static function fixedRange(int $year, string $from, string $to): array
    {
        $start = CarbonImmutable::parse("{$year}-{$from}", 'UTC');
        $end = CarbonImmutable::parse("{$year}-{$to}", 'UTC');

        return [$start, $end->lessThan($start) ? $end->addYear() : $end];
    }

    private static function easter(int $year): CarbonImmutable
    {
        // Algoritmo de Butcher/Meeus (calendario gregoriano), sin depender de ext-calendar.
        $a = $year % 19; $b = intdiv($year, 100); $c = $year % 100;
        $d = intdiv($b, 4); $e = $b % 4; $f = intdiv($b + 8, 25); $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30; $i = intdiv($c, 4); $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7; $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31); $day = (($h + $l - 7 * $m + 114) % 31) + 1;

        return CarbonImmutable::create($year, $month, $day, 0, 0, 0, 'UTC');
    }

    private static function nth(int $year, int $month, int $weekday, int $n): CarbonImmutable
    {
        $first = CarbonImmutable::create($year, $month, 1, 0, 0, 0, 'UTC');
        $offset = ($weekday - $first->dayOfWeek + 7) % 7;

        return $first->addDays($offset + 7 * ($n - 1));
    }

    private static function flag(string $country): string
    {
        return implode('', array_map(fn ($c) => mb_chr(0x1F1E6 + ord($c) - 65), str_split($country)));
    }
}
