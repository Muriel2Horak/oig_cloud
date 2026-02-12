export interface BoilerProfile {
  id: string;
  name: string;
  targetTemp: number;
  startTime: string;
  endTime: string;
  days: number[];
  enabled: boolean;
}

export interface BoilerState {
  currentTemp: number;
  targetTemp: number;
  heating: boolean;
  nextProfile?: string;
  nextStart?: string;
}

export interface BoilerHourData {
  hour: number;
  temp: number;
  heating: boolean;
  profile?: string;
}

export const DAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
export const DAYS_FULL = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
