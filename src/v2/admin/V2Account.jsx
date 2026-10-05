import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BadgeCheck, Hourglass, CircleAlert, Mail, ArrowUpRight, Check } from 'lucide-react';
import { updateMyOrganization } from '../../lib/supabase.js';
import { ICON, AIPI_URL, fmt } from '../V2Layout.jsx';
import { PLANS, CONTACT_EMAIL, formatPrice } from '../site/plans.js';
import { EMAIL_RE } from '../site/fields.jsx';
import { useAdmin, L, planInfo, fLong } from './adminKit.jsx';

const FIELDS = ['name', 'responsible_name', 'responsible_role', 'billing_name', 'billing_tax_id', 'billing_email'];
const formOf = (org) => Object.fromEntries(FIELDS.map(k => [k, org?.[k] ?? '']));

/** Compte de l'organització: pla, dades de l'empresa, responsable del sistema i facturació */
export default function V2Account() {
  const { t, tr, lang, org, isSuperadmin, notify, refreshProfile } = useAdmin();
  const [form, setForm] = useState(() => formOf(org));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = `${t.aTitle} · ${t.panelName}`; }, [t]);
  useEffect(() => { setForm(formOf(org)); }, [org]);

  const saved = useMemo(() => formOf(org), [org]);
  const dirty = FIELDS.some(k => form[k].trim() !== saved[k].trim());
  const plan = planInfo(org);
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);
  const tp = tr.v2site.landing;

  // Sense la migració 009 (organització sense pla) no hi ha res a mostrar ni a desar
  if (!isSuperadmin || !org?.plan) return <Navigate to="/admin" replace />;

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(er => ({ ...er, [k]: undefined }));
  };

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const next = {};
    if (!form.name.trim()) next.name = t.aErrName;
    if (form.billing_email.trim() && !EMAIL_RE.test(form.billing_email.trim())) next.billing_email = t.aErrEmail;
    // NIF, NIE o CIF (o un identificador fiscal europeu): lletres i xifres, de 8 a 14
    const tax = form.billing_tax_id.replace(/[\s.-]/g, '').toUpperCase();
    if (tax && !/^[A-Z]{0,2}[A-Z0-9]{8,12}$/.test(tax)) next.billing_tax_id = t.aErrTax;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { document.getElementById(`v2-acc-${first}`)?.focus(); return; }
    setBusy(true);
    const { error } = await updateMyOrganization(org.id, form);
    setBusy(false);
    if (error) { notify(t.aSaveErr, 'err'); return; }
    await refreshProfile();
    notify(t.aSaved);
  }

  const url = `${window.location.origin}/canal/${org?.slug ?? ''}`;
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(fmt(t.aMailSubject, { org: org?.name ?? '' }))}&body=${encodeURIComponent(fmt(t.aMailBody, { org: org?.name ?? '', url }))}`;

  // Estat del pla en paraules: títol, frase i to (ok | warn | danger)
  // Sense pla calculable (prova sense data), el bloc del pla es mostra igualment amb els preus
  // x = textos del panell d'un idioma, T = tots els seus textos, l = l'idioma: es calcula per als
  // tres perquè el bloc reservi l'espai del més llarg i no es mogui en canviar d'idioma
  const stateOf = (x, T, l) => {
    if (!plan) return { tone: 'ok', icon: Hourglass, title: x.aTrial, text: '' };
    const date = plan.until ? fLong(plan.until, l) : '';
    const name = plan.plan !== 'trial' ? (T.v2site.landing.plans[plan.plan]?.name ?? plan.plan) : '';
    if (plan.state === 'trial') {
      return {
        tone: plan.days <= 7 ? 'warn' : 'ok', icon: Hourglass, title: x.aTrial,
        text: plan.days === 0 ? x.aTrialToday : fmt(plan.days === 1 ? x.aTrialLeftOne : x.aTrialLeft, { n: plan.days, date }),
      };
    }
    if (plan.state === 'trialEnded') return { tone: 'danger', icon: CircleAlert, title: x.aTrialEndedTitle, text: fmt(x.aTrialEnded, { date }) };
    if (plan.state === 'expired') return { tone: 'danger', icon: CircleAlert, title: fmt(x.aExpiredTitle, { plan: name }), text: fmt(x.aExpired, { date }) };
    return {
      tone: plan.renewSoon ? 'warn' : 'ok', icon: BadgeCheck, title: fmt(x.aActive, { plan: name }),
      text: !plan.until ? x.aActiveOpen
        : !plan.renewSoon ? fmt(x.aActiveUntil, { date })
        : plan.days === 0 ? x.aRenewToday
        : fmt(plan.days === 1 ? x.aRenewSoonOne : x.aRenewSoon, { n: plan.days, date }),
    };
  };
  const state = stateOf(t, tr, lang);
  const StateIcon = state?.icon;
  const paying = !!plan && plan.plan !== 'trial';

  return (
    <div className="v2-page v2-narrow">
      <header className="v2-ph">
        <div className="v2-ph-main">
          <L as="h1" className="v2-ph-title" k="aTitle" />
          <L as="p" className="v2-ph-lead" k="aLead" />
        </div>
      </header>

      {(
        <section className={`v2-sec v2-plan is-${state.tone}`} aria-labelledby="v2-plan-t">
          <div className="v2-mfa-state">
            <span className="v2-mfa-icon"><StateIcon {...ICON} /></span>
            <div>
              <L as="h2" className="v2-sec-h" id="v2-plan-t" pick={(x, T, l) => stateOf(x, T, l).title} />
              <L as="p" className="v2-sec-lead" pick={(x, T, l) => stateOf(x, T, l).text} />
            </div>
          </div>

          <table className="v2-plan-table" aria-label={t.aPlansLabel}>
            <tbody>
              {PLANS.map(p => {
                const current = plan?.plan === p.id;
                return (
                  <tr key={p.id} className={current ? 'is-current' : undefined}>
                    <th scope="row">
                      {tp.plans[p.id].name}
                      {current && <span className="v2-plan-tag"><Check {...ICON} /><L k="aCurrent" /></span>}
                    </th>
                    <td>{tp.plans[p.id].size}</td>
                    <td className="v2-num">
                      {p.price != null
                        ? <><b>{formatPrice(p.price, lang)}</b> {tp.perYear}, {tp.plusVat}</>
                        : <b>{tp.custom}</b>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="v2-plan-foot">
            <L as="p" k="aHow" />
            <a className="v2-btn v2-btn-primary v2-btn-sm icon-lead" href={mailto}>
              <Mail {...ICON} /><L k={paying ? 'aRenew' : 'aContract'} />
            </a>
          </div>
        </section>
      )}

      <form onSubmit={save} noValidate>
        <section className="v2-sec" aria-labelledby="v2-org-t">
          <L as="h2" className="v2-sec-h" id="v2-org-t" k="aOrgTitle" />
          <div className="v2-acc-fields">
            <div className="v2-field">
              <label htmlFor="v2-acc-name"><L k="aOrgName" /></label>
              <L as="p" className="v2-help" id="v2-acc-name-h" k="aOrgNameHelp" />
              <input
                id="v2-acc-name" className="v2-input v2-input-sm" value={form.name} onChange={set('name')}
                autoComplete="organization" maxLength={120} aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'v2-acc-name-e' : 'v2-acc-name-h'}
              />
              {errors.name && <p className="v2-err" id="v2-acc-name-e" role="alert"><CircleAlert {...ICON} />{errors.name}</p>}
            </div>
            <div className="v2-field">
              <L className="v2-label" k="aOrgAddress" />
              <L as="p" className="v2-help" k="aOrgAddressHelp" />
              <p className="v2-acc-static">{url.replace(/^https?:\/\//, '')}</p>
            </div>
          </div>
        </section>

        <section className="v2-sec" aria-labelledby="v2-resp-t">
          <L as="h2" className="v2-sec-h" id="v2-resp-t" k="aRespTitle" />
          <L as="p" className="v2-sec-lead" k="aRespLead" />
          <a className="v2-link v2-acc-ext" href={AIPI_URL} target="_blank" rel="noopener noreferrer">
            <L k="aRespLink" /><ArrowUpRight {...ICON} />
          </a>
          <div className="v2-acc-fields is-two">
            <div className="v2-field">
              <label htmlFor="v2-acc-responsible_name"><L k="aRespName" /></label>
              <input id="v2-acc-responsible_name" className="v2-input v2-input-sm" value={form.responsible_name} onChange={set('responsible_name')} autoComplete="off" maxLength={120} />
            </div>
            <div className="v2-field">
              <label htmlFor="v2-acc-responsible_role"><L k="aRespRole" /></label>
              <input id="v2-acc-responsible_role" className="v2-input v2-input-sm" value={form.responsible_role} onChange={set('responsible_role')} autoComplete="off" maxLength={120} />
            </div>
          </div>
        </section>

        <section className="v2-sec" aria-labelledby="v2-bill-t">
          <L as="h2" className="v2-sec-h" id="v2-bill-t" k="aBillTitle" />
          <L as="p" className="v2-sec-lead" k="aBillLead" />
          <div className="v2-acc-fields is-two">
            <div className="v2-field">
              <label htmlFor="v2-acc-billing_name"><L k="aBillName" /></label>
              <input id="v2-acc-billing_name" className="v2-input v2-input-sm" value={form.billing_name} onChange={set('billing_name')} autoComplete="organization" maxLength={160} />
            </div>
            <div className="v2-field">
              <label htmlFor="v2-acc-billing_tax_id"><L k="aBillTax" /></label>
              <input
                id="v2-acc-billing_tax_id" className="v2-input v2-input-sm" value={form.billing_tax_id} onChange={set('billing_tax_id')}
                autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20}
                aria-invalid={!!errors.billing_tax_id} aria-describedby={errors.billing_tax_id ? 'v2-acc-billing_tax_id-e' : undefined}
              />
              {errors.billing_tax_id && <p className="v2-err" id="v2-acc-billing_tax_id-e" role="alert"><CircleAlert {...ICON} />{errors.billing_tax_id}</p>}
            </div>
            <div className="v2-field is-wide">
              <label htmlFor="v2-acc-billing_email">{t.aBillEmail} <span className="tag">{t.aOptional}</span></label>
              <input
                id="v2-acc-billing_email" className="v2-input v2-input-sm" type="email" inputMode="email" value={form.billing_email} onChange={set('billing_email')}
                autoComplete="email" spellCheck={false} maxLength={160} aria-invalid={!!errors.billing_email}
                aria-describedby={errors.billing_email ? 'v2-acc-billing_email-e' : undefined}
              />
              {errors.billing_email && <p className="v2-err" id="v2-acc-billing_email-e" role="alert"><CircleAlert {...ICON} />{errors.billing_email}</p>}
            </div>
          </div>
        </section>

        <div className="v2-acc-save">
          <p aria-live="polite">{dirty ? t.unsaved : ''}</p>
          {dirty && <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={() => { setForm(saved); setErrors({}); }} disabled={busy}>{t.discard}</button>}
          <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" disabled={!dirty} aria-busy={busy}><L k={busy ? 'saving' : 'save'} /></button>
        </div>
      </form>
    </div>
  );
}
