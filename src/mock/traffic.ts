import type { Intersection, TrafficRule } from '../types/traffic';

export const mockIntersections: Intersection[] = [
  {
    id: 'INT-001',
    name: '路口A',
    x: 150,
    y: 150,
    status: 'passable',
    passCount: 45,
    currentAgvs: [],
  },
  {
    id: 'INT-002',
    name: '路口B',
    x: 400,
    y: 100,
    status: 'passable',
    passCount: 78,
    currentAgvs: ['AGV-001'],
  },
  {
    id: 'INT-003',
    name: '路口C',
    x: 550,
    y: 300,
    status: 'controlled',
    passCount: 62,
    currentAgvs: ['AGV-006', 'AGV-002'],
  },
  {
    id: 'INT-004',
    name: '路口D',
    x: 300,
    y: 400,
    status: 'passable',
    passCount: 35,
    currentAgvs: [],
  },
  {
    id: 'INT-005',
    name: '路口E',
    x: 500,
    y: 250,
    status: 'maintenance',
    passCount: 28,
    currentAgvs: [],
  },
];

export const mockTrafficRules: TrafficRule[] = [
  {
    id: 'RULE-001',
    intersectionId: 'INT-001',
    type: 'yield',
    description: '东西方向车辆优先通行',
    enabled: true,
    createTime: '2026-01-15',
  },
  {
    id: 'RULE-002',
    intersectionId: 'INT-002',
    type: 'speed_limit',
    description: '路口限速1m/s',
    enabled: true,
    createTime: '2026-01-15',
  },
  {
    id: 'RULE-003',
    intersectionId: 'INT-003',
    type: 'yield',
    description: '执行高优先级任务车辆优先',
    enabled: true,
    createTime: '2026-02-20',
  },
  {
    id: 'RULE-004',
    intersectionId: 'INT-005',
    type: 'no_entry',
    description: '路口维护中，禁止通行',
    enabled: true,
    createTime: '2026-06-15',
  },
];
