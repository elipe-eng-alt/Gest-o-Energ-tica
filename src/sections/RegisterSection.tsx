import { useState, type FormEvent } from 'react';
import { PanelHead } from '../components/Controls';
import type { User } from '../types';

type CustomerFormState = {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  document: string;
  setor: string;
  cargo: string;
  senha: string;
  confirmarSenha: string;
};

const defaultForm: CustomerFormState = {
  nome: '',
  empresa: '',
  email: '',
  telefone: '',
  document: '',
  setor: '',
  cargo: '',
  senha: '',
  confirmarSenha: '',
};

type Field = {
  key: keyof CustomerFormState;
  label: string;
  type: string;
  autoComplete: string;
  mask?: (value: string) => string;
};

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

function maskDocument(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

const FIELDS: Field[] = [
  { key: 'nome', label: 'Nome completo', type: 'text', autoComplete: 'name' },
  { key: 'empresa', label: 'Empresa', type: 'text', autoComplete: 'organization' },
  { key: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
  { key: 'telefone', label: 'Telefone', type: 'tel', autoComplete: 'tel', mask: maskPhone },
  { key: 'document', label: 'CPF/CNPJ', type: 'text', autoComplete: 'off', mask: maskDocument },
  { key: 'setor', label: 'Setor', type: 'text', autoComplete: 'off' },
  { key: 'cargo', label: 'Cargo', type: 'text', autoComplete: 'organization-title' },
  { key: 'senha', label: 'Senha', type: 'password', autoComplete: 'new-password' },
  { key: 'confirmarSenha', label: 'Confirmar senha', type: 'password', autoComplete: 'new-password' },
];

function validate(form: CustomerFormState) {
  const documentDigits = form.document.replace(/\D/g, '').length;
  if (documentDigits !== 11 && documentDigits !== 14) return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
  if (form.senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (form.senha !== form.confirmarSenha) return 'As senhas não conferem.';
  return null;
}

type Props = {
  onRegistered: (user: User) => void;
  onGoToLogin: () => void;
};

export default function RegisterSection({ onRegistered, onGoToLogin }: Props) {
  const [formData, setFormData] = useState<CustomerFormState>(defaultForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: Field, value: string) => {
    setFormData((current) => ({ ...current, [field.key]: field.mask ? field.mask(value) : value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validate(formData);
    if (validationError) {
      setMessage({ type: 'error', message: validationError });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar cliente.');
      }

      setFormData(defaultForm);
      if (data.user) {
        onRegistered(data.user);
        return;
      }
      setMessage({ type: 'success', message: data.message || 'Cadastro realizado com sucesso.' });
    } catch (error) {
      const fallback = 'Não foi possível conectar à API. Verifique se o servidor está em execução.';
      setMessage({
        type: 'error',
        message: error instanceof TypeError ? fallback : error instanceof Error ? error.message : 'Falha ao cadastrar.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel form-panel">
      <PanelHead label="Criar conta" title="Cadastre sua empresa e comece a lançar seu consumo" />

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          {FIELDS.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                type={field.type}
                autoComplete={field.autoComplete}
                value={formData[field.key]}
                onChange={(event) => handleChange(field, event.target.value)}
                minLength={field.type === 'password' ? 8 : undefined}
                required
              />
            </label>
          ))}
        </div>

        {message && (
          <div className={`form-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.message}
          </div>
        )}

        <button type="submit" className="primary-button submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </button>
        <p className="muted">
          Já tem conta?{' '}
          <button type="button" className="link-button" onClick={onGoToLogin}>
            Entrar
          </button>
        </p>
      </form>
    </section>
  );
}
