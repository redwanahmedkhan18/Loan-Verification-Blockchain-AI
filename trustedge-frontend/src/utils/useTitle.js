import { useEffect } from "react";
export default function useTitle(title, brand = "TrustEdge Bank") {
  useEffect(() => {
    document.title = title ? `${title} — ${brand}` : brand;
  }, [title, brand]);
}
