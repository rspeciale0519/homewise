import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ListingLocationMap } from "./listing-location-map";

const mapboxMocks = vi.hoisted(() => {
  const remove = vi.fn();
  const addControl = vi.fn();
  const mapConstructor = vi.fn(function MockMap({
    container,
  }: {
    container: HTMLElement;
  }) {
    container.appendChild(document.createElement("div"));
    return { addControl, remove };
  });
  const setLngLat = vi.fn().mockReturnThis();
  const setPopup = vi.fn().mockReturnThis();
  const addTo = vi.fn().mockReturnThis();
  const setHTML = vi.fn().mockReturnThis();

  return {
    addControl,
    addTo,
    mapConstructor,
    remove,
    setHTML,
    setLngLat,
    setPopup,
  };
});

vi.mock("mapbox-gl", () => ({
  default: {
    accessToken: "",
    Map: mapboxMocks.mapConstructor,
    Marker: vi.fn(function MockMarker() {
      return {
        addTo: mapboxMocks.addTo,
        setLngLat: mapboxMocks.setLngLat,
        setPopup: mapboxMocks.setPopup,
      };
    }),
    NavigationControl: vi.fn(),
    Popup: vi.fn(function MockPopup() {
      return { setHTML: mapboxMocks.setHTML };
    }),
  },
}));

describe("ListingLocationMap", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("clears Mapbox-owned elements when the map unmounts", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "public-test-token");
    const { unmount } = render(
      <ListingLocationMap
        latitude={28.54}
        longitude={-81.38}
        address="123 Main Street"
        city="Orlando"
        state="FL"
        zip="32801"
      />,
    );

    await waitFor(() => expect(mapboxMocks.mapConstructor).toHaveBeenCalledOnce());
    const options = mapboxMocks.mapConstructor.mock.calls[0]?.[0];
    const container = options?.container;
    expect(container).toBeInstanceOf(HTMLElement);
    expect(container).not.toBeEmptyDOMElement();

    unmount();

    expect(mapboxMocks.remove).toHaveBeenCalledOnce();
    expect(container).toBeEmptyDOMElement();
  });
});
