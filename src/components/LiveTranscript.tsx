"use client";

import {
  useRef,
  useState,
} from "react";

type Props = {
  onNewSummary: (
    summary: string
  ) => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
  }

  interface SpeechRecognition
    extends EventTarget {
    continuous: boolean;

    interimResults: boolean;

    lang: string;

    start: () => void;

    stop: () => void;

    onresult: (
      event: SpeechRecognitionEvent
    ) => void;

    onend: () => void;
  }
}

export default function LiveTranscript({
  onNewSummary,
}: Props) {
  const [
    transcript,
    setTranscript,
  ] = useState("");

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const recognitionRef =
    useRef<SpeechRecognition | null>(
      null
    );

  // START RECORDING
  const startRecording =
    () => {
      if (
        !window.webkitSpeechRecognition
      ) {
        alert(
          "Speech Recognition not supported in this browser"
        );

        return;
      }

      const recognition =
        new window.webkitSpeechRecognition();

      recognition.continuous =
        true;

      recognition.interimResults =
        true;

      recognition.lang =
        "en-US";

      recognition.onresult = (
        event
      ) => {
        let finalTranscript =
          "";

        for (
          let i = 0;
          i <
          event.results.length;
          i++
        ) {
          finalTranscript +=
            event.results[
              i
            ][0].transcript;
        }

        setTranscript(
          finalTranscript
        );
      };

      recognition.onend =
        () => {
          setIsRecording(
            false
          );
        };

      recognition.start();

      recognitionRef.current =
        recognition;

      setIsRecording(true);
    };

  // STOP RECORDING
  const stopRecording =
    () => {
      recognitionRef.current?.stop();

      setIsRecording(false);
    };

  // GENERATE SUMMARY
const generateSummary =
  async () => {
    if (!transcript.trim())
      return;

    try {
      setLoading(true);

      // Stop recording automatically
      if (
        recognitionRef.current
      ) {
        recognitionRef.current.stop();

        setIsRecording(
          false
        );
      }

      const response =
        await fetch(
          "/api/summary",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                transcript,
              }
            ),
          }
        );

      const data =
        await response.json();

      if (data.result) {
        onNewSummary(
          data.result
        );

        // Clear textarea after success
        setTranscript("");
      } else {
        alert(
          "Failed to generate summary"
        );
      }
    } catch (error) {
      console.error(
        "Summary Error:",
        error
      );

      alert(
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-8">
      <h2 className="text-3xl font-bold mb-6">
        Live Meeting Capture
      </h2>

      <div className="flex gap-4 mb-6">
        {!isRecording ? (
          <button
            onClick={
              startRecording
            }
            className="bg-green-600 text-white px-6 py-3 rounded-xl"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={
              stopRecording
            }
            className="bg-red-600 text-white px-6 py-3 rounded-xl"
          >
            Stop Recording
          </button>
        )}

        <button
          onClick={
            generateSummary
          }
          disabled={
            loading ||
            !transcript
          }
          className="bg-blue-600 text-white px-6 py-3 rounded-xl disabled:opacity-50"
        >
          {loading
            ? "Generating..."
            : "Generate AI Summary"}
        </button>
      </div>

      <textarea
        value={transcript}
        onChange={(e) =>
          setTranscript(
            e.target.value
          )
        }
        placeholder="Live transcript will appear here..."
        className="w-full min-h-[220px] border rounded-xl p-4 outline-none"
      />
    </div>
  );
}