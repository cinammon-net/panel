<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EggTest extends TestCase
{
    use RefreshDatabase;

    public function test_eggs_table_is_seeded(): void
    {
        $this->seed(); // corre todos los seeders

        $this->assertDatabaseHas('eggs', [
            'name' => 'Bungeecord', // Usa un nombre real de tus JSON
        ]);
    }
}
