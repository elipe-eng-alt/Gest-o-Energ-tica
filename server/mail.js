import nodemailer from 'nodemailer';

const getOwnerEmail = () => process.env.OWNER_EMAIL || 'owner@empresa.com';
const isProduction = () => process.env.NODE_ENV === 'production';

let transporter;
function getTransporter() {
  if (transporter === undefined) {
    transporter =
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT || 587),
            secure: Number(process.env.SMTP_PORT || 587) === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
          })
        : null;
  }
  return transporter;
}

// Resend envia por HTTPS. Hospedagens como o Railway (planos Free/Hobby) bloqueiam SMTP.
async function sendWithResend(message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'EnergiaViva <onboarding@resend.dev>',
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend respondeu ${response.status}: ${data.message || JSON.stringify(data)}`);
  }
  return { provider: 'resend', id: data.id };
}

/** Envia pelo Resend, pelo SMTP ou, sem nenhum configurado, apenas registra no log. */
async function sendMail(message, { logText = true } = {}) {
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(message);
  }

  const smtp = getTransporter();
  if (smtp) {
    const info = await smtp.sendMail({ from: process.env.SMTP_USER, ...message });
    return { provider: 'smtp', id: info.messageId };
  }

  console.log('E-mail não enviado (configure RESEND_API_KEY ou SMTP):', {
    to: message.to,
    subject: message.subject,
    ...(logText ? { text: message.text } : {}),
  });
  return { provider: 'simulado' };
}

export function sendOwnerNotification(customer) {
  return sendMail({
    to: getOwnerEmail(),
    replyTo: customer.email,
    subject: 'Novo cliente cadastrado no EnergiaViva',
    text: [
      'Novo cadastro realizado no portal.',
      '',
      `Nome: ${customer.name}`,
      `Empresa: ${customer.company_name}`,
      `E-mail: ${customer.email}`,
      `Telefone: ${customer.phone}`,
      `Cargo: ${customer.position}`,
      `Setor: ${customer.sector}`,
    ].join('\n'),
  });
}

export function sendPasswordReset({ to, name, link }) {
  return sendMail(
    {
      to,
      subject: 'Redefinição de senha — EnergiaViva',
      text: [
        `Olá, ${name}.`,
        '',
        'Recebemos um pedido para redefinir a senha da sua conta no EnergiaViva.',
        'Para criar uma nova senha, abra o link abaixo (válido por 1 hora, uso único):',
        '',
        link,
        '',
        'Se você não pediu a redefinição, ignore este e-mail: sua senha continua a mesma.',
      ].join('\n'),
    },
    // Em produção o link nunca vai para o log: ele dá acesso à conta.
    { logText: !isProduction() },
  );
}
