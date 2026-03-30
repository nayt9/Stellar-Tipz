import React, { useEffect, useMemo, useState } from "react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { env } from "../../helpers/env";
import { useWallet, useContract } from "../../hooks";

interface TipAmountInputProps {
  amount: string;
  onChange: (amount: string) => void;
  balance?: string;
}

const QUICK_AMOUNTS = ["1", "5", "10", "25", "50"];
const DEFAULT_MIN_TIP_XLM = "0.1"; // 1,000,000 stroops

const TipAmountInput: React.FC<TipAmountInputProps> = ({ amount, onChange, balance }) => {
  const { connected, publicKey } = useWallet();
  const { getMinTipAmount } = useContract();
  const [useCustom, setUseCustom] = useState(!QUICK_AMOUNTS.includes(amount));
  const [fetchedBalance, setFetchedBalance] = useState<string>("");
  const [minTipXlm, setMinTipXlm] = useState<string>(DEFAULT_MIN_TIP_XLM);
  const [loadingMinTip, setLoadingMinTip] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchBalance = async () => {
      if (!connected || !publicKey) {
        if (active) {
          setFetchedBalance("");
        }
        return;
      }

      try {
        const response = await fetch(`${env.horizonUrl}/accounts/${publicKey}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const nativeBalance = Array.isArray(data.balances)
          ? data.balances.find((entry: { asset_type?: string; balance?: string }) => entry.asset_type === "native")
          : undefined;

        if (active && nativeBalance?.balance) {
          setFetchedBalance(nativeBalance.balance);
        }
      } catch {
        if (active) {
          setFetchedBalance("");
        }
      }
    };

    void fetchBalance();

    return () => {
      active = false;
    };
  }, [connected, publicKey]);

  // Fetch minimum tip amount from contract
  useEffect(() => {
    let active = true;

    const fetchMinTip = async () => {
      setLoadingMinTip(true);
      try {
        const minTip = await getMinTipAmount();
        if (active) {
          setMinTipXlm(minTip);
        }
      } catch (err) {
        console.error("Failed to fetch minimum tip amount:", err);
        // Use default if fetch fails
        if (active) {
          setMinTipXlm(DEFAULT_MIN_TIP_XLM);
        }
      } finally {
        if (active) {
          setLoadingMinTip(false);
        }
      }
    };

    void fetchMinTip();

    return () => {
      active = false;
    };
  }, [getMinTipAmount]);

  const effectiveBalance = balance ?? fetchedBalance;
  const numericAmount = Number(amount);
  const numericBalance = Number(effectiveBalance);
  const numericMinTip = Number(minTipXlm);

  const amountError = useMemo(() => {
    if (!amount.trim()) {
      return "Enter a tip amount.";
    }

    if (Number.isNaN(numericAmount)) {
      return "Amount must be numeric.";
    }

    if (numericAmount <= 0) {
      return "Amount must be greater than 0.";
    }

    if (numericAmount < numericMinTip) {
      return `Minimum tip is ${minTipXlm} XLM.`;
    }

    if (connected && effectiveBalance && !Number.isNaN(numericBalance) && numericAmount > numericBalance) {
      return "Amount exceeds your available XLM balance.";
    }

    return undefined;
  }, [amount, connected, effectiveBalance, numericAmount, numericBalance, minTipXlm, numericMinTip]);

  return (
    <div className="space-y-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-600">Tip amount</p>

      <div className="rounded-md border-2 border-black bg-yellow-100 p-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-600">Selected amount</p>
        <p className="mt-2 text-4xl font-black">
          {amount || "0"} <span className="text-2xl">XLM</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((value) => (
          <Button
            key={value}
            type="button"
            variant={!useCustom && amount === value ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setUseCustom(false);
              onChange(value);
            }}
          >
            {value} XLM
          </Button>
        ))}

        <Button
          type="button"
          variant={useCustom ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setUseCustom(true);
            if (QUICK_AMOUNTS.includes(amount)) {
              onChange("");
            }
          }}
        >
          Custom
        </Button>
      </div>

      {useCustom && (
        <Input
          label="Custom amount"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(event) => onChange(event.target.value)}
          error={amountError}
        />
      )}

      {!useCustom && amountError && (
        <p className="text-sm font-medium text-red-600">{amountError}</p>
      )}

      <p className="text-sm font-bold text-gray-600">
        Your balance: {effectiveBalance ? `${Number(effectiveBalance).toLocaleString()} XLM` : "Connect wallet to load balance"}
      </p>
    </div>
  );
};

export default TipAmountInput;
