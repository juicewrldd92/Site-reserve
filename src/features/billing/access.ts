import type { OrganizationRow } from '@/lib/database.types'

export type Access = {
  /** L'organisation peut-elle encore écrire ? Miroir de `org_can_write` en base. */
  canWrite: boolean
  /** Essai en cours, abonnement actif, ou porte fermée. */
  phase: 'trial' | 'subscribed' | 'grace' | 'expired'
  /** Jours restants d'essai ; négatif une fois dépassé. */
  daysLeft: number
}

/**
 * Traduit l'état d'une organisation en droits.
 *
 * Volontairement identique à la fonction SQL `org_can_write` : l'interface doit
 * annoncer exactement ce que la base appliquera, sinon l'utilisateur voit un
 * bouton qui échoue. La base reste l'autorité — ceci n'est qu'un affichage.
 */
export function readAccess(org: OrganizationRow, now = new Date()): Access {
  const trialEnd = new Date(org.trial_ends_at)
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000)

  if (org.subscription_status === 'active' || org.subscription_status === 'past_due') {
    const periodEnd = org.current_period_end ? new Date(org.current_period_end) : null
    const valid = periodEnd === null || periodEnd > now
    return {
      canWrite: valid,
      // `past_due` : le prélèvement a échoué mais Stripe relance. On prévient
      // sans fermer la cuisine.
      phase: valid && org.subscription_status === 'past_due' ? 'grace' : valid ? 'subscribed' : 'expired',
      daysLeft,
    }
  }

  if (org.subscription_status === 'trialing' && trialEnd > now) {
    return { canWrite: true, phase: 'trial', daysLeft }
  }

  return { canWrite: false, phase: 'expired', daysLeft }
}

