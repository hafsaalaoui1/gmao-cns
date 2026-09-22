<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">

    <title>{{ $canvas->template_name ?? 'Relevé' }}</title>

    <style>
        @page {
            margin: 25px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #222;
        }

        /* =========================
           EN-TÊTE
        ========================= */

        .header {
            border: 1px solid #333;
            padding: 12px;
            margin-bottom: 15px;
        }

        .header-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .header-subtitle {
            text-align: center;
            font-size: 10px;
            margin-bottom: 12px;
        }

        .header-info {
            width: 100%;
            border-collapse: collapse;
        }

        .header-info td {
            border: 1px solid #999;
            padding: 6px;
        }

        .label {
            font-weight: bold;
            background: #f3f3f3;
            width: 20%;
        }

        /* =========================
           TITRE
        ========================= */

        .title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 15px 0;
            text-transform: uppercase;
        }

        /* =========================
           SECTIONS
        ========================= */

        .section {
            margin-bottom: 15px;
        }

        .section-title {
            font-size: 11px;
            font-weight: bold;
            background: #eeeeee;
            border: 1px solid #333;
            padding: 6px;
        }

        /* =========================
           INFORMATIONS ÉQUIPEMENT
        ========================= */

        .equipment-table {
            width: 100%;
            border-collapse: collapse;
        }

        .equipment-table td {
            border: 1px solid #999;
            padding: 6px;
        }

        /* =========================
           TABLE MESURES
        ========================= */

        .measurements {
            width: 100%;
            border-collapse: collapse;
        }

        .measurements th,
        .measurements td {
            border: 1px solid #333;
            padding: 7px;
            text-align: center;
        }

        .measurements th {
            background: #eeeeee;
            font-weight: bold;
        }

        .measurements td:first-child {
            text-align: left;
            font-weight: bold;
        }

        .empty-value {
            height: 25px;
        }

        /* =========================
           ÉTAT
        ========================= */

        .status-table {
            width: 100%;
            border-collapse: collapse;
        }

        .status-table td {
            border: 1px solid #999;
            padding: 7px;
        }

        /* =========================
           OBSERVATION
        ========================= */

        .observation {
            border: 1px solid #999;
            height: 70px;
            padding: 8px;
        }

        /* =========================
           SIGNATURES
        ========================= */

        .signatures {
            width: 100%;
            border-collapse: collapse;
        }

        .signatures th,
        .signatures td {
            border: 1px solid #333;
            padding: 7px;
            text-align: center;
        }

        .signatures th {
            background: #eeeeee;
        }

        .signature-space {
            height: 55px;
        }

        /* =========================
           ANNEXES
        ========================= */

        .annexes {
            width: 100%;
            border-collapse: collapse;
        }

        .annexes td {
            border: 1px solid #999;
            padding: 6px;
        }

        /* =========================
           FOOTER
        ========================= */

        .footer {
            margin-top: 20px;
            padding-top: 6px;
            border-top: 1px solid #999;
            text-align: center;
            font-size: 8px;
        }
    </style>
</head>

<body>

{{-- ================================
     1. EN-TÊTE
================================ --}}

<div class="header">

    <div class="header-title">
        OFFICE NATIONAL DES AÉROPORTS
    </div>

    <div class="header-subtitle">
        DIVISION TECHNIQUE NAVIGATION
    </div>

    <table class="header-info">

        <tr>
            <td class="label">Aéroport</td>
            <td>
                {{ $header['aeroport'] ?? 'FES SAISS' }}
            </td>

            <td class="label">Date</td>
            <td>
                {{ $date ?? ($header['date'] ?? '') }}
            </td>
        </tr>

        <tr>
            <td class="label">Code site</td>
            <td>
                {{ $header['code'] ?? '' }}
            </td>

            <td class="label">Réf. envoi</td>
            <td>
                {{ $header['ref_envoi'] ?? '' }}
            </td>
        </tr>

    </table>

</div>


{{-- ================================
     2. TITRE
================================ --}}

<div class="title">
    {{ strtoupper($canvas->template_name ?? 'RELEVÉ TECHNIQUE') }}
</div>


{{-- ================================
     3. ÉQUIPEMENT
================================ --}}

<div class="section">

    <div class="section-title">
        1. Informations sur l'équipement
    </div>

    <table class="equipment-table">

        <tr>
            <td class="label">
                Équipement
            </td>

            <td>
                {{ $equipment->name ?? '' }}
            </td>

            <td class="label">
                Type
            </td>

            <td>
                {{ $canvas->template_type ?? '' }}
            </td>
        </tr>

        <tr>
            <td class="label">
                Fréquence
            </td>

            <td>
                {{ ucfirst($canvas->frequency ?? '') }}
            </td>

            <td class="label">
                État
            </td>

            <td>
                ☐ Normal
                &nbsp;&nbsp;
                ☐ Anomalie
                &nbsp;&nbsp;
                ☐ Hors service
            </td>
        </tr>

    </table>

</div>


{{-- ================================
     4. MESURES
================================ --}}

<div class="section">

    <div class="section-title">
        2. Relevé des paramètres
    </div>

    <table class="measurements">

        <thead>

            <tr>
                <th>Paramètre</th>
                <th>Unité</th>
                <th>Moniteur 1</th>
                <th>Moniteur 2</th>
                <th>Tolérance</th>
            </tr>

        </thead>

        <tbody>

            @foreach($parameters as $param)

                <tr>

                    <td>
                        {{ $param['name'] ?? '' }}
                    </td>

                    <td>
                        {{ $param['unit'] ?? '—' }}
                    </td>

                    <td class="empty-value">
                    </td>

                    <td class="empty-value">
                    </td>

                    <td>
                        {{ $param['tolerance'] ?? '—' }}
                    </td>

                </tr>

            @endforeach

        </tbody>

    </table>

</div>


{{-- ================================
     5. OBSERVATION
================================ --}}

<div class="section">

    <div class="section-title">
        3. Observation
    </div>

    <div class="observation">
    </div>

</div>


{{-- ================================
     6. SIGNATURES
================================ --}}

@if(!empty($signatures))

<div class="section">

    <div class="section-title">
        4. Validation
    </div>

    <table class="signatures">

        <thead>

            <tr>

                @foreach($signatures as $signature)

                    <th>
                        {{ $signature }}
                    </th>

                @endforeach

            </tr>

        </thead>

        <tbody>

            <tr>

                @foreach($signatures as $signature)

                    <td class="signature-space">
                        Signature :
                        <br><br>
                        __________________
                    </td>

                @endforeach

            </tr>

        </tbody>

    </table>

</div>

@endif


{{-- ================================
     7. ANNEXES
================================ --}}

@if(!empty($annexes))

<div class="section">

    <div class="section-title">
        5. Annexes
    </div>

    <table class="annexes">

        @foreach($annexes as $annexe)

            <tr>

                <td style="width: 30px; text-align:center;">
                    ☐
                </td>

                <td>
                    {{ $annexe }}
                </td>

            </tr>

        @endforeach

    </table>

</div>

@endif


<div class="footer">
    Fiche de relevé technique — GMAO
</div>

</body>
</html>