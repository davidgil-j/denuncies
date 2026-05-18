import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CONTENT = {
  ca: {
    title: 'Política de Privacitat',
    lastUpdate: 'Última actualització: maig 2026',
    back: '← Tornar',
    sections: [
      {
        title: '1. Responsable del tractament',
        body: 'Reportia (info@reportia.es) és el responsable del tractament de les dades personals recollides a través d\'aquest canal de denúncies, en qualitat de prestador de servei a l\'organització client contractant.',
      },
      {
        title: '2. Finalitat i base legal',
        body: 'Les dades es tracten per gestionar les comunicacions rebudes a través del Canal Ètic, en compliment de la Llei 2/2023, de 20 de febrer, reguladora de la protecció de les persones que informen sobre infraccions normatives, i la Directiva (UE) 2019/1937. Base legal: obligació legal (Art. 6.1.c RGPD) i interès legítim (Art. 6.1.f RGPD).',
      },
      {
        title: '3. Dades recollides',
        items: [
          'Si la comunicació és anònima: no es recullen dades identificatives.',
          'Si la comunicació és identificada: nom, correu electrònic i telèfon (tots opcionals).',
          'En tots els casos: descripció dels fets, categoria, departament, data i arxius adjunts.',
        ],
      },
      {
        title: '4. Conservació',
        body: 'Les dades es conservaran durant el temps necessari per a la investigació i, com a màxim, 10 anys des de la recepció, d\'acord amb la Llei 2/2023.',
      },
      {
        title: '5. Confidencialitat i accés',
        body: 'Únicament tindran accés les persones designades com a gestores del canal, amb deure de secret professional. El sistema implementa xifrat en trànsit (HTTPS) i en repòs, i control d\'accés basat en rols.',
      },
      {
        title: '6. Comunicació a tercers',
        body: 'Les dades no seran cedides a tercers, excepte per obligació legal. Els proveïdors tecnològics (Supabase Inc., Vercel Inc.) actuen com a encarregats del tractament amb les garanties adequades.',
      },
      {
        title: '7. Els teus drets',
        body: 'Pots exercir els drets d\'accés, rectificació, supressió, limitació, portabilitat i oposició enviant un correu a info@reportia.es amb l\'assumpte "Drets RGPD". També pots reclamar davant l\'Agència Espanyola de Protecció de Dades (aepd.es).',
      },
      {
        title: '8. Seguretat',
        body: 'S\'apliquen mesures tècniques i organitzatives per garantir la confidencialitat, integritat i disponibilitat de les dades: xifrat, control d\'accés, auditoria i còpies de seguretat periòdiques.',
      },
    ],
  },
  es: {
    title: 'Política de Privacidad',
    lastUpdate: 'Última actualización: mayo 2026',
    back: '← Volver',
    sections: [
      {
        title: '1. Responsable del tratamiento',
        body: 'Reportia (info@reportia.es) es el responsable del tratamiento de los datos personales recogidos a través de este canal de denuncias, en calidad de prestador de servicio a la organización cliente contratante.',
      },
      {
        title: '2. Finalidad y base legal',
        body: 'Los datos se tratan para gestionar las comunicaciones recibidas a través del Canal Ético, en cumplimiento de la Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas que informan sobre infracciones normativas, y la Directiva (UE) 2019/1937. Base legal: obligación legal (Art. 6.1.c RGPD) e interés legítimo (Art. 6.1.f RGPD).',
      },
      {
        title: '3. Datos recogidos',
        items: [
          'Si la comunicación es anónima: no se recogen datos identificativos.',
          'Si la comunicación es identificada: nombre, correo electrónico y teléfono (todos opcionales).',
          'En todos los casos: descripción de los hechos, categoría, departamento, fecha y archivos adjuntos.',
        ],
      },
      {
        title: '4. Conservación',
        body: 'Los datos se conservarán durante el tiempo necesario para la investigación y, como máximo, 10 años desde la recepción, conforme a la Ley 2/2023.',
      },
      {
        title: '5. Confidencialidad y acceso',
        body: 'Solo tendrán acceso las personas designadas como gestoras del canal, con deber de secreto profesional. El sistema implementa cifrado en tránsito (HTTPS) y en reposo, y control de acceso basado en roles.',
      },
      {
        title: '6. Comunicación a terceros',
        body: 'Los datos no serán cedidos a terceros, salvo obligación legal. Los proveedores tecnológicos (Supabase Inc., Vercel Inc.) actúan como encargados del tratamiento con las garantías adecuadas.',
      },
      {
        title: '7. Tus derechos',
        body: 'Puedes ejercer los derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición enviando un correo a info@reportia.es con el asunto "Derechos RGPD". También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
      },
      {
        title: '8. Seguridad',
        body: 'Se aplican medidas técnicas y organizativas para garantizar la confidencialidad, integridad y disponibilidad de los datos: cifrado, control de acceso, auditoría y copias de seguridad periódicas.',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdate: 'Last updated: May 2026',
    back: '← Back',
    sections: [
      {
        title: '1. Data controller',
        body: 'Reportia (info@reportia.es) is the data controller for personal data collected through this reporting channel, acting as a service provider to the contracting client organisation.',
      },
      {
        title: '2. Purpose and legal basis',
        body: 'Data is processed to manage communications received through the Ethics Channel, in compliance with Law 2/2023 of 20 February, regulating the protection of persons who report regulatory violations, and Directive (EU) 2019/1937. Legal basis: legal obligation (Art. 6.1.c GDPR) and legitimate interest (Art. 6.1.f GDPR).',
      },
      {
        title: '3. Data collected',
        items: [
          'If the report is anonymous: no identifying data is collected.',
          'If the report is identified: name, email address and phone number (all optional).',
          'In all cases: description of facts, category, department, date and attached files.',
        ],
      },
      {
        title: '4. Retention',
        body: 'Data will be retained for the time necessary for the investigation and, at most, 10 years from receipt, in accordance with Law 2/2023.',
      },
      {
        title: '5. Confidentiality and access',
        body: 'Only designated channel managers will have access, subject to professional secrecy obligations. The system implements encryption in transit (HTTPS) and at rest, and role-based access control.',
      },
      {
        title: '6. Third-party disclosure',
        body: 'Data will not be shared with third parties, except where required by law. Technology providers (Supabase Inc., Vercel Inc.) act as data processors with appropriate safeguards.',
      },
      {
        title: '7. Your rights',
        body: 'You may exercise your rights of access, rectification, erasure, restriction, portability and objection by emailing info@reportia.es with the subject "GDPR Rights". You may also lodge a complaint with the Spanish Data Protection Agency (aepd.es).',
      },
      {
        title: '8. Security',
        body: 'Technical and organisational measures are applied to ensure confidentiality, integrity and availability of data: encryption, access control, audit logging and regular backups.',
      },
    ],
  },
};

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lang = ['ca', 'es', 'en'].includes(searchParams.get('lang')) ? searchParams.get('lang') : 'ca';
  const c = CONTENT[lang];

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 720, padding: 0 }}>
        <div className="card-header">
          <span className="logo-wrap"><img src="/logo.png" alt="Reportia" /></span>
          <h1 style={{ fontSize: 16 }}>{c.title}</h1>
          <p className="subtitle">Reportia · Canal Ètic</p>
        </div>

        <div className="card-body" style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-muted)' }}>
          {c.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{s.title}</h3>
              {s.body && <p>{s.body}</p>}
              {s.items && (
                <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                  {s.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              )}
            </div>
          ))}

          <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>{c.lastUpdate}</p>

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <button className="btn-outline" onClick={() => navigate(-1)}>{c.back}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
