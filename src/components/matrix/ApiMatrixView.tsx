import { ApiDashboardView } from '../dashboard/ApiDashboardView';
import type { UploadBatch } from '../../lib/api';
import type { Language } from '../../types';

export function ApiMatrixView({ batches, language }: { batches: UploadBatch[]; language: Language }) {
  return <ApiDashboardView batches={batches} language={language} matrix refreshKey={batches.map(b => `${b.id}:${b.status}`).join('|')} />;
}
