import { ThinkStillMode, ThinkStillRitual, getModeCopy, readSavedIntensity, saveIntensity } from "./thinkstillData";

export function selectThinkStillCopy(ritual: ThinkStillRitual, mode?: ThinkStillMode) {
  return getModeCopy(ritual, mode ?? readSavedIntensity());
}

export function setThinkStillIntensity(mode: ThinkStillMode) {
  saveIntensity(mode);
  return mode;
}
