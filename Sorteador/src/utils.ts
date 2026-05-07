import type { Participant, PublicState, ResultItem } from "./types";

export function participantsToText(participants: Participant[]) {
  return participants.map((participant) => participant.name).join("\n");
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getLatestResults(state: PublicState): ResultItem[] {
  if (!state.results.length) return [];
  const lastRound = Math.max(...state.results.map((item) => item.round));
  return state.results.filter((item) => item.round === lastRound);
}
