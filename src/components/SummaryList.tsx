"use client";

import {
  useState,
} from "react";

type Meeting = {
  summary: string;

  attendees?: {
    email: string;
  }[];
};

type SummaryProps = {
  summaries: string[];
  selectedMeeting?: Meeting | null;
};

type EmailDraft = {
  subject: string;
  to: string;
  cc: string;
  content: string;
};

export default function SummaryList({
  summaries,
  selectedMeeting,
}: SummaryProps) {
  const [
    activeComposerIndex,
    setActiveComposerIndex,
  ] = useState<number | null>(null);

  const [
    draft,
    setDraft,
  ] = useState<EmailDraft>({
    subject: "",
    to: "",
    cc: "",
    content: "",
  });

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    emailMessage,
    setEmailMessage,
  ] = useState("");

  const [
    emailError,
    setEmailError,
  ] = useState("");

  const openComposer = (
    summary: string,
    index: number
  ) => {
    setActiveComposerIndex(index);
    setEmailMessage("");
    setEmailError("");
    setDraft({
      subject: getDefaultSubject(
        selectedMeeting,
        index
      ),
      to: getDefaultRecipients(
        selectedMeeting
      ),
      cc: "",
      content: summary,
    });
  };

  const updateDraft = (
    field: keyof EmailDraft,
    value: string
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const sendEmail =
    async () => {
      if (!draft.to.trim()) {
        setEmailError(
          "Please add at least one email in To."
        );

        return;
      }

      if (!draft.content.trim()) {
        setEmailError(
          "Email content cannot be empty."
        );

        return;
      }

      try {
        setSending(true);
        setEmailError("");
        setEmailMessage("");

        const response =
          await fetch(
            "/api/send-email",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                to: draft.to,
                cc: draft.cc,
                subject:
                  draft.subject,
                content:
                  draft.content,
              }),
            }
          );

        const data: {
          error?: string;
        } =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to send email"
          );
        }

        setEmailMessage(
          "Email sent successfully."
        );
      } catch (error) {
        setEmailError(
          error instanceof Error
            ? error.message
            : "Failed to send email"
        );
      } finally {
        setSending(false);
      }
    };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-4">
        AI Generated Summaries
      </h2>

      {summaries.length === 0 ? (
        <p className="text-gray-500">
          No summaries generated yet.
        </p>
      ) : (
        <div className="space-y-4">
          {summaries.map(
            (summary, index) => (
              <div
                key={`${index}-${summary.slice(
                  0,
                  40
                )}`}
                className="border rounded-xl p-4 bg-gray-50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold">
                    Meeting #{index + 1}
                  </h3>

                  <button
                    onClick={() =>
                      openComposer(
                        summary,
                        index
                      )
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    disabled={sending}
                  >
                    Send Email
                  </button>
                </div>

                <p className="whitespace-pre-wrap text-sm mt-3">
                  {summary}
                </p>

                {activeComposerIndex ===
                  index && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>

                      <input
                        value={
                          draft.subject
                        }
                        onChange={(event) =>
                          updateDraft(
                            "subject",
                            event.target
                              .value
                          )
                        }
                        className="w-full border rounded-lg p-2 bg-white"
                        placeholder="Email subject"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          To
                        </label>

                        <input
                          value={
                            draft.to
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "to",
                              event.target
                                .value
                            )
                          }
                          className="w-full border rounded-lg p-2 bg-white"
                          placeholder="name@example.com, team@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cc
                        </label>

                        <input
                          value={
                            draft.cc
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              "cc",
                              event.target
                                .value
                            )
                          }
                          className="w-full border rounded-lg p-2 bg-white"
                          placeholder="optional@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                      </label>

                      <textarea
                        value={
                          draft.content
                        }
                        onChange={(event) =>
                          updateDraft(
                            "content",
                            event.target
                              .value
                          )
                        }
                        className="w-full min-h-56 border rounded-lg p-3 bg-white whitespace-pre-wrap"
                        placeholder="Email content"
                      />
                    </div>

                    {emailError && (
                      <p className="text-sm text-red-600">
                        {emailError}
                      </p>
                    )}

                    {emailMessage && (
                      <p className="text-sm text-green-600">
                        {emailMessage}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={
                          sendEmail
                        }
                        disabled={sending}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {sending
                          ? "Sending..."
                          : "Send"}
                      </button>

                      <button
                        onClick={() => {
                          setActiveComposerIndex(
                            null
                          );
                          setEmailError(
                            ""
                          );
                          setEmailMessage(
                            ""
                          );
                        }}
                        disabled={sending}
                        className="bg-gray-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function getDefaultSubject(
  selectedMeeting:
    | Meeting
    | null
    | undefined,
  index: number
) {
  return `Meeting Summary - ${
    selectedMeeting?.summary ||
    `Meeting ${index + 1}`
  }`;
}

function getDefaultRecipients(
  selectedMeeting:
    | Meeting
    | null
    | undefined
) {
  return (
    selectedMeeting?.attendees
      ?.map(
        (attendee) =>
          attendee.email
      )
      .filter(Boolean)
      .join(", ") || ""
  );
}
