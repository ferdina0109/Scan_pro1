"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function normalizeLocation(loc) {
  if (!loc) return "";
  return String(loc).replaceAll("_", " ").replace(/\s+/g, " ").trim();
}

function inferFloorFromLocation(loc) {
  if (!loc) return "";
  const m = String(loc).match(/floor\s*([0-9]+)/i);
  return m?.[1] ? String(m[1]) : "";
}

function getIssues(locationType) {
  if (locationType === "washroom") {
    return ["Water leakage in toilet taps", "Smelly restroom", "Unclean floor", "Overflowing dustbin"];
  }
  if (locationType === "corridor") {
    return ["Overflowing dustbin", "Litter on floor", "Unclean corridor", "Bad smell in corridor"];
  }
  if (locationType === "drinking area") {
    return ["Dirty sink", "Overflowing dustbin", "Water leakage"];
  }
  return [];
}

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawLocationName = searchParams.get("loc");
  const locationName = normalizeLocation(rawLocationName);
  const locationType = searchParams.get("type");
  const staffFloor =
    searchParams.get("floor") ||
    inferFloorFromLocation(rawLocationName) ||
    inferFloorFromLocation(locationName);

  const issues = useMemo(() => getIssues(locationType), [locationType]);
  const [selectedIssue, setSelectedIssue] = useState(issues[0] || "");
  const [photoName, setPhotoName] = useState(null);
  const [status, setStatus] = useState("");

  const [manualLocation, setManualLocation] = useState("");
  const [manualType, setManualType] = useState("washroom");
  const [manualFloor, setManualFloor] = useState("");
  const [knownLocations, setKnownLocations] = useState([]);
  const [locationsError, setLocationsError] = useState("");

  // QR links always provide `loc` + `type`. `floor` is optional (may be inferred from loc).
  const isValid = Boolean(locationName && locationType);

  useEffect(() => {
    if (!selectedIssue && issues[0]) setSelectedIssue(issues[0]);
  }, [issues, selectedIssue]);

  useEffect(() => {
    // Keep manual fields in sync when a QR link is opened.
    if (locationName) setManualLocation(locationName);
    if (locationType) setManualType(locationType);
    if (staffFloor) setManualFloor(staffFloor);
  }, [locationName, locationType, staffFloor]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/locations");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load locations");
        if (!cancelled) {
          setKnownLocations(Array.isArray(data.locations) ? data.locations : []);
          setLocationsError("");
        }
      } catch (err) {
        if (!cancelled) {
          setKnownLocations([]);
          setLocationsError(err?.message || "Failed to load locations");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onLocationSelect(name) {
    setManualLocation(name);
    const match = knownLocations.find((l) => l.name === name);
    if (match?.location_type) setManualType(match.location_type);
    if (match?.staff_floor) setManualFloor(String(match.staff_floor));
  }

  function onContinue(e) {
    e.preventDefault();
    if (!manualLocation || !manualType || !manualFloor) return;
    const nextUrl =
      "/?loc=" +
      encodeURIComponent(manualLocation) +
      "&type=" +
      encodeURIComponent(manualType) +
      "&floor=" +
      encodeURIComponent(manualFloor);
    router.replace(nextUrl);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("");

    try {
      const res = await fetch("/api/submit-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: locationName,
          location_type: locationType,
          issue: selectedIssue,
          staff_floor: staffFloor || null,
          photo_name: photoName,
        }),
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!res.ok) {
        const msg = data.error || data.message || (raw ? raw.slice(0, 200) : "") || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setStatus("Complaint submitted successfully!");
    } catch (err) {
      setStatus(`Error submitting complaint: ${err?.message || "Unknown error"}`);
    }
  }

  return (
    <div className="container">
      <h1>Scan2Sustain</h1>
      <p className="subtitle">Smart QR Based Cleanliness Reporting System</p>

      {!isValid ? (
        <>
          <h2>Scan a QR code to auto-fill this form.</h2>
          <p className="subtitle">Or enter details manually to continue.</p>

          <form onSubmit={onContinue}>
            <label>Location:</label>
            {knownLocations.length ? (
              <select required value={manualLocation} onChange={(e) => onLocationSelect(e.target.value)}>
                <option value="" disabled>
                  Select a location
                </option>
                {knownLocations.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="e.g., Building A - Floor 1 - Corridor"
              />
            )}
            {locationsError ? <p className="statusMessage">{locationsError}</p> : null}

            <label>Location Type:</label>
            <select required value={manualType} onChange={(e) => setManualType(e.target.value)}>
              <option value="washroom">washroom</option>
              <option value="corridor">corridor</option>
              <option value="drinking area">drinking area</option>
            </select>

            <label>Floor / Block:</label>
            <input
              type="text"
              required
              value={manualFloor}
              onChange={(e) => setManualFloor(e.target.value)}
              placeholder="e.g., 1"
            />

            <button type="submit">Continue</button>
          </form>
        </>
      ) : (
        <>
          <h2>Location: {locationName}</h2>

          <form onSubmit={onSubmit}>
            <label>Select Issue:</label>
            <select required value={selectedIssue} onChange={(e) => setSelectedIssue(e.target.value)}>
              {issues.map((issue) => (
                <option key={issue} value={issue}>
                  {issue}
                </option>
              ))}
            </select>

            <label>Upload Photo (Optional):</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)} />

            <button type="submit">Submit Complaint</button>
          </form>

          {status ? <p className="statusMessage">{status}</p> : null}
        </>
      )}
    </div>
  );
}
