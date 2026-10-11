import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Button } from './ui';
import { useApp } from '../state/AppState';

// Registro contextual: conserva la acción pendiente, sin demografía, comunicaciones comerciales sin preseleccionar.
export function AuthModal() {
  const { authOpen, closeAuth, pending, signUp } = useApp();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [activity, setActivity] = useState(true); const [commercial, setCommercial] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (authOpen) setTimeout(() => first.current?.focus(), 30); }, [authOpen]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && closeAuth(); if (authOpen) addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [authOpen, closeAuth]);
  if (!authOpen) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); const er: Record<string, string> = {};
    if (mode === 'signup' && !name.trim()) er.name = 'Escribe cómo quieres aparecer';
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Revisa el email';
    if (pw.length < 8) er.pw = 'Mínimo 8 caracteres';
    setErrors(er); if (Object.keys(er).length) return;
    signUp({ name: name.trim() || email.split('@')[0], email, prefs: { activity, commercial } });
  };
  return (
    <div className="scrim" onClick={closeAuth}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="auth-title">{mode === 'signup' ? 'Únete para continuar' : 'Inicia sesión para continuar'}</h2>
          <button className="icon-btn" onClick={closeAuth} aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        {pending && <p className="pending"><Icon name="check" size={16} />Después podrás {pending.label}. No perderás lo que estabas haciendo.</p>}
        <form onSubmit={submit} noValidate>
          {mode === 'signup' && <Field label="Nombre visible" error={errors.name}><input ref={first} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" /></Field>}
          <Field label="Email" error={errors.email}><input ref={mode === 'login' ? first : undefined} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Contraseña" error={errors.pw}><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></Field>
          {mode === 'signup' && (
            <fieldset className="prefs">
              <legend>Notificaciones</legend>
              <label className="check"><input type="checkbox" checked={activity} onChange={e => setActivity(e.target.checked)} />Actividad en ideas que sigo y lanzamientos confirmados</label>
              <label className="check"><input type="checkbox" checked={commercial} onChange={e => setCommercial(e.target.checked)} />Novedades y comunicaciones comerciales</label>
            </fieldset>
          )}
          <Button type="submit" block>{mode === 'signup' ? 'Crear cuenta y continuar' : 'Entrar y continuar'}</Button>
        </form>
        <p className="small muted center">{mode === 'signup' ? '¿Ya tienes cuenta? ' : '¿Primera vez? '}<button className="link" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Inicia sesión' : 'Crea una cuenta'}</button></p>
        <p className="tiny muted center">Demo: no se envían datos a ningún servidor.</p>
      </div>
    </div>
  );
}
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className={`field${error ? ' has-error' : ''}`}><span>{label}</span>{children}{error ? <em role="alert">{error}</em> : hint ? <small>{hint}</small> : null}</label>;
}
