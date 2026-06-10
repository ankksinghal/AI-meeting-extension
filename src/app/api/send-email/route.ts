import {
  getServerSession,
} from "next-auth";

import {
  authOptions,
} from "@/lib/auth";

type SendEmailRequestBody = {
  to?: unknown;
  cc?: unknown;
  subject?: unknown;
  content?: unknown;
  attendees?: unknown;
  summary?: unknown;
  meetingTitle?: unknown;
};

export async function POST(
  req: Request
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.accessToken) {
      return Response.json(
        {
          error:
            "Please sign in again to send email with Gmail.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await req.json()) as SendEmailRequestBody;

    const toRecipients =
      normalizeRecipients(
        body.to ||
          body.attendees
      );

    const ccRecipients =
      normalizeRecipients(
        body.cc
      );

    const emailContent =
      normalizeString(
        body.content ||
          body.summary
      );

    const emailSubject =
      normalizeString(
        body.subject
      ) ||
      `Meeting Summary - ${normalizeString(
        body.meetingTitle
      ) || "Meeting"}`;

    if (!toRecipients.length) {
      return Response.json(
        {
          error:
            "At least one recipient is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!emailContent) {
      return Response.json(
        {
          error:
            "Email content is required.",
        },
        {
          status: 400,
        }
      );
    }

    const response =
      await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            raw: createRawEmail({
              to: toRecipients,
              cc: ccRecipients,
              subject:
                emailSubject,
              content:
                emailContent,
            }),
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error:
            getGmailErrorMessage(
              data
            ),
        },
        {
          status:
            response.status,
        }
      );
    }

    return Response.json({
      success: true,
      id: data.id,
    });
  } catch (error) {
    console.error(
      "Gmail Send Error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to send email with Gmail.",
      },
      {
        status: 500,
      }
    );
  }
}

function createRawEmail({
  to,
  cc,
  subject,
  content,
}: {
  to: string[];
  cc: string[];
  subject: string;
  content: string;
}) {
  const headers = [
    `To: ${to.join(", ")}`,
    cc.length
      ? `Cc: ${cc.join(", ")}`
      : "",
    `Subject: ${encodeMimeHeader(
      subject
    )}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ].filter(Boolean);

  return base64UrlEncode(
    `${headers.join(
      "\r\n"
    )}\r\n\r\n${content}`
  );
}

function encodeMimeHeader(
  value: string
) {
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(
    value,
    "utf8"
  ).toString("base64")}?=`;
}

function base64UrlEncode(
  value: string
) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizeString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeRecipients(
  value: unknown
) {
  if (Array.isArray(value)) {
    return value
      .map(normalizeString)
      .filter(Boolean);
  }

  return normalizeString(value)
    .split(/[;,]/)
    .map((email) =>
      email.trim()
    )
    .filter(Boolean);
}

function getGmailErrorMessage(
  data: unknown
) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data
  ) {
    const error = data.error;

    if (
      error &&
      typeof error ===
        "object" &&
      "message" in error &&
      typeof error.message ===
        "string"
    ) {
      return error.message;
    }
  }

  return "Gmail API failed to send email.";
}
