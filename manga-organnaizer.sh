echo "Récupération de la dernière version du code source..."
git pull
echo "Code source mis à jour."

echo "Build de l'application..."
npm install
echo "Application buildée."

echo "Lancement de l'application..."
ng serve &
echo ">>>>>> Application lancée ! Ouvrir l'URL http://localhost:4200 DANS UN NAVIGATEUR (Chrome si possible) <<<<<<"

