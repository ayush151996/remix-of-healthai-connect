import { AlertTriangle } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="medical-disclaimer flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
      <p className="text-xs leading-relaxed">
        <strong>Disclaimer:</strong> This tool provides health insights only and is not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.
      </p>
    </div>
  );
}
