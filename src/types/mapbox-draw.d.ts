declare module "@mapbox/mapbox-gl-draw" {
  import type { IControl, Map } from "mapbox-gl";

  interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    defaultMode?: string;
    styles?: Record<string, unknown>[];
  }

  class MapboxDraw implements IControl {
    constructor(options?: DrawOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(): void;
    getAll(): GeoJSON.FeatureCollection;
    deleteAll(): this;
    changeMode(mode: string, options?: Record<string, unknown>): this;
    getMode(): string;
    set(featureCollection: GeoJSON.FeatureCollection): string[];
    add(geojson: GeoJSON.Feature | GeoJSON.FeatureCollection): string[];
    get(id: string): GeoJSON.Feature | undefined;
    delete(ids: string | string[]): this;
    trash(): this;
  }

  export default MapboxDraw;
}
