import { useState, type FormEvent } from 'react';
import { PanelHead } from '../components/Controls';
import { api, errorMessage } from '../lib/api';
import type { User } from '../types';

type Props = {
  token: string | null;
  onDone: (user: User) => void;
  onRequestNewLink: () => void;
};

export default function ResetPasswordSection({ token, onDone, onRequestNewLink }: Props) {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <section className="panel form-panel login-panel">
        <PanelHead label="Redefinir senha" title="Link incompleto" />
        <p className="muted">Abra o link exatamente como chegou no e-mail, ou peça um novo.</p>
        <button type="button" className="primary-button" onClick={onRequestNewLink}>
          Pedir novo link
        </button>
      </section>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (senha.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    if (senha !== confirmarSenha) return setError('As senhas não conferem.');

    setIsSubmitting(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>('/api/auth/reset', { method: 'POST', body: { token, senha, confirmarSenha } });
      onDone(user);
    } catch (reason) {
      setError(errorMessage(reason));
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel form-panel login-panel">
      <PanelHead label="Redefinir senha" title="Crie sua nova senha" />
      <form className="register-form" onSubmit={handleSubmit}>
        <label>
          <span>Nova senha</span>
          <input type="password" autoComplete="new-password" minLength={8} value={senha} onChange={(event) => setSenha(event.target.value)} required />
        </label>
        <label>
          <span>Confirmar nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
            required
          />
        </label>
        {error && (
          <div className="form-message error" role="alert">
            {error}{' '}
            {error.includes('link') && (
              <button type="button" className="link-button" onClick={onRequestNewLink}>
                Pedir novo link
              </button>
            )}
          </div>
        )}
        <button type="submit" className="primary-button submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
        </button>
        <p className="muted">Por segurança, as outras sessões abertas desta conta serão encerradas.</p>
      </form>
    </section>
  );
}
