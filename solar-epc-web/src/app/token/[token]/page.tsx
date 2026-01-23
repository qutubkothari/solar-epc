"use client";

import { useEffect, useState } from "react";

type TokenRecord = {
  id: string;
  token: string;
  allowDownload: boolean;
  expiresAt: string | null;
  inquiry: {
    id: string;
    title: string;
  };
  client: {
    name: string;
  };
};

type CompletionDoc = {
  id: string;
  name: string;
  fileUrl: string;
  inquiry?: {
    id: string;
  };
};

export default function TokenAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [tokenParam, setTokenParam] = useState<string | null>(null);
  const [tokenRecord, setTokenRecord] = useState<TokenRecord | null>(null);
  const [docs, setDocs] = useState<CompletionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    params
      .then((resolved) => {
        if (isActive) {
          setTokenParam(resolved.token);
        }
      })
      .catch(() => {
        if (isActive) {
          setTokenParam(null);
        }
      });
    return () => {
      isActive = false;
    };
  }, [params]);

  useEffect(() => {
    if (!tokenParam) return;
    const fetchData = async () => {
      try {
        const tokenRes = await fetch("/api/tokens");
        const tokenData: TokenRecord[] = await tokenRes.json();
        const match = tokenData.find((item) => item.token === tokenParam);
        setTokenRecord(match || null);

        const docsRes = await fetch("/api/completion-docs");
        const docsData: CompletionDoc[] = await docsRes.json();
        if (match?.inquiry?.id) {
          setDocs(docsData.filter((doc) => doc.inquiry?.id === match.inquiry.id));
        } else {
          setDocs([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenParam]);

  if (loading) {
    return <div className="p-10 text-center text-sm text-solar-muted">Loading...</div>;
  }

  if (!tokenRecord) {
    return (
      <div className="p-10 text-center text-sm text-solar-muted">
        Invalid or expired token.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-solar-sand p-8 text-solar-ink">
      <div className="mx-auto max-w-3xl rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        <h1 className="text-2xl font-semibold">Client Document Access</h1>
        <p className="mt-2 text-sm text-solar-muted">
          {tokenRecord.client.name} • {tokenRecord.inquiry.title}
        </p>

        <div className="mt-6 space-y-3">
          {docs.length === 0 ? (
            <div className="text-sm text-solar-muted">No documents available yet.</div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-solar-ink">{doc.name}</p>
                  <p className="text-xs text-solar-muted">Completion Document</p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                >
                  {tokenRecord.allowDownload ? "Open" : "View"}
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
