import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  brandName?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColorHex?: string;
  businessMode?: 'BOOKING' | 'SHOP' | 'HYBRID';
  profile?: { displayName?: string; addressLine?: string };
}

async function getWorkspace(slug: string): Promise<WorkspaceData | null> {
  try {
    const res = await fetch(`${API_URL}/workspace/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ws = await getWorkspace(slug);

  if (!ws) {
    return {
      title: 'Agendar — BELA PRO',
      description: 'Agende seu horário online',
    };
  }

  const name = ws.brandName || ws.name;
  const isShop = ws.businessMode === 'SHOP';
  const title = isShop ? `Loja de ${name} — BELA PRO` : `Agendar com ${name} — BELA PRO`;
  const description =
    ws.description ||
    (isShop
      ? `Conheça os produtos de ${name}. Faça seu pedido online em poucos cliques.`
      : `Agende seu horário online com ${name}. Escolha o serviço, data e horário em poucos cliques.`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'BELA PRO',
      ...(ws.coverImageUrl || ws.logoUrl
        ? { images: [{ url: ws.coverImageUrl || ws.logoUrl! }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ws.coverImageUrl || ws.logoUrl
        ? { images: [ws.coverImageUrl || ws.logoUrl!] }
        : {}),
    },
    ...(ws.primaryColorHex ? { themeColor: ws.primaryColorHex } : {}),
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${slug}/booking`,
    },
  };
}

export default function BookingLayout({ children }: { children: ReactNode }) {
  return children;
}
