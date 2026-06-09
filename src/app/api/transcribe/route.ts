import OpenAI from "openai";

export async function POST(
  req: Request
) {
  try {
    if (
      !process.env.OPENAI_API_KEY
    ) {
      return Response.json(
        {
          error:
            "OPENAI_API_KEY is required for voice transcription.",
        },
        {
          status: 500,
        }
      );
    }

    const client = new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY,
    });

    const formData =
      await req.formData();

    const audio =
      formData.get("audio");

    if (!(audio instanceof File)) {
      return Response.json(
        {
          error:
            "Audio file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size < 1024) {
      return Response.json({
        text: "",
      });
    }

    const transcription =
      await client.audio.transcriptions.create(
        {
          file: audio,
          model:
            "gpt-4o-mini-transcribe",
          language: "en",
          prompt:
            "Transcribe meeting speech only. Preserve technical terms such as API, POC, React, Next.js, TypeScript, and integration.",
        }
      );

    return Response.json({
      text:
        transcription.text ||
        "",
    });
  } catch (error) {
    console.error(
      "Transcription Error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to transcribe audio.",
      },
      {
        status: 500,
      }
    );
  }
}
