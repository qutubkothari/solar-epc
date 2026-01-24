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
  type?: string;
  inquiry?: {
    id: string;
  };
  createdAt?: string;
};

type CompanySettings = {
  companyName: string;
  companyTagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  loginLogo?: string | null;
  loginBgImage?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export default function TokenAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [tokenParam, setTokenParam] = useState<string | null>(null);
  const [tokenRecord, setTokenRecord] = useState<TokenRecord | null>(null);
  const [docs, setDocs] = useState<CompletionDoc[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
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
        const [tokenRes, docsRes, quotationsRes, proposalsRes, settingsRes] = await Promise.all([
          fetch("/api/tokens"),
          fetch("/api/completion-docs"),
          fetch("/api/quotations"),
          fetch("/api/technical-proposals"),
          fetch("/api/company-settings"),
        ]);
        
        const tokenData: TokenRecord[] = await tokenRes.json();
        const match = tokenData.find((item) => item.token === tokenParam);
        setTokenRecord(match || null);

        if (match?.inquiry?.id) {
          const completionDocs = await docsRes.json();
          const quotations = await quotationsRes.json();
          const proposals = await proposalsRes.json();
          
          const allDocs = [
            ...completionDocs
              .filter((d: any) => d.inquiry?.id === match.inquiry.id)
              .map((d: any) => ({ 
                id: d.id, 
                name: d.name, 
                fileUrl: `/api/completion-docs/${d.id}/file`,
                type: 'Document',
                createdAt: d.createdAt
              })),
            ...quotations
              .filter((q: any) => q.inquiryId === match.inquiry.id)
              .map((q: any) => ({ 
                id: q.id, 
                name: q.title, 
                fileUrl: `/api/quotations/${q.id}/pdf`,
                type: 'Quotation',
                createdAt: q.createdAt
              })),
            ...proposals
              .filter((p: any) => p.inquiryId === match.inquiry.id)
              .map((p: any) => ({ 
                id: p.id, 
                name: p.title, 
                fileUrl: `/api/technical-proposals/${p.id}/pdf`,
                type: 'Technical Proposal',
                createdAt: p.createdAt
              })),
          ];
          
          setDocs(allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else {
          setDocs([]);
        }
        
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
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
      <div 
        className="min-h-screen flex items-center justify-center p-8"
        style={{
          backgroundImage: settings?.loginBgImage ? `url(${settings.loginBgImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="rounded-2xl border border-solar-border bg-white p-10 shadow-solar text-center max-w-md">
          {settings?.loginLogo && (
            <img
              src={settings.loginLogo}
              alt={settings.companyName}
              className="h-20 mx-auto object-contain mb-6"
            />
          )}
          <h1 className="text-xl font-semibold text-solar-ink mb-2">Access Denied</h1>
          <p className="text-sm text-solar-muted">
            Invalid or expired token.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-8"
      style={{
        backgroundImage: settings?.loginBgImage ? `url(${settings.loginBgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: settings?.loginBgImage ? undefined : '#f9f7f4',
      }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-solar-border bg-white p-8 shadow-solar">
        {/* Logo and Header */}
        {settings?.loginLogo && (
          <div className="text-center mb-6">
            <img
              src={settings.loginLogo}
              alt={settings.companyName}
              className="h-16 mx-auto object-contain mb-3"
            />
            {settings.companyTagline && (
              <p className="text-sm text-solar-muted">{settings.companyTagline}</p>
            )}
          </div>
        )}
        
        <h1 className="text-2xl font-semibold text-center mb-2">Client Document Access</h1>
        <p className="text-center text-sm text-solar-muted mb-6">
          {tokenRecord.client.name} • {tokenRecord.inquiry.title}
        </p>

        <div className="space-y-3">
          {docs.length === 0 ? (
            <div className="text-center py-8 text-sm text-solar-muted">No documents available yet.</div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-solar-border bg-solar-sand px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-solar-ink">{doc.name}</p>
                  <p className="text-xs text-solar-muted">{doc.type || 'Document'}</p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink hover:bg-solar-sky transition-colors"
                >
                  {tokenRecord.allowDownload ? "Download" : "View"}
                </a>
              </div>
            ))
          )}
        </div>
        
        {/* Footer with company branding */}
        {settings && (
          <div className="mt-8 pt-6 border-t border-solar-border text-center">
            <p className="text-xs text-solar-muted">
              Powered by <span className="font-semibold">{settings.companyName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
