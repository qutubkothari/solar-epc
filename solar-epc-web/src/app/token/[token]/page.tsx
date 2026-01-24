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
        const [tokenRes, docsRes, settingsRes] = await Promise.all([
          fetch("/api/tokens"),
          fetch("/api/completion-docs"),
          fetch("/api/company-settings"),
        ]);
        
        const tokenData: TokenRecord[] = await tokenRes.json();
        const match = tokenData.find((item) => item.token === tokenParam);
        setTokenRecord(match || null);

        const docsData: CompletionDoc[] = await docsRes.json();
        if (match?.inquiry?.id) {
          setDocs(docsData.filter((doc) => doc.inquiry?.id === match.inquiry.id));
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
                  <p className="text-xs text-solar-muted">Completion Document</p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-solar-border bg-white px-3 py-2 text-xs font-semibold text-solar-ink hover:bg-solar-sky transition-colors"
                >
                  {tokenRecord.allowDownload ? "Open" : "View"}
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
