"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Props = {
  onNewSummary: (
    summary: string
  ) => void;
};

type TranscriptLine = {
  id: string;
  speaker: string;
  text: string;
  timestamp?: string;
  updatedAt?: string;
  meetingUrl?: string;
  meetingCode?: string;
};

type ExtensionState = {
  transcriptLines: TranscriptLine[];
  captureEnabled: boolean;
  activeMeetUrl?: string;
  activeMeetCode?: string;
  meetingEnded?: boolean;
  meetingEndedAt?: string;
};

type ExtensionMessage = {
  source?: string;
  type?: string;
  state?: ExtensionState;
  message?: string;
};

const DASHBOARD_SOURCE =
  "AI_MEETING_COPILOT_DASHBOARD";

const EXTENSION_SOURCE =
  "AI_MEETING_COPILOT_EXTENSION";

const SYSTEM_TRANSCRIPT_PATTERNS =
  [
    /you'?ll be able to join in just a moment/i,
    /ready to join\?/i,
    /looking for others in the call/i,
    /you have joined the call/i,
    /you are the first one here/i,
    /returning to home screen in\s+\d+\s+seconds?/i,
    /your camera is/i,
    /your microphone is/i,
    /your hand is/i,
    /background is no longer blurred/i,
    /developing an extension for meet/i,
    /developers\.google\.com\/meet\/add-ons/i,
    /browser-extension-\*-buttons/i,
    /return to meet button/i,
    /main screen now has the usual layout/i,
    /live captions have been turned (off|on)/i,
    /system default/i,
    /white black blue green red yellow cyan magenta/i,
    /microphone array/i,
    /smart sound technology/i,
    /digital microphones/i,
    /speakers \(\d+-/i,
    /realtek/i,
    /hp hd camera/i,
    /chevron_left/i,
    /chevron_right/i,
    /skin tone/i,
    /^previous\s+.*next/i,
    /\bin\s+[\d,]+\s+minutes\b/i,
    /more_vert\s*more options/i,
    /more options pop-up menu/i,
    /scheduled for\s+\d{1,2}:\d{2}/i,
    /^scheduled for:\s+/i,
    /^scheduled for:?\s+(mon|tue|wed|thu|fri|sat|sun)\b/i,
    /\bscheduled for:?\s+(mon|tue|wed|thu|fri|sat|sun)\b/i,
    /arrow_downward\s*jump to bottom/i,
    /jump to bottom/i,
    /others might still see your full video/i,
    /call_end\s*leave call/i,
    /leave call/i,
    /videocam_off\s*turn on camera/i,
    /videocam\s*turn off camera/i,
    /turn on camera\s*\(ctrl\s*\+\s*e\)/i,
    /turn off camera\s*\(ctrl\s*\+\s*e\)/i,
    /back_hand(?:\s+back_hand)?\s*raise hand/i,
    /raise hand\s*\(ctrl\s*\+\s*alt\s*\+\s*h\)/i,
    /\bctrl\s*\+\s*e\b/i,
    /\bctrl\s*\+\s*alt\s*\+\s*h\b/i,
    /\bBETA\b.*\bAfrikaans\b/i,
    /\bAfrikaans\b.*\bZulu\b.*\bBETA\b/i,
    /\bEnglish\b.*\bAlbanian\b.*\bAmharic\b/i,
  ];

const EMPTY_EXTENSION_STATE: ExtensionState =
  {
    transcriptLines: [],
    captureEnabled: false,
    activeMeetUrl: "",
    activeMeetCode: "",
    meetingEnded: false,
    meetingEndedAt: "",
  };

const SPEAKER_COLOR_CLASSES =
  [
    "bg-violet-500",
    "bg-blue-500",
    "bg-fuchsia-400",
    "bg-emerald-400",
    "bg-amber-400",
    "bg-rose-400",
    "bg-cyan-400",
    "bg-lime-500",
  ];

export default function LiveTranscript({
  onNewSummary,
}: Props) {
  const [
    extensionState,
    setExtensionState,
  ] =
    useState<ExtensionState>(
      EMPTY_EXTENSION_STATE
    );

  const [
    isBridgeReady,
    setIsBridgeReady,
  ] = useState(false);

  const [
    bridgeError,
    setBridgeError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    summaryError,
    setSummaryError,
  ] = useState("");

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const bridgeReadyRef =
    useRef(false);

  const autoSummaryKeyRef =
    useRef("");

  const transcriptListRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const displayableTranscriptLines =
    useMemo(
      () =>
        extensionState.transcriptLines.filter(
          isDisplayableTranscriptLine
        ),
      [
        extensionState.transcriptLines,
      ]
    );

  const transcriptText =
    useMemo(
      () =>
        displayableTranscriptLines
          .map(formatTranscriptLine)
          .join("\n"),
      [
        displayableTranscriptLines,
      ]
    );

  useEffect(() => {
    const list =
      transcriptListRef.current;

    if (!list) {
      return;
    }

    list.scrollTop =
      list.scrollHeight;
  }, [
    displayableTranscriptLines.length,
  ]);

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const markBridgeReady =
      () => {
        bridgeReadyRef.current =
          true;

        setIsBridgeReady(
          true
        );

        setBridgeError("");
      };

    const handleMessage = (
      event: MessageEvent<ExtensionMessage>
    ) => {
      if (
        event.source !==
        window
      ) {
        return;
      }

      const data =
        event.data;

      if (
        data?.source !==
        EXTENSION_SOURCE
      ) {
        return;
      }

      if (
        data.type ===
        "AI_MC_READY"
      ) {
        markBridgeReady();
        requestExtensionState();
      }

      if (
        data.type ===
        "AI_MC_STATE" &&
        data.state
      ) {
        markBridgeReady();

        setExtensionState({
          ...EMPTY_EXTENSION_STATE,
          ...data.state,
          transcriptLines:
            data.state
              .transcriptLines ||
            [],
        });
      }

      if (
        data.type ===
        "AI_MC_ERROR"
      ) {
        setBridgeError(
          data.message ||
            "Could not connect to the Chrome extension."
        );
      }
    };

    window.addEventListener(
      "message",
      handleMessage
    );

    requestExtensionState();

    const bridgeTimeout =
      window.setTimeout(
        () => {
          if (
            !bridgeReadyRef.current
          ) {
            setBridgeError(
              "Chrome extension bridge not detected. Reload the extension, then reopen this dashboard from the popup."
            );
          }
        },
        2000
      );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );

      window.clearTimeout(
        bridgeTimeout
      );
    };
  }, []);

  const clearTranscriptState =
    useCallback(() => {
      setExtensionState(
        (current) => ({
          ...current,
          transcriptLines: [],
        })
      );

      postToExtension({
        type:
          "AI_MC_CLEAR_TRANSCRIPT",
      });
    }, []);

  const clearTranscript =
    useCallback(() => {
      setSummaryError("");

      setStatusMessage(
        "Transcript cleared."
      );

      clearTranscriptState();
    }, [
      clearTranscriptState,
    ]);

  const generateSummary =
    useCallback(async () => {
      const capturedTranscript =
        transcriptText.trim();

      if (
        !capturedTranscript
      ) {
        setSummaryError(
          "No transcript captured yet. Start recording and speak in Google Meet before generating a summary."
        );

        return;
      }

      try {
        setLoading(true);
        setSummaryError("");
        setStatusMessage(
          "Cleaning transcript and generating AI summary..."
        );

        const cleanedTranscript =
          applyKnownCorrections(
            capturedTranscript
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
          error?: string;
        } =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to generate summary"
          );
        }

        if (!data.result) {
          throw new Error(
            "Failed to generate summary"
          );
        }

        onNewSummary(
          data.result
        );

        clearTranscriptState();

        setStatusMessage(
          "Summary generated. Transcript cleared."
        );
      } catch (error) {
        console.error(
          "Summary Error:",
          error
        );

        setSummaryError(
          error instanceof Error
            ? error.message
            : "Something went wrong while generating the summary."
        );
      } finally {
        setLoading(false);
      }
    }, [
      clearTranscriptState,
      onNewSummary,
      transcriptText,
    ]);

  const hasTranscript =
    Boolean(
      transcriptText.trim()
    );

  useEffect(() => {
    if (
      !extensionState.meetingEnded ||
      !hasTranscript ||
      loading
    ) {
      return;
    }

    const autoSummaryKey = [
      extensionState.meetingEndedAt ||
        "ended",
      displayableTranscriptLines.length,
    ].join("-");

    if (
      autoSummaryKeyRef.current ===
      autoSummaryKey
    ) {
      return;
    }

    autoSummaryKeyRef.current =
      autoSummaryKey;

    setStatusMessage(
      "Meeting ended. Generating AI summary automatically..."
    );

    generateSummary();
  }, [
    displayableTranscriptLines.length,
    extensionState.meetingEnded,
    extensionState.meetingEndedAt,
    hasTranscript,
    loading,
    generateSummary,
  ]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold">
            Live Meeting Transcript
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            {getConnectionStatus(
              isBridgeReady,
              extensionState
            )}
          </p>
        </div>

        <span
          className={`text-sm font-medium px-3 py-1 rounded-full ${
            extensionState.captureEnabled
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {extensionState.captureEnabled
            ? "Capturing"
            : "Stopped"}
        </span>
      </div>

      <div
        ref={transcriptListRef}
        aria-live="polite"
        className="w-full min-h-40 max-h-80 overflow-y-auto border rounded-xl p-4 bg-white"
      >
        {hasTranscript ? (
          <div className="space-y-5">
            {displayableTranscriptLines.map(
              (line) => (
                <div
                  key={line.id}
                  className="flex items-start gap-3"
                >
                  <span
                    className={`mt-1 h-8 w-8 shrink-0 rounded-full ${getSpeakerColorClass(
                      line.speaker
                    )}`}
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold text-gray-950">
                        {line.speaker ||
                          "Unknown speaker"}
                      </span>

                      {line.timestamp && (
                        <span className="text-xs text-gray-500">
                          {formatTranscriptDisplayTime(
                            line.timestamp
                          )}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 rounded-xl bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-950">
                      {applyKnownCorrections(
                        line.text
                      )}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Live transcript will appear here...
          </p>
        )}
      </div>

      {!hasTranscript && (
        <p className="mt-3 text-sm text-gray-500">
          No transcript captured yet. Start recording from the Chrome extension popup, then speak in Google Meet. Captions will be enabled automatically when possible.
        </p>
      )}

      {bridgeError && (
        <p className="mt-3 text-sm text-red-600">
          {bridgeError}
        </p>
      )}

      {summaryError && (
        <p className="mt-3 text-sm text-red-600">
          {summaryError}
        </p>
      )}

      {statusMessage &&
        !summaryError && (
          <p className="mt-3 text-sm text-gray-500">
            {statusMessage}
          </p>
        )}

      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <button
          onClick={
            clearTranscript
          }
          disabled={
            !hasTranscript
          }
          className="bg-gray-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Clear Transcript
        </button>

        <button
          onClick={
            generateSummary
          }
          disabled={
            loading ||
            !hasTranscript
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

function requestExtensionState() {
  postToExtension({
    type: "AI_MC_GET_STATE",
  });
}

function postToExtension(
  message: Record<
    string,
    unknown
  >
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.postMessage(
    {
      source:
        DASHBOARD_SOURCE,
      ...message,
    },
    window.location.origin
  );
}

function formatTranscriptLine(
  line: TranscriptLine
) {
  const speaker =
    line.speaker ||
    "Unknown speaker";

  const text =
    applyKnownCorrections(
      line.text
    );

  return `${speaker}: ${text}`;
}

function formatTranscriptDisplayTime(
  timestamp: string
) {
  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getSpeakerColorClass(
  speaker: string
) {
  const normalizedSpeaker =
    normalizeTranscriptText(
      speaker ||
        "Unknown speaker"
    );

  const hash =
    Array.from(
      normalizedSpeaker
    ).reduce(
      (total, character) =>
        total +
        character.charCodeAt(0),
      0
    );

  return SPEAKER_COLOR_CLASSES[
    hash %
      SPEAKER_COLOR_CLASSES.length
  ];
}

function isDisplayableTranscriptLine(
  line: TranscriptLine
) {
  const text =
    normalizeTranscriptText(
      line.text
    );

  const speaker =
    normalizeTranscriptText(
      line.speaker
    );

  return (
    Boolean(text) &&
    text !== speaker &&
    !isMeetSystemTranscript(
      line.text,
      line.speaker
    ) &&
    ![
      "closed_caption",
      "closed_caption_disabled",
      "you",
      "caption",
      "captions",
      "mic",
      "mic_off",
      "videocam",
      "more_vert",
    ].includes(text)
  );
}

function isMeetSystemTranscript(
  text: string,
  speaker?: string
) {
  const normalizedSpeaker =
    normalizeTranscriptText(
      speaker
    );

  const combinedText = [
    speaker,
    text,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    normalizedSpeaker ===
      "default" ||
    normalizedSpeaker ===
      "english" ||
    /[\u{1F300}-\u{1FAFF}]/u.test(
      speaker || ""
    ) ||
    normalizedSpeaker.startsWith(
      "speakers ("
    ) ||
    normalizedSpeaker.startsWith(
      "microphone ("
    ) ||
    normalizedSpeaker.startsWith(
      "camera ("
    )
  ) {
    return true;
  }

  if (
    isTimeOnlyTranscript(
      text
    ) ||
    isTimeOnlyTranscript(
      combinedText
    ) ||
    isTimePrefixedMeetingUiTranscript(
      combinedText
    ) ||
    isMeetingCountdownTranscript(
      text,
      normalizedSpeaker
    ) ||
    isMeetKeyboardControlTranscript(
      combinedText,
      normalizedSpeaker
    ) ||
    isUnknownSpeakerUiTranscript(
      combinedText,
      normalizedSpeaker
    ) ||
    isLongLanguageTranscript(
      text
    ) ||
    isLongLanguageTranscript(
      combinedText
    ) ||
    isDeviceSettingsTranscript(
      text
    ) ||
    isDeviceSettingsTranscript(
      combinedText
    )
  ) {
    return true;
  }

  return SYSTEM_TRANSCRIPT_PATTERNS.some(
    (pattern) =>
      pattern.test(text) ||
      pattern.test(combinedText)
  );
}

function isMeetingCountdownTranscript(
  text: string,
  normalizedSpeaker: string
) {
  return (
    /^in\s+[\d,]+\s+minutes?$/i.test(
      normalizeTranscriptText(
        text
      )
    ) &&
    normalizedSpeaker !==
      "you"
  );
}

function isUnknownSpeakerUiTranscript(
  text: string,
  normalizedSpeaker: string
) {
  const isUnknownSpeaker =
    !normalizedSpeaker ||
    normalizedSpeaker ===
      "unknown speaker";

  if (!isUnknownSpeaker) {
    return false;
  }

  const normalizedText =
    normalizeTranscriptText(text);

  return (
    /^([a-z]+_)+[a-z]+\b/.test(
      normalizedText
    ) ||
    /\b(pop-up|popup|menu|options|background|blurred|camera|microphone|hand|leave call|jump to bottom|share screen|screen share|present)\b/.test(
      normalizedText
    )
  );
}

function isMeetKeyboardControlTranscript(
  text: string,
  normalizedSpeaker: string
) {
  const isUnknownSpeaker =
    !normalizedSpeaker ||
    normalizedSpeaker ===
      "unknown speaker";

  if (!isUnknownSpeaker) {
    return false;
  }

  const normalizedText =
    normalizeTranscriptText(text);

  return (
    /\b(ctrl|alt|shift|command|cmd)\b\s*\+/.test(
      normalizedText
    ) &&
    /(camera|microphone|mic|hand|caption|present|chat|call|leave|turn on|turn off|raise|lower|mute|unmute)/.test(
      normalizedText
    )
  );
}

function isTimePrefixedMeetingUiTranscript(
  text: string
) {
  return /^\d{1,2}:\d{2}:?\s*(am|pm)\s+.{2,80}$/i.test(
    normalizeTranscriptText(
      text
    )
  );
}

function isTimeOnlyTranscript(
  text: string
) {
  return /^\d{1,2}:\d{2}:?\s*(am|pm)?$/i.test(
    normalizeTranscriptText(
      text
    )
  );
}

function isLongLanguageTranscript(
  text: string
) {
  const normalizedText =
    normalizeTranscriptText(text);

  const betaCount =
    (
      text.match(/\bBETA\b/g) ||
      []
    ).length;

  return (
    betaCount >= 5 ||
    (
      normalizedText.length >
        250 &&
      normalizedText.includes(
        "afrikaans"
      ) &&
      normalizedText.includes(
        "zulu"
      )
    )
  );
}

function isDeviceSettingsTranscript(
  text: string
) {
  const normalizedText =
    normalizeTranscriptText(text);

  return (
    normalizedText.includes(
      "microphone"
    ) &&
    normalizedText.includes(
      "speakers"
    ) &&
    (
      normalizedText.includes(
        "camera"
      ) ||
      normalizedText.includes(
        "realtek"
      )
    )
  );
}

function normalizeTranscriptText(
  value?: string
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getConnectionStatus(
  isBridgeReady: boolean,
  extensionState: ExtensionState
) {
  if (!isBridgeReady) {
    return "Connecting to Chrome extension...";
  }

  if (
    extensionState.meetingEnded
  ) {
    return "Meeting ended. AI summary will be generated automatically.";
  }

  if (
    extensionState.activeMeetCode
  ) {
    return `Connected to Google Meet ${extensionState.activeMeetCode}`;
  }

  if (
    extensionState.activeMeetUrl
  ) {
    return "Connected to Google Meet";
  }

  return "Waiting for an active Google Meet tab.";
}

function applyKnownCorrections(
  text: string
) {
  const corrections: Record<
    string,
    string
  > = {
    "a pay integration":
      "API integration",
    "a p i": "API",
    "a pay": "API",
    "i pay": "API",
    "i p i": "API",
    pigma: "Figma",
    "react yes": "React.js",
    "next yes": "Next.js",
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

  return Object.entries(
    corrections
  ).reduce(
    (
      updatedText,
      [wrong, correct]
    ) =>
      updatedText.replace(
        new RegExp(
          escapeRegExp(wrong),
          "gi"
        ),
        correct
      ),
    text
  );
}

function escapeRegExp(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}
