<?php

namespace App\Http\Controllers\Api;

use App\Models\EquipmentReadingTemplate;
use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;

class CanvasPdfExportController extends Controller
{
    public function exportPdf($id)
    {
        $canvas = EquipmentReadingTemplate::with('equipment')->findOrFail($id);

        $data = [
            'canvas' => $canvas,
            'header' => $canvas->header ?? [],
            'equipment' => $canvas->equipment,
            'parameters' => $canvas->parameters ?? [],
            'signatures' => $canvas->signatures ?? [],
            'annexes' => $canvas->annexes ?? [],
            'date' => date('d/m/Y'),
        ];

        $pdf = Pdf::loadView('pdfs.canvas', $data);
        $pdf->setPaper('A4', 'portrait');

        $fileName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $canvas->template_name) . '.pdf';
        return $pdf->download($fileName);
    }
}