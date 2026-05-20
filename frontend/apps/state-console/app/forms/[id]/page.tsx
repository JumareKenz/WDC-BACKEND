import { FormEditor } from '../../../src/components/FormEditor';
import { mockForms } from '../../../src/lib/mock-data-tables';

export function generateStaticParams() {
  return mockForms.map((f) => ({ id: f.id }));
}

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormEditor formId={id} />;
}
