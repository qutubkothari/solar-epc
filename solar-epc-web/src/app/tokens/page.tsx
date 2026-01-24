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
        <TokenDocumentsView
          token={viewToken}
          onClose={() => setViewToken(null)}
          onUpdate={fetchTokens}
        />
      )}
    </div>
  );
}

// Token Documents Management Component
function TokenDocumentsView({ 
  token, 
  onClose, 
  onUpdate 
}: { 
  token: Token; 
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      const [completionRes, quotationRes, proposalRes] = await Promise.all([
        fetch("/api/completion-docs"),
        fetch("/api/quotations"),
        fetch("/api/technical-proposals"),
      ]);
      
      const completionDocs = await completionRes.json();
      const quotations = await quotationRes.json();
      const proposals = await proposalRes.json();
      
      const inquiryId = token.inquiryId;
      
      const allDocs = [
        ...completionDocs
          .filter((d: any) => d.inquiryId === inquiryId)
          .map((d: any) => ({ ...d, type: 'Completion Document', downloadUrl: d.fileUrl })),
        ...quotations
          .filter((q: any) => q.inquiryId === inquiryId)
          .map((q: any) => ({ 
            id: q.id, 
            name: q.title, 
            type: 'Quotation',
            downloadUrl: `/api/quotations/${q.id}/pdf`,
            createdAt: q.createdAt
          })),
        ...proposals
          .filter((p: any) => p.inquiryId === inquiryId)
          .map((p: any) => ({ 
            id: p.id, 
            name: p.title, 
            type: 'Technical Proposal',
            downloadUrl: `/api/technical-proposals/${p.id}/pdf`,
            createdAt: p.createdAt
          })),
      ];
      
      setDocs(allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [token.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('inquiryId', token.inquiryId!);
        formData.append('name', file.name);

        const res = await fetch('/api/completion-docs', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
      }
      
      fetchDocs();
      onUpdate();
    } catch (error) {
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docType: string) => {
    if (!confirm('Delete this document?')) return;
    
    try {
      const endpoint = docType === 'Completion Document' 
        ? `/api/completion-docs/${docId}`
        : docType === 'Quotation'
        ? `/api/quotations/${docId}`
        : `/api/technical-proposals/${docId}`;
        
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        fetchDocs();
        onUpdate();
      }
    } catch (error) {
      alert('Failed to delete document');
    }
  };

  return (
    <ModalShell
      title="📄 Token Documents"
      subtitle={`${token.client.name} • ${token.inquiry?.title || 'Documents'}`}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-4">
        {/* Token Info */}
        <div className="rounded-xl bg-amber-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-solar-muted">Token Link:</span>
            <button
              onClick={() => {
                const link = `${window.location.origin}/token/${token.token}`;
                navigator.clipboard.writeText(link);
                alert('Link copied to clipboard!');
              }}
              className="text-solar-amber hover:underline font-semibold"
            >
              Copy Link
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-solar-muted">Expires:</span>
            <span className="font-semibold">{formatDate(token.expiresAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-solar-muted">Download Enabled:</span>
            <span className="font-semibold">{token.allowDownload ? 'Yes' : 'View Only'}</span>
          </div>
        </div>

        {/* Upload Section */}
        <div className="rounded-xl border-2 border-dashed border-solar-border p-6 text-center">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="doc-upload"
            disabled={uploading}
          />
          <label
            htmlFor="doc-upload"
            className="cursor-pointer"
          >
            <div className="text-4xl mb-2">📎</div>
            <p className="text-sm font-semibold text-solar-ink mb-1">
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </p>
            <p className="text-xs text-solar-muted">
              Click to select files or drag and drop
            </p>
          </label>
        </div>

        {/* Documents List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-solar-ink">
            Available Documents ({docs.length})
          </h3>
          
          {loading ? (
            <div className="text-center py-8 text-sm text-solar-muted">Loading documents...</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8 text-sm text-solar-muted">
              No documents yet. Upload documents to share with client.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {docs.map((doc) => (
                <div
                  key={`${doc.type}-${doc.id}`}
                  className="flex items-center justify-between rounded-xl border border-solar-border bg-white p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-solar-ink">{doc.name}</p>
                    <p className="text-xs text-solar-muted">{doc.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-solar-border bg-white px-3 py-1.5 text-xs font-semibold text-solar-ink hover:bg-solar-sky"
                    >
                      Preview
                    </a>
                    {doc.type === 'Completion Document' && (
                      <button
                        onClick={() => handleDelete(doc.id, doc.type)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-solar-border bg-white py-2 text-sm font-semibold text-solar-ink"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
