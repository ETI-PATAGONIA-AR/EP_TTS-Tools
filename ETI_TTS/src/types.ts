export type VoiceName = "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Jorge" | "Dalia" | "Lorenzo" | "Valentina" | "Mateo";

export interface VoiceOption {
  value: VoiceName;
  label: string;
  gender: "Femenino" | "Masculino";
  description: string;
}

export interface Speaker {
  id: string;
  label: string;
  voice: VoiceName;
  pitch: string;
  rate: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  text: string;
  audioSrc: string;
  genre?: string;
}
