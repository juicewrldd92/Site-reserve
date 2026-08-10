/**
 * Détection du système, et étapes d'installation qui vont avec.
 *
 * L'installation d'une PWA n'a rien d'universel : sur iPhone elle passe par le
 * bouton Partager de Safari, sur Android par le menu de Chrome. Montrer les
 * deux à la fois n'aiderait personne — on demande, puis on ne montre que le
 * bon chemin.
 */

export type Platform = 'ios' | 'android'

/** Devine le système pour préselectionner le bon choix, sans jamais l'imposer. */
export function guessPlatform(userAgent = navigator.userAgent): Platform | null {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return null
}

/** Vrai si l'app tourne déjà depuis l'écran d'accueil : plus rien à installer. */
export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Propriété non standard, propre à Safari iOS.
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export type Step = {
  /** Titre court, à l'impératif : c'est une consigne, pas une description. */
  title: string
  detail: string
}

export const STEPS: Record<Platform, Step[]> = {
  ios: [
    {
      title: 'Appuie sur Partager',
      detail:
        'Le carré avec la flèche vers le haut, en bas de Safari. Si tu ne le vois pas, fais défiler la page vers le bas : la barre réapparaît.',
    },
    {
      title: 'Choisis « Sur l’écran d’accueil »',
      detail:
        'Il faut souvent faire défiler le menu un peu vers le bas pour le trouver.',
    },
    {
      title: 'Appuie sur « Ajouter »',
      detail:
        'En haut à droite. Réserve apparaît sur ton écran d’accueil, comme n’importe quelle autre app.',
    },
  ],
  android: [
    {
      title: 'Ouvre le menu ⋮',
      detail: 'Les trois points en haut à droite de Chrome.',
    },
    {
      title: 'Choisis « Installer l’application »',
      detail:
        'Selon la version de Chrome, l’intitulé peut être « Ajouter à l’écran d’accueil ». C’est la même chose.',
    },
    {
      title: 'Confirme avec « Installer »',
      detail: 'Réserve rejoint tes autres applications, dans le tiroir et sur l’accueil.',
    },
  ],
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  ios: 'iPhone',
  android: 'Android',
}

/** Le navigateur à utiliser : sur iOS, seul Safari sait installer une PWA. */
export const REQUIRED_BROWSER: Record<Platform, string> = {
  ios: 'Safari',
  android: 'Chrome',
}
