export type StageStatus = "idle" | "rolling" | "revealed";

export interface Participant {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

export interface ResultItem {
  id: string;
  participantId: string;
  name: string;
  key: string;
  round: number;
  drawId: string;
  selectedAt: string;
}

export interface Settings {
  noRepeat: boolean;
  drawQuantity: number;
}

export interface Stage {
  status: StageStatus;
  currentName: string;
  round: number;
  drawId: string | null;
}

export interface PublicState {
  participants: Participant[];
  results: ResultItem[];
  settings: Settings;
  stage: Stage;
  updatedAt: string;
}
