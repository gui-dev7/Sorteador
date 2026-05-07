import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import clsx from "clsx";
import type { PublicState, Settings } from "./types";
import { formatDateTime, getLatestResults, participantsToText } from "./utils";

const DRAW_ANIMATION_MS = 4300;
const STORAGE_KEY = "sorteador-fiap-vercel-state-v2";

const initialState: PublicState = {
  participants: [],
  results: [],
  settings: {
    noRepeat: true,
    drawQuantity: 1
  },
  stage: {
    status: "idle",
    currentName: "Pronto para sortear",
    round: 0,
    drawId: null
  },
  updatedAt: new Date().toISOString()
};

const sampleList = [
  "Guilherme Oliveira",
  "Lucas Martins",
  "Evandro Lima",
  "Marcos Vinícius",
  "Ana Clara",
  "Beatriz Rocha",
  "Rafael Souza",
  "Camila Torres",
  "João Pedro",
  "Fernanda Alves",
  "Larissa Nunes",
  "Matheus Henrique",
  "Guilherme Oliveira"
].join("\n");

type IconName = "stage" | "draw" | "list" | "history" | "copy" | "reset" | "clear" | "sample" | "close" | "gear" | "spark";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 48 48", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true };
  const stroke = "currentColor";
  const sw = 3.4;

  const paths: Record<IconName, ReactNode> = {
    stage: <svg {...common}><path d="M8 10H40V29C40 32.3 37.3 35 34 35H14C10.7 35 8 32.3 8 29V10Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M17 41H31M24 35V41M16 19H32M18 26H30" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>,
    draw: <svg {...common}><path d="M24 5C34.5 5 43 13.5 43 24C43 34.5 34.5 43 24 43C13.5 43 5 34.5 5 24C5 13.5 13.5 5 24 5Z" stroke={stroke} strokeWidth={sw}/><path d="M24 11V24L34 30" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/><path d="M12.5 16.5L16 12.5M35.5 16.5L32 12.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity="0.55"/></svg>,
    list: <svg {...common}><path d="M15 12H41M15 24H41M15 36H33" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/><path d="M7 12H7.1M7 24H7.1M7 36H7.1" stroke={stroke} strokeWidth={sw + 2} strokeLinecap="round"/></svg>,
    history: <svg {...common}><path d="M24 9C15.7 9 9 15.7 9 24C9 32.3 15.7 39 24 39C32.3 39 39 32.3 39 24" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/><path d="M39 11V20H30" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/><path d="M39 20C36.5 13.6 30.8 9 24 9M24 16V25L30 29" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>,
    copy: <svg {...common}><path d="M16 16H35C37.2 16 39 17.8 39 20V39C39 41.2 37.2 43 35 43H16C13.8 43 12 41.2 12 39V20C12 17.8 13.8 16 16 16Z" stroke={stroke} strokeWidth={sw}/><path d="M9 32V10C9 7.8 10.8 6 13 6H32" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>,
    reset: <svg {...common}><path d="M13 14C16 10.9 20.2 9 24.8 9C33.3 9 40.2 15.9 40.2 24.4C40.2 32.9 33.3 39.8 24.8 39.8C17.6 39.8 11.5 34.9 9.8 28.2" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/><path d="M8 10V19H17" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>,
    clear: <svg {...common}><path d="M12 14H36M19 14V10H29V14M16 20L18 40H30L32 20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/><path d="M22 25V35M27 25V35" stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity="0.55"/></svg>,
    sample: <svg {...common}><path d="M10 12C10 9.8 11.8 8 14 8H34C36.2 8 38 9.8 38 12V36C38 38.2 36.2 40 34 40H14C11.8 40 10 38.2 10 36V12Z" stroke={stroke} strokeWidth={sw}/><path d="M17 18H31M17 25H31M17 32H25" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>,
    close: <svg {...common}><path d="M14 14L34 34M34 14L14 34" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>,
    gear: <svg {...common}><path d="M24 16C28.4 16 32 19.6 32 24C32 28.4 28.4 32 24 32C19.6 32 16 28.4 16 24C16 19.6 19.6 16 24 16Z" stroke={stroke} strokeWidth={sw}/><path d="M24 5V10M24 38V43M5 24H10M38 24H43M10.6 10.6L14.2 14.2M33.8 33.8L37.4 37.4M37.4 10.6L33.8 14.2M14.2 33.8L10.6 37.4" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>,
    spark: <svg {...common}><path d="M25 4L29.8 18.2L44 23L29.8 27.8L25 42L20.2 27.8L6 23L20.2 18.2L25 4Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M10 6L11.8 11.2L17 13L11.8 14.8L10 20L8.2 14.8L3 13L8.2 11.2L10 6Z" stroke={stroke} strokeWidth="2.8" strokeLinejoin="round" opacity="0.65"/></svg>
  };

  return paths[name];
}

function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function makeKey(name: string) {
  return cleanName(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseText(text: string) {
  const all = text.split(/[\n,;]+/g).map(cleanName).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const name of all) {
    const key = makeKey(name);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  }

  return { all, visible: unique };
}

function AnimatedHeadline() {
  return (
    <h1 className="hero-title fiap-heading" aria-label="FIAP">
      <motion.span
        className="fiap-wordmark"
        aria-hidden="true"
        initial={{ y: 24, opacity: 0, scale: 0.94, filter: "blur(12px)" }}
        animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.78, type: "spring", stiffness: 150, damping: 18 }}
      />
    </h1>
  );
}

function MetricCard({ label, value, emphasis }: { label: string; value: number | string; emphasis?: boolean }) {
  return (
    <motion.div className={clsx("metric-card", emphasis && "emphasis")} whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.99 }}>
      <strong>{value}</strong>
      <span>{label}</span>
    </motion.div>
  );
}

function ToggleCard({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description: string }) {
  return (
    <motion.button type="button" className={clsx("toggle-card", checked && "active")} onClick={() => onChange(!checked)} whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <i aria-hidden="true" />
    </motion.button>
  );
}

function DrawArena({ state, onDraw, onOpenStage }: { state: PublicState; onDraw: () => void; onOpenStage: () => void }) {
  const latest = getLatestResults(state);
  const isRolling = state.stage.status === "rolling";
  const isRevealed = state.stage.status === "revealed";
  const hasParticipants = state.participants.length > 0;
  const isMultiReveal = isRevealed && latest.length >= 2;

  return (
    <section className={clsx("draw-arena premium-card", isRolling && "is-active-draw", isRevealed && "is-revealed-draw")}>
      <div className="arena-bg-text">FIAP</div>
      {isRolling && (
        <div className="arena-topline solo">
          <span className="draw-state running">Sorteando agora</span>
        </div>
      )}

      <div className={clsx("stage-orbit", isRolling && "is-rolling", isRevealed && "is-revealed")} aria-live="polite">
        <div className="orbit-ring ring-one" />
        <div className="orbit-ring ring-two" />
        <div className="speed-streaks" />
        <div className="orbit-glow" />
        <AnimatePresence>{isRevealed && <motion.div className="result-impact" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0], scale: [0.2, 1.15, 1.8] }} exit={{ opacity: 0 }} transition={{ duration: 0.78, ease: "easeOut" }} />}</AnimatePresence>

        {isMultiReveal ? (
          <motion.div
            key={`multi-${state.stage.drawId}`}
            className="multi-winner-reveal"
            initial={{ opacity: 0, y: 36, scale: 0.88, filter: "blur(16px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.64, type: "spring", stiffness: 160, damping: 18 }}
          >
            <span className="multi-winner-kicker">{latest.length} pessoas sorteadas</span>
            <div className="multi-winner-list">
              {latest.map((item, index) => (
                <motion.strong
                  key={item.id}
                  initial={{ opacity: 0, y: 18, scale: 0.84 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.14 + index * 0.08, type: "spring", stiffness: 230, damping: 17 }}
                  whileHover={{ y: -3, scale: 1.025 }}
                >
                  {item.name}
                </motion.strong>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`${state.stage.drawId}-${state.stage.currentName}`}
            className={clsx("main-name", isRolling && "rolling-name", isRevealed && "revealed-name")}
            initial={{ opacity: 0, y: isRolling ? 18 : 34, scale: isRolling ? 0.96 : 0.9, filter: isRolling ? "blur(8px)" : "blur(14px)" }}
            animate={{ opacity: 1, y: 0, scale: isRolling ? 0.98 : 1, filter: isRolling ? "blur(2.4px)" : "blur(0px)" }}
            transition={isRolling ? { duration: 0.13, ease: "easeOut" } : { duration: 0.56, type: "spring", stiffness: 155, damping: 17 }}
          >
            {state.stage.currentName}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {latest.length === 1 && isRevealed && (
          <motion.div className="result-strip" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {latest.map((item, index) => (
              <motion.div className="result-chip" key={item.id} initial={{ opacity: 0, scale: 0.78, rotate: -3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: index * 0.08, type: "spring", stiffness: 260, damping: 16 }} whileHover={{ y: -3, scale: 1.025 }}>
                <span>{item.name}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="arena-actions">
        <button className="primary-action" type="button" onClick={onDraw} disabled={isRolling || !hasParticipants}>
          <Icon name="draw" size={19} />
          {isRolling ? "Sorteando..." : "Sortear agora"}
        </button>
        <button className="ghost-action" type="button" onClick={onOpenStage}>
          <Icon name="stage" size={19} />
          Abrir palco
        </button>
      </div>
    </section>
  );
}

function ParticipantPreview({ names, previousKeys }: { names: string[]; previousKeys: Set<string> }) {
  return (
    <section className="panel live-preview interactive-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Renderização em tempo real</span>
          <h2>Lista no palco</h2>
        </div>
      </div>

      <div className="chips-zone">
        {names.length === 0 ? (
          <div className="empty-state">
            <Icon name="spark" />
            <p>Digite os nomes no painel para visualizar tudo ao vivo.</p>
          </div>
        ) : (
          names.map((name, index) => {
            const alreadyDrawn = previousKeys.has(makeKey(name));
            return (
              <motion.div className={clsx("participant-chip", alreadyDrawn && "already-drawn")} key={`${name}-${index}`} layout initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(index * 0.012, 0.24), type: "spring", stiffness: 260, damping: 21 }} whileHover={{ y: -2, scale: 1.025 }}>
                <span>{name}</span>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
}

function HistoryPanel({ state, onResetResults }: { state: PublicState; onResetResults: () => void }) {
  return (
    <section className="panel history-panel interactive-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Registro do sorteio</span>
          <h2>Resultados anteriores</h2>
        </div>
      </div>

      {state.results.length === 0 ? (
        <div className="empty-state compact">
          <Icon name="spark" />
          <p>Nenhum resultado ainda. Ao sortear, o registro aparece aqui.</p>
        </div>
      ) : (
        <div className="timeline">
          {[...state.results].reverse().map((item) => (
            <motion.div className="timeline-item" key={item.id} layout initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} whileHover={{ x: 4 }}>
              <div className="timeline-dot" />
              <div>
                <strong>{item.name}</strong>
                <span>{formatDateTime(item.selectedAt)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="panel-actions single">
        <button className="soft-action" type="button" onClick={onResetResults}>
          <Icon name="reset" size={17} />
          Liberar nomes
        </button>
      </div>
    </section>
  );
}

function ControlPanel({
  state,
  text,
  setText,
  parsed,
  onSettings,
  onDraw,
  onSample,
  onClear,
  onCopy
}: {
  state: PublicState;
  text: string;
  setText: (text: string) => void;
  parsed: ReturnType<typeof parseText>;
  onSettings: (settings: Partial<Settings>) => void;
  onDraw: () => void;
  onSample: () => void;
  onClear: () => void;
  onCopy: () => void;
}) {
  const isRolling = state.stage.status === "rolling";

  return (
    <section className="panel control-panel interactive-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Painel de comando</span>
          <h2>Controle do sorteio</h2>
        </div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="participants">Participantes</label>
        <span>{parsed.visible.length} nomes reconhecidos</span>
      </div>
      <textarea id="participants" className="participants-input" value={text} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)} placeholder={"Digite um nome por linha\nOu separe por vírgula\nExemplo:\nGuilherme\nLucas\nEvandro\nMarcos"} />

      <div className="input-grid compact">
        <label className="number-field">
          <span>Quantidade sorteada</span>
          <input type="number" min={1} max={50} value={state.settings.drawQuantity} onChange={(event: ChangeEvent<HTMLInputElement>) => onSettings({ drawQuantity: Math.max(Number(event.target.value || 1), 1) })} />
        </label>
      </div>

      <div className="toggle-grid single-toggle">
        <ToggleCard checked={state.settings.noRepeat} onChange={(checked) => onSettings({ noRepeat: checked })} title="Não repetir resultado" description="Quem já saiu não entra nos próximos sorteios." />
      </div>

      <div className="panel-actions">
        <button className="primary-action" type="button" onClick={onDraw} disabled={isRolling || parsed.visible.length === 0}>
          <Icon name="draw" size={18} />
          {isRolling ? "Sorteando..." : "Sortear"}
        </button>
        <button className="soft-action" type="button" onClick={onSample}><Icon name="sample" size={17} />Exemplo</button>
        <button className="soft-action" type="button" onClick={onCopy}><Icon name="copy" size={17} />Copiar</button>
        <button className="danger-action" type="button" onClick={onClear}><Icon name="clear" size={17} />Limpar</button>
      </div>
    </section>
  );
}

function StageFullscreen({ state, participantCount, onClose, onDraw }: { state: PublicState; participantCount: number; onClose: () => void; onDraw: () => void }) {
  const latest = getLatestResults(state);
  const isRolling = state.stage.status === "rolling";
  const isRevealed = state.stage.status === "revealed";
  const isMultiReveal = isRevealed && latest.length >= 2;

  return (
    <motion.div className="stage-fullscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="stage-noise" />
      <button className="close-stage" type="button" onClick={onClose} aria-label="Fechar palco"><Icon name="close" /></button>
      <div className="stage-content-full">
        <div className={clsx("stage-orbit huge", isRolling && "is-rolling", isRevealed && "is-revealed")} aria-live="assertive">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="speed-streaks" />
          <div className="orbit-glow" />
          <AnimatePresence>{isRevealed && <motion.div className="result-impact" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0], scale: [0.2, 1.2, 1.9] }} exit={{ opacity: 0 }} transition={{ duration: 0.82, ease: "easeOut" }} />}</AnimatePresence>

          {isMultiReveal ? (
            <motion.div key={`stage-multi-${state.stage.drawId}`} className="multi-winner-reveal stage-multi" initial={{ opacity: 0, y: 42, scale: 0.86, filter: "blur(16px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.66, type: "spring", stiffness: 150, damping: 18 }}>
              <span className="multi-winner-kicker">{latest.length} pessoas sorteadas</span>
              <div className="multi-winner-list stage-multi-list">
                {latest.map((item, index) => (
                  <motion.strong key={item.id} initial={{ opacity: 0, y: 28, scale: 0.82 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.14 + index * 0.1, type: "spring", stiffness: 190, damping: 17 }}>
                    {item.name}
                  </motion.strong>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key={`stage-${state.stage.drawId}-${state.stage.currentName}`} className={clsx("main-name huge-name", isRolling && "rolling-name", isRevealed && "revealed-name")} initial={{ opacity: 0, y: isRolling ? 24 : 40, scale: isRolling ? 0.96 : 0.88, filter: isRolling ? "blur(10px)" : "blur(16px)" }} animate={{ opacity: 1, y: 0, scale: isRolling ? 0.98 : 1, filter: isRolling ? "blur(2.7px)" : "blur(0px)" }} transition={isRolling ? { duration: 0.12, ease: "easeOut" } : { duration: 0.6, type: "spring", stiffness: 145, damping: 17 }}>
              {state.stage.currentName}
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {latest.length === 1 && isRevealed && (
            <motion.div className="stage-results" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {latest.map((item, index) => (
                <motion.div className="stage-result" key={item.id} initial={{ opacity: 0, y: 20, scale: 0.88 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.15 + index * 0.09, type: "spring", stiffness: 180 }}>
                  {item.name}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="stage-footer">
          <span>{participantCount} participantes</span>
        </div>

        <button className="stage-draw" type="button" onClick={onDraw} disabled={isRolling || participantCount === 0}>
          {isRolling ? "Sorteando..." : "Sortear novamente"}
          <Icon name="draw" size={22} />
        </button>
      </div>
    </motion.div>
  );
}

function Toast({ message }: { message: string }) {
  return <AnimatePresence>{message && <motion.div className="toast" initial={{ opacity: 0, y: 30, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }}>{message}</motion.div>}</AnimatePresence>;
}

function createParticipantsFromText(text: string) {
  return parseText(text).visible.map((name) => ({
    id: crypto.randomUUID(),
    name,
    key: makeKey(name),
    createdAt: new Date().toISOString()
  }));
}

function getAvailableNames(names: string[], previousKeys: Set<string>, noRepeat: boolean) {
  if (!noRepeat) return names;
  return names.filter((name) => !previousKeys.has(makeKey(name)));
}

function randomSampleNames(names: string[], quantity: number) {
  const copy = [...names];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const j = random[0] % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, quantity);
}

function createLocalResults(names: string[], drawId: string, round: number) {
  const selectedAt = new Date().toISOString();

  return names.map((name) => ({
    id: crypto.randomUUID(),
    participantId: crypto.randomUUID(),
    name,
    key: makeKey(name),
    round,
    drawId,
    selectedAt
  }));
}

function getRollingDelay(progress: number) {
  const eased = 1 - Math.pow(1 - progress, 3);
  return 42 + eased * 205;
}

async function requestDrawFromVercelApi(payload: {
  names: string[];
  quantity: number;
  noRepeat: boolean;
  previousKeys: string[];
}) {
  const response = await fetch("/api/draw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Não foi possível sortear agora.");
  }

  return data as { ok: true; drawId: string; results: PublicState["results"] };
}

function loadSavedState(): PublicState {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;

    const saved = JSON.parse(raw) as Partial<PublicState>;
    return {
      ...initialState,
      ...saved,
      settings: {
        ...initialState.settings,
        ...(saved.settings || {})
      },
      stage: {
        ...initialState.stage,
        ...(saved.stage || {}),
        status: saved.stage?.status === "rolling" ? "idle" : saved.stage?.status || initialState.stage.status,
        currentName: saved.stage?.status === "rolling" ? "Pronto para sortear" : saved.stage?.currentName || initialState.stage.currentName
      },
      updatedAt: new Date().toISOString()
    };
  } catch {
    return initialState;
  }
}

export default function App() {
  const savedStateRef = useRef<PublicState | null>(null);
  if (!savedStateRef.current) savedStateRef.current = loadSavedState();

  const [state, setState] = useState<PublicState>(() => savedStateRef.current || initialState);
  const [text, setText] = useState(() => participantsToText((savedStateRef.current || initialState).participants));
  const [toast, setToast] = useState("");
  const [stageOpen, setStageOpen] = useState(false);
  const drawTimer = useRef<number | null>(null);

  const parsed = useMemo(() => parseText(text), [text]);
  const previousKeys = useMemo(() => new Set(state.results.map((item) => item.key)), [state.results]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 1500;
    const colors = ["#ff7a1a", "#ff2fa3", "#ffffff", "#a7a7a7", "#111111"];
    const frame = () => {
      confetti({ particleCount: 6, angle: 58, spread: 70, origin: { x: 0 }, colors, scalar: 0.95 });
      confetti({ particleCount: 6, angle: 122, spread: 70, origin: { x: 1 }, colors, scalar: 0.95 });
      confetti({ particleCount: 2, spread: 90, origin: { x: 0.5, y: 0.36 }, colors, scalar: 1.2 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  useEffect(() => {
    const participants = createParticipantsFromText(text);
    setState((current) => ({
      ...current,
      participants,
      updatedAt: new Date().toISOString()
    }));
  }, [text]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setStageOpen(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!stageOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const previousBodyTouchAction = body.style.touchAction;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;
      body.style.touchAction = previousBodyTouchAction;
      body.style.overscrollBehavior = previousBodyOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [stageOpen]);

  useEffect(() => {
    return () => {
      if (drawTimer.current) window.clearTimeout(drawTimer.current);
    };
  }, []);

  const updateText = useCallback((nextText: string) => {
    setText(nextText);
  }, []);

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, ...settings },
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const draw = useCallback(async () => {
    if (parsed.visible.length === 0) {
      showToast("Adicione participantes antes de sortear.");
      return;
    }

    if (state.stage.status === "rolling") return;

    const quantity = Math.max(1, Number(state.settings.drawQuantity || 1));
    const availableNames = getAvailableNames(parsed.visible, previousKeys, state.settings.noRepeat);

    if (availableNames.length === 0) {
      showToast("Não há nomes disponíveis. Libere os nomes anteriores ou desligue o modo sem repetição.");
      return;
    }

    if (quantity > availableNames.length) {
      showToast("A quantidade selecionada é maior que a lista disponível.");
      return;
    }

    const drawId = crypto.randomUUID();
    const round = state.stage.round + 1;
    const startedAt = Date.now();

    const apiPromise = requestDrawFromVercelApi({
      names: parsed.visible,
      quantity,
      noRepeat: state.settings.noRepeat,
      previousKeys: [...previousKeys]
    }).catch(() => {
      const selectedNames = randomSampleNames(availableNames, quantity);
      return {
        ok: true as const,
        drawId,
        results: createLocalResults(selectedNames, drawId, round)
      };
    });

    setState((current) => ({
      ...current,
      stage: {
        status: "rolling",
        currentName: availableNames[Math.floor(Math.random() * availableNames.length)] || "Sorteando...",
        round,
        drawId
      },
      updatedAt: new Date().toISOString()
    }));

    if (drawTimer.current) window.clearTimeout(drawTimer.current);

    const tick = async () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / DRAW_ANIMATION_MS, 1);
      const currentName = availableNames[Math.floor(Math.random() * availableNames.length)] || "Sorteando...";

      setState((current) => ({
        ...current,
        stage: {
          ...current.stage,
          currentName
        },
        updatedAt: new Date().toISOString()
      }));

      if (progress >= 1) {
        drawTimer.current = null;
        const response = await apiPromise;
        const normalizedResults = response.results.map((item) => ({
          ...item,
          round,
          drawId: response.drawId || drawId
        }));

        setState((current) => ({
          ...current,
          results: [...current.results, ...normalizedResults],
          stage: {
            status: "revealed",
            currentName: normalizedResults.length === 1 ? normalizedResults[0].name : `${normalizedResults.length} pessoas sorteadas`,
            round,
            drawId: response.drawId || drawId
          },
          updatedAt: new Date().toISOString()
        }));

        fireConfetti();
        showToast("Resultado revelado.");
        return;
      }

      drawTimer.current = window.setTimeout(tick, getRollingDelay(progress));
    };

    drawTimer.current = window.setTimeout(tick, 42);
  }, [fireConfetti, parsed.visible, previousKeys, showToast, state.settings.drawQuantity, state.settings.noRepeat, state.stage.round, state.stage.status]);

  const openStage = useCallback(async () => {
    setStageOpen(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      showToast("Palco aberto. O navegador não autorizou tela cheia automática.");
    }
  }, [showToast]);

  const closeStage = useCallback(async () => {
    setStageOpen(false);
    if (document.fullscreenElement) await document.exitFullscreen();
  }, []);

  const resetResults = useCallback(() => {
    setState((current) => ({
      ...current,
      results: [],
      stage: {
        ...current.stage,
        status: "idle",
        currentName: "Nomes liberados",
        drawId: null
      },
      updatedAt: new Date().toISOString()
    }));
    showToast("Nomes liberados para novos sorteios.");
  }, [showToast]);

  const clearAll = useCallback(() => {
    if (drawTimer.current) window.clearTimeout(drawTimer.current);
    drawTimer.current = null;
    setText("");
    setState({ ...initialState, updatedAt: new Date().toISOString() });
    localStorage.removeItem(STORAGE_KEY);
    showToast("Tudo limpo.");
  }, [showToast]);

  const useSample = useCallback(() => {
    updateText(sampleList);
    showToast("Lista de exemplo aplicada.");
  }, [showToast, updateText]);

  const copyResults = useCallback(async () => {
    if (!state.results.length) {
      showToast("Ainda não existe resultado para copiar.");
      return;
    }
    const content = state.results.map((item) => `Resultado ${item.name} - ${formatDateTime(item.selectedAt)}`).join("\n");
    await navigator.clipboard.writeText(content);
    showToast("Resultado copiado.");
  }, [showToast, state.results]);

  return (
    <>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <main className="app-shell">
        <header className="hero-section">
          <motion.div className="hero-title-wrap" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <AnimatedHeadline />
          </motion.div>
        </header>

        <section className="metrics-grid single-metric">
          <MetricCard label="Participantes" value={parsed.visible.length} emphasis />
        </section>

        <section className="main-grid">
          <div className="left-column">
            <DrawArena state={state} onDraw={draw} onOpenStage={openStage} />
            <ParticipantPreview names={parsed.visible} previousKeys={state.settings.noRepeat ? previousKeys : new Set()} />
          </div>

          <div className="right-column">
            <ControlPanel state={state} text={text} setText={updateText} parsed={parsed} onSettings={updateSettings} onDraw={draw} onSample={useSample} onClear={clearAll} onCopy={copyResults} />
            <HistoryPanel state={state} onResetResults={resetResults} />
          </div>
        </section>
      </main>

      <AnimatePresence>{stageOpen && <StageFullscreen state={state} participantCount={parsed.visible.length} onClose={closeStage} onDraw={draw} />}</AnimatePresence>
      <Toast message={toast} />
    </>
  );
}
