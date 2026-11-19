import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { ConfirmButton, Notice, PageHeader, Segmented } from '../components/ui';
import { CORE_META } from '../data/core';
import { formatDateTime } from '../domain/dates';
import { SRS } from '../domain/srs';
import type { AnswerMode, AudioPreference, ThemeSetting } from '../domain/types';
import { analyzeImport, buildCsv, buildExport, planImport, type DuplicateStrategy, type ImportAnalysis } from '../storage/importExport';
import { saveTextFile } from '../services/download';
import { providerStatus, type ProviderStatus } from '../services/lookup';
import { englishVoices, nativeAudioAvailable, onVoicesChanged, speak, speechSupported, type VoiceInfo } from '../services/speech';
import { useApp } from '../state/AppContext';

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="card flex flex-col gap-4 p-5">
      <div>
        <h2 id={id} className="text-xl font-bold">
          {title}
        </h2>
        {intro && <div className="mt-1 text-sm text-ink-2">{intro}</div>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 max-w-md">
        <label htmlFor={htmlFor} className="font-bold">
          {label}
        </label>
        {hint && <p className="text-sm text-ink-2">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Switch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-ocean' : 'bg-line'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-surface shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

export function SettingsPage() {
  const app = useApp();
  const { settings, updateSettings, sync, syncNow, storageKind, storageError, inClaude, toast } = app;
  const [voices, setVoices] = useState<VoiceInfo[]>(() => englishVoices());
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [strategy, setStrategy] = useState<DuplicateStrategy>('newest');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => onVoicesChanged(() => setVoices(englishVoices())), []);
  useEffect(() => {
    providerStatus().then(setStatus);
  }, []);

  const au = voices.filter((v) => v.australian);
  const current = voices.find((v) => v.uri === settings.voiceURI) ?? voices[0] ?? null;

  async function exportJson() {
    const data = app.getRepoData();
    const file = buildExport(data, Date.now());
    const r = await saveTextFile(`oz-vocab-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(file, null, 1), 'application/json');
    if (r.ok) toast('Sauvegarde exportée.', 'success');
    else toast(r.message, 'error');
  }
  async function exportCsv() {
    const r = await saveTextFile(`oz-vocab-vocabulaire-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(app.words, Date.now()), 'text/csv');
    if (r.ok) toast('Vocabulaire exporté en CSV.', 'success');
    else toast(r.message, 'error');
  }
  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast('Fichier trop volumineux (20 Mo au maximum).', 'error');
      return;
    }
    const text = await file.text();
    setAnalysis(analyzeImport(text, app.getRepoData()));
    if (fileRef.current) fileRef.current.value = '';
  }
  async function confirmImport() {
    if (!analysis?.ok) return;
    const changes = planImport(analysis, app.getRepoData(), strategy, Date.now());
    await app.applyImport(changes);
    const nw = changes.words?.length ?? 0;
    const ns = changes.sessions?.length ?? 0;
    toast(`Import terminé : ${nw} mot${nw > 1 ? 's' : ''} et ${ns} session${ns > 1 ? 's' : ''} mis à jour.`, 'success');
    setAnalysis(null);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PageHeader eyebrow="Réglages" title="Paramètres" />

      <Section
        id="set-voice"
        title="Prononciation australienne"
        intro="La prononciation utilise les voix installées sur ton appareil, réglées en anglais australien (en-AU)."
      >
        {!speechSupported() ? (
          <Notice tone="error">Ce navigateur ne propose pas de synthèse vocale. Essaie Safari, Chrome ou Edge à jour.</Notice>
        ) : au.length > 0 ? (
          <Notice>
            <strong>{au.length} voix australienne{au.length > 1 ? 's' : ''} détectée{au.length > 1 ? 's' : ''}</strong> : {au.map((v) => v.name).join(', ')}.
          </Notice>
        ) : (
          <Notice tone="warn">
            <p>
              <strong>Aucune voix australienne n’est installée sur cet appareil.</strong> La lecture utilise une autre voix anglaise
              {current ? ` (${current.name}, ${current.lang})` : ''} : l’accent ne sera pas australien.
              {nativeAudioAvailable() && ' Quand un enregistrement humain australien existe pour un mot (Wiktionary), il est utilisé à la place.'}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer font-bold">Installer une voix australienne</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>iPhone / iPad</strong> : Réglages › Accessibilité › Contenu énoncé › Voix › Anglais › choisis Karen, Lee, Catherine ou Gordon (Australie), version « améliorée »,
                  puis recharge la page.
                </li>
                <li>
                  <strong>Mac</strong> : Réglages Système › Accessibilité › Contenu énoncé › Voix du système › Gérer les voix › Anglais (Australie).
                </li>
                <li>
                  <strong>Windows</strong> : Paramètres › Heure et langue › Voix › Ajouter des voix › English (Australia). Le navigateur Edge propose aussi les voix en ligne Natasha et
                  William.
                </li>
                <li>
                  <strong>Android</strong> : Paramètres › Synthèse vocale › Moteur Google › Installer les données vocales › English (Australia).
                </li>
              </ul>
            </details>
          </Notice>
        )}
        {voices.length > 0 && (
          <Row label="Voix utilisée" htmlFor="set-voice-select">
            <select
              id="set-voice-select"
              className="field max-w-xs"
              value={settings.voiceURI ?? ''}
              onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}
            >
              <option value="">Automatique (meilleure voix australienne)</option>
              {voices.map((v) => (
                <option key={v.uri} value={v.uri}>
                  {v.name} · {v.lang}
                  {v.australian ? ' · Australie' : ''}
                </option>
              ))}
            </select>
          </Row>
        )}
        <Row label="Vitesse de lecture" htmlFor="set-rate" hint={`${settings.speechRate.toFixed(2).replace('.', ',')} × la vitesse normale`}>
          <input
            id="set-rate"
            type="range"
            min={0.6}
            max={1.2}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })}
            className="w-48 accent-[var(--ocean)]"
          />
        </Row>
        <Row label="Lecture automatique" htmlFor="set-autoplay" hint="Prononce chaque mot dès qu’il s’affiche pendant la révision.">
          <Switch id="set-autoplay" checked={settings.autoPlay} onChange={(v) => updateSettings({ autoPlay: v })} />
        </Row>
        {!inClaude && (
          <Row label="Enregistrements humains" hint="Utiliser d’abord un enregistrement australien réel (Wiktionary) quand il existe. Nécessite Internet.">
            <Segmented<AudioPreference>
              label="Source audio"
              value={settings.audioPreference}
              onChange={(v) => updateSettings({ audioPreference: v })}
              options={[
                { value: 'tts', label: 'Voix de l’appareil' },
                { value: 'native-first', label: 'Enregistrement d’abord' },
              ]}
            />
          </Row>
        )}
        <div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              speak("G'day! How are you going? I'll see you this arvo at the beach.", { voiceURI: settings.voiceURI, rate: settings.speechRate }).then((r) =>
                toast(r.label, r.kind === 'tts-au' ? 'success' : 'info'),
              )
            }
          >
            <Icon name="volume" size={20} /> Tester la voix
          </button>
        </div>
      </Section>

      <Section id="set-review" title="Révision">
        <Row label="Mots par session" htmlFor="set-size" hint="Nombre de mots distincts au départ de chaque session.">
          <select id="set-size" className="field w-28" value={settings.sessionSize} onChange={(e) => updateSettings({ sessionSize: Number(e.target.value) })}>
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label="Nouveaux mots par jour"
          htmlFor="set-new"
          hint="Une fois tes révisions faites, « Réviser » propose une nouvelle liste. Avec une limite, il te demande avant de la dépasser."
        >
          <select id="set-new" className="field w-36" value={settings.newPerDay} onChange={(e) => updateSettings({ newPerDay: Number(e.target.value) })}>
            {[0, 10, 20, 30, 50, 80].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'Sans limite' : n}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Boutons de réponse" hint="Le mode avancé remplace « Je connais » par Difficile / Facile pour affiner les intervalles.">
          <Segmented<AnswerMode>
            label="Boutons de réponse"
            value={settings.answerMode}
            onChange={(v) => updateSettings({ answerMode: v })}
            options={[
              { value: 'two', label: '2 boutons' },
              { value: 'three', label: '3 niveaux' },
            ]}
          />
        </Row>
      </Section>

      <Section id="set-look" title="Apparence">
        <Row label="Thème">
          <Segmented<ThemeSetting>
            label="Thème"
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
              { value: 'system', label: 'Automatique' },
            ]}
          />
        </Row>
      </Section>

      <Section id="set-translate" title="Traduction automatique" intro="Utilisée par la page « Ajouter un mot ». Sans service, la saisie manuelle reste possible.">
        {status && (
          <Notice tone={status.id === 'none' ? 'warn' : 'info'}>
            <strong>{status.label}.</strong> {status.detail}
          </Notice>
        )}
        {!inClaude && status?.id === 'server' && (
          <Row label="Code d’accès du service" htmlFor="set-code" hint="Seulement si tu as défini LOOKUP_ACCESS_CODE sur ton hébergeur.">
            <input
              id="set-code"
              type="password"
              className="field max-w-xs"
              autoComplete="off"
              value={settings.lookupAccessCode}
              onChange={(e) => updateSettings({ lookupAccessCode: e.target.value })}
            />
          </Row>
        )}
      </Section>

      <Section
        id="set-sync"
        title="Sauvegarde et synchronisation"
        intro={
          <>
            <p>
              <strong>Sauvegarde locale</strong> : chaque réponse est enregistrée immédiatement dans ce navigateur (IndexedDB). Elle survit aux rechargements et fonctionne hors ligne,
              mais reste sur cet appareil.
            </p>
            <p className="mt-1">
              <strong>Synchronisation</strong> : copie tes données dans un espace en ligne lié à ton compte pour les retrouver sur un autre appareil.
            </p>
          </>
        }
      >
        {storageKind === 'memory' && (
          <Notice tone="error">
            Ce navigateur refuse le stockage local ({storageError}). Tes progrès seront perdus à la fermeture de la page
            {sync.state === 'idle' ? ', sauf ce qui est synchronisé' : ''}. Exporte une sauvegarde régulièrement.
          </Notice>
        )}
        {inClaude ? (
          sync.state === 'unavailable' ? (
            <Notice tone="warn">{sync.message ?? 'Synchronisation indisponible dans cette vue.'}</Notice>
          ) : (
            <>
              <Row label="Synchroniser mes appareils" htmlFor="set-sync-toggle" hint="Via ton compte claude.ai : ouvre ce même lien sur ton iPhone et ton ordinateur.">
                <Switch id="set-sync-toggle" checked={settings.syncEnabled} onChange={(v) => updateSettings({ syncEnabled: v })} />
              </Row>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <SyncBadge />
                {sync.lastAt && <span className="text-ink-2">Dernière synchronisation : {formatDateTime(sync.lastAt)}</span>}
                {settings.syncEnabled && (
                  <button type="button" className="btn btn-ghost min-h-10" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}>
                    <Icon name="refresh" size={18} /> Synchroniser maintenant
                  </button>
                )}
              </div>
              {sync.message && sync.state === 'error' && <Notice tone="warn">{sync.message}</Notice>}
            </>
          )
        ) : (
          <Notice>
            Cette version du site garde tes données sur cet appareil. Pour passer d’un appareil à l’autre, exporte une sauvegarde JSON ici puis importe-la sur l’autre appareil. Le
            code est prêt à recevoir un service de synchronisation (voir le README).
          </Notice>
        )}
      </Section>

      <Section id="set-data" title="Mes données" intro="Exporte une sauvegarde complète (JSON) ou ton vocabulaire dans un tableur (CSV).">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={exportJson}>
            <Icon name="download" size={20} /> Exporter la sauvegarde (JSON)
          </button>
          <button type="button" className="btn btn-ghost" onClick={exportCsv}>
            <Icon name="download" size={20} /> Exporter le vocabulaire (CSV)
          </button>
          <label className="btn btn-ghost cursor-pointer">
            <Icon name="upload" size={20} /> Importer une sauvegarde
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        </div>
        {analysis && (
          <div className="rounded-2xl border border-line p-4">
            {!analysis.ok ? (
              <Notice tone="error">{analysis.fatal}</Notice>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="font-bold">Contenu du fichier</p>
                <ul className="list-disc pl-5 text-sm tabular">
                  <li>{analysis.newWords} nouveaux mots</li>
                  <li>{analysis.sameId} mots déjà présents (même fiche)</li>
                  {analysis.sameEnglish > 0 && <li>{analysis.sameEnglish} mots en double (même mot anglais, fiche différente)</li>}
                  <li>{analysis.newSessions} nouvelles sessions sur {analysis.sessions.length}</li>
                </ul>
                {analysis.errors.length > 0 && (
                  <Notice tone="warn">
                    {analysis.errors.length} entrée{analysis.errors.length > 1 ? 's' : ''} ignorée{analysis.errors.length > 1 ? 's' : ''} : {analysis.errors.slice(0, 3).join(' ; ')}
                    {analysis.errors.length > 3 ? '…' : ''}
                  </Notice>
                )}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold">En cas de doublon</p>
                  <Segmented<DuplicateStrategy>
                    label="Gestion des doublons"
                    value={strategy}
                    onChange={setStrategy}
                    options={[
                      { value: 'newest', label: 'Garder le plus récent' },
                      { value: 'keep-local', label: 'Garder mes données' },
                      { value: 'replace', label: 'Remplacer par l’import' },
                    ]}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => void confirmImport()}>
                    Importer
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => setAnalysis(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-sm text-ink-2">Remet tous les mots à l’état « nouveau » et efface l’historique. Tes mots ajoutés sont conservés.</p>
          <ConfirmButton
            confirmLabel="Oui, tout remettre à zéro"
            onConfirm={() => {
              void app.resetAllProgress().then(() => toast('Progression remise à zéro.'));
            }}
          >
            <Icon name="refresh" size={20} /> Réinitialiser ma progression
          </ConfirmButton>
        </div>
      </Section>

      <Section id="set-about" title="À propos des données">
        <div className="flex flex-col gap-3 text-sm text-ink-2">
          <p>
            <strong className="text-ink">Liste de fréquence</strong> : {CORE_META.source}. Elle classe les lemmes (une entrée par famille de mots : « go » regroupe go, goes, went,
            gone, going) selon leur fréquence dans la partie orale d’un grand corpus d’anglais contemporain. Cinq balises de transcription (pause, unclear, laughter, breath, cough)
            ont été retirées ; l’ordre n’a pas été modifié. Le rang « n° » est la position dans la liste nettoyée, le rang NGSL-S celui de la source.{' '}
            <a className="text-ocean underline" href={CORE_META.sourceUrl} target="_blank" rel="noreferrer">
              newgeneralservicelist.com
            </a>
          </p>
          <p>
            <strong className="text-ink">Prononciation (IPA)</strong> : {CORE_META.ipaSource}, avec les symboles de Cox & Palethorpe (2007) pour l’anglais australien général (par ex.
            « day » /dæɪ/, « go » /ɡəʉ/). La conversion est automatique : quelques mots peuvent varier selon les locuteurs.
          </p>
          <p>
            <strong className="text-ink">Répétition espacée</strong> : adaptation de SM-2. Un mot inconnu revient en fin de session puis {SRS.learningStepMinutes} minutes plus tard ;
            un mot connu revient après 1 jour, puis l’intervalle est multiplié par sa facilité (2,5 au départ). Un oubli réduit la facilité et l’intervalle sans repartir de zéro. Un
            mot est « maîtrisé » à partir de {SRS.masteredInterval} jours d’intervalle.
          </p>
          <p>Traductions et exemples des 500 mots rédigés pour ce site ; tu peux corriger chaque fiche.</p>
        </div>
      </Section>
    </div>
  );
}

export function SyncBadge() {
  const { sync, settings } = useApp();
  const map: Record<string, [string, string]> = {
    checking: ['Vérification…', 'bg-surface-2 text-ink-2'],
    idle: ['Synchronisé', 'bg-gum-soft text-gum'],
    syncing: ['Synchronisation…', 'bg-ocean-soft text-ocean'],
    error: ['Échec de synchronisation', 'bg-coral-soft text-coral'],
    offline: ['Hors ligne', 'bg-wattle-soft text-wattle-ink'],
    disabled: ['Désactivée', 'bg-surface-2 text-ink-2'],
    unavailable: ['Locale uniquement', 'bg-surface-2 text-ink-2'],
  };
  const [label, cls] = map[settings.syncEnabled ? sync.state : sync.state === 'unavailable' ? 'unavailable' : 'disabled'];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>;
}
