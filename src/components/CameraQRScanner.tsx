'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, X, RefreshCw, AlertCircle, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraQRScannerProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

/**
 * Parses raw QR scan result which could be:
 * 1. JSON payload: { sessionId, courseId, token, issuedAt }
 * 2. URL parameter: https://.../student-portal?token=CADENCE-XYZ
 * 3. Raw token string: CADENCE-XYZ
 */
export function extractTokenFromQR(raw: string): string {
  const trimmed = raw.trim();

  // 1. Check if JSON payload from QRTerminal
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.token) return String(parsed.token).trim();
      if (parsed.qrToken) return String(parsed.qrToken).trim();
      if (parsed.qr_token) return String(parsed.qr_token).trim();
    } catch (e) {
      // Ignore JSON parse failure, fallback below
    }
  }

  // 2. Check if URL containing token query parameter
  if (trimmed.includes('token=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://cadence.local/${trimmed}`);
      const t = url.searchParams.get('token');
      if (t) return t.trim();
    } catch (e) {
      const match = trimmed.match(/[?&]token=([^&#]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]).trim();
    }
  }

  // 3. Raw token string fallback
  return trimmed;
}

export default function CameraQRScanner({ onScan, onClose }: CameraQRScannerProps) {
  const [cameraState, setCameraState] = useState<'initializing' | 'scanning' | 'error' | 'stopped'>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'cadence-camera-viewfinder';

  useEffect(() => {
    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        setCameraState('initializing');
        setErrorMessage('');

        // Create scanner instance targeting the container div
        scannerInstance = new Html5Qrcode(containerId);
        scannerRef.current = scannerInstance;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Try environment camera (rear camera on mobile devices)
        await scannerInstance.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            if (!isMounted || hasScanned) return;
            setHasScanned(true);

            // Extract the session token
            const token = extractTokenFromQR(decodedText);

            // Cleanly stop scanner before handing off token
            if (scannerInstance && scannerInstance.isScanning) {
              scannerInstance.stop().then(() => {
                scannerInstance?.clear();
                onScan(token);
              }).catch(() => {
                onScan(token);
              });
            } else {
              onScan(token);
            }
          },
          () => {
            // Normal scan frame miss, ignore
          }
        );

        if (isMounted) {
          setCameraState('scanning');
        }
      } catch (err: any) {
        if (!isMounted) return;

        // If environment camera failed, attempt fallback to any available video input
        try {
          if (scannerInstance) {
            await scannerInstance.start(
              { facingMode: 'user' },
              { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              (decodedText: string) => {
                if (!isMounted || hasScanned) return;
                setHasScanned(true);
                const token = extractTokenFromQR(decodedText);
                if (scannerInstance && scannerInstance.isScanning) {
                  scannerInstance.stop().then(() => {
                    scannerInstance?.clear();
                    onScan(token);
                  }).catch(() => {
                    onScan(token);
                  });
                } else {
                  onScan(token);
                }
              },
              () => {}
            );
            if (isMounted) {
              setCameraState('scanning');
              return;
            }
          }
        } catch (fallbackErr: any) {
          console.warn('Fallback camera also failed:', fallbackErr);
        }

        console.error('Camera initialization error:', err);
        let friendlyMessage = 'Unable to access your device camera.';
        if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
          friendlyMessage = 'Camera permission denied. Please allow camera access in your browser settings to scan the QR code.';
        } else if (err?.name === 'NotFoundError' || String(err).includes('device not found')) {
          friendlyMessage = 'No camera device detected on this device. You can enter the token manually below.';
        } else if (String(err).includes('SecureContext') || String(err).includes('HTTPS')) {
          friendlyMessage = 'Camera access requires a secure connection (HTTPS). Please enter the token manually.';
        }
        setErrorMessage(friendlyMessage);
        setCameraState('error');
      }
    };

    // Small delay to ensure DOM element is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch((e) => console.warn('Clean stop error:', e));
        } else {
          try {
            scannerRef.current.clear();
          } catch (e) {}
        }
      }
    };
  }, [onScan, hasScanned]);

  const handleStopAndClose = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
    }
    onClose();
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0e1015] border border-[#d9ad3c]/30 shadow-2xl space-y-4 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Viewfinder Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#d9ad3c]/15 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
            <Camera className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Live QR Scanner
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h3>
            <p className="text-[11px] text-[#9e988f]">Aim camera at classroom dynamic QR code</p>
          </div>
        </div>
        <button
          onClick={handleStopAndClose}
          type="button"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9e988f] hover:text-white transition-colors border border-white/5 cursor-pointer"
          title="Close Camera"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Viewfinder Camera Feed Container */}
      <div className="relative mx-auto w-full max-w-[340px] aspect-square rounded-xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
        {/* HTML5 QR reader target */}
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Loading overlay */}
        {cameraState === 'initializing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e1015]/90 text-xs font-mono text-[#9e988f] space-y-2.5 z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-[#d9ad3c]" />
            <span>Initializing mobile camera...</span>
          </div>
        )}

        {/* Error overlay */}
        {cameraState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 bg-[#0e1015]/95 text-center space-y-3 z-10">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <CameraOff className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-white">Camera Access Failed</div>
              <p className="text-[11px] text-[#9e988f] leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={handleStopAndClose}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-mono transition-colors border border-white/10 cursor-pointer"
            >
              Use Manual Token Entry
            </button>
          </div>
        )}

        {/* Viewfinder Target Reticle (Neo-Kinpaku Gold) */}
        {cameraState === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              {/* Corner brackets */}
              <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#d9ad3c] rounded-tl-sm" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#d9ad3c] rounded-tr-sm" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#d9ad3c] rounded-bl-sm" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#d9ad3c] rounded-br-sm" />

              {/* Animated scan line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#2dd4bf] to-transparent shadow-[0_0_8px_#2dd4bf] animate-[scan_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
      </div>

      {/* Helpful Instructions */}
      <div className="flex items-center justify-between text-[11px] text-[#9e988f] font-mono px-1">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <ScanLine className="w-3.5 h-3.5" /> 15s Dynamic QR Ready
        </span>
        <button
          onClick={handleStopAndClose}
          type="button"
          className="hover:text-[#d9ad3c] transition-colors underline cursor-pointer"
        >
          Cancel &amp; enter code
        </button>
      </div>

      {/* Keyframe animation for scanning line */}
      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(190px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

