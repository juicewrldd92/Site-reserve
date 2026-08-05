import type { ReactNode } from 'react'

import { BrandMark } from '@/components/icons'
import { Card } from '@/components/ui/Card'

/** Affiché quand les clés Supabase manquent : on dit quoi faire, précisément. */
export function SetupNeeded() {
  return (
    <div className="bg-canvas flex min-h-dvh justify-center">
      <div
        className="flex w-full max-w-[430px] flex-col gap-5 px-6"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 28px)' }}
      >
        <BrandMark size={40} />
        <div className="flex flex-col gap-2">
          <h1 className="text-[27px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            Il manque Supabase
          </h1>
          <p className="text-ink-muted text-[15.5px] leading-[1.5]">
            L'app a besoin d'une base pour stocker tes produits. Trois minutes, une fois
            pour toutes.
          </p>
        </div>

        <Card className="flex flex-col gap-4 p-5">
          <Step n={1} title="Crée un projet sur supabase.com">
            Gratuit. Note l'URL du projet et la clé <em>anon public</em> (Project
            settings → API).
          </Step>
          <Step n={2} title="Renseigne .env.local">
            <code className="text-ink-muted mt-1 block font-mono text-[12px] leading-relaxed">
              VITE_SUPABASE_URL=…
              <br />
              VITE_SUPABASE_ANON_KEY=…
            </code>
          </Step>
          <Step n={3} title="Applique la migration">
            Colle{' '}
            <code className="font-mono text-[12.5px] break-all">
              supabase/migrations/0001_tenancy.sql
            </code>{' '}
            dans le SQL editor, puis relance{' '}
            <code className="font-mono text-[12.5px]">npm run dev</code>.
          </Step>
        </Card>
      </div>
    </div>
  )
}

function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="bg-corail-tint text-corail-ink flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-bold">
        {n}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-ink-muted text-[13.5px] leading-[1.5]">{children}</span>
      </div>
    </div>
  )
}
