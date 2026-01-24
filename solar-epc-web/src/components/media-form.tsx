"use client";

import { useEffect, useState, useRef } from "react";
import { ModalShell } from "@/components/modal-shell";
import { Camera, MapPin, FileText, Upload } from "lucide-react";

type Inquiry = {
  id: string;
  title: string;
};

type MediaFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

type MediaFile = {
  file: File;
  preview: string;
  category: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
};

export function MediaForm({ onClose, onSuccess }: MediaFormProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/inquiries")
      .then((res) => res.json())
      .then((data) => setInquiries(data))
      .catch(() => setInquiries([]));
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup: stop camera stream and revoke preview URLs
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      mediaFiles.forEach(media => URL.revokeObjectURL(media.preview));
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, // Prefer back camera on mobile
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setErrorMessage("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Get GPS coordinates
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (error) {
          console.log("GPS not available for this photo");
        }
      }

      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(blob);
      
      setMediaFiles(prev => [...prev, {
        file,
        preview,
        category: 'roof',
        notes: '',
        latitude,
        longitude
      }]);

      stopCamera();
    }, 'image/jpeg', 0.85);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Get GPS coordinates once for all files
    let latitude: number | null = null;
    let longitude: number | null = null;
    
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (error) {
        console.log("GPS not available");
      }
    }

    const newFiles: MediaFile[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      category: file.type.startsWith('image/') ? 'roof' : 'other',
      notes: '',
      latitude,
      longitude
    }));

    setMediaFiles(prev => [...prev, ...newFiles]);
  };

  const updateMediaFile = (index: number, updates: Partial<MediaFile>) => {
    setMediaFiles(prev => prev.map((media, i) => 
      i === index ? { ...media, ...updates } : media
    ));
  };

  const removeMediaFile = (index: number) => {
    const media = mediaFiles[index];
    URL.revokeObjectURL(media.preview);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedInquiryId) {
      setErrorMessage("Please select an inquiry");
      return;
    }

    if (mediaFiles.length === 0) {
      setErrorMessage("Please add at least one photo or video");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setUploadProgress(0);

    try {
      let completed = 0;
      const total = mediaFiles.length;

      for (const media of mediaFiles) {
        const formData = new FormData();
        formData.append('file', media.file);
        formData.append('inquiryId', selectedInquiryId);
        formData.append('category', media.category);
        formData.append('notes', media.notes);
        if (media.latitude) formData.append('latitude', media.latitude.toString());
        if (media.longitude) formData.append('longitude', media.longitude.toString());

        const res = await fetch("/api/inquiry-media", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to upload ${media.file.name}`);
        }

        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="📸 Upload Site Media"
      subtitle="Capture photos/videos with GPS tags and dimensional notes for site assessment."
      onClose={onClose}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Inquiry Selection */}
        <div className="rounded-xl bg-amber-50 p-4">
          <label className="block text-sm font-semibold text-solar-ink mb-2">
            📋 Select Inquiry
          </label>
          <select
            required
            value={selectedInquiryId}
            onChange={(e) => setSelectedInquiryId(e.target.value)}
            className="w-full rounded-xl border border-solar-border bg-white px-3 py-2 text-sm outline-none shadow-sm"
          >
            <option value="">Choose an inquiry...</option>
            {inquiries.map((inquiry) => (
              <option key={inquiry.id} value={inquiry.id}>
                {inquiry.title}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Section */}
        {showCamera ? (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto max-h-96"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 bg-solar-amber text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture Photo
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-3 rounded-xl border border-solar-border text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-solar-border bg-white px-4 py-6 text-sm font-semibold text-solar-ink hover:border-solar-amber hover:bg-amber-50 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Open Camera
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-solar-border bg-white px-4 py-6 text-sm font-semibold text-solar-ink hover:border-solar-amber hover:bg-amber-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Media Files List */}
        {mediaFiles.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-solar-ink">
                📎 Media Files ({mediaFiles.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  mediaFiles.forEach(media => URL.revokeObjectURL(media.preview));
                  setMediaFiles([]);
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Clear All
              </button>
            </div>

            {mediaFiles.map((media, index) => (
              <div key={index} className="rounded-xl border border-solar-border bg-white p-4 space-y-3">
                <div className="flex gap-3">
                  {/* Preview */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {media.file.type.startsWith('image/') ? (
                      <img src={media.preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        {media.file.type.startsWith('video/') ? '🎥 Video' : '📄 File'}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-solar-ink truncate">
                          {media.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(media.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMediaFile(index)}
                        className="text-red-600 text-xs hover:underline ml-2"
                      >
                        Remove
                      </button>
                    </div>

                    {/* GPS Info */}
                    {media.latitude && media.longitude && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <MapPin className="w-3 h-3" />
                        GPS: {media.latitude.toFixed(6)}, {media.longitude.toFixed(6)}
                      </div>
                    )}

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Category
                      </label>
                      <select
                        value={media.category}
                        onChange={(e) => updateMediaFile(index, { category: e.target.value })}
                        className="w-full text-xs rounded-lg border border-gray-300 bg-white px-2 py-1.5"
                      >
                        <option value="roof">🏠 Roof</option>
                        <option value="electrical-panel">⚡ Electrical Panel</option>
                        <option value="meter">📊 Meter</option>
                        <option value="obstruction">🚧 Obstruction</option>
                        <option value="other">📁 Other</option>
                      </select>
                    </div>

                    {/* Notes/Dimensions */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <FileText className="w-3 h-3 inline mr-1" />
                        Notes / Dimensions
                      </label>
                      <input
                        type="text"
                        value={media.notes}
                        onChange={(e) => updateMediaFile(index, { notes: e.target.value })}
                        placeholder="e.g., 15m x 20m, 3m height, facing south"
                        className="w-full text-xs rounded-lg border border-gray-300 bg-white px-2 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-solar-amber h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-solar-border px-4 py-2.5 text-sm font-semibold text-solar-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || mediaFiles.length === 0}
            className="flex-1 rounded-xl bg-solar-amber px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? `Uploading ${uploadProgress}%` : `Upload ${mediaFiles.length} File${mediaFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
