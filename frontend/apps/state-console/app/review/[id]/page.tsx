import { mockSubmissions } from '../../../src/lib/mock-data-tables';
import ReviewPageClient from './review-page';

export function generateStaticParams() {
  return mockSubmissions.map((s) => ({ id: s.id }));
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return <ReviewPageClient />;
}
