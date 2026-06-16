export interface Waypoint {
  x: number;
  y: number;
  name?: string;
}

export type PathType = 'shortest' | 'fastest' | 'alternative';

export interface Path {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distance: number;
  estimatedTime: number;
  waypoints: Waypoint[];
  type: PathType;
  createTime: string;
}

export type MapPointType = 'warehouse' | 'workshop' | 'yard' | 'dock' | 'charging' | 'intersection';

export interface MapPoint {
  name: string;
  type: MapPointType;
  x: number;
  y: number;
}
