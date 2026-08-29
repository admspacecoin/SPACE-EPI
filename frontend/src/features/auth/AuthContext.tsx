import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'

export type UserRole = 'admin' | 'almoxarifado' | 'seguranca' | 'gestor' | 'consulta'

export type Profile = {
  id: string
  nome: string
  email: string
  perfil: UserRole
  status: 'ativo' | 'inativo'
}

type AuthState = {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // onAuthStateChanged substitui supabase.auth.onAuthStateChange — dispara
    // imediatamente com o estado atual e depois a cada login/logout.
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsubscribeAuth
  }, [])

  useEffect(() => {
    if (!user) return

    // onSnapshot em vez de um fetch único: se um admin mudar o perfil desta
    // pessoa em Administração, a UI reage na hora, sem precisar recarregar.
    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', user.uid),
      async (snap) => {
        if (!snap.exists()) {
          // Sem Cloud Function (onAuthUserCreate): no primeiro login de uma
          // conta criada pelo admin no Firebase Auth, o próprio cliente cria
          // seu documento de perfil, sempre com os valores padrão travados
          // pela regra de segurança (perfil: 'consulta', status: 'ativo').
          // Um admin promove depois pela tela de Administração.
          try {
            await setDoc(doc(db, 'users', user.uid), {
              nome: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário'),
              email: user.email ?? '',
              perfil: 'consulta',
              status: 'ativo',
              createdAt: serverTimestamp(),
            })
          } catch {
            setError('Não foi possível criar o perfil do usuário.')
            setProfile(null)
            setLoading(false)
          }
          return
        }
        const data = snap.data()
        setProfile({
          id: snap.id,
          nome: data.nome,
          email: data.email,
          perfil: data.perfil,
          status: data.status,
        })
        setError(null)
        setLoading(false)
      },
      () => {
        setError('Falha ao sincronizar o perfil do usuário.')
        setLoading(false)
      }
    )
    return unsubscribeProfile
  }, [user])

  async function signIn(email: string, password: string) {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (err) {
      const msg = translateAuthError(err)
      setError(msg)
      return { error: msg }
    }
  }

  async function signOut() {
    await firebaseSignOut(auth)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

function translateAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'E-mail ou senha inválidos.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas. Aguarde um pouco antes de tentar de novo.'
  }
  return err instanceof Error ? err.message : 'Falha ao entrar.'
}
