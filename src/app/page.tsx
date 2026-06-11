"use client";

import {
  useEffect,
  useState,
} from "react";

import { useSession } from "next-auth/react";

import UserLogin from "../components/UserLogin";
import Meetings from "../components/Meetings";
import TranscriptUpload from "../components/TranscriptUpload";
import SummaryList from "../components/SummaryList";
import LiveTranscript from "../components/LiveTranscript";

type Meeting = {
  summary: string;

  start: {
    dateTime: string;
  };

  hangoutLink?: string;

  attendees?: {
    email: string;
  }[];

};

type HistoryItem = {
  id: number;
  title: string;
  summary: string;
  generatedAt: string;
};

export default function Home() {
  const { data: session } =
    useSession();

  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  const [summaries, setSummaries] =
    useState<string[]>([]);

  const [history, setHistory] =
    useState<HistoryItem[]>(
      []
    );

  const [
    actionItemsCount,
    setActionItemsCount,
  ] = useState(0);

  const [
    selectedMeeting,
    setSelectedMeeting,
  ] = useState<Meeting | null>(
    null
  );

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    )
      return;

    const email =
      session?.user?.email;

    if (!email) return;

    const savedHistory =
      localStorage.getItem(
        `meeting-history-${email}`
      );

    if (savedHistory) {
      try {
        const rawHistory =
          JSON.parse(savedHistory);

        const parsedHistory: HistoryItem[] =
          rawHistory.filter(
            (
              item: HistoryItem
            ) =>
              item &&
              item.summary &&
              item.title
          );

        queueMicrotask(() => {
          setHistory(
            parsedHistory
          );
        });
      } catch (error) {
        console.error(
          "History Parse Error:",
          error
        );
      }
    }
  }, [session]);

  useEffect(() => {
    const fetchMeetings =
      async () => {
        if (
          !session?.accessToken
        )
          return;

        try {
          const now =
            new Date();

          const timeMin =
            now.toISOString();

          const endOfDay =
            new Date();

          endOfDay.setHours(
            23,
            59,
            59,
            999
          );

          const timeMax =
            endOfDay.toISOString();

          const response =
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=20&singleEvents=true&orderBy=startTime`,
              {
                headers: {
                  Authorization: `Bearer ${session.accessToken}`,
                },
              }
            );

          const data =
            await response.json();

          const filteredMeetings =
            (
              data.items ||
              []
            ).filter(
              (
                meeting: Meeting
              ) =>
                meeting.hangoutLink
            );

          setMeetings(
            filteredMeetings
          );
        } catch (error) {
          console.error(
            "Meeting Fetch Error:",
            error
          );
        }
      };

    fetchMeetings();
  }, [session]);

  const handleNewSummary = (
    summary: string
  ) => {
    setSummaries((prev) => [
      summary,
      ...prev,
    ]);

    setHistory((prev) => {
      const newHistoryItem: HistoryItem =
      {
        id: Date.now(),

        title:
          selectedMeeting?.summary ||
          "Untitled Meeting",

        summary,

        generatedAt:
          new Date().toLocaleString(),
      };

      const updatedHistory = [
        newHistoryItem,
        ...prev,
      ];

      if (
        session?.user?.email
      ) {
        localStorage.setItem(
          `meeting-history-${session.user.email}`,
          JSON.stringify(
            updatedHistory
          )
        );
      }

      return updatedHistory;
    });

    const actionSection =
      summary.split(
        "Action Items:"
      )[1] || "";

    const actionMatches =
      actionSection.match(
        /^(\d+\.|-)/gm
      );

    setActionItemsCount(
      (prev) =>
        prev +
        (actionMatches
          ? actionMatches.length
          : 0)
    );
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-md">
        <h1 className="text-2xl font-bold">
          AI Meeting Copilot
        </h1>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
            A
          </div>

          <span>
            {session?.user?.name}
          </span>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 min-h-screen bg-slate-800 text-white p-6">
          <nav className="space-y-4">
            <div className="bg-slate-700 p-3 rounded-xl">
              Dashboard
            </div>

            <div className="hover:bg-slate-700 p-3 rounded-xl cursor-pointer">
              Meetings
            </div>

            <div className="hover:bg-slate-700 p-3 rounded-xl cursor-pointer">
              Summaries
            </div>

            <div className="hover:bg-slate-700 p-3 rounded-xl cursor-pointer">
              Settings
            </div>
          </nav>
        </aside>

        <section className="flex-1 p-8">
          <div className="mb-8">
            <UserLogin />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-gray-500 text-sm">
                Total Meetings
              </h2>

              <p className="text-3xl font-bold mt-2">
                {
                  meetings.length
                }
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-gray-500 text-sm">
                AI Summaries
              </h2>

              <p className="text-3xl font-bold mt-2">
                {
                  history.length
                }
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-gray-500 text-sm">
                Action Items
              </h2>

              <p className="text-3xl font-bold mt-2">
                {
                  actionItemsCount
                }
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Meetings
              meetings={
                meetings
              }
              onSelectMeeting={
                setSelectedMeeting
              }
            />
          </div>

          <div className="mt-8">
            <TranscriptUpload
              onNewSummary={
                handleNewSummary
              }
            />
          </div>

          <div className="mt-8">
            <LiveTranscript
              onNewSummary={
                handleNewSummary
              }
            />
          </div>

          <div className="mt-8">
            <SummaryList
              summaries={
                summaries
              }
              selectedMeeting={
                selectedMeeting
              }
            />
          </div>

          <div className="mt-8 bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">
              Meeting History
            </h2>

            {history.length === 0 && (
              <p>
                No meeting history
                available
              </p>
            )}

            {history.length > 0 && (
              <div className="space-y-4">
                {history
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-xl p-4"
                    >
                      <h3 className="font-semibold text-lg">
                        {item.title}
                      </h3>

                      <p className="text-sm text-gray-500 mb-2">
                        {
                          item.generatedAt
                        }
                      </p>

                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {
                          item.summary
                        }
                      </pre>
                    </div>
                  )
                  )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
