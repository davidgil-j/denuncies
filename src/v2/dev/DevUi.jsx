import React, { useState } from 'react';
import { LayoutDashboard, BarChart3, Share2, SlidersHorizontal, ArrowRight, EyeOff, Clock, Shield, Search, Plus, Sparkles } from 'lucide-react';
import { translations } from '../../translations.js';
import { LANGS } from '../V2Layout.jsx';
import {
  SplitShell, SideTab, PillNav, Button, IconButton, Chip, Chips, Card, OrgMark, Avatar, Skeleton, Field, Segmented,
  StepBar, DeadlineChip, CaseCard, Kanban, ChatThread, ChatComposer,
} from '../ui/index.js';
import './dev.css';

// Página de trabajo, solo en desarrollo (/dev/ui): todas las piezas comunes en sus estados.
// Los textos de ejemplo van en castellano; los propios de cada pieza cambian con el idioma.

const TOKENS = [
  ['--bg', '#F2F4F8'], ['--surface', '#FFFFFF'], ['--ink', '#0D1530'], ['--muted', '#4D5672'], ['--line', '#D7DEEF'], ['--soft', '#EEF1F7'],
  ['--report', '#2F54EB'], ['--report-soft', '#E8EDFF'], ['--report-soft-ink', '#1F3FC4'], ['--on-report-muted', '#E3E9FF'],
  ['--warn-bg', '#FFF0D6'], ['--warn-ink', '#7A4100'], ['--danger-bg', '#FCE5E2'], ['--danger-ink', '#9C1C12'], ['--danger-line', '#F3B5AE'],
  ['--ok-bg', '#E1F5EC'], ['--ok-ink', '#0E5C41'], ['--on-ink-muted', '#C9D3F5'], ['--on-ink-accent', '#7EA0FF'], ['--on-ink-warn', '#FFC46B'], ['--chart-soft', '#A9BCFA'],
];

const CASES = {
  new: [
    { id: 'a', title: 'Comentarios sexuales a compañeras en el turno de noche', meta: 'Acoso laboral · Anónima · ayer', today: true, deadline: { kind: 'ack', days: 6 }, meeting: true, selected: true },
    { id: 'b', title: 'Vertidos del taller de mantenimiento al desagüe', meta: 'Medio ambiente · Anónima · hoy', deadline: { kind: 'ack', days: 7 } },
  ],
  open: [
    { id: 'c', title: 'Contrataciones de Compras a la empresa de un familiar', meta: 'Conflicto de intereses · Anónima', today: true, deadline: { kind: 'resp', days: -9 }, overdue: true },
    { id: 'd', title: 'Trato desigual en el reparto de turnos', meta: 'Discriminación · Con datos', today: true, wrote: true, deadline: { kind: 'resp', days: 79 } },
    { id: 'e', title: 'Facturas infladas de un proveedor en Ventas', meta: 'Fraude o corrupción · Anónima', deadline: { kind: 'resp', days: 12 }, priority: 'high' },
  ],
  closed: [
    { id: 'f', title: 'Gastos personales pasados como dietas', done: 'onTime' },
    { id: 'g', title: 'Falta de equipos de protección en el muelle de carga', done: 'onTime' },
  ],
};
const COLS = [['new', 'Nuevas'], ['open', 'En curso'], ['closed', 'Cerradas']];

function Block({ title, note, children }) {
  return (
    <section className="dev-block">
      <h2 className="dev-h2">{title}</h2>
      {note && <p className="dev-note">{note}</p>}
      {children}
    </section>
  );
}

export default function DevUi() {
  const [lang, setLang] = useState('es');
  const [side, setSide] = useState(null);
  const [cases, setCases] = useState(CASES);
  const [radio, setRadio] = useState('phone');
  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState([
    { id: 1, author: 'Empresa Demo', when: '7 oct', text: 'Hola. Hemos recibido tu denuncia y ya la estamos revisando. Gracias por contarlo.' },
    { id: 2, author: 'Empresa Demo', when: 'ayer', text: '¿Podrías decirnos más o menos desde qué mes ocurre? Nos ayuda a ordenar la investigación.' },
    { id: 3, mine: true, when: 'hoy', text: 'Desde principios de septiembre, más o menos.' },
  ]);
  const langPills = (tone) => (
    <Segmented
      tone={tone} label="Idioma" value={lang} onChange={setLang}
      options={LANGS.map(l => ({ value: l, label: l.toUpperCase(), ariaLabel: translations[l].langName, lang: l }))}
    />
  );
  const nav = [
    { to: '/dev/ui', label: 'Tablero', icon: LayoutDashboard, active: true },
    { to: '/dev/ui?informe', label: 'Informe', icon: BarChart3 },
    { to: '/dev/ui?compartir', label: 'Compartir el canal', short: 'Compartir', icon: Share2 },
    { to: '/dev/ui?ajustes', label: 'Equipo y ajustes', short: 'Ajustes', icon: SlidersHorizontal },
  ];
  const move = (item, from, to) => setCases(c => ({ ...c, [from]: c[from].filter(i => i.id !== item.id), [to]: [{ ...item, selected: false }, ...c[to]] }));
  const arrow = <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />;

  return (
    <div className="ds ds-page dev">
      <header className="dev-head">
        <div>
          <h1 className="ds-h1 is-sm">Piezas del diseño</h1>
          <p className="ds-lead">Fase 1 · sistema visual «dos mitades». Solo se ve en desarrollo.</p>
        </div>
        {langPills('white')}
      </header>

      <Block title="Colores" note="Las variables de src/v2/ds.css.">
        <div className="dev-swatches">
          {TOKENS.map(([name, hex]) => (
            <div key={name} className="dev-swatch"><span style={{ background: hex }} /><b>{name}</b><small>{hex}</small></div>
          ))}
        </div>
      </Block>

      <Block title="Títulos y texto">
        <Card>
          <span className="ds-hero">Denunciar</span>
          <h3 className="ds-h1">¿Qué ha pasado?</h3>
          <h3 className="ds-h1 is-sm">3 casos te necesitan hoy</h3>
          <p className="ds-lead">Elige lo que más se parezca. Si no lo tienes claro, elige la última.</p>
          <p>Texto normal de 16 px en Manrope. <a href="#enlace">Un enlace dentro del texto</a>.</p>
        </Card>
      </Block>

      <Block title="Botones" note="En píldora, letra 800 y sin bordes. Alturas: 64, 58, 48, 44 y 40 px.">
        <div className="dev-row3">
          <Card>
            <span className="ds-card-title">Sobre blanco</span>
            <div className="dev-wrap">
              <Button variant="ink" size="lg" iconEnd={arrow}>Entrar</Button>
              <Button variant="report" size="md">Registrar y obtener el código</Button>
              <Button variant="soft" size="md">Descargar justificante</Button>
              <Button variant="bg" size="sm">Exportar PDF</Button>
              <Button variant="tint" size="sm" icon={<Sparkles size={15} aria-hidden="true" />}>Redactar con IA</Button>
              <Button variant="danger" size="sm">Suprimir datos</Button>
              <Button variant="report" size="xs">+ Invitar</Button>
              <Button variant="ink" size="md" disabled>Desactivado</Button>
              <IconButton variant="bg" label="Buscar"><Search size={18} aria-hidden="true" /></IconButton>
              <IconButton variant="report" label="Registrar caso"><Plus size={20} aria-hidden="true" /></IconButton>
            </div>
          </Card>
          <Card tone="report">
            <span className="ds-card-title">Sobre azul</span>
            <div className="dev-wrap">
              <Button variant="white" size="xl" iconEnd={arrow}>Empezar</Button>
              <Button variant="white" size="lg" iconEnd={arrow}>Continuar</Button>
              <Button variant="shade" size="lg">Volver</Button>
              <Button variant="ink" size="sm">Salir rápido</Button>
              <Button variant="white" size="lg" disabled>Continuar</Button>
            </div>
          </Card>
          <Card tone="ink">
            <span className="ds-card-title">Sobre oscuro</span>
            <div className="dev-wrap">
              <Button variant="white" size="md">Enviar el acuse de recibo</Button>
              <Button variant="white" size="sm">Descargar el cartel</Button>
              <Button variant="glass" size="sm">Ya está hecho</Button>
            </div>
          </Card>
        </div>
      </Block>

      <Block title="Chips">
        <div className="dev-row3">
          <Card>
            <Chips>
              <Chip>Acoso laboral o sexual</Chip><Chip tone="report">Pide reunión</Chip><Chip tone="warn">Prioridad alta</Chip>
              <Chip tone="danger">Vencido</Chip><Chip tone="ok">A tiempo</Chip><Chip tone="ink">Hoy</Chip>
            </Chips>
            <Chips><Chip size="md">Anónima</Chip><Chip size="md" tone="report">Pide reunión presencial</Chip><Chip size="md" tone="warn">Quedan 21 días de prueba</Chip><Chip size="md">Datos de demostración</Chip></Chips>
            <Chips size="lg"><Chip size="lg" icon={<Clock size={16} aria-hidden="true" />}>Plazos legales automáticos</Chip></Chips>
          </Card>
          <Card tone="report">
            <Chips><Chip tone="shade" size="md" icon={<EyeOff size={14} aria-hidden="true" />}>Modo anónimo</Chip><Chip tone="shade" size="md">Acoso laboral o sexual</Chip></Chips>
            <Chips size="lg">
              <Chip tone="shade" size="lg" icon={<EyeOff size={16} aria-hidden="true" />}>Puedes ser anónimo</Chip>
              <Chip tone="shade" size="lg" icon={<Clock size={16} aria-hidden="true" />}>Respuesta en 3 meses máximo</Chip>
              <Chip tone="shade" size="lg" icon={<Shield size={16} aria-hidden="true" />}>Sin represalias, por ley</Chip>
            </Chips>
          </Card>
          <Card tone="bg">
            <span className="ds-card-title">Plazos (DeadlineChip)</span>
            <Chips>
              <DeadlineChip lang={lang} kind="ack" days={7} /><DeadlineChip lang={lang} kind="ack" days={6} /><DeadlineChip lang={lang} kind="ack" days={1} />
              <DeadlineChip lang={lang} kind="ack" days={0} /><DeadlineChip lang={lang} kind="ack" days={-2} />
            </Chips>
            <Chips>
              <DeadlineChip lang={lang} kind="meeting" days={6} /><DeadlineChip lang={lang} kind="meeting" days={-1} />
            </Chips>
            <Chips>
              <DeadlineChip lang={lang} kind="resp" days={79} onBg /><DeadlineChip lang={lang} kind="resp" days={12} /><DeadlineChip lang={lang} kind="resp" days={0} />
              <DeadlineChip lang={lang} kind="resp" days={-9} />
            </Chips>
          </Card>
        </div>
      </Block>

      <Block title="Tarjetas" note="Radios de 32, 24 y 20 px. Una sola sombra: la de la tarjeta elegida.">
        <div className="dev-row4">
          <Card><span className="ds-card-title">Blanca</span><p>Tarjeta principal.</p></Card>
          <Card tone="outline"><span className="ds-card-title">Con contorno</span><p>Bloques de la ficha.</p></Card>
          <Card tone="ink"><span className="ds-card-title">Oscura</span><p style={{ color: 'var(--on-ink-muted)' }}>Siguiente paso, primeros pasos.</p></Card>
          <Card picked radius="md"><span className="ds-card-title">Elegida</span><p>Con la sombra permitida.</p></Card>
        </div>
        <Card tone="report" radius="xl">
          <div className="dev-row3">
            <Card tone="shade"><span className="ds-card-title">Oscurecida</span><p style={{ color: 'var(--on-report-muted)' }}>Sobre azul siempre se oscurece.</p></Card>
            <Card tone="dashed"><span className="ds-card-title">Discontinua</span><p style={{ color: 'var(--on-report-muted)' }}>Zona de pruebas, «Otra cosa».</p></Card>
            <Card picked><span className="ds-card-title">Elegida sobre azul</span><p>Blanca, con sombra.</p></Card>
          </div>
        </Card>
        <div className="dev-wrap">
          <OrgMark name="Empresa Demo" /><Avatar name="Laura Puig" /><Avatar name="Daniel Ortega" tint={1} size="sm" /><Avatar name="Núria Soler" tint={2} size="sm" />
          <span style={{ flex: '1 1 200px', display: 'grid', gap: 8 }}><Skeleton width="70%" height={18} /><Skeleton /><Skeleton width="40%" /></span>
        </div>
      </Block>

      <Block title="Campos">
        <div className="dev-row3">
          <Card>
            <Field label="Correo" type="email" defaultValue="laura.puig@empresa-demo.es" />
            <Field label="Contraseña" type="password" error="Escribe tu contraseña." />
            <Field as="textarea" rows={3} label="¿Qué ha pasado?" help="Mínimo 20 caracteres." placeholder="Cuéntalo con tus palabras" />
          </Card>
          <Card tone="bg">
            <Field size="sm" plain label="Nombre" defaultValue="Laura Puig Ferrer" />
            <Field size="sm" plain warn label="Comunicado a la AIPI" placeholder="Pendiente" help="Quedan 6 días hábiles" />
            <Field as="select" size="sm" plain label="Prioridad" defaultValue="high"><option value="normal">Normal</option><option value="high">Alta</option></Field>
            <Field size="sm" label="Cuándo" tag="opcional" placeholder="Por ejemplo, desde septiembre" />
          </Card>
          <Card tone="report">
            <Field code onReport label="Tu código" placeholder="XXXX-XXXX" defaultValue="5P7Y-983" autoComplete="off" />
            <Field code onReport label="Con error" defaultValue="AAAA-0000" error="No hemos podido abrir ningún caso con ese código. Revísalo." />
          </Card>
        </div>
      </Block>

      <Block title="Selector en píldora" note="Idioma, opciones de radio (con las flechas del teclado) y pestañas.">
        <div className="dev-wrap">
          {langPills('white')}
          <Card tone="bg" style={{ flex: '1 1 420px' }}>
            <Segmented
              mode="radio" loose label="¿Cómo ha llegado?" value={radio} onChange={setRadio}
              options={[['phone', 'Teléfono'], ['in_person', 'En persona'], ['mail', 'Correo postal'], ['email', 'Email'], ['other', 'Otra']].map(([value, label]) => ({ value, label }))}
            />
          </Card>
        </div>
      </Block>

      <Block title="Progreso (StepBar)">
        <div className="dev-row3">
          <Card tone="report"><StepBar lang={lang} total={3} current={1} /><StepBar lang={lang} total={3} current={2} /><StepBar lang={lang} total={3} current={3} /></Card>
          <Card tone="ink" style={{ gridColumn: 'span 2' }}>
            <StepBar tone="ink" current={1} names={['Recibida', 'Acuse enviado', 'Investigando', 'Respondida']} label="Estado del caso" />
            <StepBar tone="ink" current={3} names={['Recibida', 'Acuse enviado', 'Investigando', 'Respondida']} label="Estado del caso" />
          </Card>
        </div>
      </Block>

      <Block title="Menú del panel (PillNav)" note="En el móvil pasa a ser la barra fija de abajo.">
        <Card>
          <div className="dev-wrap">
            <span className="dev-brand"><OrgMark name="Empresa Demo" /><b>Empresa Demo</b></span>
            <PillNav items={nav} label={translations[lang].ds.navLabel} />
          </div>
        </Card>
      </Block>

      <Block title="Tablero (Kanban y CaseCard)" note="Arrastra una tarjeta a otra columna o usa su botón «Mover a…», que funciona con el teclado. En el móvil, las columnas son pestañas.">
        <Card>
          <Kanban
            lang={lang}
            columns={COLS.map(([id, name]) => ({ id, name, items: cases[id], ...(id === 'closed' ? { total: cases.closed.length + 4, footer: <a href="#cerradas">Ver las {cases.closed.length + 4}</a> } : {}) }))}
            onMove={move}
            renderCard={(c, { move: mv, dragging }) => <CaseCard lang={lang} {...c} to="/dev/ui" move={mv} dragging={dragging} />}
          />
        </Card>
        <div className="dev-row3">
          <Card tone="bg"><Kanban lang={lang} columns={[{ id: 'x', name: 'Columna vacía', items: [] }]} renderCard={() => null} /></Card>
          <Card tone="bg"><span className="ds-card-title">Cargando</span><Card radius="md"><Skeleton width="80%" height={18} /><Skeleton width="55%" /><Skeleton width="35%" height={24} /></Card></Card>
          <Card tone="bg"><span className="ds-card-title">Crítica y cerrada tarde</span>
            <CaseCard lang={lang} title="Acceso a nóminas de toda la plantilla" meta="Datos personales · Con datos" priority="critical" deadline={{ kind: 'resp', days: 40 }} to="/dev/ui" />
            <CaseCard lang={lang} title="Horas extra sin registrar en almacén" done="late" />
          </Card>
        </div>
      </Block>

      <Block title="Conversación (ChatThread)">
        <div className="dev-row2">
          <Card>
            <span className="ds-card-title">Mi caso</span>
            <ChatThread lang={lang} messages={msgs} />
            <ChatComposer lang={lang} value={draft} onChange={setDraft} onSend={text => { setMsgs(m => [...m, { id: Date.now(), mine: true, when: 'ahora', text }]); setDraft(''); }} />
          </Card>
          <Card tone="outline">
            <span className="ds-card-title">Conversación con quien informa</span>
            <ChatThread lang={lang} messages={[]} empty="Todavía no hay mensajes. El acuse de recibo será el primero." />
            <ChatComposer
              lang={lang} id="dev-compose-2" stacked value="" onChange={() => {}} onSend={() => {}} placeholder="Escribe a quien informa. No pidas datos que le identifiquen."
              sendLabel="Enviar" actions={<Button variant="tint" size="sm" icon={<Sparkles size={15} aria-hidden="true" />}>Redactar con IA</Button>}
            />
          </Card>
        </div>
      </Block>

      <Block title="Las dos mitades (SplitShell y SideTab)" note="Pulsa un lado: la tarjeta crece y la otra queda en una franja de 76 px (250 ms; sin animación si el sistema lo pide).">
        <div className="dev-wrap">
          <Segmented mode="radio" label="Lado elegido" value={side ?? 'entry'} onChange={v => setSide(v === 'entry' ? null : v)}
            options={[{ value: 'entry', label: 'Entrada' }, { value: 'report', label: 'Denunciar' }, { value: 'manage', label: 'Gestionar' }]} />
        </div>
        <SplitShell
          className="dev-split" active={side} reportLabel="Denunciar" manageLabel="Gestionar"
          top={!side && <><span className="dev-brand"><OrgMark name="Empresa Demo" /><b>Empresa Demo</b><span style={{ color: 'var(--muted)', fontSize: 14 }}>Canal ético</span></span><span className="dev-wrap">{langPills('white')}<Button variant="ink" size="sm">Salir rápido</Button></span></>}
          bottom={!side && <><span>Sistema interno de información de Empresa Demo · Ley 2/2023</span><span className="dev-wrap"><a href="#p">Privacidad</a><a href="#c">Canales externos (AIPI, Antifrau)</a><a href="#r">Con Reportia</a></span></>}
          report={side ? (
            <>
              <div className="dev-between"><span className="dev-brand"><OrgMark name="Empresa Demo" /><b>Empresa Demo</b><Chip tone="shade" size="md">Modo anónimo</Chip></span><Button variant="ink" size="sm">Salir rápido</Button></div>
              <StepBar lang={lang} total={3} current={1} />
              <h3 className="ds-h1">¿Qué ha pasado?</h3>
              <div className="dev-between" style={{ marginTop: 'auto' }}><Button variant="shade" size="lg" onClick={() => setSide(null)}>Volver</Button><Button variant="white" size="lg" iconEnd={arrow}>Continuar</Button></div>
            </>
          ) : (
            <>
              <span className="ds-hero">Denunciar</span>
              <p className="ds-lead">Cuenta lo que has visto. Sin nombre, sin crear cuenta y en tres minutos.</p>
              <div className="dev-between"><a href="#caso" style={{ fontWeight: 700 }}>¿Ya lo contaste? Mira tu caso</a><Button variant="white" size="xl" iconEnd={arrow} onClick={() => setSide('report')}>Empezar</Button></div>
            </>
          )}
          manage={side ? (
            <>
              <div className="dev-between"><span className="dev-brand"><OrgMark name="Empresa Demo" /><b>Empresa Demo</b></span><PillNav items={nav} label="Panel" /><Avatar name="Laura Puig" /></div>
              <h3 className="ds-h1 is-sm">3 casos te necesitan hoy</h3>
              <Button variant="bg" size="sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSide(null)}>Volver a la entrada</Button>
            </>
          ) : (
            <>
              <span className="ds-hero">Gestionar</span>
              <p className="ds-lead">Para el equipo de Empresa Demo que recibe, investiga y responde.</p>
              <div className="dev-between"><span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 15 }}>Acceso con verificación en dos pasos</span><Button variant="ink" size="xl" iconEnd={arrow} onClick={() => setSide('manage')}>Acceder</Button></div>
            </>
          )}
          reportTab={<SideTab side="report" label="Ver el canal" icon="external" ariaLabel="Ver el canal público" onClick={() => setSide('report')} />}
          manageTab={<SideTab side="manage" label="Gestionar" icon="forward" onClick={() => setSide('manage')} />}
        />
      </Block>
    </div>
  );
}
