import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 720, padding: 0 }}>
        <div className="card-header">
          <span className="logo-wrap"><img src="/logo.png" alt="Reportia" /></span>
          <h1 style={{ fontSize: 16 }}>Política de Privacitat</h1>
          <p className="subtitle">Canal Ètic Corporatiu — Reportia</p>
        </div>

        <div className="card-body" style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-muted)' }}>

          <Section title="1. Responsable del tractament">
            <p>Reportia (info@reportia.es) és el responsable del tractament de les dades personals recollides a través d'aquest canal de denúncies, en qualitat de prestador de servei a l'organització client contractant.</p>
          </Section>

          <Section title="2. Finalitat i base legal">
            <p>Les dades es tracten per gestionar les comunicacions rebudes a través del Canal Ètic, en compliment de la <strong>Llei 2/2023, de 20 de febrer</strong>, reguladora de la protecció de les persones que informen sobre infraccions normatives, i la <strong>Directiva (UE) 2019/1937</strong>.</p>
            <p style={{ marginTop: 8 }}>Base legal: obligació legal (Art. 6.1.c RGPD) i interès legítim de l'organització en el compliment normatiu (Art. 6.1.f RGPD).</p>
          </Section>

          <Section title="3. Dades recollides">
            <ul style={{ paddingLeft: 20, marginTop: 4 }}>
              <li>Si la comunicació és <strong>anònima</strong>: no es recullen dades identificatives.</li>
              <li>Si la comunicació és <strong>identificada</strong>: nom, correu electrònic i telèfon (tots opcionals).</li>
              <li>En tots els casos: descripció dels fets, categoria, departament afectat, data i persones implicades (opcional), i arxius adjunts.</li>
            </ul>
          </Section>

          <Section title="4. Conservació">
            <p>Les dades es conservaran durant el temps necessari per a la investigació del cas i, com a màxim, <strong>10 anys</strong> des de la recepció, d'acord amb els terminis establerts per la Llei 2/2023. Transcorregut aquest termini, les dades seran eliminades de forma segura.</p>
          </Section>

          <Section title="5. Confidencialitat i accés">
            <p>Únicament tindran accés a les dades les persones designades com a gestores del canal, amb deure de secret professional. El sistema implementa xifrat en trànsit (HTTPS/TLS) i en repòs, i control d'accés basat en rols (RBAC).</p>
          </Section>

          <Section title="6. Comunicació a tercers">
            <p>Les dades no seran cedides a tercers, excepte obligació legal (autoritats competents, òrgans judicials). Els proveïdors tecnològics (Supabase Inc., Vercel Inc.) actuen com a encarregats del tractament amb les garanties adequades conforme al RGPD.</p>
          </Section>

          <Section title="7. Drets de les persones interessades">
            <p>Podeu exercir els drets d'<strong>accés, rectificació, supressió, limitació, portabilitat i oposició</strong> enviant un correu a <strong>info@reportia.es</strong> amb l'assumpte "Drets RGPD" i el vostre codi de seguiment (si disposeu de comunicació identificada).</p>
            <p style={{ marginTop: 8 }}>També teniu dret a presentar reclamació davant l'<strong>Agència Espanyola de Protecció de Dades</strong> (aepd.es).</p>
          </Section>

          <Section title="8. Seguretat">
            <p>S'apliquen mesures tècniques i organitzatives adequades per garantir la confidencialitat, integritat i disponibilitat de les dades, incloent xifrat, control d'accés, auditoria d'operacions i còpies de seguretat periòdiques.</p>
          </Section>

          <Section title="9. Actualitzacions">
            <p>Aquesta política pot ser actualitzada per adaptar-se a canvis normatius o funcionals. La versió vigent sempre estarà disponible a aquesta pàgina.</p>
            <p style={{ marginTop: 8, fontSize: 11 }}>Última actualització: maig 2026</p>
          </Section>

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <button className="btn-outline" onClick={() => navigate(-1)}>
              ← Tornar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}
