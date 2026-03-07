import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { MapPin, Search, Link2, X } from "lucide-react";
import {
  searchPlaces,
  reverseGeocode,
  formatPhotonFeature,
  getFeatureLatLng,
  type PhotonFeature,
} from "@/lib/geocoding";
import {
  parseMapLink,
  getServiceLabel,
} from "@/lib/map-link-parser";

export interface LocationResult {
  lat: number;
  lng: number;
  address: string;
}

interface LocationAutocompleteProps {
  id?: string;
  placeholder?: string;
  value?: string;
  onSelect: (result: LocationResult) => void;
  onFocus?: () => void;
  /** Bias search results near this coordinate */
  biasLat?: number;
  biasLon?: number;
  className?: string;
}

export function LocationAutocomplete({
  id,
  placeholder,
  value: controlledValue,
  onSelect,
  onFocus,
  biasLat,
  biasLon,
  className,
}: LocationAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(controlledValue ?? "");
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [linkDetected, setLinkDetected] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInputValue(controlledValue);
    }
  }, [controlledValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Clear link detected badge after 3s
  useEffect(() => {
    if (linkDetected) {
      const timer = setTimeout(() => setLinkDetected(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [linkDetected]);

  const doSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsSearching(true);
      try {
        const features = await searchPlaces(query, {
          limit: 5,
          lat: biasLat,
          lon: biasLon,
        });
        setResults(features);
        setIsOpen(features.length > 0);
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsSearching(false);
      }
    },
    [biasLat, biasLon]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setLinkDetected(null);

    // Debounced search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const result = parseMapLink(pasted);

    if (result) {
      e.preventDefault();
      setIsOpen(false);
      setIsSearching(true);

      try {
        // Reverse geocode to get the address name
        const feature = await reverseGeocode(
          result.coords.lat,
          result.coords.lng
        );
        const address = feature
          ? formatPhotonFeature(feature)
          : `${result.coords.lat.toFixed(5)}, ${result.coords.lng.toFixed(5)}`;

        setInputValue(address);
        setLinkDetected(getServiceLabel(result.service));
        onSelect({
          lat: result.coords.lat,
          lng: result.coords.lng,
          address,
        });
      } catch {
        // Fallback: use coords directly
        const address = `${result.coords.lat.toFixed(5)}, ${result.coords.lng.toFixed(5)}`;
        setInputValue(address);
        setLinkDetected(getServiceLabel(result.service));
        onSelect({
          lat: result.coords.lat,
          lng: result.coords.lng,
          address,
        });
      } finally {
        setIsSearching(false);
      }
    }
  };

  const selectFeature = (feature: PhotonFeature) => {
    const { lat, lng } = getFeatureLatLng(feature);
    const address = formatPhotonFeature(feature);
    setInputValue(address);
    setIsOpen(false);
    setResults([]);
    onSelect({ lat, lng, address });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          selectFeature(results[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const clearInput = () => {
    setInputValue("");
    setResults([]);
    setIsOpen(false);
    setLinkDetected(null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onFocus={() => {
            onFocus?.();
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t("create_load_search_placeholder")}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        {isSearching ? (
          <Spinner
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          />
        ) : inputValue ? (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {/* Link detected badge */}
      {linkDetected && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-500 animate-in fade-in slide-in-from-top-1 duration-200">
          <Link2 size={12} />
          {t("create_load_link_detected", { service: linkDetected })}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <ul className="max-h-[200px] overflow-y-auto py-1">
            {results.map((feature, index) => {
              const props = feature.properties;
              const name = props.name || props.street || "Unknown";
              const detail = [props.city, props.state, props.country]
                .filter(Boolean)
                .join(", ");

              return (
                <li
                  key={
                    `${feature.geometry.coordinates[0]}-${feature.geometry.coordinates[1]}-${index}`
                  }
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                      index === activeIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectFeature(feature)}
                  >
                    <MapPin
                      size={14}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{name}</p>
                      {detail && (
                        <p className="truncate text-xs text-muted-foreground">
                          {detail}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* No results */}
      {isOpen && results.length === 0 && !isSearching && inputValue.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-3 text-center text-xs text-muted-foreground shadow-lg">
          {t("create_load_no_results")}
        </div>
      )}
    </div>
  );
}
