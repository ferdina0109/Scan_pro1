"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const locationName = searchParams.get("loc");
  const locationType = searchParams.get("type");
  const staffFloor = searchParams.get("floor");

  const issues = useMemo(() => getIssues(locationType), [locationType]);
  const [selectedIssue, setSelectedIssue] = useState(issues[0] || "");
  const [photoName, setPhotoName] = useState(null);
  const [status, setStatus] = useState("");

  const [manualLocation, setManualLocation] = useState("");
  const [manualType, setManualType] = useState("washroom");
  const [manualFloor, setManualFloor] = useState("");

  const isValid = Boolean(locationName && locationType && staffFloor);

  useEffect(() => {
    if (!selectedIssue && issues[0]) setSelectedIssue(issues[0]);
  }, [issues, selectedIssue]);

  useEffect(() => {
    // Keep manual fields in sync when a QR link is opened.
    if (locationName) setManualLocation(locationName);
    if (locationType) setManualType(locationType);
    if (staffFloor) setManualFloor(staffFloor);
  }, [locationName, locationType, staffFloor]);

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
          staff_floor: staffFloor,
          photo_name: photoName,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Request failed");

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
            <input
              type="text"
              required
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="e.g., Block A Washroom"
            />

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
