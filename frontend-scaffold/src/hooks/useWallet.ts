import { useMemo } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  AlbedoModule,
  xBullModule,
} from "@creit.tech/stellar-wallets-kit";
import { signTx } from "../helpers/network";
import { useWalletStore } from "../store/walletStore";

interface Freighter {
  getNetwork: () => Promise<string>;
  getAddress: () => Promise<string>;
}

let kitInstance: StellarWalletsKit | null = null;
let currentNetwork: WalletNetwork | null = null;

type DisposableWalletKit = StellarWalletsKit & {
  closeModal?: () => void;
  disconnect?: () => void | Promise<void>;
  destroy?: () => void;
  removeAllListeners?: () => void;
};

const disposeKit = (kit: StellarWalletsKit | null) => {
  const disposableKit = kit as DisposableWalletKit | null;
  if (!disposableKit) return;

  try {
    disposableKit.closeModal?.();
  } catch (error) {
    console.warn("Failed to close wallet modal during cleanup:", error);
  }

  try {
    void disposableKit.disconnect?.();
  } catch (error) {
    console.warn("Failed to disconnect wallet kit during cleanup:", error);
  }

  try {
    disposableKit.removeAllListeners?.();
    disposableKit.destroy?.();
  } catch (error) {
    console.warn("Failed to fully dispose wallet kit during cleanup:", error);
  }
};

const getKit = (network: WalletNetwork) => {
  if (!kitInstance || currentNetwork !== network) {
    disposeKit(kitInstance);
    kitInstance = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID,
      modules: [new FreighterModule(), new AlbedoModule(), new xBullModule()],
    });
    currentNetwork = network;
  }
  return kitInstance;
};

export const useWallet = () => {
  const {
    publicKey,
    connected,
    connecting,
    error,
    network,
    connect,
    disconnect,
    setConnecting,
    setError,
    setNetwork: storeSetNetwork,
  } = useWalletStore();

  const kitNetwork =
    network === "PUBLIC" ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;
  const kit = useMemo(() => getKit(kitNetwork), [kitNetwork]);

  const actions = useMemo(
    () => ({
      connect: async () => {
        setConnecting(true);
        setError(null);
        try {
          await kit.openModal({
            onWalletSelected: async (option) => {
              try {
                kit.setWallet(option.id);
                const { address } = await kit.getAddress();

                // Automatic network detection for better UX
                try {
                  // If it's Freighter, check its current network
                  const freighterWindow = window as unknown as {
                    freighter?: Freighter;
                  };
                  if (option.id === FREIGHTER_ID && freighterWindow.freighter) {
                    const networkDetails =
                      await freighterWindow.freighter.getNetwork();
                    const detectedNetwork =
                      networkDetails === "PUBLIC" ? "PUBLIC" : "TESTNET";
                    if (detectedNetwork !== network) {
                      storeSetNetwork(detectedNetwork);
                    }
                  }
                } catch (e) {
                  console.warn("Network auto-detection failed:", e);
                }

                connect(address);
              } catch (err) {
                console.error("Wallet connection failed:", err);
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to connect wallet",
                );
              }
            },
          });
        } catch {
          setConnecting(false);
        }
      },

      disconnect: () => {
        disconnect();
      },

      setNetwork: (newNetwork: "TESTNET" | "PUBLIC") => {
        storeSetNetwork(newNetwork);
      },

      signTransaction: async (xdr: string): Promise<string> => {
        if (!publicKey) {
          throw new Error("Wallet not connected");
        }

        return signTx(xdr, publicKey, kit);
      },
    }),
    [
      publicKey,
      connect,
      disconnect,
      setConnecting,
      setError,
      storeSetNetwork,
      kit,
      network,
    ],
  );

  return useMemo(
    () => ({ publicKey, connected, connecting, error, network, ...actions }),
    [publicKey, connected, connecting, error, network, actions],
  );
};
