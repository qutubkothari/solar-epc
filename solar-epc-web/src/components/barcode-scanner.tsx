"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ModalShell } from "@/components/modal-shell";

type BarcodeScannerProps = {
  onScan: (serialNumber: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions or use manual entry.");
    }
  }, []);

  // Barcode detection using BarcodeDetector API (Chrome/Edge)
  const detectBarcode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== 4) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Use BarcodeDetector API if available
    if ("BarcodeDetector" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code", "data_matrix"],
        });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code && code !== lastScanned) {
            setLastScanned(code);
            onScan(code);
            // Vibrate on successful scan if supported
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
          }
        }
      } catch (err) {
        console.error("Barcode detection error:", err);
      }
    }
  }, [scanning, lastScanned, onScan]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!scanning) return;

    const interval = setInterval(detectBarcode, 200);
    return () => clearInterval(interval);
  }, [scanning, detectBarcode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualEntry.trim()) {
      onScan(manualEntry.trim());
      setManualEntry("");
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <ModalShell
      title="Scan Barcode"
      subtitle="Point camera at equipment barcode or enter serial manually."
      onClose={handleClose}
      size="lg"
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-24 border-2 border-solar-amber rounded-lg">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-solar-amber rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-solar-amber rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-solar-amber rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-solar-amber rounded-br-lg" />
            </div>
          </div>
          {scanning && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-1 text-xs text-white">
              Scanning...
            </div>
          )}
        </div>
      )}

      {lastScanned && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">
            <span className="font-semibold">Last Scanned:</span> {lastScanned}
          </p>
        </div>
      )}

      {/* Manual Entry */}
      <form onSubmit={handleManualSubmit} className="mt-4">
        <label className="block text-sm font-semibold text-solar-ink">
          Manual Entry
        </label>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={manualEntry}
            onChange={(e) => setManualEntry(e.target.value)}
            placeholder="Enter serial number"
            className="flex-1 rounded-xl border border-solar-border bg-solar-sand px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!manualEntry.trim()}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
        >
          Done
        </button>
      </div>
    </ModalShell>
  );
}
