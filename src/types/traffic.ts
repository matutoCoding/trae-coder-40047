export type IntersectionStatus = 'passable' | 'controlled' | 'maintenance';

export interface Intersection {
  id: string;
  name: string;
  x: number;
  y: number;
  status: IntersectionStatus;
  passCount: number;
  currentAgvs: string[];
}

export type RuleType = 'yield' | 'speed_limit' | 'no_entry';

export interface TrafficRule {
  id: string;
  intersectionId: string;
  type: RuleType;
  description: string;
  enabled: boolean;
  createTime: string;
}
