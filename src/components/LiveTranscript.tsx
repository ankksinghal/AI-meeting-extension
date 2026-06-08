"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Meeting = {
  summary: string;

  attendees?: {
    email: string;
  }[];
};

type Props = {
  onNewSummary: (
    summary: string
  ) => void;

  selectedMeeting:
  | Meeting
  | null;
};

type SpeechRecognitionResultItem =
  {
    transcript: string;
  };

type SpeechRecognitionResultGroup =
  {
    0: SpeechRecognitionResultItem;

    length: number;
  };

type SpeechRecognitionEventType =
  {
    results: SpeechRecognitionResultGroup[];
  };

type SpeechRecognitionType =
  {
    continuous: boolean;

    interimResults: boolean;

    lang: string;

    start: () => void;

    stop: () => void;

    onresult:
    | ((
      event: SpeechRecognitionEventType
    ) => void)
    | null;

    onerror:
    | ((
      event: Event
    ) => void)
    | null;
  };

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionType;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;

    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function LiveTranscript({
  onNewSummary,
  selectedMeeting,
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
    useRef<SpeechRecognitionType | null>(
      null
    );

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (
      !SpeechRecognitionAPI
    ) {
      alert(
        "Speech Recognition not supported"
      );

      return;
    }

    const recognition =
      new SpeechRecognitionAPI();

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
          event.results[i][0]
            .transcript + " ";
      }

      setTranscript(
        finalTranscript
      );
    };

    recognition.onerror = (
      event
    ) => {
      console.error(
        "Speech Recognition Error:",
        event
      );
    };

    recognitionRef.current =
      recognition;
  }, []);

  const startRecording =
    () => {
      if (
        recognitionRef.current
      ) {
        recognitionRef.current.start();

        setIsRecording(
          true
        );
      }
    };

  const stopRecording =
    () => {
      if (
        recognitionRef.current
      ) {
        recognitionRef.current.stop();

        setIsRecording(
          false
        );
      }
    };

  const normalizeTranscript = (
    text: string
  ) => {
    const corrections: Record<
      string,
      string
    > = {
      "i pay": "API",

      pigma: "Figma",

      "react yes":
        "React.js",

      "next yes":
        "Next.js",

      "type script":
        "TypeScript",

      "java script":
        "JavaScript",

      "node yes":
        "Node.js",

      "tail wind":
        "Tailwind",

      "mongo db":
        "MongoDB",
    };

    let updatedText =
      text.toLowerCase();

    Object.entries(
      corrections
    ).forEach(
      ([wrong, correct]) => {
        updatedText =
          updatedText.replaceAll(
            wrong,
            correct
          );
      }
    );

    return updatedText;
  };

  const generateSummary =
    async () => {
      if (!transcript.trim())
        return;

      try {
        setLoading(true);

        stopRecording();

        const cleanedTranscript =
          normalizeTranscript(
            transcript
          );

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
                  transcript:
                    cleanedTranscript,
                }
              ),
            }
          );

        const data: {
          result?: string;
        } =
          await response.json();

        if (data.result) {
          onNewSummary(
            data.result
          );

          if (
            selectedMeeting?.attendees
          ) {
            const attendees =
              selectedMeeting.attendees.map(
                (
                  attendee
                ) =>
                  attendee.email
              );

            await fetch(
              "/api/send-email",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify(
                  {
                    attendees,

                    meetingTitle:
                      selectedMeeting.summary,

                    summary:
                      data.result,
                  }
                ),
              }
            );
          }

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
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">
        Live Meeting Transcript
      </h2>

      <textarea
        value={transcript}
        onChange={(e) =>
          setTranscript(
            e.target.value
          )
        }
        placeholder="Live transcript will appear here..."
        className="w-full h-40 border rounded-xl p-4 outline-none"
      />

      <div className="flex gap-4 mt-4">
        {!isRecording ? (
          <button
            onClick={
              startRecording
            }
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={
              stopRecording
            }
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
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
            !transcript.trim()
          }
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading
            ? "Generating..."
            : "Generate AI Summary"}
        </button>
      </div>
    </div>
  );
}