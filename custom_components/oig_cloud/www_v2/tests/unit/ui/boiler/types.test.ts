import { describe, it, expect } from 'vitest';
import {
  BoilerProfile,
  BoilerState,
  BoilerHourData,
  DAYS_SHORT,
  DAYS_FULL,
} from '@/ui/features/boiler/types';

describe('Boiler types', () => {
  describe('DAYS_SHORT', () => {
    it('should have 7 days', () => {
      expect(DAYS_SHORT).toHaveLength(7);
    });

    it('should have Czech abbreviations', () => {
      expect(DAYS_SHORT[0]).toBe('Po');
      expect(DAYS_SHORT[6]).toBe('Ne');
    });
  });

  describe('DAYS_FULL', () => {
    it('should have 7 days', () => {
      expect(DAYS_FULL).toHaveLength(7);
    });

    it('should have Czech names', () => {
      expect(DAYS_FULL[0]).toBe('Pondělí');
      expect(DAYS_FULL[6]).toBe('Neděle');
    });
  });

  describe('BoilerProfile', () => {
    it('should have required properties', () => {
      const profile: BoilerProfile = {
        id: '1',
        name: 'Ráno',
        targetTemp: 55,
        startTime: '06:00',
        endTime: '08:00',
        days: [1, 1, 1, 1, 1, 0, 0],
        enabled: true,
      };

      expect(profile.id).toBe('1');
      expect(profile.name).toBe('Ráno');
      expect(profile.targetTemp).toBe(55);
      expect(profile.days).toHaveLength(7);
    });
  });

  describe('BoilerState', () => {
    it('should have required properties', () => {
      const state: BoilerState = {
        currentTemp: 45,
        targetTemp: 55,
        heating: true,
      };

      expect(state.currentTemp).toBe(45);
      expect(state.heating).toBe(true);
    });

    it('should support optional next profile', () => {
      const state: BoilerState = {
        currentTemp: 45,
        targetTemp: 55,
        heating: false,
        nextProfile: 'Večer',
        nextStart: '18:00',
      };

      expect(state.nextProfile).toBe('Večer');
      expect(state.nextStart).toBe('18:00');
    });
  });

  describe('BoilerHourData', () => {
    it('should have required properties', () => {
      const data: BoilerHourData = {
        hour: 14,
        temp: 52,
        heating: true,
      };

      expect(data.hour).toBe(14);
      expect(data.temp).toBe(52);
    });
  });
});
