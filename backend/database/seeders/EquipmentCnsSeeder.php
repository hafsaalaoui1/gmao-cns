<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EquipmentCategory;
use App\Models\Equipment;

class EquipmentCnsSeeder extends Seeder
{
    public function run()
    {
        // 1. Créer les catégories
        $radionavigation = EquipmentCategory::create([
            'name' => 'Radionavigation',
            'code' => 'RNAV',
            'description' => 'Équipements de navigation (VOR, DME, ILS, NDB)',
            'order' => 1,
            'is_active' => true,
        ]);

        $surveillance = EquipmentCategory::create([
            'name' => 'Surveillance',
            'code' => 'SURV',
            'description' => 'Équipements de surveillance (Radar, ADS-B)',
            'order' => 2,
            'is_active' => true,
        ]);

        $communication = EquipmentCategory::create([
            'name' => 'Communication',
            'code' => 'COMM',
            'description' => 'Équipements de communication (VHF, HF, Téléphone)',
            'order' => 3,
            'is_active' => true,
        ]);

        $annexes = EquipmentCategory::create([
            'name' => 'Équipements annexes',
            'code' => 'ANNEX',
            'description' => 'Batteries, climatiseurs, antennes',
            'order' => 4,
            'is_active' => true,
        ]);

        // 2. Créer les équipements (sans le champ 'code')
        $equipments = [
            // Radionavigation
            ['name' => 'VOR-001', 'type' => 'VOR', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],
            ['name' => 'VOR-002', 'type' => 'VOR', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],
            ['name' => 'VOR-003', 'type' => 'VOR', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],
            ['name' => 'DME-001', 'type' => 'DME', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],
            ['name' => 'DME-002', 'type' => 'DME', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],
            ['name' => 'ILS-001 (Localizer)', 'type' => 'ILS', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],
            ['name' => 'ILS-002 (Glide Path)', 'type' => 'ILS', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],
            ['name' => 'NDB-001', 'type' => 'NDB', 'category_id' => $radionavigation->id, 'status' => 'operationnel'],

            // Surveillance
            ['name' => 'RADAR-001 (Primaire)', 'type' => 'Radar', 'category_id' => $surveillance->id, 'status' => 'operationnel'],
            ['name' => 'RADAR-002 (Secondaire)', 'type' => 'Radar', 'category_id' => $surveillance->id, 'status' => 'operationnel'],
            ['name' => 'ADS-B-001', 'type' => 'ADS-B', 'category_id' => $surveillance->id, 'status' => 'operationnel'],
            ['name' => 'ADS-B-002', 'type' => 'ADS-B', 'category_id' => $surveillance->id, 'status' => 'operationnel'],

            // Communication
            ['name' => 'VHF-001', 'type' => 'VHF', 'category_id' => $communication->id, 'status' => 'operationnel'],
            ['name' => 'VHF-002', 'type' => 'VHF', 'category_id' => $communication->id, 'status' => 'operationnel'],
            ['name' => 'HF-001', 'type' => 'HF', 'category_id' => $communication->id, 'status' => 'operationnel'],
            ['name' => 'Téléphone-001', 'type' => 'Téléphone', 'category_id' => $communication->id, 'status' => 'operationnel'],
            ['name' => 'Téléimprimeur-001', 'type' => 'Téléimprimeur', 'category_id' => $communication->id, 'status' => 'operationnel'],

            // Annexes
            ['name' => 'Batteries (Autonomie)', 'type' => 'Batterie', 'category_id' => $annexes->id, 'status' => 'operationnel'],
            ['name' => 'Climatiseurs', 'type' => 'Climatiseur', 'category_id' => $annexes->id, 'status' => 'operationnel'],
            ['name' => 'Antennes', 'type' => 'Antenne', 'category_id' => $annexes->id, 'status' => 'operationnel'],
        ];

        foreach ($equipments as $data) {
            Equipment::create($data);
        }
    }
}