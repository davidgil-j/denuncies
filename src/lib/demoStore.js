// Dades de demostració del panell de gestió.
// Només es carrega en mode demo (sense credencials de Supabase), amb import() dinàmic des de
// supabase.js: en producció aquest fitxer no es descarrega mai.
// Les dates són relatives al moment de la primera càrrega perquè els plaços legals sempre
// tinguin sentit. L'estat es guarda a sessionStorage perquè els canvis de la demo sobrevisquin
// a una recàrrega dins la mateixa pestanya.

const KEY = 'reportia-demo-store-v1';
const DAY = 86400000;
const OPEN = ['received', 'reviewing', 'investigating', 'waiting'];
const DONE = ['resolved', 'closed'];

// QR d'exemple (otpauth de demostració). Escanejar-lo no dona accés a res.
const DEMO_QR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41 41" shape-rendering="crispEdges"><path fill="#FFFFFF" d="M0 0h41v41H0z"/><path stroke="#0F2242" d="M0 0.5h7m2 0h1m3 0h1m1 0h1m3 0h1m1 0h1m1 0h4m1 0h4m2 0h7M0 1.5h1m5 0h1m2 0h5m2 0h1m1 0h1m1 0h1m1 0h1m1 0h1m3 0h1m1 0h1m1 0h1m1 0h1m5 0h1M0 2.5h1m1 0h3m1 0h1m1 0h3m4 0h2m2 0h1m2 0h3m1 0h1m1 0h1m3 0h1m1 0h1m1 0h3m1 0h1M0 3.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h3m3 0h1m2 0h1m2 0h1m2 0h1m1 0h3m2 0h1m1 0h3m1 0h1M0 4.5h1m1 0h3m1 0h1m1 0h6m1 0h2m2 0h2m2 0h1m2 0h1m1 0h2m1 0h2m1 0h1m1 0h3m1 0h1M0 5.5h1m5 0h1m1 0h1m1 0h3m1 0h3m3 0h1m1 0h1m4 0h3m2 0h1m1 0h1m5 0h1M0 6.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M8 7.5h1m3 0h1m2 0h2m3 0h5m2 0h2M0 8.5h1m1 0h5m2 0h1m5 0h5m2 0h1m1 0h2m1 0h5m2 0h5M0 9.5h3m2 0h1m1 0h2m2 0h1m2 0h1m1 0h2m1 0h1m1 0h3m1 0h1m2 0h4m2 0h5m1 0h1M0 10.5h2m1 0h1m1 0h5m3 0h5m2 0h2m2 0h1m1 0h2m1 0h1m3 0h3m1 0h4M2 11.5h1m2 0h1m3 0h1m3 0h2m6 0h2m1 0h1m1 0h3m1 0h2m4 0h2m1 0h2M0 12.5h1m4 0h3m3 0h1m1 0h1m1 0h4m6 0h9m3 0h4M0 13.5h1m1 0h2m1 0h1m2 0h2m1 0h1m1 0h2m1 0h1m1 0h1m1 0h1m2 0h2m1 0h2m2 0h2m2 0h4m2 0h1M0 14.5h4m1 0h4m1 0h3m1 0h3m2 0h1m1 0h1m1 0h2m1 0h1m3 0h3m4 0h1m1 0h1M1 15.5h2m4 0h2m1 0h2m2 0h1m1 0h6m1 0h1m2 0h1m2 0h4m4 0h1m2 0h1M0 16.5h1m1 0h1m1 0h3m2 0h3m2 0h2m1 0h4m4 0h1m1 0h2m1 0h1m1 0h1m2 0h1m2 0h2M5 17.5h1m3 0h2m1 0h3m1 0h2m3 0h1m1 0h1m1 0h3m1 0h3m2 0h7M0 18.5h1m1 0h1m1 0h1m1 0h3m2 0h1m1 0h1m2 0h2m1 0h3m1 0h2m3 0h3m2 0h1m1 0h4M0 19.5h1m1 0h1m4 0h1m4 0h1m1 0h6m1 0h1m2 0h1m2 0h1m2 0h1m1 0h1m3 0h2m1 0h1M1 20.5h9m1 0h1m1 0h1m2 0h1m2 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h2m6 0h2M0 21.5h1m1 0h1m1 0h2m2 0h2m1 0h1m6 0h4m1 0h1m1 0h2m1 0h2m1 0h4m4 0h2M4 22.5h3m2 0h1m3 0h2m1 0h3m1 0h1m4 0h3m1 0h1m2 0h2m4 0h1M2 23.5h3m2 0h8m3 0h1m1 0h2m4 0h2m4 0h4m2 0h3M0 24.5h1m1 0h2m2 0h1m1 0h1m2 0h1m1 0h1m1 0h4m3 0h1m3 0h4m1 0h2m4 0h2m1 0h1M2 25.5h1m1 0h2m5 0h3m3 0h1m1 0h2m1 0h2m2 0h1m1 0h1m2 0h1m1 0h5m2 0h1M1 26.5h3m2 0h1m5 0h3m1 0h2m2 0h3m4 0h2m4 0h1m1 0h2m2 0h2M0 27.5h1m1 0h4m2 0h1m3 0h1m1 0h1m1 0h1m1 0h1m2 0h2m5 0h1m4 0h5M4 28.5h1m1 0h1m1 0h1m3 0h6m1 0h2m1 0h1m2 0h2m1 0h8m1 0h4M0 29.5h2m1 0h1m1 0h1m2 0h1m2 0h1m1 0h1m3 0h2m4 0h2m1 0h2m3 0h1m2 0h1m1 0h3m1 0h1M0 30.5h1m2 0h1m1 0h5m2 0h1m2 0h1m2 0h1m1 0h1m1 0h3m4 0h2m4 0h1m1 0h1M0 31.5h1m1 0h2m1 0h1m2 0h2m1 0h2m2 0h1m1 0h1m3 0h4m1 0h2m5 0h1m1 0h1m1 0h1M0 32.5h1m1 0h1m3 0h2m1 0h2m6 0h2m6 0h1m1 0h1m1 0h1m1 0h6m1 0h1M8 33.5h1m1 0h7m5 0h2m6 0h3m3 0h1m2 0h2M0 34.5h7m3 0h1m1 0h1m3 0h1m1 0h1m3 0h1m1 0h2m5 0h2m1 0h1m1 0h3M0 35.5h1m5 0h1m1 0h1m1 0h2m2 0h1m1 0h1m2 0h1m4 0h1m4 0h4m3 0h2m1 0h1M0 36.5h1m1 0h3m1 0h1m1 0h2m1 0h1m1 0h2m3 0h1m2 0h5m1 0h4m1 0h5m1 0h2M0 37.5h1m1 0h3m1 0h1m1 0h1m1 0h4m1 0h1m3 0h3m1 0h1m2 0h1m4 0h1m6 0h1m1 0h1M0 38.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h3m1 0h2m3 0h2m1 0h2m1 0h1m3 0h1m1 0h5m1 0h1M0 39.5h1m5 0h1m3 0h1m1 0h1m2 0h1m1 0h2m1 0h2m1 0h2m2 0h2m1 0h1m1 0h1m3 0h1m2 0h1M0 40.5h7m1 0h2m2 0h1m1 0h1m1 0h3m3 0h1m1 0h4m1 0h1m1 0h1m1 0h1m2 0h2"/></svg>`);
const DEMO_SECRET = 'JBSW Y3DP EHPK 3PXP';

const PEOPLE = {
  admin:  { id: 'demo-user', full_name: 'Administrador Demo', email: 'admin@empresa-demo.es' },
  laura:  { id: 'mgr-laura', full_name: 'Laura Puig Ferrer', email: 'l.puig@empresa-demo.es' },
  daniel: { id: 'mgr-daniel', full_name: 'Daniel Ortega Ruiz', email: 'd.ortega@empresa-demo.es' },
  nuria:  { id: 'mgr-nuria', full_name: 'Núria Soler Vidal', email: 'n.soler@empresa-demo.es' },
};

function seed() {
  const now = Date.now();
  // Data relativa: fa `days` dies a les hh:mm (o fa uns minuts si cau al futur)
  const at = (days, h = 10, m = 0) => {
    const d = new Date(now - days * DAY);
    d.setHours(h, m, 0, 0);
    if (d.getTime() > now) return new Date(now - (90 + days * 7) * 60000).toISOString();
    return d.toISOString();
  };
  const day = (days) => at(days).slice(0, 10);

  const complaints = [];
  const messages = {};
  const audit = [];
  let n = 0;
  const log = (complaint_id, created_at, action, details = {}) =>
    audit.push({ id: `a${++n}`, complaint_id, action, details, created_at });

  // c: dades de la denúncia · thread: missatges · events: registre d'activitat
  function add(c, thread = [], events = []) {
    const created = c.created_at;
    complaints.push({
      reporter_name: null, reporter_email: null, reporter_phone: null,
      department: null, incident_date: null, involved_people: null,
      language: 'es', organization_id: 'demo-org', attachments: [],
      ...c,
      updated_at: c.updated_at ?? created,
    });
    messages[c.id] = thread.map((m, i) => ({ id: `${c.id}-m${i}`, is_read: true, ...m }));
    log(c.id, created, 'created', { channel: 'web', language: c.language ?? 'es' });
    events.forEach(e => log(c.id, e.at, e.action, e.details));
  }
  const st = (at_, from, to, who, note) => ({ at: at_, action: 'status_changed', details: { from, to, actor_name: who.full_name, ...(note ? { note } : {}) } });
  const pr = (at_, from, to, who) => ({ at: at_, action: 'priority_changed', details: { from, to, actor_name: who.full_name } });
  const ms = (at_, who) => ({ at: at_, action: 'message_sent', details: { actor_name: who.full_name } });
  const { laura, daniel, nuria, admin } = PEOPLE;

  add({
    id: 'c-r7kd4wpn', tracking_code: 'R7KD-4WPN', category: 'environmental', status: 'received', priority: 'normal',
    is_anonymous: true, created_at: at(0, 8, 41), department: 'Taller de mantenimiento', incident_date: day(5),
    description: 'En el taller de mantenimiento se vacían los bidones de aceite usado de las carretillas en el desagüe del patio trasero, en lugar de llevarlos al contenedor de residuos peligrosos. Lo he visto al menos tres veces en las últimas dos semanas, siempre al final del turno de tarde.',
    attachments: [{ id: 'f1', filename: 'foto-desague-patio.jpg', file_size: 2412000, mime_type: 'image/jpeg', storage_path: 'demo/foto-desague-patio.jpg' }],
  });

  add({
    id: 'c-vk7p2mqa', tracking_code: 'VK7P-2MQA', category: 'harassment', status: 'received', priority: 'high',
    is_anonymous: true, created_at: at(1, 23, 12), department: 'Almacén central, turno de noche',
    involved_people: 'Uno de los responsables del turno de noche',
    description: 'Desde hace varias semanas, uno de los responsables del turno de noche hace comentarios de carácter sexual a varias compañeras y se acerca a ellas más de lo necesario cuando están solas en los pasillos de preparación de pedidos. Algunas compañeras han pedido cambiar de turno para no coincidir con él. Tengo capturas de los mensajes que envió al grupo de mensajería del turno.',
    attachments: [{ id: 'f2', filename: 'capturas-grupo-turno.pdf', file_size: 845000, mime_type: 'application/pdf', storage_path: 'demo/capturas-grupo-turno.pdf' }],
  });

  add({
    id: 'c-3hxd8rne', tracking_code: '3HXD-8RNE', category: 'data', status: 'received', priority: 'normal',
    is_anonymous: true, created_at: at(5, 11, 5), department: 'Atención al cliente',
    description: 'Algunas personas del equipo de atención al cliente exportan listados con nombre, DNI y dirección de clientes a hojas de cálculo y se los envían a su correo personal para trabajar desde casa. Los archivos no tienen contraseña. Lo he visto en la bandeja compartida del departamento.',
  });

  add({
    id: 'c-m9tf6bzq', tracking_code: 'M9TF-6BZQ', category: 'fraud', status: 'received', priority: 'high',
    is_anonymous: true, created_at: at(9, 17, 48), department: 'Compras',
    involved_people: 'Persona que aprueba las facturas de transporte',
    description: 'Una empresa de transporte factura cada mes rutas de reparto que no aparecen en el registro de salidas del almacén. He comparado las facturas de julio y agosto con las hojas de ruta y hay al menos once servicios cobrados que no se hicieron. Las facturas las aprueba siempre la misma persona del departamento de compras.',
    attachments: [{ id: 'f3', filename: 'comparativa-rutas-julio-agosto.xlsx', file_size: 64300, mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', storage_path: 'demo/comparativa-rutas.xlsx' }],
  });

  add({
    id: 'c-q4ns7hje', tracking_code: 'Q4NS-7HJE', category: 'safety', status: 'reviewing', priority: 'critical',
    is_anonymous: true, created_at: at(6, 7, 52), updated_at: at(5, 9, 30), department: 'Muelle de carga', incident_date: day(8),
    description: 'Dos carretillas elevadoras del muelle de carga llevan semanas con la alarma de marcha atrás estropeada y una de ellas pierde líquido de frenos. Se comunicó al encargado, pero se siguen usando a diario porque faltan máquinas. El viernes casi atropellan a un compañero.',
  }, [
    { sender: 'manager', content: 'Gracias por avisar. Hoy mismo hemos retirado las dos carretillas para revisarlas. ¿Sabe si hay más máquinas con el mismo problema?', created_at: at(5, 9, 34) },
  ], [
    st(at(5, 9, 30), 'received', 'reviewing', nuria, 'Se retiran del servicio las carretillas 4 y 7 hasta su revisión.'),
    pr(at(5, 9, 31), 'normal', 'critical', nuria),
    ms(at(5, 9, 34), nuria),
  ]);

  add({
    id: 'c-w2lc9pxa', tracking_code: 'W2LC-9PXA', category: 'discrimination', status: 'reviewing', priority: 'normal',
    is_anonymous: false, reporter_name: 'Marta Vidal Roca', reporter_email: 'marta.vidal@correo-demo.es', reporter_phone: '612 345 678',
    created_at: at(12, 16, 20), updated_at: at(11, 10, 2), department: 'Recursos Humanos',
    description: 'En el último proceso de promoción interna para coordinador de almacén se descartó a las tres candidatas que se presentaron, aunque tenían mejor valoración en la evaluación anual que el candidato elegido. En mi entrevista me preguntaron si tenía previsto tener hijos. Pido que se revise el proceso.',
  }, [
    { sender: 'manager', content: 'Buenos días. Hemos recibido su denuncia y la estamos revisando. Le escribiremos por este canal si necesitamos más información.', created_at: at(11, 10, 5) },
    { sender: 'reporter', content: 'Gracias. Puedo aportar el correo con la convocatoria y mi última evaluación anual si les sirve.', created_at: at(10, 19, 40) },
  ], [
    st(at(11, 10, 2), 'received', 'reviewing', laura),
    ms(at(11, 10, 5), laura),
  ]);

  add({
    id: 'c-j6yb3kmv', tracking_code: 'J6YB-3KMV', category: 'accounting', status: 'investigating', priority: 'high',
    is_anonymous: true, created_at: at(25, 9, 15), updated_at: at(19, 12, 10), department: 'Contabilidad',
    description: 'Al cierre de cada trimestre se registran como ventas pedidos que el cliente todavía no ha confirmado, y se anulan a principios del trimestre siguiente. Pasó en marzo y en junio con importes altos. Creo que se hace para cumplir los objetivos de facturación.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia. La revisará el área de cumplimiento.', created_at: at(24, 8, 50) },
    { sender: 'manager', content: '¿Podría indicar los números de pedido o los clientes afectados? Nos ayudaría a localizar los asientos.', created_at: at(21, 13, 0) },
    { sender: 'reporter', content: 'Son pedidos de dos clientes de la zona norte. Los números empiezan por PV-24 y se anularon entre el 2 y el 5 de julio.', created_at: at(20, 22, 15) },
  ], [
    st(at(24, 8, 48), 'received', 'reviewing', daniel),
    ms(at(24, 8, 50), daniel),
    ms(at(21, 13, 0), daniel),
    st(at(19, 12, 8), 'reviewing', 'investigating', daniel, 'Se pide a auditoría interna el detalle de abonos de julio.'),
    pr(at(19, 12, 10), 'normal', 'high', daniel),
  ]);

  add({
    id: 'c-t8gh5rwd', tracking_code: 'T8GH-5RWD', category: 'harassment', status: 'waiting', priority: 'high',
    is_anonymous: true, created_at: at(33, 21, 3), updated_at: at(6, 11, 20), department: 'Oficinas centrales, planta 2',
    description: 'Un jefe de equipo grita y humilla en público a dos personas de su equipo, con insultos y amenazas de despido delante de todos. Pasa casi a diario desde que empezó el año. Las personas afectadas tienen miedo de denunciarlo ellas mismas.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia y la estamos revisando con prioridad.', created_at: at(32, 9, 12) },
    { sender: 'manager', content: 'Para avanzar necesitamos saber en qué meses ocurrieron los hechos que describe y si alguien más los presenció. No hace falta que dé nombres: basta con indicar cuántas personas estaban presentes.', created_at: at(6, 11, 22) },
  ], [
    st(at(32, 9, 10), 'received', 'reviewing', laura),
    ms(at(32, 9, 12), laura),
    st(at(20, 16, 0), 'reviewing', 'investigating', laura),
    st(at(6, 11, 20), 'investigating', 'waiting', laura, 'A la espera de que el informante concrete las fechas.'),
    ms(at(6, 11, 22), laura),
  ]);

  add({
    id: 'c-p3ve8nqc', tracking_code: 'P3VE-8NQC', category: 'fraud', status: 'investigating', priority: 'critical',
    is_anonymous: true, created_at: at(80, 12, 30), updated_at: at(14, 17, 45), department: 'Ventas',
    description: 'Un comercial cobra en efectivo a varios clientes pequeños y les entrega albaranes sin sello. El dinero no se ingresa en caja hasta semanas después, y a veces solo una parte. Lo sé porque dos clientes han llamado reclamando pedidos que ya habían pagado.',
    attachments: [
      { id: 'f4', filename: 'albaran-sin-sello-1.jpg', file_size: 1310000, mime_type: 'image/jpeg', storage_path: 'demo/albaran-1.jpg' },
      { id: 'f5', filename: 'albaran-sin-sello-2.jpg', file_size: 1185000, mime_type: 'image/jpeg', storage_path: 'demo/albaran-2.jpg' },
    ],
  }, [
    { sender: 'manager', content: 'Gracias. Hemos recibido la denuncia y la documentación adjunta.', created_at: at(79, 9, 0) },
    { sender: 'reporter', content: 'Otro cliente ha llamado esta semana con el mismo problema.', created_at: at(52, 18, 10) },
    { sender: 'manager', content: 'Lo hemos añadido al expediente. La investigación sigue abierta.', created_at: at(51, 10, 30) },
  ], [
    st(at(79, 8, 55), 'received', 'reviewing', daniel),
    ms(at(79, 9, 0), daniel),
    st(at(70, 11, 0), 'reviewing', 'investigating', daniel, 'Se cruzan los cobros con los ingresos en caja de los últimos seis meses.'),
    pr(at(52, 18, 40), 'high', 'critical', admin),
    ms(at(51, 10, 30), daniel),
  ]);

  add({
    id: 'c-l5zu2chx', tracking_code: 'L5ZU-2CHX', category: 'safety', status: 'waiting', priority: 'normal',
    is_anonymous: true, created_at: at(86, 10, 10), updated_at: at(10, 9, 0), department: 'Almacén central',
    description: 'Las salidas de emergencia de los pasillos 4 y 9 están bloqueadas con palés casi todos los días. En el simulacro de mayo no se pudo usar la del pasillo 9.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia y la estamos revisando.', created_at: at(85, 9, 30) },
    { sender: 'manager', content: '¿Sigue ocurriendo después de la reorganización del almacén de julio?', created_at: at(10, 9, 2) },
  ], [
    st(at(85, 9, 28), 'received', 'reviewing', nuria),
    ms(at(85, 9, 30), nuria),
    st(at(60, 12, 0), 'reviewing', 'investigating', nuria),
    st(at(10, 9, 0), 'investigating', 'waiting', nuria),
    ms(at(10, 9, 2), nuria),
  ]);

  add({
    id: 'c-n7aw4dsk', tracking_code: 'N7AW-4DSK', category: 'conflict', status: 'investigating', priority: 'normal',
    is_anonymous: true, created_at: at(101, 15, 0), updated_at: at(64, 10, 0), department: 'Compras',
    description: 'El responsable de compras adjudica desde hace meses los pedidos de material de embalaje a una empresa que, según el registro mercantil, administra su cuñado. Los precios son más altos que los de otros proveedores que se presentaron.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia. La estamos revisando.', created_at: at(97, 9, 15) },
  ], [
    st(at(97, 9, 12), 'received', 'reviewing', daniel),
    ms(at(97, 9, 15), daniel),
    st(at(64, 10, 0), 'reviewing', 'investigating', daniel),
  ]);

  add({
    id: 'c-k2sx7gfh', tracking_code: 'K2SX-7GFH', category: 'environmental', status: 'investigating', priority: 'normal',
    is_anonymous: true, created_at: at(18, 13, 22), updated_at: at(9, 16, 0), department: 'Almacén central',
    description: 'Los residuos de cartón y plástico del almacén se mezclan con la basura general y salen en el mismo contenedor, aunque a los clientes se les factura el reciclaje de embalajes.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia y la estamos revisando.', created_at: at(16, 10, 0) },
  ], [
    st(at(16, 9, 58), 'received', 'reviewing', nuria),
    ms(at(16, 10, 0), nuria),
    st(at(9, 16, 0), 'reviewing', 'investigating', nuria, 'Se solicitan los albaranes del gestor de residuos.'),
  ]);

  add({
    id: 'c-b2kr6tym', tracking_code: 'B2KR-6TYM', category: 'data', status: 'resolved', priority: 'normal',
    is_anonymous: true, created_at: at(60, 9, 40), updated_at: at(15, 12, 0), department: 'Sistemas',
    description: 'Las cámaras del almacén graban también la zona de taquillas y vestuarios, y las grabaciones se guardan en un ordenador sin contraseña al que puede acceder cualquiera del turno.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia y la estamos revisando.', created_at: at(58, 10, 0) },
    { sender: 'manager', content: 'Se han reorientado las cámaras y las grabaciones se guardan ahora en un servidor con acceso restringido. Damos la denuncia por resuelta.', created_at: at(15, 12, 5) },
  ], [
    st(at(58, 9, 58), 'received', 'reviewing', admin),
    ms(at(58, 10, 0), admin),
    st(at(40, 9, 0), 'reviewing', 'investigating', admin),
    st(at(15, 12, 0), 'investigating', 'resolved', admin, 'Cámaras reorientadas y acceso a grabaciones restringido.'),
    ms(at(15, 12, 5), admin),
  ]);

  add({
    id: 'c-h9pl3xge', tracking_code: 'H9PL-3XGE', category: 'other', status: 'resolved', priority: 'low',
    is_anonymous: true, created_at: at(95, 14, 5), updated_at: at(8, 10, 30), department: 'Comedor',
    description: 'El servicio de comedor no indica los alérgenos de los platos del día y en dos ocasiones ha servido platos con frutos secos en el menú para personas alérgicas.',
  }, [
    { sender: 'manager', content: 'La empresa del comedor ya publica los alérgenos de cada plato y ha separado el menú para personas alérgicas. Gracias por avisar.', created_at: at(8, 10, 32) },
  ], [
    st(at(92, 9, 0), 'received', 'reviewing', admin),
    st(at(8, 10, 30), 'reviewing', 'resolved', admin),
    ms(at(8, 10, 32), admin),
  ]);

  add({
    id: 'c-e8mc4pvt', tracking_code: 'E8MC-4PVT', category: 'conflict', status: 'resolved', priority: 'low',
    is_anonymous: false, reporter_name: 'Pablo Ferrer Gil', reporter_email: 'pablo.ferrer@correo-demo.es',
    created_at: at(45, 10, 45), updated_at: at(12, 9, 15), department: 'Servicios generales',
    description: 'Un miembro del comité que elige al proveedor de limpieza tiene participación en una de las empresas candidatas y no se ha apartado del proceso.',
  }, [
    { sender: 'manager', content: 'Gracias. Lo estamos comprobando.', created_at: at(44, 9, 0) },
    { sender: 'manager', content: 'La persona se ha apartado del comité y la adjudicación se repetirá. Damos la denuncia por resuelta.', created_at: at(12, 9, 18) },
  ], [
    st(at(44, 8, 58), 'received', 'reviewing', daniel),
    ms(at(44, 9, 0), daniel),
    st(at(12, 9, 15), 'reviewing', 'resolved', daniel, 'Conflicto de intereses confirmado. Se repite la adjudicación.'),
    ms(at(12, 9, 18), daniel),
  ]);

  add({
    id: 'c-f4qj7mbn', tracking_code: 'F4QJ-7MBN', category: 'harassment', status: 'closed', priority: 'high',
    is_anonymous: false, reporter_name: 'Jordi Serra Mas', reporter_email: 'jordi.serra@correo-demo.es', reporter_phone: '622 410 987',
    created_at: at(120, 18, 30), updated_at: at(35, 13, 0), department: 'Administración',
    description: 'Una compañera de mi departamento recibe mensajes de contenido sexual de un superior fuera del horario laboral. Me lo ha contado y me ha pedido que lo comunique, porque teme represalias si lo hace ella.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia. La trataremos con la máxima confidencialidad.', created_at: at(119, 9, 30) },
    { sender: 'manager', content: 'La investigación ha concluido y se han tomado medidas. Cerramos el expediente.', created_at: at(35, 13, 5) },
  ], [
    st(at(119, 9, 28), 'received', 'reviewing', laura),
    ms(at(119, 9, 30), laura),
    st(at(110, 10, 0), 'reviewing', 'investigating', laura),
    st(at(42, 12, 0), 'investigating', 'resolved', laura, 'Se aplica el protocolo de acoso. Medidas disciplinarias.'),
    st(at(35, 13, 0), 'resolved', 'closed', laura),
    ms(at(35, 13, 5), laura),
  ]);

  add({
    id: 'c-y6dt9kwa', tracking_code: 'Y6DT-9KWA', category: 'accounting', status: 'closed', priority: 'normal',
    is_anonymous: true, created_at: at(140, 11, 20), updated_at: at(38, 10, 0), department: 'Logística',
    description: 'En logística se pagan horas extra que no constan en el sistema de fichaje. Algunas semanas se pagan más horas de las que el almacén estuvo abierto.',
  }, [
    { sender: 'manager', content: 'Hemos recibido su denuncia y la estamos revisando.', created_at: at(137, 9, 0) },
  ], [
    st(at(137, 8, 58), 'received', 'reviewing', daniel),
    ms(at(137, 9, 0), daniel),
    st(at(120, 9, 0), 'reviewing', 'investigating', daniel),
    st(at(38, 10, 0), 'investigating', 'closed', daniel, 'Se corrige el procedimiento de validación de horas extra.'),
  ]);

  add({
    id: 'c-g3ub5nrz', tracking_code: 'G3UB-5NRZ', category: 'fraud', status: 'archived', priority: 'low',
    is_anonymous: true, created_at: at(160, 8, 0), updated_at: at(100, 12, 0), department: 'Flota',
    description: 'Creo que alguien usa la tarjeta de combustible de la empresa para su coche particular. No sé quién es, pero los consumos de la furgoneta 12 no cuadran con los kilómetros.',
  }, [
    { sender: 'manager', content: 'Hemos revisado los consumos de la furgoneta 12. La diferencia se debe a un error del cuentakilómetros, ya reparado. Archivamos la denuncia.', created_at: at(100, 12, 5) },
  ], [
    st(at(155, 9, 0), 'received', 'reviewing', admin),
    st(at(100, 12, 0), 'reviewing', 'archived', admin, 'Sin indicios de uso indebido.'),
    ms(at(100, 12, 5), admin),
  ]);

  // Fil per a les consultes del canal públic que no són d'aquesta llista
  messages['demo-complaint'] = [];

  const profiles = [
    { ...PEOPLE.admin, role: 'superadmin', created_at: at(260, 9, 0) },
    { ...PEOPLE.laura, role: 'manager', created_at: at(240, 11, 0) },
    { ...PEOPLE.daniel, role: 'manager', created_at: at(240, 11, 5) },
    { ...PEOPLE.nuria, role: 'manager', created_at: at(170, 16, 30) },
  ];
  const P = (manager_id, category, v, e, r, d) => ({ id: `${manager_id}-${category}`, manager_id, category, can_view: v, can_edit: e, can_reply: r, can_delete: d });
  const permissions = [
    P('mgr-laura', 'harassment', true, true, true, false),
    P('mgr-laura', 'discrimination', true, true, true, false),
    P('mgr-daniel', 'fraud', true, true, true, false),
    P('mgr-daniel', 'accounting', true, true, true, true),
    P('mgr-daniel', 'conflict', true, true, true, false),
    P('mgr-daniel', 'data', true, false, false, false),
    P('mgr-nuria', 'safety', true, true, true, false),
    P('mgr-nuria', 'environmental', true, true, true, false),
  ];

  return { v: 1, complaints, messages, audit, profiles, permissions, mfa: [], seq: n };
}

// ── Persistència ────────────────────────────────────────────────────────
let store = null;
function db() {
  if (store) return store;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) store = JSON.parse(raw);
  } catch { /* sense emmagatzematge: es treballa en memòria */ }
  if (!store) { store = seed(); save(); }
  return store;
}
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(store)); } catch { /* en memòria */ }
}
const wait = (ms = 220) => new Promise(r => setTimeout(r, ms));
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const LIST_FIELDS = ['id', 'tracking_code', 'category', 'status', 'priority', 'is_anonymous', 'department', 'incident_date', 'language', 'created_at', 'updated_at'];
const pick = (c) => Object.fromEntries(LIST_FIELDS.map(k => [k, c[k] ?? null]));
const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);

// ── Denúncies ───────────────────────────────────────────────────────────
export async function listComplaints({ categories = null } = {}) {
  await wait(380);
  const rows = db().complaints
    .filter(c => !categories || categories.includes(c.category))
    .sort(byDateDesc)
    .map(pick);
  return { complaints: rows, error: null };
}

export async function getAllComplaints({ status, page = 1, limit = 20 } = {}) {
  await wait();
  const all = db().complaints.filter(c => !status || c.status === status).sort(byDateDesc);
  return { data: clone(all.slice((page - 1) * limit, page * limit)), count: all.length, error: null };
}

export async function getComplaintById(id) {
  await wait(300);
  const c = db().complaints.find(x => x.id === id);
  return c ? { complaint: clone(c), error: null } : { complaint: null, error: { message: 'not-found' } };
}

export async function getComplaintStats(allowedCategories = null) {
  if (allowedCategories !== null && allowedCategories.length === 0) return { total: 0, open: 0, resolved: 0 };
  const rows = db().complaints.filter(c => !allowedCategories || allowedCategories.includes(c.category));
  return {
    total: rows.length,
    open: rows.filter(c => OPEN.includes(c.status)).length,
    resolved: rows.filter(c => DONE.includes(c.status)).length,
  };
}

// Mateixa semàntica que la versió real: el registre només s'escriu si hi ha nota
export async function updateComplaintStatus(id, status, adminNote = null, priority = null) {
  await wait();
  const s = db();
  const c = s.complaints.find(x => x.id === id);
  if (!c) return { error: { message: 'not-found' } };
  c.status = status;
  if (priority) c.priority = priority;
  c.updated_at = new Date().toISOString();
  if (adminNote) s.audit.push({ id: `a${++s.seq}`, complaint_id: id, action: `status_changed_to_${status}`, details: { note: adminNote }, created_at: c.updated_at });
  save();
  return { error: null };
}

export async function deleteComplaint(id) {
  await wait(300);
  const s = db();
  const before = s.complaints.length;
  s.complaints = s.complaints.filter(c => c.id !== id);
  if (s.complaints.length === before) return { error: { message: 'not-found' } };
  delete s.messages[id];
  // Com a la BD (on delete set null): el registre es conserva sense vincle
  s.audit.forEach(a => { if (a.complaint_id === id) a.complaint_id = null; });
  save();
  return { error: null };
}

export async function getAuditLogs(complaintId) {
  await wait(150);
  const logs = db().audit
    .filter(a => a.complaint_id === complaintId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return { logs: clone(logs), error: null };
}

export async function logComplaintEvent({ complaintId, action, details = {} }) {
  const s = db();
  s.audit.push({ id: `a${++s.seq}`, complaint_id: complaintId, action, details, created_at: new Date().toISOString() });
  save();
  return { error: null };
}

// ── Missatges ───────────────────────────────────────────────────────────
export async function getMessages(complaintId) {
  await wait(150);
  return { messages: clone(db().messages[complaintId] ?? []), error: null };
}

export async function sendMessage(complaintId, content, sender = 'reporter') {
  await wait(250);
  const s = db();
  (s.messages[complaintId] ??= []).push({ id: uid('m'), sender, content, is_read: false, created_at: new Date().toISOString() });
  const c = s.complaints.find(x => x.id === complaintId);
  if (c) c.updated_at = new Date().toISOString();
  save();
  return { error: null };
}

// ── Canal públic enllaçat amb el panell (només demo) ────────────────────
// Una denúncia enviada des del canal v2 apareix al panell; amb el seu codi es pot consultar.
export function addComplaint({ id, trackingCode, formData, files = [] }) {
  const s = db();
  const now = new Date().toISOString();
  const anon = formData.isAnonymous !== false;
  s.complaints.push({
    id, tracking_code: trackingCode, organization_id: 'demo-org',
    is_anonymous: anon,
    reporter_name: anon ? null : formData.name || null,
    reporter_email: anon ? null : formData.email || null,
    reporter_phone: anon ? null : formData.phone || null,
    category: formData.category || 'other',
    department: formData.department || null,
    description: formData.description || '',
    incident_date: formData.incidentDate || null,
    involved_people: formData.involvedPeople || null,
    language: formData.language ?? 'ca',
    status: 'received', priority: 'normal', created_at: now, updated_at: now,
    attachments: [...files].map((f, i) => ({ id: uid('f'), filename: f.name, file_size: f.size, mime_type: f.type, storage_path: `demo/${i}-${f.name}` })),
  });
  s.messages[id] = [];
  s.audit.push({ id: `a${++s.seq}`, complaint_id: id, action: 'created', details: { channel: 'web', language: formData.language ?? 'ca' }, created_at: now });
  save();
}

export function findByCode(code) {
  const c = db().complaints.find(x => x.tracking_code === String(code).toUpperCase());
  if (!c) return null;
  const { id, tracking_code, status, category, created_at, updated_at } = c;
  return { id, tracking_code, status, category, organization_id: 'demo-org', created_at, updated_at };
}

// ── Usuaris i permisos ──────────────────────────────────────────────────
export async function getAllProfiles() {
  await wait(260);
  const rows = [...db().profiles].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return { profiles: clone(rows), error: null };
}

export async function getManagerPermissions(managerId) {
  await wait(120);
  return { permissions: clone(db().permissions.filter(p => p.manager_id === managerId)), error: null };
}

export async function setManagerPermissions(managerId, permissionsArray) {
  await wait(350);
  const s = db();
  s.permissions = s.permissions
    .filter(p => p.manager_id !== managerId)
    .concat(permissionsArray.map(p => ({ ...p, id: `${managerId}-${p.category}`, manager_id: managerId })));
  save();
  return { error: null };
}

export async function inviteManager(email, fullName) {
  await wait(500);
  const s = db();
  const clean = String(email).trim().toLowerCase();
  if (s.profiles.some(p => p.email === clean)) return { userId: null, error: new Error('already-exists') };
  const id = uid('mgr');
  s.profiles.push({ id, full_name: fullName, email: clean, role: 'manager', created_at: new Date().toISOString(), invited: true });
  save();
  return { userId: id, error: null };
}

export async function updateProfile(userId, updates) {
  await wait();
  const p = db().profiles.find(x => x.id === userId);
  if (p) Object.assign(p, updates);
  save();
  return { error: null };
}

export async function deleteManager(userId) {
  await wait(400);
  const s = db();
  s.profiles = s.profiles.filter(p => p.id !== userId);
  s.permissions = s.permissions.filter(p => p.manager_id !== userId);
  save();
  return { error: null };
}

// ── Verificació en dos passos (simulada de forma evident) ───────────────
export async function listMfaFactors() {
  await wait(200);
  return { factors: clone(db().mfa), error: null };
}

export async function enrollMfaFactor() {
  await wait(300);
  return { factorId: uid('factor'), qrCode: DEMO_QR, secret: DEMO_SECRET, error: null };
}

export async function verifyMfaEnrollment(factorId, code) {
  await wait(450);
  if (!/^\d{6}$/.test(code)) return { error: { message: 'invalid-code' } };
  const s = db();
  s.mfa = [{ id: factorId, status: 'verified', factor_type: 'totp', created_at: new Date().toISOString() }];
  save();
  return { error: null };
}

export async function unenrollMfaFactor(factorId) {
  await wait(300);
  const s = db();
  s.mfa = s.mfa.filter(f => f.id !== factorId);
  save();
  return { error: null };
}
