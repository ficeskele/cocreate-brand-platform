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
    if (mode === 'signup' && !name.trim()) er.name = 'How you want to appear';
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Check the email';
    if (pw.length < 8) er.pw = 'At least 8 characters';
    setErrors(er); if (Object.keys(er).length) return;
    signUp({ name: name.trim() || email.split('@')[0], email, prefs: { activity, commercial } });
  };
  return (
    <div className="scrim" onClick={closeAuth}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="auth-title">{mode === 'signup' ? 'Join to continue' : 'Sign in to continue'}</h2>
          <button className="icon-btn" onClick={closeAuth} aria-label="Close"><Icon name="close" /></button>
        </div>
        {pending && <p className="pending"><Icon name="check" size={16} />Afterwards you can {pending.label}. You won’t lose what you were doing.</p>}
        <form onSubmit={submit} noValidate>
          {mode === 'signup' && <Field label="Display name" error={errors.name}><input ref={first} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" /></Field>}
          <Field label="Email" error={errors.email}><input ref={mode === 'login' ? first : undefined} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Password" error={errors.pw}><input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></Field>
          {mode === 'signup' && (
            <fieldset className="prefs">
              <legend>Notifications</legend>
              <label className="check"><input type="checkbox" checked={activity} onChange={e => setActivity(e.target.checked)} />Activity on ideas I follow and confirmed launches</label>
              <label className="check"><input type="checkbox" checked={commercial} onChange={e => setCommercial(e.target.checked)} />News and marketing emails</label>
            </fieldset>
          )}
          <Button type="submit" block>{mode === 'signup' ? 'Create account and continue' : 'Sign in and continue'}</Button>
        </form>
        <p className="small muted center">{mode === 'signup' ? 'Already have an account? ' : 'First time? '}<button className="link" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
        <p className="tiny muted center">Demo: no data is sent to any server.</p>
      </div>
    </div>
  );
}
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className={`field${error ? ' has-error' : ''}`}><span>{label}</span>{children}{error ? <em role="alert">{error}</em> : hint ? <small>{hint}</small> : null}</label>;
}
