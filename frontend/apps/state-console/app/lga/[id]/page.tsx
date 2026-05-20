import { mockLgaHeatmap } from '../../../src/lib/mock-dashboard';
import LgaDrilldownPageClient from './lga-page';

export function generateStaticParams() {
  return mockLgaHeatmap.map((l) => ({ id: l.id }));
}

export default async function LgaDrilldownPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return <LgaDrilldownPageClient />;
}
