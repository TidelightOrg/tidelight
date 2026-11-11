import PublicCapsuleViewer from "@/app/ui/public-capsule-viewer";
import "./public-capsule.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Public Decision Capsule · Tidelight",
  robots: { index: false, follow: false },
};

export default async function PublicCapsulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicCapsuleViewer key={token} token={token} />;
}
