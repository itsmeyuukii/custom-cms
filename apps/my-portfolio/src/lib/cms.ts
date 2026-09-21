// Thin, app-local client for the CMS's public REST API (/api/v1).
// Not a shared package — per docs/MONOREPO_PLAN.md, that's only worth
// building once 2+ sites duplicate this. Fetch here, not client-side:
// server-to-server has no CORS concerns, and the CMS sets no CORS headers.

export type CmsBlock = {
  id: string;
  order: number;
  data: unknown;
  component: {
    key: string;
    name: string;
  };
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  blocks: CmsBlock[];
};

type ApiEnvelope<T> =
  { data: T } | { error: { code: string; message: string } };

export async function getPage(slug: string): Promise<CmsPage | null> {
  const baseUrl = process.env.CMS_API_URL;
  if (!baseUrl) {
    throw new Error("CMS_API_URL is not set");
  }

  const res = await fetch(`${baseUrl}/api/v1/pages/${slug}`, {
    next: { revalidate: 60 },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`CMS request failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as ApiEnvelope<CmsPage>;
  if ("error" in body) {
    throw new Error(`CMS returned an error: ${body.error.message}`);
  }
  return body.data;
}
