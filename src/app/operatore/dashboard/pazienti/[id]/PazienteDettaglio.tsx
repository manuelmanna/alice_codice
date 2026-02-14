'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    aggiornaPaziente,
    aggiungiFarmaco,
    eliminaFarmaco,
    creaEsercizio,
    eliminaEsercizio,
} from '../actions';
import styles from './paziente.module.css';

interface Farmaco {
    id: string;
    nome: string;
    dosaggio: string;
    fascia: string;
    orario: string;
}

interface EsercizioStep {
    id: string;
    numero_step: number;
    istruzione: string;
}

interface Esercizio {
    id: string;
    nome: string;
    durata_minuti: number;
    frequenza: string | null;
    esercizi_step: EsercizioStep[];
}

interface UmoreEntry {
    data: string;
    valore: string;
}

interface AttivitaRecente {
    id: string;
    preso: boolean;
    created_at: string;
    farmaci: { nome: string } | null;
}

interface Metriche {
    aderenzaFarmaci: number;
    complianceEsercizi: number;
    umoreLog: UmoreEntry[];
    attivitaRecenti: AttivitaRecente[];
}

interface Paziente {
    id: string;
    nome_completo: string;
    eta: number | null;
    email: string | null;
    telefono: string | null;
    indirizzo: string | null;
    contatto_emergenza: string | null;
    stato: string;
}

export default function PazienteDettaglio({
    paziente,
    farmaci,
    esercizi,
    metriche,
    tab,
}: {
    paziente: Paziente;
    farmaci: Farmaco[];
    esercizi: Esercizio[];
    metriche: Metriche;
    tab: 'dettagli' | 'gestisci';
}) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [showEsercizioModal, setShowEsercizioModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [esercizioSteps, setEsercizioSteps] = useState<string[]>(['']);

    const umoreEmoji: Record<string, string> = { felice: '😊', normale: '😐', triste: '😢' };

    // ---- Salva dati paziente ----
    async function handleSavePaziente(formData: FormData) {
        setSaving(true);
        setSaveMsg(null);
        const result = await aggiornaPaziente(paziente.id, formData);
        if (result?.error) {
            setSaveMsg('❌ ' + result.error);
        } else {
            setSaveMsg('✅ Dati salvati con successo!');
        }
        setSaving(false);
        setTimeout(() => setSaveMsg(null), 3000);
    }

    // ---- Aggiungi farmaco ----
    async function handleAddFarmaco(formData: FormData) {
        const result = await aggiungiFarmaco(paziente.id, formData);
        if (result?.error) {
            alert(result.error);
        }
    }

    // ---- Elimina farmaco ----
    async function handleDeleteFarmaco(farmacoId: string) {
        if (!confirm('Eliminare questo farmaco?')) return;
        await eliminaFarmaco(farmacoId, paziente.id);
    }

    // ---- Crea esercizio ----
    async function handleCreateEsercizio(formData: FormData) {
        esercizioSteps.forEach((step, i) => {
            if (step.trim()) {
                formData.set(`step_${i + 1}`, step);
            }
        });
        const result = await creaEsercizio(paziente.id, formData);
        if (result?.error) {
            alert(result.error);
        } else {
            setShowEsercizioModal(false);
            setEsercizioSteps(['']);
        }
    }

    // ---- Elimina esercizio ----
    async function handleDeleteEsercizio(esercizioId: string) {
        if (!confirm('Eliminare questo esercizio e tutti i suoi passaggi?')) return;
        await eliminaEsercizio(esercizioId, paziente.id);
    }

    // ---- Gestione step modal ----
    function addStep() {
        setEsercizioSteps([...esercizioSteps, '']);
    }
    function updateStep(index: number, value: string) {
        const updated = [...esercizioSteps];
        updated[index] = value;
        setEsercizioSteps(updated);
    }
    function removeStep(index: number) {
        if (esercizioSteps.length <= 1) return;
        setEsercizioSteps(esercizioSteps.filter((_, i) => i !== index));
    }

    // Helper per colore metriche
    function metricColor(value: number) {
        if (value < 50) return styles.metricDanger;
        if (value < 75) return styles.metricWarning;
        return styles.metricSuccess;
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <button onClick={() => router.push('/operatore/dashboard')} className={styles.backBtn}>
                    ← Indietro
                </button>
                <div className={styles.pageHeaderInfo}>
                    <h1 className={styles.pageTitle}>{paziente.nome_completo}</h1>
                    <p className={styles.pageSubtitle}>
                        {paziente.eta ? `${paziente.eta} anni` : ''} · {paziente.stato.toUpperCase()}
                    </p>
                </div>
                <div className={styles.pageHeaderActions}>
                    <Link
                        href={`/operatore/dashboard/pazienti/${paziente.id}`}
                        className={`btn ${tab === 'dettagli' ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    >
                        📊 Dettagli Paziente
                    </Link>
                    <Link
                        href={`/operatore/dashboard/pazienti/${paziente.id}?tab=gestisci`}
                        className={`btn ${tab === 'gestisci' ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    >
                        ⚙️ Gestisci Paziente
                    </Link>
                </div>
            </div>

            {saveMsg && (
                <div className={`alert ${saveMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px' }}>
                    {saveMsg}
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB: DETTAGLI — Statistiche e monitoraggio */}
            {/* ============================================================ */}
            {tab === 'dettagli' && (
                <>
                    {/* Alert stato paziente */}
                    {paziente.stato !== 'ok' && (
                        <div className={`alert ${paziente.stato === 'critico' ? 'alert-danger' : 'alert-warning'}`} style={{ marginBottom: '24px' }}>
                            <strong>
                                {paziente.stato === 'critico' ? '⚠️ Stato Critico - Attenzione Richiesta' : '⚠️ Attenzione Richiesta'}
                            </strong>
                            <p style={{ margin: '4px 0 0', fontSize: '14px' }}>
                                {metriche.aderenzaFarmaci < 50 && 'Bassa aderenza ai farmaci. '}
                                {metriche.complianceEsercizi < 50 && 'Bassa compliance esercizi. '}
                                Consigliato contatto telefonico.
                            </p>
                        </div>
                    )}

                    {/* Metriche riepilogo — 3 colonne */}
                    <div className={styles.metricsRow}>
                        <div className={styles.metricCard}>
                            <div className={styles.metricTitle}>Aderenza Farmaci</div>
                            <div className={`${styles.metricBigValue} ${metricColor(metriche.aderenzaFarmaci)}`}>
                                {metriche.aderenzaFarmaci}%
                            </div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricTitle}>Compliance Esercizi</div>
                            <div className={`${styles.metricBigValue} ${metricColor(metriche.complianceEsercizi)}`}>
                                {metriche.complianceEsercizi}%
                            </div>
                        </div>
                    </div>

                    {/* Andamento Umore (7 giorni) */}
                    <div className={`card ${styles.section}`}>
                        <div className="card-header">
                            <h3 className="card-title">📈 Andamento Umore (7 giorni)</h3>
                        </div>
                        <div className={styles.umoreRow} style={{ padding: '20px', gap: '12px' }}>
                            {metriche.umoreLog.length === 0 ? (
                                <span className={styles.nessunDato}>Nessun dato registrato</span>
                            ) : (
                                metriche.umoreLog.map((u, i) => (
                                    <div key={i} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '28px' }}>{umoreEmoji[u.valore] || '❓'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            {new Date(u.data).toLocaleDateString('it-IT', { weekday: 'short' })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Attività recenti */}
                    <div className={`card ${styles.section}`}>
                        <div className="card-header">
                            <h3 className="card-title">📋 Attività Recenti</h3>
                        </div>
                        {metriche.attivitaRecenti.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                Nessuna attività recente
                            </p>
                        ) : (
                            <div className={styles.attivitaList}>
                                {metriche.attivitaRecenti.map((att) => (
                                    <div key={att.id} className={styles.attivitaItem}>
                                        <span className={att.preso ? styles.attOk : styles.attDanger}>
                                            {att.preso ? '✅' : '❌'}
                                        </span>
                                        <span>
                                            Farmaco {att.farmaci?.nome || 'N/A'} - {att.preso ? 'PRESO' : 'NON PRESO'}
                                        </span>
                                        <span className={styles.attTime}>
                                            {new Date(att.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ============================================================ */}
            {/* TAB: GESTISCI — Informazioni, Farmaci, Esercizi */}
            {/* ============================================================ */}
            {tab === 'gestisci' && (
                <>
                    {/* Header azioni gestione */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
                        <button
                            onClick={() => setShowDiscardModal(true)}
                            className="btn btn-outline btn-sm"
                        >
                            ✕ Scarta Modifiche
                        </button>
                        <button
                            type="submit"
                            form="paziente-form"
                            className="btn btn-success btn-sm"
                            disabled={saving}
                        >
                            {saving ? (
                                <><span className="spinner spinner-white" /> Salvando...</>
                            ) : (
                                '💾 Salva Modifiche'
                            )}
                        </button>
                    </div>

                    {/* INFORMAZIONI ANAGRAFICHE */}
                    <div className={`card ${styles.section}`}>
                        <div className="card-header">
                            <h3 className="card-title">📝 Informazioni Anagrafiche</h3>
                        </div>

                        <form id="paziente-form" action={handleSavePaziente}>
                            <div className="form-row" style={{ marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nome Completo</label>
                                    <input type="text" name="nome_completo" className="form-input" defaultValue={paziente.nome_completo} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Età</label>
                                    <input type="number" name="eta" className="form-input" defaultValue={paziente.eta || ''} min={1} max={149} />
                                </div>
                            </div>

                            <div className="form-row" style={{ marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" name="email" className="form-input" defaultValue={paziente.email || ''} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Telefono</label>
                                    <input type="tel" name="telefono" className="form-input" defaultValue={paziente.telefono || ''} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Indirizzo</label>
                                    <input type="text" name="indirizzo" className="form-input" defaultValue={paziente.indirizzo || ''} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contatto di Emergenza</label>
                                    <input type="text" name="contatto_emergenza" className="form-input" defaultValue={paziente.contatto_emergenza || ''} placeholder="Sara Romano - +39 333 1086795" />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* GESTIONE FARMACI */}
                    <div className={`card ${styles.section}`}>
                        <div className="card-header">
                            <h3 className="card-title">💊 Gestione Farmaci</h3>
                        </div>

                        {farmaci.length > 0 && (
                            <div className={styles.farmaciList}>
                                {farmaci.map((f) => (
                                    <div key={f.id} className="list-item">
                                        <div className="list-item-content">
                                            <div className="list-item-title">{f.nome}</div>
                                            <div className="list-item-subtitle">
                                                {f.dosaggio} - {f.orario}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteFarmaco(f.id)} className="btn-icon-danger" title="Elimina farmaco">
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.addFarmacoSection}>
                            <h4 className={styles.subSectionTitle}>Aggiungi Nuovo Farmaco</h4>
                            <form action={handleAddFarmaco} className={styles.addFarmacoForm}>
                                <div className="form-group">
                                    <input type="text" name="nome" className="form-input" placeholder="Nome farmaco" required />
                                </div>
                                <div className="form-group">
                                    <input type="text" name="dosaggio" className="form-input" placeholder="Dosaggio" required />
                                </div>
                                <div className="form-group">
                                    <select name="fascia" className="form-select" required>
                                        <option value="">Fascia</option>
                                        <option value="mattina">Mattina</option>
                                        <option value="pranzo">Pranzo</option>
                                        <option value="sera">Sera</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <input type="time" name="orario" className="form-input" required />
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm">
                                    + Aggiungi
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* GESTIONE ESERCIZI */}
                    <div className={`card ${styles.section}`}>
                        <div className="card-header">
                            <h3 className="card-title">💪 Gestione Esercizi</h3>
                            <button onClick={() => setShowEsercizioModal(true)} className="btn btn-primary btn-sm">
                                + Nuovo Esercizio
                            </button>
                        </div>

                        {esercizi.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                Nessun esercizio configurato. Clicca &quot;+ Nuovo Esercizio&quot; per aggiungerne uno.
                            </p>
                        ) : (
                            <div className={styles.eserciziList}>
                                {esercizi.map((es) => (
                                    <div key={es.id} className={styles.esercizioItem}>
                                        <div className={styles.esercizioHeader}>
                                            <div>
                                                <div className={styles.esercizioNome}>🏋️ {es.nome}</div>
                                                <div className={styles.esercizioMeta}>
                                                    {es.durata_minuti} min · {es.frequenza || 'Giornaliero'}
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteEsercizio(es.id)} className="btn-icon-danger" title="Elimina esercizio">
                                                🗑️
                                            </button>
                                        </div>

                                        {es.esercizi_step && es.esercizi_step.length > 0 && (
                                            <div className={styles.stepList}>
                                                <div className={styles.stepListTitle}>Passaggi:</div>
                                                {es.esercizi_step
                                                    .sort((a, b) => a.numero_step - b.numero_step)
                                                    .map((step) => (
                                                        <div key={step.id} className={styles.stepItem}>
                                                            <span className={styles.stepNumber}>{step.numero_step}</span>
                                                            <span>{step.istruzione}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ============================================================ */}
            {/* MODAL: Crea Nuovo Esercizio */}
            {/* ============================================================ */}
            {showEsercizioModal && (
                <div className="modal-overlay" onClick={() => setShowEsercizioModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Crea Nuovo Esercizio</h2>
                            <button className="modal-close" onClick={() => setShowEsercizioModal(false)}>✕</button>
                        </div>

                        <form action={handleCreateEsercizio}>
                            <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Informazioni Base
                            </h4>

                            <div className="form-row" style={{ marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">
                                        Nome Esercizio <span className="required">*</span>
                                    </label>
                                    <input type="text" name="nome_esercizio" className="form-input" placeholder='es. Alzare le Braccia' required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Durata <span className="required">*</span>
                                    </label>
                                    <input type="number" name="durata_minuti" className="form-input" placeholder="es. 5 minuti" required min={1} />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label className="form-label">Frequenza</label>
                                <input type="text" name="frequenza" className="form-input" placeholder="es. Giornaliero, 3 volte a settimana" />
                            </div>

                            {/* Step */}
                            <div className={styles.modalStepSection}>
                                <div className={styles.modalStepHeader}>
                                    <h4>
                                        Passaggi dell&apos;Esercizio <span className="required">*</span>
                                    </h4>
                                    <button type="button" onClick={addStep} className="btn btn-outline btn-sm">
                                        + Aggiungi Passaggio
                                    </button>
                                </div>
                                <p className={styles.modalStepHint}>
                                    Il paziente seguirà questi passaggi uno alla volta.
                                </p>

                                <div className={styles.stepInputList}>
                                    {esercizioSteps.map((step, i) => (
                                        <div key={i} className={styles.stepInputRow}>
                                            <span className={styles.stepInputNumber}>{i + 1}</span>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder={`Passaggio ${i + 1} - es. "Siediti comodo sulla sedia"`}
                                                value={step}
                                                onChange={(e) => updateStep(i, e.target.value)}
                                                required
                                            />
                                            {esercizioSteps.length > 1 && (
                                                <button type="button" onClick={() => removeStep(i)} className="btn-icon-danger">✕</button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="alert alert-info" style={{ marginTop: '16px' }}>
                                    💡 <strong>Suggerimento:</strong> Scrivi istruzioni semplici e chiare.
                                    Il paziente vedrà un passaggio alla volta con font molto grandi.
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowEsercizioModal(false)} className="btn btn-outline">
                                    Annulla
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    + Aggiungi Esercizio
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL: Scarta Modifiche */}
            {/* ============================================================ */}
            {showDiscardModal && (
                <div className="modal-overlay" onClick={() => setShowDiscardModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
                        <h2 className="modal-title" style={{ justifyContent: 'center', marginBottom: '8px' }}>
                            Scartare le modifiche?
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                            Tutte le modifiche non salvate andranno perse. Questa azione non può essere annullata.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button onClick={() => setShowDiscardModal(false)} className="btn btn-outline">Annulla</button>
                            <button
                                onClick={() => {
                                    setShowDiscardModal(false);
                                    router.refresh();
                                }}
                                className="btn btn-danger"
                            >
                                Scarta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
