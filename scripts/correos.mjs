#!/usr/bin/env node
// Genera las cuatro plantillas de correo de Supabase Auth (src/v2/emails/*.html) desde una sola fuente.
//   node scripts/correos.mjs
// Lo que cambia respecto a las de antes (docs/AUDITORIA_ESTETICA.md, E-01 a E-05; PLAN_FASES n.º 41 y 42):
//   · cabecera con el logotipo oficial de Reportia, verde sobre azul petróleo (public/marca/reportia-logo-316.png);
//   · un solo idioma por correo: el que la persona tiene guardado (lang, en sus datos de Supabase: lo ponen el alta y
//     la invitación). Si no lo hay, en castellano, con una línea en catalán y en inglés debajo;
//   · un solo botón, con las esquinas del producto (10 px), y ningún texto por debajo de 13 px;
//   · sin el lema «Canal de denuncias anónimas»: el canal también admite denuncias con nombre (duda 23 del abogado).
// Las plantillas se pegan a mano en Supabase › Authentication › Emails (docs/QUE_TIENE_QUE_HACER_DAVID.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMPRESA } from '../src/v2/config/producto.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'v2', 'emails');
const FONT = "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const INK = '#0D1530';
const MUTED = '#4D5672';
const BLUE = '#2F54EB';
const PETROL = '#294E59';

const COMUNES = {
  es: { hello: 'Hola:', noBtn: '¿El botón no funciona? Copia este enlace en el navegador.', auto: `Mensaje automático de ${EMPRESA}.`, sentTo: 'Enviado a' },
  ca: { hello: 'Hola:', noBtn: 'El botó no funciona? Copia aquest enllaç al navegador.', auto: `Missatge automàtic de ${EMPRESA}.`, sentTo: 'Enviat a' },
  en: { hello: 'Hello,', noBtn: 'Button not working? Copy this link into your browser.', auto: `Automatic message from ${EMPRESA}.`, sentTo: 'Sent to' },
};

// Cada correo: asunto (Supabase solo admite uno: va en castellano y catalán), y por idioma: título, párrafos, botón,
// nota final y la línea corta que se añade, en los otros dos idiomas, cuando no se sabe el de la persona
const CORREOS = {
  invite: {
    file: 'invite.html', template: '«Invite user»',
    subject: 'Invitación para gestionar el canal de denuncias · Invitació per gestionar el canal de denúncies',
    showTo: true,
    es: {
      title: 'Invitación para gestionar el canal de denuncias',
      pre: 'Acepta la invitación y elige una contraseña.',
      body: [`Te han dado acceso para gestionar el canal de denuncias de tu organización en ${EMPRESA}. Para empezar, acepta la invitación y elige una contraseña.`,
        'Solo verás las denuncias de los temas que te hayan asignado. Trata su contenido con confidencialidad: la Ley 2/2023 protege la identidad de quien informa.'],
      btn: 'Aceptar la invitación', note: 'Si no esperabas esta invitación, ignora este mensaje.',
    },
    ca: {
      title: 'Invitació per gestionar el canal de denúncies',
      pre: 'Accepta la invitació i tria una contrasenya.',
      body: [`T'han donat accés per gestionar el canal de denúncies de la teva organització a ${EMPRESA}. Per començar, accepta la invitació i tria una contrasenya.`,
        "Només veuràs les denúncies dels temes que t'hagin assignat. Tracta'n el contingut amb confidencialitat: la Llei 2/2023 protegeix la identitat de qui informa."],
      btn: 'Acceptar la invitació', note: 'Si no esperaves aquesta invitació, ignora aquest missatge.',
      short: "Català: t'han donat accés per gestionar el canal de denúncies. Fes servir el botó per acceptar-ho.",
    },
    en: {
      title: 'Invitation to manage the reporting channel',
      pre: 'Accept the invitation and choose a password.',
      body: [`You have been given access to manage your organisation's reporting channel in ${EMPRESA}. To start, accept the invitation and choose a password.`,
        'You will only see reports on the topics assigned to you. Treat their content as confidential: Law 2/2023 protects the identity of the person reporting.'],
      btn: 'Accept the invitation', note: 'If you were not expecting this invitation, ignore this message.',
      short: 'English: you have been given access to manage the reporting channel. Use the button to accept.',
    },
  },
  confirm: {
    file: 'confirm-signup.html', template: '«Confirm sign up»',
    subject: 'Confirma tu correo electrónico · Confirma el teu correu electrònic',
    showTo: true,
    es: {
      title: 'Confirma tu correo electrónico',
      pre: 'Confirma tu dirección para activar la cuenta.',
      body: [`Has creado una cuenta en ${EMPRESA} para gestionar vuestro canal de denuncias. Para activarla, confirma que esta dirección de correo es tuya.`],
      btn: 'Confirmar el correo', note: 'Si no has creado tú esta cuenta, ignora este mensaje y la cuenta no se activará.',
    },
    ca: {
      title: 'Confirma el teu correu electrònic',
      pre: "Confirma l'adreça per activar el compte.",
      body: [`Has creat un compte a ${EMPRESA} per gestionar el vostre canal de denúncies. Per activar-lo, confirma que aquesta adreça de correu és teva.`],
      btn: 'Confirmar el correu', note: "Si no has creat tu aquest compte, ignora aquest missatge i el compte no s'activarà.",
      short: 'Català: confirma amb el botó que aquesta adreça de correu és teva.',
    },
    en: {
      title: 'Confirm your email address',
      pre: 'Confirm your address to activate the account.',
      body: [`You have created a ${EMPRESA} account to manage your reporting channel. To activate it, confirm that this email address is yours.`],
      btn: 'Confirm the email', note: 'If you did not create this account, ignore this message and it will not be activated.',
      short: 'English: use the button to confirm that this email address is yours.',
    },
  },
  reset: {
    file: 'reset-password.html', template: '«Reset password»',
    subject: 'Restablece tu contraseña · Restableix la contrasenya',
    showTo: true,
    es: {
      title: 'Restablecer la contraseña',
      pre: 'Elige una contraseña nueva.',
      body: [`Hemos recibido una solicitud para restablecer la contraseña de la cuenta {{ .Email }} en ${EMPRESA}.`],
      btn: 'Elegir una contraseña nueva', note: 'Si no lo has pedido tú, ignora este mensaje. Tu contraseña actual sigue siendo válida.',
    },
    ca: {
      title: 'Restablir la contrasenya',
      pre: 'Tria una contrasenya nova.',
      body: [`Hem rebut una sol·licitud per restablir la contrasenya del compte {{ .Email }} a ${EMPRESA}.`],
      btn: 'Triar una contrasenya nova', note: 'Si no ho has demanat tu, ignora aquest missatge. La teva contrasenya actual continua sent vàlida.',
      short: 'Català: fes servir el botó per triar una contrasenya nova.',
    },
    en: {
      title: 'Reset your password',
      pre: 'Choose a new password.',
      body: [`We received a request to reset the password of the account {{ .Email }} in ${EMPRESA}.`],
      btn: 'Choose a new password', note: 'If you did not ask for it, ignore this message. Your current password is still valid.',
      short: 'English: use the button to choose a new password.',
    },
  },
  change: {
    file: 'change-email.html', template: '«Change email address»',
    subject: 'Confirma el cambio de correo · Confirma el canvi de correu',
    showTo: false,
    es: {
      title: 'Confirmar el cambio de correo electrónico',
      pre: 'Confirma el cambio de correo de tu cuenta.',
      body: [`Se ha pedido cambiar el correo de tu cuenta de ${EMPRESA} de {{ .Email }} a {{ .NewEmail }}. Para completar el cambio, confírmalo con el botón.`],
      btn: 'Confirmar el cambio', note: 'Si no lo has pedido tú, no pulses el botón y cambia tu contraseña.',
    },
    ca: {
      title: 'Confirmar el canvi de correu electrònic',
      pre: 'Confirma el canvi de correu del teu compte.',
      body: [`S'ha demanat canviar el correu del teu compte de ${EMPRESA} de {{ .Email }} a {{ .NewEmail }}. Per completar el canvi, confirma-ho amb el botó.`],
      btn: 'Confirmar el canvi', note: 'Si no ho has demanat tu, no premis el botó i canvia la contrasenya.',
      short: 'Català: confirma amb el botó el canvi de correu del teu compte.',
    },
    en: {
      title: 'Confirm the change of email address',
      pre: 'Confirm the change of email address of your account.',
      body: [`A change of email address was requested for your ${EMPRESA} account, from {{ .Email }} to {{ .NewEmail }}. To complete it, confirm with the button.`],
      btn: 'Confirm the change', note: 'If it was not you, do not press the button and change your password.',
      short: 'English: use the button to confirm the change of email address.',
    },
  },
};

const p = (text, { size = 15, line = 24, color = INK, cls = 'ink', extra = '' } = {}) =>
  `<p class="${cls}" style="margin:0 0 14px;font-family:${FONT};font-size:${size}px;line-height:${line}px;color:${color};${extra}">${text}</p>`;

/** El cuerpo del correo en un idioma */
function cuerpo(c, lang, others) {
  const t = c[lang];
  const k = COMUNES[lang];
  return `
              <tr>
                <td class="px" lang="${lang}" style="padding:28px 32px 4px;">
                  <h1 class="ink" style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:28px;font-weight:800;color:${INK};">${t.title}</h1>
                  ${p(k.hello)}
                  ${t.body.map(x => p(x)).join('\n                  ')}
                  <table role="presentation" class="btn-t" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;">
                    <tr>
                      <td class="btn-td" align="center" bgcolor="${BLUE}" style="border-radius:10px;background:${BLUE};mso-padding-alt:14px 24px;">
                        <a class="btn-a" href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:15px;font-weight:700;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:10px;">${t.btn}</a>
                      </td>
                    </tr>
                  </table>
                  ${p(t.note, { size: 13, line: 20, color: MUTED, cls: 'muted' })}
                  ${others ? `{{ if not .Data.lang }}${others.map(o => p(c[o].short, { size: 13, line: 20, color: MUTED, cls: 'muted', extra: 'margin:0 0 8px;' })).join('')}{{ end }}` : ''}
                </td>
              </tr>
              <tr>
                <td class="px" style="padding:0 32px 24px;">
                  <div class="rule" style="border-top:1px solid #E3E6ED;font-size:0;line-height:0;margin:0 0 16px;">&nbsp;</div>
                  ${p(k.noBtn, { size: 13, line: 20, color: MUTED, cls: 'muted', extra: 'margin:0 0 6px;' })}
                  <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;"><a class="link" href="{{ .ConfirmationURL }}" target="_blank" style="color:#1F3FC4;text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
                </td>
              </tr>`;
}

function pie(lang, showTo) {
  const k = COMUNES[lang];
  return p(`${k.auto}${showTo ? ` ${k.sentTo} {{ .Email }}.` : ''}`, { size: 13, line: 20, color: MUTED, cls: 'muted', extra: 'margin:0 0 6px;' });
}

function plantilla(c) {
  const branch = (fn) => `{{ if eq $l "ca" }}${fn('ca')}{{ else if eq $l "en" }}${fn('en')}{{ else }}${fn('es')}{{ end }}`;
  return `<!-- Supabase Dashboard > Authentication > Emails > Templates > ${c.template}: pegar todo este archivo en el cuerpo del mensaje (HTML). -->
<!-- Asunto: ${c.subject} -->
<!-- Generado con scripts/correos.mjs: no se edita a mano. Un idioma por correo: el de la persona (.Data.lang); si no lo hay, castellano. -->
{{ $l := "es" }}{{ with .Data.lang }}{{ $l = . }}{{ end }}<!DOCTYPE html>
<html lang="{{ $l }}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${branch(l => c[l].title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    a { color: #1F3FC4; }
    @media (max-width: 520px) {
      .outer { padding: 16px 10px !important; }
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .btn-t { width: 100% !important; }
      .btn-td, .btn-a { display: block !important; text-align: center !important; }
    }
    @media (prefers-color-scheme: dark) {
      .bg { background: #0E1220 !important; }
      .card { background: #171C2B !important; border-color: #2B3348 !important; }
      .rule { border-color: #2B3348 !important; }
      .ink { color: #EEF1F7 !important; }
      .muted { color: #A8B1C6 !important; }
      .link { color: #B7C5FF !important; }
    }
    [data-ogsc] .ink { color: #EEF1F7 !important; }
    [data-ogsc] .muted { color: #A8B1C6 !important; }
    [data-ogsc] .link { color: #B7C5FF !important; }
  </style>
</head>
<body class="bg" style="margin:0;padding:0;background:#F6F7F9;">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#F6F7F9;">${branch(l => c[l].pre)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
  <table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F7F9;">
    <tr>
      <td class="outer" align="center" style="padding:32px 12px;">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6ED;border-radius:14px;">
          <tr>
            <td bgcolor="${PETROL}" style="background:${PETROL};padding:20px 32px;border-radius:13px 13px 0 0;">
              <img src="{{ .SiteURL }}/marca/reportia-logo-316.png" width="158" height="33" alt="${EMPRESA}" style="display:block;border:0;outline:none;width:158px;height:33px;color:#27D18D;font-family:${FONT};font-size:20px;font-weight:700;">
            </td>
          </tr>
${branch(l => cuerpo(c, l, l === 'es' ? ['ca', 'en'] : null))}
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td class="px" style="padding:18px 32px 0;">
              ${branch(l => pie(l, c.showTo))}
              <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;"><a class="link" href="{{ .SiteURL }}" target="_blank" style="color:#1F3FC4;text-decoration:none;">{{ .SiteURL }}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

for (const c of Object.values(CORREOS)) {
  fs.writeFileSync(path.join(OUT, c.file), plantilla(c));
  console.log('escrito', c.file);
}
