import { Check } from "lucide-react";

function Toast({ message }) {
  return (
    <div className="toast" role="status">
      <Check size={15} className="ic" />
      {message}
    </div>
  );
}

export default Toast;
