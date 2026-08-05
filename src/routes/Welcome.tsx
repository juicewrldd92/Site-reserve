import { useNavigate } from 'react-router-dom'

import { BrandMark } from '@/components/icons'
import { Button } from '@/components/ui/Button'

/** Écran 01 · une image, une promesse, une seule action. Pas de formulaire. */
export function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="bg-canvas flex min-h-dvh justify-center">
      <div className="flex min-h-dvh w-full max-w-[430px] flex-col">
        <div
          className="photo-ph relative mx-5 flex-1 overflow-hidden rounded-[28px]"
          style={{ marginTop: 'max(env(safe-area-inset-top), 16px)' }}
        >
          <div className="absolute top-5 left-5 flex items-center gap-2.5">
            <BrandMark size={34} />
            <span className="text-[19px] font-extrabold tracking-[-0.02em]">Réserve</span>
          </div>
        </div>

        <div
          className="flex flex-col gap-3.5 px-6 pt-7"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 34px)' }}
        >
          <h1 className="text-[31px] leading-[1.12] font-extrabold tracking-[-0.03em]">
            Ta réserve,
            <br />
            dans ta poche.
          </h1>
          <p className="text-ink-muted text-[16px] leading-[1.55]">
            Scanne tes produits, garde l'œil sur les dates, commande sans y penser.
            Promis, ça prend 2 minutes à mettre en place.
          </p>
          <div className="my-1.5 flex gap-1.5">
            <span className="bg-corail h-1.5 w-[22px] rounded-full" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#DCD5CC]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#DCD5CC]" />
          </div>
          <Button onClick={() => navigate('/connexion?mode=inscription')}>C'est parti</Button>
          <Button variant="ghost" size="md" onClick={() => navigate('/connexion')}>
            J'ai déjà un compte
          </Button>
        </div>
      </div>
    </div>
  )
}
