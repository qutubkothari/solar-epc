"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/modal-shell";
import { MapPin, Camera } from "lucide-react";

type Client = {
  id: string;
  name: string;
};

type InquiryFormProps = {
  onClose: () => void;
  onSuccess: () => void;
  inquiryId?: string;
  initialData?: {
    clientId: string;
    title: string;
    notes?: string | null;
    siteAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    buildingHeight?: number | null;
    roofArea?: number | null;
    roofType?: string | null;
    roofOrientation?: string | null;
    sunDirection?: string | null;
    shadingObstructions?: string | null;
    electricalPanelDistance?: number | null;
    electricalPanelCapacity?: number | null;
    structuralNotes?: string | null;
  };
};

export function InquiryForm({ onClose, onSuccess, inquiryId, initialData }: InquiryFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    clientId: initialData?.clientId || "",
    title: initialData?.title || "",
    notes: initialData?.notes || "",
    siteAddress: initialData?.siteAddress || "",
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    buildingHeight: initialData?.buildingHeight || null,
    roofArea: initialData?.roofArea || null,
    roofType: initialData?.roofType || "",
    roofOrientation: initialData?.roofOrientation || "",
    sunDirection: initialData?.sunDirection || "",
    shadingObstructions: initialData?.shadingObstructions || "",
    electricalPanelDistance: initialData?.electricalPanelDistance || null,
    electricalPanelCapacity: initialData?.electricalPanelCapacity || null,
    structuralNotes: initialData?.structuralNotes || "",
  });

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch((err) => console.error(err));
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        setFormData({ 
          ...formData, 
          latitude: lat, 
          longitude: lon 
        });

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await response.json();
          if (data.display_name) {
            setFormData(prev => ({ 
              ...prev, 
              latitude: lat,
              longitude: lon,
              siteAddress: data.display_name 
            }));
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location");
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(inquiryId ? `/api/inquiries/${inquiryId}` : "/api/inquiries", {
        method: inquiryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage("Unable to save inquiry. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving the inquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={inquiryId ? "Edit Site Survey" : "New Solar Site Survey"}
      subtitle="Capture comprehensive site assessment data for accurate solar design."
      onClose={onClose}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-solar-ink border-b border-solar-border pb-2">
            📋 Basic Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Client *</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-solar-ink">Project Title *</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
                placeholder="e.g., Villa Rooftop - 15kW"
              />
            </div>
          </div>
        </div>

        {/* GPS & Site Location */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-solar-ink border-b border-solar-border pb-2">
            📍 Site Location & GPS
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-solar-ink mb-1">Site Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.siteAddress}
                onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                className="flex-1 rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
                placeholder="Enter address or use GPS..."
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                {gettingLocation ? "Getting..." : "Use GPS"}
              </button>
            </div>
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-green-600 mt-1">
                📌 GPS: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {/* Site Survey Data */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-solar-ink border-b border-solar-border pb-2">
            🏗️ Site Assessment Data
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Building Height (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.buildingHeight || ""}
                onChange={(e) => setFormData({ ...formData, buildingHeight: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
                placeholder="e.g., 8.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-solar-ink">Roof Area (m²)</label>
              <input
                type="number"
                step="0.1"
                value={formData.roofArea || ""}
                onChange={(e) => setFormData({ ...formData, roofArea: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
                placeholder="e.g., 150"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-solar-ink">Roof Type</label>
              <select
                value={formData.roofType}
                onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
              >
                <option value="">Select type...</option>
                <option value="Flat">Flat Roof</option>
                <option value="Pitched">Pitched/Sloped Roof</option>
                <option value="Metal Sheet">Metal Sheet</option>
                <option value="Concrete">RCC Concrete</option>
                <option value="Tile">Clay/Concrete Tile</option>
                <option value="Tin Shed">Tin Shed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Roof Orientation</label>
              <select
                value={formData.roofOrientation}
                onChange={(e) => setFormData({ ...formData, roofOrientation: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
              >
                <option value="">Select orientation...</option>
                <option value="South">South (Optimal)</option>
                <option value="North">North</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="Southeast">Southeast</option>
                <option value="Southwest">Southwest</option>
                <option value="Flat">Flat (East-West System)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-solar-ink">Primary Sun Direction</label>
              <input
                type="text"
                value={formData.sunDirection}
                onChange={(e) => setFormData({ ...formData, sunDirection: e.target.value })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
                placeholder="e.g., South-facing, unobstructed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">Shading & Obstructions</label>
            <textarea
              rows={2}
              value={formData.shadingObstructions}
              onChange={(e) => setFormData({ ...formData, shadingObstructions: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
              placeholder="Trees, nearby buildings, chimneys, water tanks, satellite dishes..."
            />
          </div>
        </div>

        {/* Electrical Infrastructure */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-solar-ink border-b border-solar-border pb-2">
            ⚡ Electrical Infrastructure
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-solar-ink">Panel Distance (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.electricalPanelDistance || ""}
                onChange={(e) => setFormData({ ...formData, electricalPanelDistance: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
                placeholder="Distance from roof to panel"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-solar-ink">Panel Capacity (A)</label>
              <input
                type="number"
                value={formData.electricalPanelCapacity || ""}
                onChange={(e) => setFormData({ ...formData, electricalPanelCapacity: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
                placeholder="e.g., 100A, 200A"
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-solar-ink border-b border-solar-border pb-2">
            📝 Site Notes & Observations
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-solar-ink">Structural Notes</label>
            <textarea
              rows={2}
              value={formData.structuralNotes}
              onChange={(e) => setFormData({ ...formData, structuralNotes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
              placeholder="Roof condition, access points, structural concerns, walkway requirements..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-solar-ink">General Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
              placeholder="Additional remarks, client requests, special considerations..."
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-800">
            <Camera className="h-4 w-4 inline mr-1" />
            <strong>Next Step:</strong> After saving, upload site photos with GPS tags and dimensional notes in the Inquiries page.
          </p>
        </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-solar-amber py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Saving..." : inquiryId ? "Save Inquiry" : "Create Inquiry"}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}
