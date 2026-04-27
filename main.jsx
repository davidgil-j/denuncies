import React, { useState } from 'react';

import ReactDOM from 'react-dom/client';

import { useForm } from 'react-hook-form';

import { v4 as uuidv4 } from 'uuid';



function App() {

    const { register, handleSubmit, reset } = useForm();

    const [idSeguimiento, setIdSeguimiento] = useState(null);



    // --- CONFIGURACIÓ TOTAL DE DISSENY I CONTINGUT ---

    const [cfg, setCfg] = useState({

        // 1. Contingut i Llistes

        logo: "🛡️",

        titulo: "CANAL ÈTIC CORPORATIU",

        subtitulo: "La teva comunicació és 100% anònima i segura segons la Llei 2/2023.",

        opcionesTipo: "Frau, Assetjament Laboral, Seguretat de Dades, Altres",

        labelTipo: "Categoria de la incidència",

        labelRelacion: "Relació amb l'entitat",

        opcionesRelacion: "Empleat/da, Client/a, Proveïdor/a, Extern/a",



        // NOUS CAMPS: Denunciant

        labelDenunciantNom: "Nom i cognoms del denunciant",

        labelDenunciantEmail: "Correu electrònic del denunciant",



        labelDesc: "Descripció detallada",

        placeholderDesc: "Escriu aquí els fets de manera detallada...",

        txtBoton: "ENVIAR COMUNICACIÓ SEGURA",

        txtPrivacidad: "Certifico que la informació és veraç i accepto el tractament anònim.",



        // 2. Colors (Personalització)

        colFondoPagina: "#f1f5f9",

        colFondoCard: "#ffffff",

        colBoton: "#2563eb",

        colBotonTxt: "#ffffff",

        colTitulo: "#0f172a",

        colSubtitulo: "#64748b",

        colLabels: "#475569",

        colInputsTxt: "#1e293b",

        colInputsBorde: "#e2e8f0",



        // 3. Mides (en píxels)

        sizeLogo: 60,

        sizeTitulo: 24,

        sizeSubtitulo: 14,

        sizeLabels: 11,

        sizeInputs: 14,

        sizeBoton: 16,

        anchoCard: 550,

        radioBordes: 16,

        paddingCard: 40

    });



    const u = (key, value) => setCfg(prev => ({ ...prev, [key]: value }));



    const s = {

        wrapper: { display: 'flex', minHeight: '100vh', fontFamily: "'Montserrat', sans-serif", backgroundColor: cfg.colFondoPagina },

        editor: { width: '400px', backgroundColor: '#111827', color: '#e5e7eb', padding: '20px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box', borderRight: '1px solid #374151' },

        preview: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },

        card: { backgroundColor: cfg.colFondoCard, padding: `${cfg.paddingCard}px`, borderRadius: `${cfg.radioBordes}px`, width: '100%', maxWidth: `${cfg.anchoCard}px`, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },



        h1: { margin: '0', color: cfg.colTitulo, fontSize: `${cfg.sizeTitulo}px`, fontWeight: '700' },

        p: { color: cfg.colSubtitulo, fontSize: `${cfg.sizeSubtitulo}px`, marginTop: '8px' },

        label: { display: 'block', marginBottom: '6px', fontSize: `${cfg.sizeLabels}px`, fontWeight: '700', color: cfg.colLabels, textTransform: 'uppercase', letterSpacing: '0.5px' },

        input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: `1px solid ${cfg.colInputsBorde}`, fontFamily: 'inherit', fontSize: `${cfg.sizeInputs}px`, color: cfg.colInputsTxt, boxSizing: 'border-box', backgroundColor: cfg.colFondoCard },

        btn: { width: '100%', padding: '16px', backgroundColor: cfg.colBoton, color: cfg.colBotonTxt, border: 'none', borderRadius: '12px', fontSize: `${cfg.sizeBoton}px`, fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '10px' },



        editSection: { marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #374151' },

        editLabel: { fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase' },

        editInput: { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' },

        colorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }

    };



    return (

        <div style={s.wrapper}>

            {/* PANELL D'EDITOR (ESQUERRA) */}

            <div style={s.editor}>

                <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '25px', fontWeight: '700' }}>🛠️ EDITOR DE DISSENY</h2>



                <div style={s.editSection}>

                    <p style={s.editLabel}>1. Continguts i Textos</p>

                    <input style={s.editInput} value={cfg.logo} onChange={e => u('logo', e.target.value)} placeholder="Logo (URL o Emoji)" />

                    <input style={s.editInput} value={cfg.titulo} onChange={e => u('titulo', e.target.value)} placeholder="Títol" />

                    <textarea style={{ ...s.editInput, height: '60px' }} value={cfg.subtitulo} onChange={e => u('subtitulo', e.target.value)} placeholder="Subtítol" />

                    <input style={s.editInput} value={cfg.labelDenunciantNom} onChange={e => u('labelDenunciantNom', e.target.value)} placeholder="Label Nom Denunciant" />

                    <input style={s.editInput} value={cfg.labelDenunciantEmail} onChange={e => u('labelDenunciantEmail', e.target.value)} placeholder="Label Email Denunciant" />

                    <input style={s.editInput} value={cfg.txtBoton} onChange={e => u('txtBoton', e.target.value)} placeholder="Text del Botó" />

                </div>



                <div style={s.editSection}>

                    <p style={s.editLabel}>2. Colors Personalitzats</p>

                    <div style={s.colorGrid}>

                        <div><span style={{ fontSize: '10px' }}>Fons Pàg.</span><input type="color" style={s.editInput} value={cfg.colFondoPagina} onChange={e => u('colFondoPagina', e.target.value)} /></div>

                        <div><span style={{ fontSize: '10px' }}>Targeta</span><input type="color" style={s.editInput} value={cfg.colFondoCard} onChange={e => u('colFondoCard', e.target.value)} /></div>

                        <div><span style={{ fontSize: '10px' }}>Botó</span><input type="color" style={s.editInput} value={cfg.colBoton} onChange={e => u('colBoton', e.target.value)} /></div>

                        <div><span style={{ fontSize: '10px' }}>Títol</span><input type="color" style={s.editInput} value={cfg.colTitulo} onChange={e => u('colTitulo', e.target.value)} /></div>

                        <div><span style={{ fontSize: '10px' }}>Etiquetes</span><input type="color" style={s.editInput} value={cfg.colLabels} onChange={e => u('colLabels', e.target.value)} /></div>

                    </div>

                </div>



                <div style={s.editSection}>

                    <p style={s.editLabel}>3. Mides de cada element (px)</p>

                    <div style={{ fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

                        <div>Logo: {cfg.sizeLogo}px<input type="range" min="20" max="200" value={cfg.sizeLogo} onChange={e => u('sizeLogo', e.target.value)} style={{ width: '100%' }} /></div>

                        <div>Títol: {cfg.sizeTitulo}px<input type="range" min="12" max="60" value={cfg.sizeTitulo} onChange={e => u('sizeTitulo', e.target.value)} style={{ width: '100%' }} /></div>

                        <div>Etiquetes: {cfg.sizeLabels}px<input type="range" min="8" max="25" value={cfg.sizeLabels} onChange={e => u('sizeLabels', e.target.value)} style={{ width: '100%' }} /></div>

                        <div>Camps: {cfg.sizeInputs}px<input type="range" min="10" max="30" value={cfg.sizeInputs} onChange={e => u('sizeInputs', e.target.value)} style={{ width: '100%' }} /></div>

                        <div>Botó: {cfg.sizeBoton}px<input type="range" min="10" max="30" value={cfg.sizeBoton} onChange={e => u('sizeBoton', e.target.value)} style={{ width: '100%' }} /></div>

                    </div>

                </div>



                <div style={s.editSection}>

                    <p style={s.editLabel}>4. Llistes Dinàmiques</p>

                    <span style={{ fontSize: '10px' }}>Tipus d'incidència (separat per comes)</span>

                    <textarea style={{ ...s.editInput, height: '60px' }} value={cfg.opcionesTipo} onChange={e => u('opcionesTipo', e.target.value)} />

                    <span style={{ fontSize: '10px' }}>Relacions</span>

                    <textarea style={{ ...s.editInput, height: '60px' }} value={cfg.opcionesRelacion} onChange={e => u('opcionesRelacion', e.target.value)} />

                </div>

            </div>



            {/* VISTA PRÈVIA (DRETA) */}

            <div style={s.preview}>

                <div style={s.card}>

                    <header style={{ textAlign: 'center', marginBottom: '35px' }}>

                        {cfg.logo.startsWith('http') ?

                            <img src={cfg.logo} style={{ width: `${cfg.sizeLogo}px`, height: 'auto', marginBottom: '15px' }} alt="Logo" /> :

                            <div style={{ fontSize: `${cfg.sizeLogo}px`, marginBottom: '15px' }}>{cfg.logo}</div>

                        }

                        <h1 style={s.h1}>{cfg.titulo}</h1>

                        <p style={s.p}>{cfg.subtitulo}</p>

                    </header>



                    {idSeguimiento ? (

                        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f0fdf4', borderRadius: '15px', border: `2px solid ${cfg.colBoton}` }}>

                            <h2 style={{ color: '#166534', fontFamily: 'inherit' }}>Comunicació Rebuda</h2>

                            <p>Guarda aquest codi per fer el seguiment:</p>

                            <div style={{ fontSize: '32px', fontWeight: '800', color: cfg.colBoton, margin: '20px 0' }}>{idSeguimiento}</div>

                            <button onClick={() => setIdSeguimiento(null)} style={{ ...s.btn, backgroundColor: '#64748b' }}>Tancar</button>

                        </div>

                    ) : (

                        <form onSubmit={handleSubmit(() => setIdSeguimiento(uuidv4().split('-')[0].toUpperCase()))}>



                            {/* SECCIÓ: DADES DEL DENUNCIANT */}

                            <div style={{ borderBottom: `1px solid ${cfg.colInputsBorde}`, marginBottom: '20px', paddingBottom: '10px' }}>

                                <label style={s.label}>{cfg.labelDenunciantNom}</label>

                                <input style={s.input} placeholder="Escriu el teu nom complet" />



                                <label style={s.label}>{cfg.labelDenunciantEmail}</label>

                                <input type="email" style={s.input} placeholder="Exemple: correu@empresa.com" />

                            </div>



                            <label style={s.label}>{cfg.labelTipo}</label>

                            <select style={s.input}>

                                {cfg.opcionesTipo.split(',').map(o => <option key={o} value={o}>{o.trim()}</option>)}

                            </select>



                            <label style={s.label}>{cfg.labelRelacion}</label>

                            <select style={s.input}>

                                {cfg.opcionesRelacion.split(',').map(o => <option key={o} value={o}>{o.trim()}</option>)}

                            </select>



                            <label style={s.label}>{cfg.labelDesc}</label>

                            <textarea style={{ ...s.input, height: '100px', resize: 'none' }} placeholder={cfg.placeholderDesc} required />



                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>

                                <input type="checkbox" required />

                                <label style={{ fontSize: '11px', color: cfg.colSubtitulo }}>{cfg.txtPrivacidad}</label>

                            </div>



                            <button type="submit" style={s.btn}>

                                {cfg.txtBoton}

                            </button>

                        </form>

                    )}

                </div>

            </div>

        </div>

    );

}



ReactDOM.createRoot(document.getElementById('root')).render(<App />);
