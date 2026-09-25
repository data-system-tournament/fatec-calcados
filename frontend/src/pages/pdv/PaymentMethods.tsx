import { Banknote, CreditCard, QrCode, Wallet, type LucideIcon } from "lucide-react";
import { PAYMENT_METHODS } from "../../config";
import Secao from "./Secao";

const ICONES: Record<string, LucideIcon> = { PIX: QrCode, CREDITO: CreditCard, DEBITO: Wallet, DINHEIRO: Banknote };

const baseClass =
  "flex h-12 items-center gap-2.5 rounded-lg border px-3 text-left text-[13.5px] font-medium " +
  "transition-[border-color,background-color,color] duration-100 ";
const selectedClass = "border-ink bg-ink text-surface";
const idleClass = "border-line-2 bg-surface text-ink-2 hover:border-faint";

type PaymentMethodsProps = {
  value: string;
  onChange: (code: string) => void;
};

function PaymentMethods({ value, onChange }: PaymentMethodsProps) {
  return (
    <Secao titulo="Pagamento">
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((method) => {
          const selected = method.code === value;
          const Icone = ICONES[method.code] ?? CreditCard;
          return (
            <button
              key={method.code}
              className={baseClass + (selected ? selectedClass : idleClass)}
              aria-pressed={selected}
              onClick={() => onChange(method.code)}
            >
              <Icone size={17} strokeWidth={1.7} aria-hidden className="flex-none" />
              {method.label}
            </button>
          );
        })}
      </div>
    </Secao>
  );
}

export default PaymentMethods;
