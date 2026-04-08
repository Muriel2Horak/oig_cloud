import { describe, it, expect } from 'vitest';
import {
  FlowNode,
  FlowConnection,
  NODE_COLORS,
  DEFAULT_NODES,
  DEFAULT_CONNECTIONS,
} from '@/ui/features/flow/types';

describe('Flow types', () => {
  describe('NODE_COLORS', () => {
    it('should have colors for all node types', () => {
      expect(NODE_COLORS.solar).toBeDefined();
      expect(NODE_COLORS.battery).toBeDefined();
      expect(NODE_COLORS.inverter).toBeDefined();
      expect(NODE_COLORS.grid).toBeDefined();
      expect(NODE_COLORS.house).toBeDefined();
    });

    it('should use hex colors', () => {
      expect(NODE_COLORS.solar).toMatch(/^#[0-9a-f]{6}$/i);
      expect(NODE_COLORS.battery).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('DEFAULT_NODES', () => {
    it('should have 5 nodes', () => {
      expect(DEFAULT_NODES).toHaveLength(5);
    });

    it('should have solar node', () => {
      const solar = DEFAULT_NODES.find(n => n.id === 'solar');
      expect(solar).toBeDefined();
      expect(solar?.type).toBe('solar');
      expect(solar?.label).toBe('Solar');
    });

    it('should have battery node with soc data', () => {
      const battery = DEFAULT_NODES.find(n => n.id === 'battery');
      expect(battery).toBeDefined();
      expect(battery?.data).toHaveProperty('soc');
    });

    it('should have all required properties', () => {
      DEFAULT_NODES.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('x');
        expect(node).toHaveProperty('y');
        expect(node).toHaveProperty('width');
        expect(node).toHaveProperty('height');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('power');
        expect(node).toHaveProperty('data');
      });
    });
  });

  describe('DEFAULT_CONNECTIONS', () => {
    it('should have 4 connections', () => {
      expect(DEFAULT_CONNECTIONS).toHaveLength(4);
    });

    it('should connect solar to inverter', () => {
      const conn = DEFAULT_CONNECTIONS.find(c => c.id === 'solar-inverter');
      expect(conn).toBeDefined();
      expect(conn?.from).toBe('solar');
      expect(conn?.to).toBe('inverter');
    });

    it('should have bidirectional battery connection', () => {
      const conn = DEFAULT_CONNECTIONS.find(c => c.id === 'battery-inverter');
      expect(conn?.direction).toBe('bidirectional');
    });

    it('should have all required properties', () => {
      DEFAULT_CONNECTIONS.forEach(conn => {
        expect(conn).toHaveProperty('id');
        expect(conn).toHaveProperty('from');
        expect(conn).toHaveProperty('to');
        expect(conn).toHaveProperty('power');
        expect(conn).toHaveProperty('direction');
      });
    });
  });
});
