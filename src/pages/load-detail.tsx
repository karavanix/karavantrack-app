import { useParams, useNavigate } from "react-router-dom";
import { LoadDetailView } from "@/components/loads/load-detail-view";

export default function LoadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return null;

  return <LoadDetailView loadId={id} onClose={() => navigate(-1)} />;
}
