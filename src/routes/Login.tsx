import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { BrandMark, ChevronRightIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { getSupabase } from '@/lib/supabase'

type Mode = 'connexion' | 'inscription'
type Method = 'motdepasse' | 'lien'

/** Connexion / inscription : e-mail + mot de passe, ou lien magique. */
export function Login() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(
    params.get('mode') === 'inscription' ? 'inscription' : 'connexion',
  )
  const [method, setMethod] = useState<Method>('motdepasse')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const auth = getSupabase().auth

      if (method === 'lien') {
        const { error: err } = await auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        })
        if (err) throw err
        setSent(true)
        return
      }

      const { error: err } =
        mode === 'inscription'
          ? await auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin },
            })
          : await auth.signInWithPassword({ email, password })
      if (err) throw err
      // La redirection est gérée par le garde de route dès que la session arrive.
    } catch (cause) {
      setError(translate(cause))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col justify-center gap-3.5">
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            Regarde tes mails 📬
          </h1>
          <p className="text-ink-muted text-[15.5px] leading-[1.5]">
            On vient d'envoyer un lien de connexion à <strong>{email}</strong>. Un clic
            et tu es dedans.
          </p>
          <Button variant="secondary" onClick={() => setSent(false)}>
            Utiliser une autre adresse
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            {mode === 'inscription' ? 'On se lance ?' : 'Content de te revoir'}
          </h1>
          <p className="text-ink-muted text-[15.5px] leading-[1.5]">
            {mode === 'inscription'
              ? 'Ton adresse, un mot de passe, et c’est parti.'
              : 'Reprends là où tu t’étais arrêté.'}
          </p>
        </div>

        <Field
          label="Ton e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="marco@chezmarco.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {method === 'motdepasse' && (
          <Field
            label="Mot de passe"
            type="password"
            autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            placeholder="8 caractères minimum"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {error && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy
            ? 'Un instant…'
            : method === 'lien'
              ? 'Recevoir un lien magique'
              : mode === 'inscription'
                ? 'Créer mon compte'
                : 'Me connecter'}
        </Button>

        <button
          type="button"
          onClick={() => setMethod(method === 'lien' ? 'motdepasse' : 'lien')}
          className="text-ink-muted flex items-center justify-center gap-1 text-[14px] font-semibold"
        >
          {method === 'lien' ? 'Utiliser un mot de passe' : 'Recevoir plutôt un lien magique'}
          <ChevronRightIcon size={16} />
        </button>

        <div className="mt-auto flex flex-col items-center gap-2 pt-6">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'inscription' ? 'connexion' : 'inscription')
              setError(null)
            }}
            className="text-[14.5px] font-semibold"
          >
            {mode === 'inscription' ? (
              <>
                Déjà un compte ? <span className="text-corail">Se connecter</span>
              </>
            ) : (
              <>
                Pas encore de compte ? <span className="text-corail">S'inscrire</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Screen>
  )
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas flex min-h-dvh justify-center">
      <div
        className="flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 28px)',
        }}
      >
        <Link to="/bienvenue" className="flex items-center gap-2.5 text-ink">
          <BrandMark size={34} />
          <span className="text-[19px] font-extrabold tracking-[-0.02em]">Réserve</span>
        </Link>
        {children}
      </div>
    </div>
  )
}

/** Les messages de Supabase sont en anglais : on parle français en cuisine. */
function translate(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause)
  if (/invalid login credentials/i.test(message)) return 'E-mail ou mot de passe incorrect.'
  if (/user already registered/i.test(message)) return 'Cette adresse a déjà un compte.'
  if (/password should be at least/i.test(message))
    return 'Mot de passe trop court (8 caractères minimum).'
  if (/email rate limit|over_email_send_rate_limit/i.test(message))
    return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (/unable to validate email|invalid format/i.test(message)) return 'Cette adresse e-mail semble invalide.'
  return message
}
