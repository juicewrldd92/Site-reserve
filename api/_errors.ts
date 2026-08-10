/**
 * Filet de sécurité pour les routes serveur.
 *
 * Une exception non rattrapée dans une fonction Vercel produit un 500 sans
 * corps : côté client on ne voit qu'« erreur », et côté serveur il faut aller
 * fouiller les journaux. Or les causes ici sont presque toujours les mêmes —
 * une variable d'environnement absente — et elles se nomment en une phrase.
 *
 * On enveloppe donc chaque route pour qu'elle réponde toujours quelque chose
 * de lisible. Le message d'erreur est renvoyé tel quel : ces routes ne
 * manipulent que des identifiants d'organisation et des noms de variables,
 * jamais de secret.
 */
export function withErrors(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return await handler(request)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Erreur inattendue'
      console.error('Route en échec', request.url, cause)
      return Response.json({ erreur: message }, { status: 500 })
    }
  }
}
