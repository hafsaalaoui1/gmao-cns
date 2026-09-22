<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">

    <title>Votre compte GMAO CNS - ONDA</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

    <div style="max-width:650px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08);">

        <!-- En-tête -->
        <div style="background:#0f3d5e; padding:25px; text-align:center; color:white;">
            <h1 style="margin:0; font-size:24px;">
                GMAO CNS - ONDA
            </h1>

            <p style="margin:8px 0 0; font-size:14px;">
                Office National des Aéroports
            </p>
        </div>

        <!-- Contenu -->
        <div style="padding:35px;">

            <h2 style="color:#0f3d5e; margin-top:0;">
                Bonjour {{ $userName }} !
            </h2>

            <p style="font-size:16px; line-height:1.6; color:#333;">
                Votre compte a été créé avec succès sur la plateforme
                <strong>GMAO CNS</strong>.
            </p>

            <p style="font-size:16px; line-height:1.6; color:#333;">
                Voici vos identifiants de connexion :
            </p>

            <!-- Identifiants -->
            <div style="background:#f4f7fa; border-left:4px solid #0f3d5e; padding:20px; margin:25px 0;">

                <p style="margin:8px 0; font-size:15px;">
                    <strong>Email :</strong>
                    {{ $userEmail }}
                </p>

                <p style="margin:8px 0; font-size:15px;">
                    <strong>Mot de passe :</strong>
                    {{ $password }}
                </p>

            </div>

            <!-- Bouton connexion -->
            <div style="text-align:center; margin:30px 0;">

                <a
                    href="http://localhost:3000/login"
                    style="
                        display:inline-block;
                        background:#0f3d5e;
                        color:white;
                        text-decoration:none;
                        padding:14px 28px;
                        border-radius:6px;
                        font-weight:bold;
                    "
                >
                    Se connecter
                </a>

            </div>

            <p style="font-size:14px; line-height:1.6; color:#555;">
                Nous vous recommandons de changer votre mot de passe
                lors de votre première connexion.
            </p>

            <p style="font-size:14px; line-height:1.6; color:#555;">
                Si le bouton <strong>Se connecter</strong> ne fonctionne pas,
                copiez et collez cette adresse dans votre navigateur :
            </p>

            <p style="font-size:13px; color:#0f3d5e; word-break:break-all;">
                http://localhost:3000/login
            </p>

            <hr style="border:none; border-top:1px solid #eeeeee; margin:30px 0;">

            <p style="font-size:14px; line-height:1.6; color:#555;">
                Cordialement,
            </p>

            <p style="font-size:14px; line-height:1.6; color:#555;">
                <strong>
                    Office National des Aéroports - Service Radar & Radionavigation
                </strong>
            </p>

            <p style="font-size:14px; color:#555;">
                L'équipe GMAO CNS
            </p>

        </div>

        <!-- Footer -->
        <div style="background:#f4f6f8; padding:18px; text-align:center;">

            <p style="margin:0; font-size:12px; color:#888;">
                GMAO CNS - ONDA
            </p>

        </div>

    </div>

</body>
</html>