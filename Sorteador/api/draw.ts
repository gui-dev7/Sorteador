type DrawRequest = {
  names?: string[];
  quantity?: number;
  noRepeat?: boolean;
  previousKeys?: string[];
};

type DrawResult = {
  id: string;
  participantId: string;
  name: string;
  key: string;
  round: number;
  drawId: string;
  selectedAt: string;
};

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
  json: (data: unknown) => void;
};

function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function makeKey(name: string) {
  return cleanName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const output: { id: string; name: string; key: string }[] = [];

  for (const rawName of names) {
    const name = cleanName(rawName);
    if (!name) continue;

    const key = makeKey(name);
    if (seen.has(key)) continue;

    seen.add(key);
    output.push({ id: crypto.randomUUID(), name, key });
  }

  return output;
}

function randomSample<T>(items: T[], quantity: number) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const j = random[0] % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, quantity);
}

function parseBody(body: unknown): DrawRequest {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as DrawRequest;
    } catch {
      return {};
    }
  }
  return body as DrawRequest;
}

function send(response: ApiResponse, data: unknown, status = 200) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(data);
}

export default function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method === "GET") {
    return send(response, { ok: true, service: "sorteador-draw-api", runtime: "vercel-functions" });
  }

  if (request.method !== "POST") {
    return send(response, { ok: false, error: "Método não permitido." }, 405);
  }

  const body = parseBody(request.body);
  const names = Array.isArray(body.names) ? body.names : [];
  const quantity = Math.max(1, Math.min(Number(body.quantity || 1), 50));
  const previousKeys = new Set(Array.isArray(body.previousKeys) ? body.previousKeys : []);
  const noRepeat = body.noRepeat !== false;

  const participants = uniqueNames(names);
  const available = noRepeat ? participants.filter((participant) => !previousKeys.has(participant.key)) : participants;

  if (participants.length === 0) {
    return send(response, { ok: false, error: "Adicione participantes antes de sortear." }, 400);
  }

  if (available.length === 0) {
    return send(response, { ok: false, error: "Não há nomes disponíveis. Libere os nomes anteriores ou desligue o modo sem repetição." }, 400);
  }

  if (quantity > available.length) {
    return send(response, { ok: false, error: "A quantidade selecionada é maior que a lista disponível." }, 400);
  }

  const drawId = crypto.randomUUID();
  const selectedAt = new Date().toISOString();
  const selected = randomSample(available, quantity);

  const results: DrawResult[] = selected.map((participant) => ({
    id: crypto.randomUUID(),
    participantId: participant.id,
    name: participant.name,
    key: participant.key,
    round: 1,
    drawId,
    selectedAt
  }));

  return send(response, { ok: true, drawId, results });
}
