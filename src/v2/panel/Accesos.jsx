import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePanel } from './kit.jsx';
import { listAccessLog } from '../../lib/supabase.js';
import { fDateTime } from '../admin/adminKit.jsx';
import { Card } from '../ui/index.js';

// A6 · Pantalla «Accesos»: quién abre, exporta, descarga, ve la identidad o suprime. Solo administradores.
// Respeta la exclusión por caso (C1): la función list_access_log no devuelve los accesos de un caso del
// que el administrador está apartado. Las acciones son del equipo, así que llevan la hora (no se ocultan).
export default function Accesos() {
  const { lang, p, org, isSuperadmin } = usePanel();
  const a = p.access;
  const [rows, setRows] = useState(null); // null = cargando
  const [failed, setFailed] = useState(false);

  useEffect(() => { document.title = `${a.title} · ${org?.name ?? ''}`; }, [a, org]);
  useEffect(() => {
    if (!isSuperadmin) return undefined;
    let alive = true;
    listAccessLog({ limit: 300 }).then(({ rows: r, error }) => {
      if (!alive) return;
      if (error) { setFailed(true); setRows([]); } else setRows(r ?? []);
    });
    return () => { alive = false; };
  }, [isSuperadmin]);

  if (!isSuperadmin) {
    return (
      <div className="pn-page">
        <Card className="pn-empty"><h1 className="pn-empty-t">{a.noAccessTitle}</h1><p>{a.noAccessText}</p></Card>
      </div>
    );
  }

  const loading = rows === null;
  return (
    <div className="pn-page">
      <div className="pn-top"><h1 className="ds-h1">{a.title}</h1></div>
      <p className="pn-lead">{a.lead}</p>
      {loading ? (
        <p className="ds-vh" role="status">{a.title}…</p>
      ) : failed ? (
        <Card className="pn-empty"><p>{a.notAvail}</p></Card>
      ) : rows.length === 0 ? (
        <Card className="pn-empty"><p>{a.empty}</p></Card>
      ) : (
        <ol className="pn-access">
          {rows.map(r => (
            <li key={r.id} className="pn-access-row">
              <time className="pn-access-when" dateTime={r.created_at}>{fDateTime(r.created_at, lang)}</time>
              <span className="pn-access-who">{r.actor_name ?? '—'}</span>
              <span className="pn-access-what"><b>{a.actions[r.action] ?? r.action}</b>{r.detail ? <q>{r.detail}</q> : null}</span>
              <span className="pn-access-case">
                {r.complaint_id ? <Link to={`/admin/complaints/${r.complaint_id}`}>{r.reference ?? '—'}</Link> : (r.reference ?? '')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
