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
import MeetingHistory from "../components/MeetingHistory";
import LiveTranscript from "../components/LiveTranscript";

type Meeting = {
  summary: string;

  start: {
    dateTime: string;
  };

  hangoutLink?: string;
};

type MeetingHistoryItem = {
  id: number;
  title: string;
  summary: string;
  generatedAt: string;
};

export default function Home() {
  const { data: session } =
    useSession();

  // Safe user email
  const userEmail =
    session?.user?.email;

  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  // Current active summary
  const [summaries, setSummaries] =
    useState<string[]>([]);

  // User-wise history
  const [history, setHistory] =
    useState<
      MeetingHistoryItem[]
    >([]);

  const [
    actionItemsCount,
    setActionItemsCount,
  ] = useState(0);

  // Load user-wise history
  useEffect(() => {
    if (!userEmail) {
      return;
    }

    const loadHistory =
      async () => {
        const storageKey = `meeting-history-${userEmail}`;

        const savedHistory =
          localStorage.getItem(
            storageKey
          );

        if (!savedHistory) {
          return;
        }

        const parsedHistory: MeetingHistoryItem[] =
          JSON.parse(
            savedHistory
          );

        await Promise.resolve();

        setHistory(
          parsedHistory
        );
      };

    loadHistory();
  }, [userEmail]);

  // Save user-wise history
  useEffect(() => {
    if (!userEmail) {
      return;
    }

    const storageKey = `meeting-history-${userEmail}`;

    localStorage.setItem(
      storageKey,
      JSON.stringify(
        history
      )
    );
  }, [history, userEmail]);

  // Fetch upcoming meetings
  useEffect(() => {
    const fetchMeetings =
      async () => {
        if (
          !session?.accessToken
        ) {
          return;
        }

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
              `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
              {
                headers: {
                  Authorization: `Bearer ${session.accessToken}`,
                },
              }
            );

          const data =
            await response.json();

          // Only Google Meet meetings
          const filteredMeetings =
            (
              data.items ||
              []
            ).filter(
              (
                meeting: Meeting
              ) =>
                Boolean(
                  meeting.hangoutLink
                )
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

  // Handle Summary
const handleNewSummary = (
  summary: string
) => {
  setSummaries((prev) => [
    summary,
    ...prev,
  ]);

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
      {/* Header */}
      <header className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-md">
        <h1 className="text-2xl font-bold">
          AI Meeting Copilot
        </h1>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
            A
          </div>

          <span>
            {
              session?.user
                ?.name
            }
          </span>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
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

        {/* Main Content */}
        <section className="flex-1 p-8">
          {/* Login */}
          <div className="mb-8">
            <UserLogin />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upcoming Meetings */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-gray-500 text-sm">
                Upcoming Meetings
              </h2>

              <p className="text-3xl font-bold mt-2">
                {
                  meetings.length
                }
              </p>
            </div>

            {/* AI Summaries */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-gray-500 text-sm">
                AI Summaries
              </h2>

              <p className="text-3xl font-bold mt-2">
                {
                  summaries.length
                }
              </p>
            </div>

            {/* Action Items */}
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

          {/* Meetings */}
          <div className="mt-8">
            <Meetings
              meetings={
                meetings
              }
            />
          </div>

          {/* Upload Transcript */}
          <div className="mt-8">
            <TranscriptUpload
              onNewSummary={
                handleNewSummary
              }
            />
          </div>

          {/* Live Transcript */}
          <div className="mt-8">
            <LiveTranscript
              onNewSummary={
                handleNewSummary
              }
            />
          </div>

          {/* Current AI Summary */}
          <div className="mt-8">
            <SummaryList
              summaries={
                summaries
              }
            />
          </div>

          {/* Meeting History */}
          {/* <div className="mt-8">
            <MeetingHistory
              history={
                history
              }
            />
          </div> */}
        </section>
      </div>
    </main>
  );
}