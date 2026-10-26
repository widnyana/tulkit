"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BikeFitResult, LegFrame, Side } from "./../types";
import { createTracker, type Tracker } from "./../tracker";
import { analyze } from "./../utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CAPTURE_MS = 10000;

export function CameraPanel(props: {
  side: Side;
  onResult: (result: BikeFitResult | null) => void;
}): ReactElement {
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "recording" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);

  const propsRef = useRef(props);
  propsRef.current = props;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<Tracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const framesRef = useRef<LegFrame[]>([]);
  const urlRef = useRef<string | null>(null);
  const lastTRef = useRef(0);
  const startTRef = useRef(0);
  const recordingRef = useRef(false);

  const stopAll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    trackerRef.current?.close();
    trackerRef.current = null;
    recordingRef.current = false;
  }, []);

  const finish = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    recordingRef.current = false;
    const video = videoRef.current;
    if (urlRef.current !== null) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      if (video) {
        video.pause();
        video.removeAttribute("src");
      }
    }
    const result = analyze(framesRef.current);
    propsRef.current.onResult(result);
    setStatus("done");
    if (result) {
      setMessage("Analysis complete.");
    } else {
      setMessage(
        "Not enough clear leg frames. Check the setup tips and try again.",
      );
      toast.error(
        "Not enough clear leg frames. Check the setup tips and try again.",
      );
    }
  }, []);

  const startLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const loop = () => {
      if (!recordingRef.current) return;
      const v = videoRef.current;
      if (!v || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const t = performance.now();
      if (t <= lastTRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTRef.current = t;
      const frame = trackerRef.current?.detect(v, propsRef.current.side, t);
      if (frame) framesRef.current.push(frame);

      if (urlRef.current === null) {
        const p = Math.min(1, (t - startTRef.current) / CAPTURE_MS);
        setProgress(p);
        if (p >= 1) {
          finish();
          return;
        }
      } else if (Number.isFinite(v.duration) && v.duration > 0) {
        setProgress(v.currentTime / v.duration);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [finish]);

  const record = useCallback(() => {
    if (!trackerRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    framesRef.current = [];
    propsRef.current.onResult(null);
    setProgress(0);
    lastTRef.current = 0;
    setStatus("recording");
    setMessage("Pedal at a steady pace, side view...");
    startTRef.current = performance.now();
    recordingRef.current = true;
    startLoop();
  }, [startLoop]);

  const openCamera = useCallback(async (isCancelled: () => boolean) => {
    setStatus("loading");
    setMessage("Asking for camera access...");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Allow it in the browser address bar, then press Start camera."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No camera found."
            : "Could not open the camera.";
      setStatus("error");
      setMessage(msg);
      toast.error(msg);
      setCameraOn(false);
      return;
    }
    if (isCancelled()) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Play can fail before user interaction; preview still works once it can.
      }
    }
    setCameraOn(true);
    if (trackerRef.current === null) {
      setStatus("loading");
      setMessage("Loading pose model...");
      try {
        trackerRef.current = await createTracker();
      } catch {
        setStatus("error");
        const msg =
          "Could not load the pose model. Check your connection and reload.";
        setMessage(msg);
        toast.error(msg);
        return;
      }
      if (isCancelled()) {
        trackerRef.current.close();
        trackerRef.current = null;
        return;
      }
    }
    setStatus("ready");
    setMessage("Camera ready. Get in position, then press Record.");
  }, []);

  const startFile = useCallback(
    (file: File) => {
      if (!trackerRef.current) return;
      const video = videoRef.current;
      if (!video) return;
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
        video.srcObject = null;
        setCameraOn(false);
      }
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      video.src = url;
      video.onended = () => {
        finish();
      };
      void video.play().catch(() => {
        // Ignore play failures; the loop follows the video state.
      });
      framesRef.current = [];
      propsRef.current.onResult(null);
      setProgress(0);
      lastTRef.current = 0;
      setStatus("recording");
      setMessage("Pedal at a steady pace, side view...");
      startTRef.current = performance.now();
      recordingRef.current = true;
      startLoop();
    },
    [finish, startLoop],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    let cancelled = false;
    void openCamera(() => cancelled);
    return () => {
      cancelled = true;
      stopAll();
    };
  }, []);

  const disabled = status === "loading" || status === "recording";

  return (
    <div className="flex flex-col gap-3">
      <video
        ref={videoRef}
        playsInline
        muted
        className="aspect-video w-full rounded-lg bg-black/80 object-contain"
      />
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
      {status === "recording" && (
        <div className="h-1 rounded bg-muted">
          <div
            className="h-1 rounded bg-primary"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={record}
          disabled={!cameraOn || !(status === "ready" || status === "done")}
        >
          Record 10 s
        </Button>
        {!cameraOn && status !== "loading" && status !== "recording" && (
          <Button
            variant="outline"
            onClick={() => {
              void openCamera(() => false);
            }}
          >
            Start camera
          </Button>
        )}
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => {
            document.getElementById("camera-panel-file")?.click();
          }}
        >
          Upload video
        </Button>
        <input
          id="camera-panel-file"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) startFile(file);
            event.target.value = "";
          }}
        />
        {status === "recording" && (
          <Button variant="outline" onClick={finish}>
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
