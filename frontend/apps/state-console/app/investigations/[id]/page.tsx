import { mockInvestigations } from '../../../src/lib/mock-data-tables';
import InvestigationDetailPageClient from './investigation-page';

export function generateStaticParams() {
  return mockInvestigations.map((i) => ({ id: i.id }));
}

export default async function InvestigationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return <InvestigationDetailPageClient />;
}
