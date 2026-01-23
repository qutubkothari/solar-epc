"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { TokenForm } from "@/components/token-form";
import { ModalShell } from "@/components/modal-shell";
import { formatDate } from "@/lib/format";

type Token = {
  id: string;
  token: string;
  expiresAt: string | null;
  allowDownload?: boolean;
  clientId?: string;
  inquiryId?: string;
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
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [viewToken, setViewToken] = useState<Token | null>(null);

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

  const handleDeleteToken = async (id: string) => {
    const confirmDelete = window.confirm("Delete this token?");
    if (!confirmDelete) return;
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTokens();
      if (viewToken?.id === id) setViewToken(null);
    }
  };

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
                    onClick={() => setViewToken(token)}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    View
                  </button>
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
                  <button
                    onClick={() => setEditingToken(token)}
                    className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteToken(token.id)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                  >
                    Delete
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

      {editingToken && (
        <TokenForm
          tokenId={editingToken.id}
          initialData={{
            clientId: editingToken.clientId || "",
            inquiryId: editingToken.inquiryId || "",
            expiresAt: editingToken.expiresAt,
            allowDownload: editingToken.allowDownload,
          }}
          onClose={() => setEditingToken(null)}
          onSuccess={() => {
            fetchTokens();
            setEditingToken(null);
          }}
        />
      )}

      {viewToken && (
        <ModalShell
          title="Token Details"
          subtitle={viewToken.inquiry?.title || "Token"}
          onClose={() => setViewToken(null)}
          size="md"
        >
          <div className="space-y-2 text-sm text-solar-ink">
            <div className="flex justify-between">
              <span className="text-solar-muted">Client</span>
              <span className="font-semibold">{viewToken.client.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Token</span>
              <span className="font-semibold">{viewToken.token}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Expiry</span>
              <span className="font-semibold">{formatDate(viewToken.expiresAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-solar-muted">Allow Download</span>
              <span className="font-semibold">{viewToken.allowDownload ? "Yes" : "No"}</span>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
