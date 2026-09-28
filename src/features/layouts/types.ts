import type { Orientation, ZoneConfig, ZoneKind, ZoneStyle } from "@/player/zones/types";

export type { Orientation, ZoneConfig, ZoneKind, ZoneStyle };

export type Zone = {
  id: string;
  org_id: string;
  layout_id: string;
  name: string;
  kind: ZoneKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  position: number;
  radius: number;
  style: ZoneStyle;
  config: ZoneConfig;
  source_id: string | null;
  playlist_id: string | null;
};

export type Layout = {
  id: string;
  org_id: string;
  name: string;
  template: string | null;
  orientation: Orientation;
  background: string;
};
