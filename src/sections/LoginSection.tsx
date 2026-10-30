import { useState, type FormEvent } from 'react';
import { PanelHead } from '../components/Controls';
import { api, errorMessage } from '../lib/api';

type Props = {
  onLogin: (email: string, senha: string) => Promise<unknown>;
  onGoToRegister: () => void;
};

export default function LoginSection({ onLogin, onGoToRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: 'login' | 'forgot') => {
    setMode(next);
    setMessage(null);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      await onLogin(email, senha);
    } catch (reason) {
      setMessage({ type: 'error', text: errorMessage(reason) });
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { message: text } = await api<{ message: string }>('/api/auth/forgot', { method: 'POST', body: { email } });
      setMessage({ type: 'success', text });
    } catch (reason) {
      setMessage({ type: 'error', text: errorMessage(reason) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedback = message && (
    <div className={`form-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
      {message.text}
    </div>
  );

  if (mode === 'forgot') {
    return (
      <section className="panel form-panel login-panel">
        <PanelHead label="Esqueci minha senha" title="Receba um link para criar uma nova senha" />
        <form className="register-form" onSubmit={handleForgot}>
          <label>
            <span>E-mail da conta</span>
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {feedback}
          <button type="submit" className="primary-button submit-button" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar link'}
          </button>
          <p className="muted">
            <button type="button" className="link-button" onClick={() => switchMode('login')}>
              Voltar para Entrar
            </button>
          </p>
        </form>
      </section>
    );
  }

  return (
    <section className="panel form-panel login-panel">
      <PanelHead label="Entrar" title="Acesse a área da sua empresa" />

      <form className="register-form" onSubmit={handleLogin}>
        <label>
          <span>E-mail</span>
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          <span>Senha</span>
          <input type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} required />
        </label>

        {feedback}

        <button type="submit" className="primary-button submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="muted">
          <button type="button" className="link-button" onClick={() => switchMode('forgot')}>
            Esqueci minha senha
          </button>
        </p>
        <p className="muted">
          Ainda não tem conta?{' '}
          <button type="button" className="link-button" onClick={onGoToRegister}>
            Cadastre sua empresa
          </button>
        </p>
      </form>
    </section>
  );
}
