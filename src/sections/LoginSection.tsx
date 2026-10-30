import { useState, type FormEvent } from 'react';
import { PanelHead } from '../components/Controls';
import { errorMessage } from '../lib/api';

type Props = {
  onLogin: (email: string, senha: string) => Promise<unknown>;
  onGoToRegister: () => void;
};

export default function LoginSection({ onLogin, onGoToRegister }: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(email, senha);
    } catch (reason) {
      setError(errorMessage(reason));
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel form-panel login-panel">
      <PanelHead label="Entrar" title="Acesse a área da sua empresa" />

      <form className="register-form" onSubmit={handleSubmit}>
        <label>
          <span>E-mail</span>
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          <span>Senha</span>
          <input type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} required />
        </label>

        {error && (
          <div className="form-message error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="primary-button submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
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
