<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\InterventionController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\ReadingController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\LogController;
use App\Http\Controllers\Api\MaintenanceScheduleController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\EquipmentTypeController;
use App\Http\Controllers\Api\ReleveTemplateController;
use App\Http\Controllers\Api\ReleveParameterController;
use App\Http\Controllers\Api\InterventionAssignmentController;
use App\Http\Controllers\Api\AtsepController;
use App\Http\Controllers\Api\CanvasController;
use App\Http\Controllers\Api\CanvasPdfExportController;
use App\Http\Controllers\Api\PartController;
use App\Http\Controllers\Api\MaintenancePlanController;
use App\Http\Controllers\Api\EquipmentCategoryController;
use App\Http\Controllers\Api\GroupRotationController;
use App\Http\Controllers\Api\PlanningTemplateController;
use App\Http\Controllers\Api\PlanningExceptionController;
use App\Http\Controllers\Api\NotificationController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/


// ============================================================
// AUTHENTIFICATION (PUBLIC)
// ============================================================

Route::post('/login', [AuthController::class, 'login']);

Route::get('/login', function () {
    return response()->json([
        'message' => 'Non authentifié'
    ], 401);
})->name('login');


// ============================================================
// ROUTES PROTÉGÉES
// ============================================================

Route::middleware('auth:sanctum')->group(function () {

    // ============================================================
    // AUTH
    // ============================================================

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', [AuthController::class, 'user']);


    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    Route::prefix('notifications')->group(function () {

        Route::get('/', [
            NotificationController::class,
            'index'
        ]);

        Route::get('/unread-count', [
            NotificationController::class,
            'unreadCount'
        ]);

        Route::put('/read-all', [
            NotificationController::class,
            'markAllAsRead'
        ]);

        Route::put('/{id}/read', [
            NotificationController::class,
            'markAsRead'
        ]);

        Route::delete('/{id}', [
            NotificationController::class,
            'destroy'
        ]);
    });


    // ============================================================
    // DASHBOARD
    // ============================================================

    Route::prefix('dashboard')->group(function () {

        Route::get('/stats', [
            DashboardController::class,
            'stats'
        ]);

        Route::get('/kpi', [
            DashboardController::class,
            'kpi'
        ]);

        Route::get('/charts', [
            DashboardController::class,
            'charts'
        ]);

        Route::get('/admin-stats', [
            DashboardController::class,
            'adminStats'
        ]);

        Route::get('/activities', [
            DashboardController::class,
            'recentActivities'
        ]);

        Route::get('/today-interventions', [
            DashboardController::class,
            'todayInterventions'
        ]);
    });


    // ============================================================
    // ADMIN - UTILISATEURS & LOGS
    // ============================================================

    Route::get('/users/intervenants', [
        UserController::class,
        'intervenants'
    ]);

    Route::middleware('role:admin')->group(function () {

        Route::get('/users', [
            UserController::class,
            'index'
        ]);

        Route::post('/users', [
            UserController::class,
            'store'
        ]);

        Route::get('/users/{id}', [
            UserController::class,
            'show'
        ]);

        Route::put('/users/{id}', [
            UserController::class,
            'update'
        ]);

        Route::delete('/users/{id}', [
            UserController::class,
            'destroy'
        ]);

        Route::put('/users/{id}/toggle', [
            UserController::class,
            'toggleActive'
        ]);

        Route::get('/logs', [
            LogController::class,
            'index'
        ]);

        Route::get('/logs/recent', [
            LogController::class,
            'recent'
        ]);
    });


    // ============================================================
    // ÉQUIPEMENTS
    // ============================================================

    Route::apiResource(
        'equipments',
        EquipmentController::class
    );

    Route::get(
        '/equipments/{id}/history',
        [EquipmentController::class, 'history']
    );


    // ============================================================
    // CATÉGORIES D'ÉQUIPEMENTS
    // ============================================================

    // IMPORTANT :
    // Cette route doit être avant apiResource()
    Route::get(
        '/equipment-categories/hierarchy',
        [EquipmentCategoryController::class, 'hierarchy']
    );

    Route::apiResource(
        'equipment-categories',
        EquipmentCategoryController::class
    );


    // ============================================================
    // GROUPES
    // Responsable
    // ============================================================

    Route::middleware('role:responsable')->group(function () {

        Route::apiResource(
            'groups',
            GroupController::class
        );

        Route::post(
            '/groups/{id}/users',
            [GroupController::class, 'addUser']
        );

        Route::delete(
            '/groups/{id}/users/{userId}',
            [GroupController::class, 'removeUser']
        );
    });


    // ============================================================
    // INTERVENTIONS
    // ============================================================

    Route::prefix('interventions')->group(function () {

        // --------------------------------------------------------
        // LISTE
        // --------------------------------------------------------

        Route::get(
            '/',
            [InterventionController::class, 'index']
        );


        // --------------------------------------------------------
        // CRÉATION
        // --------------------------------------------------------

        Route::post(
            '/',
            [InterventionController::class, 'store']
        );


        // --------------------------------------------------------
        // INTERVENTIONS DU JOUR
        // --------------------------------------------------------

        Route::get(
            '/daily',
            [InterventionController::class, 'daily']
        );


        // --------------------------------------------------------
        // PROCHAINE INTERVENTION
        // --------------------------------------------------------
        // IMPORTANT :
        // Doit être AVANT /{id}
        // Sinon "next" peut être interprété comme un ID.
        // --------------------------------------------------------

        Route::get(
            '/next',
            [InterventionController::class, 'nextIntervention']
        );


        // --------------------------------------------------------
        // CALENDRIER
        // --------------------------------------------------------

        Route::get(
            '/calendar',
            [InterventionController::class, 'calendar']
        );


        // --------------------------------------------------------
        // LECTURE DES RELEVÉS
        // --------------------------------------------------------

        Route::get(
            '/{id}/readings',
            [ReadingController::class, 'getReadings']
        );


        // --------------------------------------------------------
        // ENVOYER LES RELEVÉS
        // --------------------------------------------------------

        Route::post(
            '/{id}/readings',
            [ReadingController::class, 'submitReadings']
        );


        // --------------------------------------------------------
        // TÉLÉCHARGER PDF DES RELEVÉS
        // --------------------------------------------------------

        Route::get(
            '/{id}/download-pdf',
            [ReadingController::class, 'downloadReadingPdf']
        );


        // --------------------------------------------------------
        // AFFICHER UNE INTERVENTION
        // --------------------------------------------------------

        Route::get(
            '/{id}',
            [InterventionController::class, 'show']
        );


        // --------------------------------------------------------
        // MODIFIER UNE INTERVENTION
        // --------------------------------------------------------

        Route::put(
            '/{id}',
            [InterventionController::class, 'update']
        );


        // --------------------------------------------------------
        // SUPPRIMER UNE INTERVENTION
        // --------------------------------------------------------

        Route::delete(
            '/{id}',
            [InterventionController::class, 'destroy']
        );


        // --------------------------------------------------------
        // AFFECTER UNE INTERVENTION
        // --------------------------------------------------------

        Route::put(
            '/{id}/assign',
            [InterventionController::class, 'assign']
        );


        // --------------------------------------------------------
        // DÉMARRER UNE INTERVENTION
        // --------------------------------------------------------

        Route::post(
            '/{id}/start',
            [InterventionController::class, 'startIntervention']
        );


        // --------------------------------------------------------
        // TERMINER UNE INTERVENTION
        // --------------------------------------------------------

        Route::post(
            '/{id}/complete',
            [InterventionController::class, 'completeIntervention']
        );
    });


    // ============================================================
    // MES INTERVENTIONS
    // ============================================================
    //
    // Cette route doit permettre au frontend de récupérer
    // les interventions de l'intervenant.
    //
    // Les tickets qui lui sont affectés seront intégrés
    // dans cette partie via InterventionController.
    // ============================================================

    Route::get(
        '/my-interventions',
        [InterventionController::class, 'myInterventions']
    );


    // ============================================================
    // TICKETS / PANNES
    // ============================================================

    // ------------------------------------------------------------
    // LISTE / CRÉATION / AFFICHAGE / MODIFICATION / SUPPRESSION
    // ------------------------------------------------------------

    Route::apiResource(
        'tickets',
        TicketController::class
    );


    // ------------------------------------------------------------
    // AFFECTER UN TICKET
    // ------------------------------------------------------------

    Route::put(
        '/tickets/{id}/assign',
        [TicketController::class, 'assign']
    );


    // ------------------------------------------------------------
    // CHANGER LE STATUT D'UN TICKET
    // ------------------------------------------------------------
    //
    // Exemple :
    // nouveau -> assigne
    // assigne -> en_cours
    // en_cours -> en_attente
    // en_cours -> resolu
    // resolu -> cloture
    //
    // La vérification de l'utilisateur autorisé et des
    // transitions doit être faite dans TicketController.
    // ------------------------------------------------------------

    Route::put(
        '/tickets/{id}/status',
        [TicketController::class, 'updateStatus']
    );
    Route::post('/tickets/{id}/confirm-failure', [TicketController::class, 'confirmFailure']);

    // ------------------------------------------------------------
    // CLÔTURER UN TICKET
    // ------------------------------------------------------------

    Route::put(
        '/tickets/{id}/close',
        [TicketController::class, 'close']
    );


    // ============================================================
    // RELEVÉS
    // ============================================================

    Route::prefix('readings')->group(function () {

        // --------------------------------------------------------
        // HISTORIQUE GLOBAL DES RELEVÉS
        // --------------------------------------------------------

        Route::get(
            '/history',
            [ReadingController::class, 'history']
        );


        // --------------------------------------------------------
        // RELEVÉS D'UN ÉQUIPEMENT
        // --------------------------------------------------------

        Route::get(
            '/equipment/{equipmentId}',
            [ReadingController::class, 'byEquipment']
        );


        // --------------------------------------------------------
        // TEMPLATES D'UN ÉQUIPEMENT
        // --------------------------------------------------------

        Route::get(
            '/templates/{equipmentId}',
            [ReadingController::class, 'getTemplates']
        );


        // --------------------------------------------------------
        // CRÉER UN TEMPLATE
        // --------------------------------------------------------

        Route::post(
            '/templates',
            [ReadingController::class, 'createTemplate']
        );


        // --------------------------------------------------------
        // SOUMETTRE UN RELEVÉ
        // --------------------------------------------------------

        Route::post(
            '/submit',
            [ReadingController::class, 'submit']
        );


        // --------------------------------------------------------
        // VALIDATION D'UN RELEVÉ
        // --------------------------------------------------------
        //
        // POST /api/readings/{id}/validate
        //
        // actions :
        // - valider
        // - rejeter
        // - demander_modification
        // --------------------------------------------------------

        Route::post(
            '/{id}/validate',
            [ReadingController::class, 'validateReadings']
        );


        // --------------------------------------------------------
        // RELEVÉS EN ATTENTE DE VALIDATION
        // --------------------------------------------------------

        Route::get(
            '/to-validate',
            [ReadingController::class, 'toValidate']
        );
    });


    // ============================================================
    // PLANNING RÉCURRENT
    // Responsable
    // ============================================================

    Route::middleware('role:responsable')->group(function () {

        // --------------------------------------------------------
        // ROTATIONS DES GROUPES
        // --------------------------------------------------------

        Route::apiResource(
            'group-rotations',
            GroupRotationController::class
        );


        // --------------------------------------------------------
        // GÉNÉRER TOUT LE PLANNING
        // --------------------------------------------------------
        //
        // IMPORTANT :
        // Cette route doit être avant /{id}
        // --------------------------------------------------------

        Route::get(
            '/planning-templates/generate-all',
            [PlanningTemplateController::class, 'generateAll']
        );


        // --------------------------------------------------------
        // GÉNÉRER UN PLANNING
        // --------------------------------------------------------

        Route::post(
            '/planning-templates/{id}/generate',
            [PlanningTemplateController::class, 'generate']
        );


        // --------------------------------------------------------
        // PLANNING TEMPLATES
        // --------------------------------------------------------

        Route::apiResource(
            'planning-templates',
            PlanningTemplateController::class
        );


        // --------------------------------------------------------
        // EXCEPTIONS DU PLANNING
        // --------------------------------------------------------

        Route::apiResource(
            'planning-exceptions',
            PlanningExceptionController::class
        );
    });


    // ============================================================
    // PLANNING PRÉVENTIF
    // ============================================================

    Route::middleware('role:responsable')->group(function () {

        Route::get(
            '/maintenance-plans/annual',
            [MaintenancePlanController::class, 'getAnnualPlanning']
        );

        Route::get(
            '/maintenance-plans/monthly',
            [MaintenancePlanController::class, 'getMonthlyPlanning']
        );

        Route::get(
            '/maintenance-plans/weekly',
            [MaintenancePlanController::class, 'getWeeklyPlanning']
        );

        Route::apiResource(
            'maintenance-plans',
            MaintenancePlanController::class
        )->except([
            'edit',
            'create'
        ]);
    });


    // ============================================================
    // CANVAS DE RELEVÉS
    // ============================================================

    Route::apiResource(
        'canvases',
        CanvasController::class
    );

    Route::post(
        '/canvases/{id}/assign',
        [CanvasController::class, 'assignToIntervention']
    );

    Route::get(
        '/canvases/{id}/export-pdf',
        [CanvasPdfExportController::class, 'exportPdf']
    );


    // ============================================================
    // STOCK - PIÈCES DÉTACHÉES
    // ============================================================

    // IMPORTANT :
    // /low-stock doit être AVANT apiResource('parts')
    // sinon Laravel peut interpréter "low-stock" comme {part}.
    Route::get(
        '/parts/low-stock',
        [PartController::class, 'lowStock']
    );

    Route::apiResource(
        'parts',
        PartController::class
    );


    // ============================================================
    // ESPACE ATSEP
    // ============================================================

    Route::prefix('atsep')->group(function () {

        Route::get(
            '/interventions',
            [AtsepController::class, 'mesInterventions']
        );

        Route::patch(
            '/interventions/{interventionId}/demarrer',
            [AtsepController::class, 'demarrer']
        );

        Route::patch(
            '/interventions/{interventionId}/terminer',
            [AtsepController::class, 'terminer']
        );

        Route::get(
            '/interventions/{interventionId}/checklist',
            [AtsepController::class, 'getChecklist']
        );

        Route::post(
            '/interventions/{interventionId}/releve',
            [AtsepController::class, 'saisirReleve']
        );

        Route::post(
            '/releves/{releveId}/valeurs',
            [AtsepController::class, 'enregistrerValeurs']
        );

        Route::get(
            '/equipements/{equipmentId}/historique',
            [AtsepController::class, 'historiqueEquipement']
        );
    });


    // ============================================================
    // TYPES D'ÉQUIPEMENTS
    // ============================================================

    Route::apiResource(
        'equipment-types',
        EquipmentTypeController::class
    );


    // ============================================================
    // RELEVÉS - TEMPLATES & PARAMÈTRES
    // ============================================================

    Route::apiResource(
        'releve-templates',
        ReleveTemplateController::class
    );

    Route::apiResource(
        'releve-parameters',
        ReleveParameterController::class
    );


    // ============================================================
    // AFFECTATION DES INTERVENTIONS
    // ============================================================
    //
    // Cette route utilise le nouveau contrôleur
    // InterventionAssignmentController.
    //
    // Elle reste conservée car ton frontend peut encore
    // utiliser cette version.
    // ============================================================

    Route::post(
        '/interventions/{interventionId}/assign',
        [InterventionAssignmentController::class, 'assign']
    );

    Route::get(
        '/interventions/{interventionId}/assignments',
        [InterventionAssignmentController::class, 'index']
    );


    // ============================================================
    // TEST AUTHENTIFICATION
    // ============================================================

    Route::get('/test-auth', function () {
        return response()->json([
            'message' => 'Authentifié avec succès !'
        ]);
    });

});