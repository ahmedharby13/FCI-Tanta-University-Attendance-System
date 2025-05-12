import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PowerOff, X, RefreshCw } from "lucide-react";

interface QrCodeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeDataUrl: string; // base64 image data
  expiresAt: string; // ISO date string
  onCloseQr: () => Promise<void>; // Function to call the close API
  isClosingQr: boolean; // Loading state for the close action
  onRegenerateQr?: () => Promise<void>; // Function to regenerate QR when expired
  isRegeneratingQr?: boolean; // Loading state for regeneration
}

export default function QrCodeDialog({
  isOpen,
  onOpenChange,
  qrCodeDataUrl,
  expiresAt,
  onCloseQr,
  isClosingQr,
  onRegenerateQr,
  isRegeneratingQr = false,
}: QrCodeDialogProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsExpired(false); // Reset expiry state on open

    const calculateTimeLeft = () => {
      try {
        const expirationDate = new Date(expiresAt);
        const now = new Date();
        const difference = expirationDate.getTime() - now.getTime();

        if (difference <= 0) {
          setTimeLeft("Expired");
          setIsExpired(true);
          clearInterval(interval); // Stop interval when expired
          return;
        }

        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft(
          `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s remaining`,
        );
      } catch (e) {
        // console.error("Error parsing expiresAt date:", e);
        setTimeLeft("Invalid date");
        setIsExpired(true); // Treat invalid date as expired
        clearInterval(interval);
      }
    };

    const interval = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Initial calculation

    return () => clearInterval(interval);
  }, [expiresAt, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 border-b relative">
          <DialogTitle className="text-xl sm:text-2xl">
            Scan for Attendance
          </DialogTitle>
          <DialogDescription>
            Students: Scan this code.
            {timeLeft && (
              <span
                className={`ml-2 font-medium ${isExpired ? "text-red-500" : "text-green-600"}`}
              >
                ({timeLeft})
              </span>
            )}
          </DialogDescription>
          <DialogClose
            asChild
            className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          ></DialogClose>
        </DialogHeader>

        <div className="flex-grow flex items-center justify-center p-4 sm:p-6 overflow-auto bg-gray-50">
          {qrCodeDataUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={qrCodeDataUrl}
                alt="Attendance QR Code"
                className={`max-w-[90%] max-h-[90%] min-w-[300px] object-contain shadow-md border bg-white p-4 ${isExpired ? "opacity-50" : ""}`}
                style={{ aspectRatio: "1/1" }}
              />
              {isExpired && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/70 text-white px-6 py-3 rounded-md text-lg font-bold">
                    QR Code Expired
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">QR Code not available.</p>
          )}
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t flex flex-col sm:flex-row sm:justify-end gap-2">
          {/* Show Regenerate button if expired and onRegenerateQr exists */}
          {isExpired && onRegenerateQr && (
            <Button
              variant="default"
              onClick={onRegenerateQr}
              disabled={isRegeneratingQr}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isRegeneratingQr ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRegeneratingQr ? "Generating..." : "Generate New QR Code"}
            </Button>
          )}

          {/* Show Close Attendance button only if not expired */}
          {!isExpired && (
            <Button
              variant="destructive"
              onClick={onCloseQr}
              disabled={isClosingQr}
            >
              {isClosingQr ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PowerOff className="mr-2 h-4 w-4" />
              )}
              {isClosingQr ? "Closing..." : "Close Attendance"}
            </Button>
          )}

          {/* Close Dialog button */}
          <DialogClose asChild>
            <Button variant="outline">Close Window</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
