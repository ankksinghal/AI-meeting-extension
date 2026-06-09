import nodemailer from "nodemailer";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const {
      attendees,
      summary,
      meetingTitle,
    } = body;

    const transporter =
      nodemailer.createTransport({
        service: "gmail",

        auth: {
          user:
            process.env.EMAIL_USER,

          pass:
            process.env.EMAIL_PASS,
        },
      });

    await transporter.sendMail({
      from:
        process.env.EMAIL_USER,

      to: attendees.join(","),

      subject: `Meeting Summary - ${meetingTitle}`,

      text: `AI Meeting Summary\n\n${summary}`,

      html: `
        <h2>AI Meeting Summary</h2>
        <pre>${escapeHtml(summary)}</pre>
      `,
    });

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          "Failed to send email",
      },
      {
        status: 500,
      }
    );
  }
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
