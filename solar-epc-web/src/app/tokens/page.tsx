"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { TokenForm } from "@/components/token-form";
import { formatDate } from "@/lib/format";

type Token = {
  id: string;
  token: string;
  expiresAt: string | null;
  client: {
    name: string;
  };
  inquiry: {
    title: string;
  };
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/tokens");
      const data = await res.json();
      setTokens(data);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const getTokenLink = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/token/${token}`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Client Document Tokens"
        subtitle="Share secure, view-only links for closure document packs."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-solar-amber px-4 py-2 text-sm font-semibold text-white"
          >
            Generate Token
          </button>
        }
      />

      <div className="rounded-2xl border border-solar-border bg-white p-6 shadow-solar">
        {loading ? (
          <div className="text-center text-sm text-solar-muted">Loading...</div>
        ) : tokens.length === 0 ? (
          <div className="text-center text-sm text-solar-muted">
            No tokens yet. Generate a token to share documents.
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-solar-ink">
                    {token.inquiry?.title || "Untitled Project"}
                  </p>
                  <p className="text-xs text-solar-muted">{token.client.name}</p>
                </div>
                <div className="text-xs text-solar-muted">
                  Token: <span className="font-semibold text-solar-ink">{token.token}</span>
                  <div>Expiry: {formatDate(token.expiresAt)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(getTokenLink(token.token))}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => window.open(getTokenLink(token.token), "_blank")}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TokenForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchTokens();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
