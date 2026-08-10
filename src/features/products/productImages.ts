/**
 * Vignette de secours, devinée d'après le nom du produit.
 *
 * Un produit saisi à la main n'a pas de photo, et la grille de stock perd
 * l'essentiel de son intérêt quand elle affiche des aplats gris : c'est la
 * photo qui permet de reconnaître un produit sans lire son nom.
 *
 * On rattrape donc les ingrédients les plus courants d'une cuisine française.
 * Ce n'est ni exhaustif ni précis — une « crème de marrons » recevra la photo
 * de la crème fraîche — mais une image approximative reste plus lisible qu'un
 * rectangle vide, et l'utilisateur peut toujours mettre la sienne.
 *
 * Les images vivent dans `public/photos`, en licence CC0.
 */

/**
 * Motifs par image, du plus spécifique au plus général.
 *
 * L'ordre compte : « tomate » doit être testé avant « sauce », sinon une
 * « sauce tomate » reçoit la mauvaise vignette. Les entrées sont comparées
 * sans accents ni casse.
 */
const REGLES: Array<{ photo: string; mots: string[] }> = [
  { photo: 'mozzarella', mots: ['mozzarella', 'mozza', 'burrata', 'bufala', 'feta', 'parmesan', 'fromage', 'emmental', 'gruyere', 'chevre', 'comte'] },
  { photo: 'tomates', mots: ['tomate', 'san marzano', 'coulis', 'passata', 'concentre de tomate', 'ketchup'] },
  { photo: 'basilic', mots: ['basilic', 'persil', 'coriandre', 'menthe', 'ciboulette', 'thym', 'romarin', 'herbe', 'aromate', 'origan', 'estragon'] },
  { photo: 'roquette', mots: ['roquette', 'salade', 'laitue', 'mache', 'epinard', 'cresson', 'mesclun'] },
  { photo: 'huile', mots: ['huile', 'olive', 'vinaigre', 'vinaigrette'] },
  { photo: 'creme', mots: ['creme', 'lait', 'beurre', 'yaourt', 'mascarpone', 'ricotta', 'fraiche'] },
  { photo: 'farine', mots: ['farine', 'pate', 'pates', 'spaghetti', 'penne', 'tagliatelle', 'semoule', 'riz', 'polenta', 'pain', 'levure'] },
]

/** Retire accents et casse : « Crème Fraîche » et « creme fraiche » se valent. */
function aplatir(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Devine une vignette à partir du nom, ou `null` si rien ne correspond.
 *
 * On ne devine jamais contre une photo existante : l'appelant ne s'en sert que
 * lorsque le produit n'en a pas.
 */
export function guessProductImage(name: string): string | null {
  const plat = aplatir(name)
  for (const { photo, mots } of REGLES) {
    if (mots.some((mot) => plat.includes(mot))) return `/photos/${photo}.jpg`
  }
  return null
}

/**
 * Photo à afficher : celle du produit, sinon une vignette devinée.
 *
 * Rien n'est écrit en base — c'est un affichage. Le jour où l'utilisateur
 * ajoute sa propre photo, elle reprend naturellement la main.
 */
export function displayImage(
  imageUrl: string | null | undefined,
  name: string,
): string | null {
  return imageUrl ?? guessProductImage(name)
}
