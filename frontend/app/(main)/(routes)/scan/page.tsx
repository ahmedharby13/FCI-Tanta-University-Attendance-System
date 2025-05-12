"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import axios from "axios";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import ReactConfetti from "react-confetti";
import { toast, Toaster } from "sonner";

interface Location {
  latitude: number;
  longitude: number;
}

interface VerificationData {
  location: Location;
  fingerprint: string;
  timestamp: string;
}

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);
  const qrRef = useRef<Html5Qrcode | null>(null);

  // Update timestamp in UTC format
  useEffect(() => {
    const updateTimestamp = () => {
      const now = new Date();
      const utcYear = now.getUTCFullYear();
      const utcMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
      const utcDay = String(now.getUTCDate()).padStart(2, "0");
      const utcHours = String(now.getUTCHours()).padStart(2, "0");
      const utcMinutes = String(now.getUTCMinutes()).padStart(2, "0");
      const utcSeconds = String(now.getUTCSeconds()).padStart(2, "0");

      const formattedDate = `${utcYear}-${utcMonth}-${utcDay} ${utcHours}:${utcMinutes}:${utcSeconds}`;
      setTimestamp(formattedDate);
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize fingerprint
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (err) {
        // console.error("Error generating fingerprint:", err);
        setError("Failed to generate device fingerprint");
        toast.error(
          "Failed to generate device fingerprint. Please refresh the page.",
          {
            duration: 5000,
            position: "top-center",
          },
        );
      }
    };

    initializeFingerprint();
  }, []);

  // Get user's location
  const getCurrentLocation = (): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          reject(new Error("Failed to get location: " + err.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      );
    });
  };

  useEffect(() => {
    qrRef.current = new Html5Qrcode("reader");

    getCurrentLocation()
      .then(setLocation)
      .catch((err) => {
        // console.error("Location error:", err);
        setError("Please enable location services");
        toast.error(
          "Location services are required. Please enable GPS and refresh.",
          {
            duration: 6000,
            position: "top-center",
            icon: "📍",
          },
        );
      });

    return () => {
      if (qrRef.current && qrRef.current.isScanning) {
        qrRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!qrRef.current) return;

    try {
      setScanning(true);
      setError(null);

      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        const backCamera = cameras.find(
          (camera) =>
            camera.label.toLowerCase().includes("back") ||
            camera.label.toLowerCase().includes("rear") ||
            camera.label.toLowerCase().includes("environment"),
        );

        const cameraId = backCamera
          ? backCamera.id
          : cameras[cameras.length - 1].id;

        await qrRef.current.start(
          { deviceId: cameraId },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
            facingMode: { exact: "environment" },
          },
          (decodedText) => {
            setScanResult(decodedText);
            stopScanning();
          },
        );
      } else {
        throw new Error("No cameras found");
      }
    } catch (err: any) {
      // console.error("Error starting scanner:", err);
      setError(err.message || "Failed to start camera");
      toast.error(`Camera error: ${err.message || "Failed to start camera"}`, {
        duration: 4000,
        position: "top-center",
        icon: "📷",
      });
      setScanning(false);

      if (err.message?.includes("exact")) {
        try {
          await qrRef.current.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1,
            },
            (decodedText) => {
              setScanResult(decodedText);
              stopScanning();
            },
          );
          setError(null);
          setScanning(true);
        } catch (retryErr) {
          // console.error("Error on retry:", retryErr);
          setError("Could not access back camera");
          toast.error("Could not access camera. Please check permissions.", {
            duration: 5000,
            position: "top-center",
          });
          setScanning(false);
        }
      }
    }
  };

  const stopScanning = async () => {
    if (qrRef.current && qrRef.current.isScanning) {
      try {
        await qrRef.current.stop();
        setScanning(false);
      } catch (err) {
        // console.error("Error stopping scanner:", err);
        setError("Failed to stop scanner");
        toast.error("Failed to stop scanner", {
          duration: 3000,
          position: "top-center",
        });
      }
    }
  };

  const reset = () => {
    setScanResult(null);
    setError(null);
    setShowConfetti(false);
    if (scanning) {
      stopScanning();
    }
  };

  useEffect(() => {
    async function verify() {
      if (scanResult) {
        try {
          const currentLocation = await getCurrentLocation();
          // Extract code from URL pattern
          const urlParts = scanResult.split("/");
          const code = urlParts.length >= 7 ? urlParts[6] : scanResult;

          const verificationData: VerificationData = {
            location: currentLocation,
            fingerprint: fingerprint,
            timestamp: timestamp,
          };

          toast.loading("Verifying attendance...", { id: "verifying" });

          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/attendance/verify/${code}`,
            verificationData,
            {
              withCredentials: true,
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            },
          );

          toast.dismiss("verifying");
          if (response.status === 200) {
            setShowConfetti(true);
            toast.success("Attendance verified successfully!", {
              duration: 5000,
              position: "top-center",
              icon: "✅",
            });
            setTimeout(() => setShowConfetti(false), 5000);
          }
        } catch (err: any) {
          toast.dismiss("verifying");
          // console.error("Verification error:", err);

          // Extract specific error message from response
          let errorMessage = "Failed to verify attendance. Please try again.";

          if (err.response) {
            if (err.response.data && err.response.data.message) {
              errorMessage = err.response.data.message;
            } else if (err.response.status === 401) {
              errorMessage = "Your session has expired. Please log in again.";
            } else if (err.response.status === 403) {
              errorMessage =
                "You are not authorized to verify attendance in this class.";
            } else if (err.response.status === 404) {
              errorMessage =
                "QR code not found or class/section does not exist.";
            }
          } else if (err.request) {
            errorMessage = "Network error. Please check your connection.";
          }

          setError(errorMessage);

          // Choose icon based on error type
          let icon = "❌";
          if (errorMessage.includes("location")) icon = "📍";
          if (errorMessage.includes("expired")) icon = "⏱️";
          if (
            errorMessage.includes("enrolled") ||
            errorMessage.includes("section")
          )
            icon = "🧑‍🎓";
          if (errorMessage.includes("already recorded")) icon = "🔄";
          if (errorMessage.includes("connection")) icon = "📶";

          toast.error(errorMessage, {
            duration: 6000,
            position: "top-center",
            icon: icon,
          });
        }
      }
    }
    verify();
    return () => {};
  }, [scanResult, fingerprint]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-md">
      <Toaster />

      {showConfetti && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-center">QR Code Scanner</h1>

        {/* UTC Time and User Information */}
        <div className="text-sm text-center space-y-1">
          <p className="text-gray-600">
            <span className="font-medium">🕒 UTC Time:</span>
            <br />
            {timestamp}
          </p>
          {location && <p className="text-green-600">📍 Location active</p>}
        </div>

        {/* Status indicator */}
        {scanResult && (
          <div
            className={`text-center p-2 rounded-md ${showConfetti ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
          >
            <p className="font-medium">
              {showConfetti
                ? "Verification Successful!"
                : "Awaiting verification..."}
            </p>
          </div>
        )}

        {/* Control buttons */}
        <div className="space-y-2">
          {!scanning && !scanResult && (
            <Button
              onClick={startScanning}
              className="w-full"
              disabled={!location || !fingerprint}
            >
              {!location || !fingerprint
                ? "Waiting for services..."
                : "Start Camera"}
            </Button>
          )}
          {scanning && (
            <Button onClick={stopScanning} variant="outline" className="w-full">
              Stop Camera
            </Button>
          )}
          {(scanResult || error) && (
            <Button variant="outline" onClick={reset} className="w-full">
              Scan Again
            </Button>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="border border-red-500 p-4 rounded bg-red-50 text-red-700">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Video feed container */}
        <div
          id="reader"
          className="border rounded-md overflow-hidden"
          style={{
            width: "100%",
            minHeight: "300px",
            position: "relative",
          }}
        ></div>

        <p className="text-xs text-center text-gray-500">
          Please ensure camera and location permissions are enabled.
        </p>
      </div>
    </div>
  );
}
