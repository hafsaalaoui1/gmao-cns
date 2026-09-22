<?php

namespace App\Http\Controllers\Api;

use App\Models\EquipmentReadingTemplate;
use App\Http\Controllers\Controller;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;

class CanvasExportController extends Controller
{
    public function exportWord($id)
    {
        try {
            $canvas = EquipmentReadingTemplate::with('equipment')->findOrFail($id);

            $phpWord = new PhpWord();
            $section = $phpWord->addSection();

            // ============================================================
            // En-tête ONDA
            // ============================================================
            $section->addTitle('OFFICE NATIONAL DES AEROPORTS', 1);
            $section->addTitle('DIVISION TECHNIQUE NAVIGATION', 2);
            $section->addTextBreak(1);

            $header = $canvas->header ?? [];
            $ref = $header['ref_envoi'] ?? '';
            $date = $header['date'] ?? date('d/m/Y');
            $aeroport = $header['aeroport'] ?? 'FES SAISS';
            $code = $header['code'] ?? '';

            $section->addText(htmlspecialchars("réf d'envoi : $ref", ENT_QUOTES, 'UTF-8'));
            $section->addText(htmlspecialchars("Date : $date", ENT_QUOTES, 'UTF-8'));
            $section->addTextBreak(1);
            $section->addText(htmlspecialchars("Aéroport : $aeroport", ENT_QUOTES, 'UTF-8'));
            $section->addText(htmlspecialchars("Code : $code", ENT_QUOTES, 'UTF-8'));
            $section->addTextBreak(1);

            $title = $canvas->template_name ?? 'Relevé de maintenance';
            $section->addTitle(strtoupper(htmlspecialchars($title, ENT_QUOTES, 'UTF-8')), 1);
            $section->addTextBreak(1);

            $equipment = $canvas->equipment;
            $section->addText(htmlspecialchars("Type d'équipement : " . ($equipment->name ?? ''), ENT_QUOTES, 'UTF-8'));
            $section->addText(htmlspecialchars("Fréquence / Indicatif : " . ($canvas->template_type ?? ''), ENT_QUOTES, 'UTF-8'));
            $section->addText("Ensemble en service : ");
            $section->addText("État de l'équipement : Normal");
            $section->addTextBreak(1);

            // ============================================================
            // Tableau des paramètres
            // ============================================================
            $styleTable = ['borderSize' => 6, 'borderColor' => '000000', 'cellMargin' => 80];
            $phpWord->addTableStyle('myTable', $styleTable);
            $table = $section->addTable('myTable');

            $table->addRow();
            $table->addCell(3000)->addText('Paramètres');
            $table->addCell(2000)->addText('Moniteur 1');
            $table->addCell(2000)->addText('Moniteur 2');
            $table->addCell(3000)->addText('Tolérances');

            foreach ($canvas->parameters as $param) {
                $table->addRow();
                $table->addCell(3000)->addText(htmlspecialchars($param['name'] ?? '', ENT_QUOTES, 'UTF-8'));
                $table->addCell(2000)->addText('');
                $table->addCell(2000)->addText('');
                $table->addCell(3000)->addText(htmlspecialchars($param['tolerance'] ?? '', ENT_QUOTES, 'UTF-8'));
            }

            $section->addTextBreak(1);
            $section->addText('Commentaire :');
            $section->addText('_________________________');
            $section->addTextBreak(1);

            // Signatures
            $signatures = $canvas->signatures ?? [];
            if (!empty($signatures)) {
                $section->addText('Signatures :');
                foreach ($signatures as $sig) {
                    $section->addText(htmlspecialchars($sig, ENT_QUOTES, 'UTF-8') . ' : ________________________');
                }
            }

            // Annexes
            $annexes = $canvas->annexes ?? [];
            if (!empty($annexes)) {
                $section->addTextBreak(1);
                $section->addTitle('ANNEXES', 2);
                foreach ($annexes as $annexe) {
                    $section->addText('☐ ' . htmlspecialchars($annexe, ENT_QUOTES, 'UTF-8'));
                }
            }

            // ============================================================
            // Sauvegarder et télécharger
            // ============================================================
            $fileName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $canvas->template_name) . '.docx';
            $fileName = 'Releve_' . $canvas->id . '_' . $fileName;

            $dir = storage_path('app/public');
            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }

            $tempPath = $dir . '/' . $fileName;

            $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
            $objWriter->save($tempPath);

            return response()->download($tempPath, $fileName)->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de l\'export',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
}