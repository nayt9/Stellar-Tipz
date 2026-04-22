import BigNumber from "bignumber.js";
import React, { useEffect, useState } from "react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { env } from "../../helpers/env";
import { stroopToXlm, xlmToStroop } from "../../helpers/format";
import { useWallet, useContract } from "../../hooks";
import { BASE_FEE } from "../../services";

interface TipAmountInputProps {
  amount: string;
  onChange: (amount: string) => void;
}

const QUICK_AMOUNTS = ["1", "5", "10", "25", "50"];
const DEFAULT_MIN_TIP_XLM = "0.1"; // 1,000,000 stroops
const ESTIMATED_NETWORK_FEE_XLM = new BigNumber(stroopToXlm(BASE_FEE, 5));

const formatXlmDisplay = (value: BigNumber): string => {
  const decimalPlaces = value.decimalPlaces() ?? 0;
  return value.toFormat(Math.min(7, Math.max(2, decimalPlaces)));
};

const TipAmountInput: React.FC<TipAmountInputProps> = ({ amount, onChange }) => {
  const { connected, publicKey } = useWallet();
  const { getMinTipAmount } = useContract();
  const [useCustom, setUseCustom] = useState(!QUICK_AMOUNTS.includes(amount));
  const [fetchedBalance, setFetchedBalance] = useState<string>("");
  const [minTipXlm, setMinTipXlm] = useState<string>(DEFAULT_MIN_TIP_XLM);

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
      }
    };

    void fetchMinTip();

    return () => {
      active = false;
    };
  }, [getMinTipAmount]);

  const effectiveBalance = fetchedBalance;
  const numericAmount = Number(amount);
  const numericBalance = Number(effectiveBalance);
  const numericMinTip = Number(minTipXlm);
  const amountBigNumber = Number.isNaN(numericAmount)
    ? new BigNumber(0)
    : new BigNumber(amount || "0");
  const amountInStroops = Number.isNaN(numericAmount) || numericAmount <= 0
    ? null
    : xlmToStroop(amount);
  const totalCost = amountBigNumber.plus(ESTIMATED_NETWORK_FEE_XLM);
  const balanceBigNumber = !effectiveBalance || Number.isNaN(numericBalance)
    ? null
    : new BigNumber(effectiveBalance);

  let amountError: string | undefined;

  if (!amount.trim()) {
    amountError = "Enter a tip amount.";
  } else if (Number.isNaN(numericAmount)) {
    amountError = "Amount must be numeric.";
  } else if (numericAmount <= 0) {
    amountError = "Amount must be greater than 0.";
  } else if (numericAmount < numericMinTip) {
    amountError = `Minimum tip is ${minTipXlm} XLM.`;
  } else if (
    connected &&
    effectiveBalance &&
    !Number.isNaN(numericBalance) &&
    numericAmount > numericBalance
  ) {
    amountError = "Amount exceeds your available XLM balance.";
  } else if (connected && balanceBigNumber && totalCost.gt(balanceBigNumber)) {
    amountError =
      "Total cost exceeds your available XLM balance once network fees are included.";
  }

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

      <div className="space-y-3 border-2 border-black bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-600">
            Payment summary
          </p>
          <p className="text-[11px] font-bold text-gray-500">
            Estimated before signing
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="font-bold text-gray-600">Tip amount</dt>
            <dd className="text-right font-black tabular-nums">
              {formatXlmDisplay(amountBigNumber)} XLM
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-bold text-gray-600">Tip amount (stroops)</dt>
            <dd className="text-right font-bold tabular-nums text-gray-700">
              {amountInStroops ? amountInStroops.toFormat(0) : "0"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-bold text-gray-600">Estimated network fee</dt>
            <dd className="text-right font-bold tabular-nums text-gray-700">
              {formatXlmDisplay(ESTIMATED_NETWORK_FEE_XLM)} XLM
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t-2 border-dashed border-black pt-2">
            <dt className="font-black uppercase tracking-wide">Total cost</dt>
            <dd className="text-right font-black tabular-nums">
              {formatXlmDisplay(totalCost)} XLM
            </dd>
          </div>
        </dl>

        {connected && balanceBigNumber && totalCost.gt(balanceBigNumber) && (
          <p className="border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            This tip total is higher than your current wallet balance.
          </p>
        )}
      </div>

      <p className="text-sm font-bold text-gray-600">
        Your balance: {effectiveBalance ? `${Number(effectiveBalance).toLocaleString()} XLM` : "Connect wallet to load balance"}
      </p>
    </div>
  );
};

export default TipAmountInput;
