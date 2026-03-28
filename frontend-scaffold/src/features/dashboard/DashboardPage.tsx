import React from 'react';
import { ArrowUpRight, Coins, LayoutDashboard, Wallet } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import PageContainer from "../../components/layout/PageContainer";
import AmountDisplay from "../../components/shared/AmountDisplay";
import CreditBadge from "../../components/shared/CreditBadge";
import TipCard from "../../components/shared/TipCard";
import WalletConnect from "../../components/shared/WalletConnect";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import { mockProfile, mockTips } from "../mockData";
import EarningsChart from "./EarningsChart";
import QRCode from "./QRCode";

const DashboardPage: React.FC = () => {
  const { connected } = useWallet();
  const { profile, loading, isRegistered } = useProfile();

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  if (!loading && !isRegistered) {
    return <Navigate to="/register" replace />;
  }

  const creator = profile ?? mockProfile;

  const tabs = [
      {
        id: 'overview',
        label: 'Overview',
        content: (
          <div className="space-y-6 pt-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Available balance</p>
                <AmountDisplay amount={creator.balance} className="text-2xl" />
              </Card>
              <Card className="space-y-2 bg-yellow-100">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Lifetime volume</p>
                <AmountDisplay amount={creator.totalTipsReceived} className="text-2xl" />
              </Card>
              <Card className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Supporters</p>
                <p className="text-3xl font-black">{creator.totalTipsCount}</p>
              </Card>
              <Card className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Credit score</p>
                <CreditBadge score={creator.creditScore} />
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="space-y-4" padding="lg">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-black uppercase">Recent earnings</h2>
                </div>

                {mockTips.length === 0 ? (
                  <EmptyState
                    icon={<Coins />}
                    title="No earnings yet"
                    description="Once tips start landing, your payout history will show up here."
                  />
                ) : (
                  <div className="space-y-4">
                    {mockTips.slice(0, 3).map((tip) => (
                      <TipCard key={`${tip.from}-${tip.timestamp}`} tip={tip} showReceiver={false} />
                    ))}
                  </div>
                )}
              </Card>

              <div className="space-y-6">
                <Card className="space-y-4" padding="lg">
                  <h2 className="text-xl font-black uppercase">Withdrawal status</h2>
                  <div className="border-2 border-black bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Ready to withdraw</p>
                    <AmountDisplay amount={creator.balance} className="mt-2 block text-xl" />
                  </div>
                  <p className="text-sm font-medium leading-6 text-gray-700">
                    Withdrawal execution is still placeholder-backed in the scaffold, but the dashboard now makes the flow visible.
                  </p>
                </Card>

                <Card className="space-y-4" padding="lg">
                  <h2 className="text-xl font-black uppercase">Growth signals</h2>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between border-2 border-black p-3">
                      <span className="inline-flex items-center gap-2 text-sm font-bold">
                        <Wallet size={16} />
                        Returning supporters
                      </span>
                      <span className="text-lg font-black">38%</span>
                    </div>
                    <div className="flex items-center justify-between border-2 border-black p-3">
                      <span className="inline-flex items-center gap-2 text-sm font-bold">
                        <ArrowUpRight size={16} />
                        Weekly tip volume
                      </span>
                      <span className="text-lg font-black">+14%</span>
                    </div>
                  </div>
                </Card>
              </div>
            </section>
          </div>
        ),
      },
      {
        id: 'tips',
        label: 'Tips',
        content: <div className="pt-6"><TipHistory /></div>,
      },
      {
        id: 'earnings',
        label: 'Earnings',
        content: (
          <div className="pt-6">
            <Card>
              <p className="text-sm font-bold text-gray-700">Earnings insights module is scaffolded and ready for contract-backed analytics.</p>
            </Card>
          </div>
        ),
      },
      {
        id: 'settings',
        label: 'Settings',
        content: (
          <div className="pt-6">
            <Card>
              <p className="text-sm font-bold text-gray-700">Creator settings panel placeholder. Wallet and profile controls will land here.</p>
            </Card>
          </div>
        ),
      },
    ];

  return (
    <div className="space-y-6 pt-6">
      {/* Profile info */}
      <Card className="space-y-3" padding="lg">
        <h2 className="text-xl font-black uppercase">Profile</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="font-bold uppercase text-gray-500">Username</span>
            <span className="font-black">@{profile.username}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="font-bold uppercase text-gray-500">Display name</span>
            <span className="font-black">{profile.displayName || "—"}</span>
          </div>
          {profile.xHandle && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="font-bold uppercase text-gray-500">X handle</span>
              <span className="font-black">@{profile.xHandle}</span>
            </div>
          )}
        </div>
        <Link to="/profile/edit">
          <Button variant="outline" size="sm">Edit profile</Button>
        </Link>
      </Card>

      {/* Share link */}
      <Card className="space-y-3" padding="lg">
        <h2 className="text-xl font-black uppercase">Share your tip link</h2>
        <ShareLink username={profile.username} />
      </Card>

      {/* QR code placeholder */}
      <Card className="space-y-3" padding="lg">
        <div className="flex items-center gap-2">
          <QrCode size={20} />
          <h2 className="text-xl font-black uppercase">QR code</h2>
        </div>
        <p className="text-sm text-gray-600">
          Scan to open your tip page: <span className="font-bold">{tipUrl}</span>
        </p>
        <div className="flex h-32 w-32 items-center justify-center border-2 border-black bg-gray-100">
          <div className="text-center">
            <QrCode size={48} className="mx-auto text-gray-400" />
            <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">QR coming soon</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main DashboardPage
// ---------------------------------------------------------------------------
const DashboardPage: React.FC = () => {
  usePageTitle('Dashboard');

  const { connected } = useWalletStore();
  const { profile, tips, stats, loading, error, refetch } = useDashboard();

  // Not connected — prompt wallet connection
  if (!connected) {
    return (
      <PageContainer maxWidth="xl" className="space-y-8 py-10">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
              Creator dashboard
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-4xl font-black uppercase">
              <LayoutDashboard size={32} />
              Dashboard
            </h1>
          </div>
          <WalletConnect />
        </section>
        <EmptyState
          icon={<Wallet />}
          title="Connect your wallet"
          description="Connect a Stellar wallet to view your dashboard."
        />
      </PageContainer>
    );
  }

  // Connected but not registered
  if (!loading && !profile) {
    return (
      <PageContainer maxWidth="xl" className="space-y-8 py-10">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
              Creator dashboard
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-4xl font-black uppercase">
              <LayoutDashboard size={32} />
              Dashboard
            </h1>
          </div>
          <WalletConnect />
        </section>
        <EmptyState
          icon={<LayoutDashboard />}
          title="No profile found"
          description="Register a creator profile to unlock your dashboard."
        />
        <div className="flex justify-center">
          <Link to="/register">
            <Button variant="primary">Register now</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: profile ? (
        <OverviewTab profile={profile} stats={stats} tips={tips} loading={loading} />
      ) : null,
    },
    {
      id: "tips",
      label: "Tips",
      content: <TipsTab tips={tips} loading={loading} />,
    },
    {
      id: "earnings",
      label: "Earnings",
      content: profile ? (
        <EarningsTab profile={profile} stats={stats} loading={loading} />
      ) : null,
    },
    {
      id: "settings",
      label: "Settings",
      content: profile ? <SettingsTab profile={profile} /> : null,
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="space-y-8 py-10">
      {/* Page header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
            Creator dashboard
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-black uppercase">
            <LayoutDashboard size={32} />
            Dashboard
          </h1>
          <p className="mt-2 text-sm font-bold text-gray-600">{creator.displayName}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Available balance</p>
          <AmountDisplay amount={mockProfile.balance} className="text-2xl" />
        </Card>
        <Card className="space-y-2 bg-yellow-100">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Lifetime volume</p>
          <AmountDisplay amount={mockProfile.totalTipsReceived} className="text-2xl" />
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Supporters</p>
          <p className="text-3xl font-black">{mockProfile.totalTipsCount}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Credit score</p>
          <CreditBadge score={mockProfile.creditScore} />
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card padding="lg">
            <EarningsChart tips={mockTips} />
          </Card>

          <Card className="space-y-4" padding="lg">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black uppercase">Recent earnings</h2>
              <Link to="/profile" className="text-sm font-black uppercase underline">
                View full profile
              </Link>
            </div>

          {mockTips.length === 0 ? (
            <EmptyState
              icon={<Coins />}
              title="No earnings yet"
              description="Once tips start landing, your payout history will show up here."
            />
          ) : (
            <div className="space-y-4">
              {mockTips.slice(0, 3).map((tip) => (
                <TipCard key={`${tip.from}-${tip.timestamp}`} tip={tip} showReceiver={false} />
              ))}
            </div>
          )}

          <Pagination currentPage={1} totalPages={totalPages} onPageChange={() => {}} />
        </Card>
      </div>

        <div className="space-y-6">
          <Card className="space-y-4" padding="lg">
            <h2 className="text-xl font-black uppercase">Withdrawal status</h2>
            <div className="border-2 border-black bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Ready to withdraw</p>
              <AmountDisplay amount={mockProfile.balance} className="mt-2 block text-xl" />
            </div>
            <p className="text-sm font-medium leading-6 text-gray-700">
              Withdrawal execution is still placeholder-backed in the scaffold, but the dashboard now makes the flow visible.
            </p>
          </Card>

          <Card className="space-y-4" padding="lg">
            <h2 className="text-xl font-black uppercase">Growth signals</h2>
            <div className="grid gap-3">
              <div className="flex items-center justify-between border-2 border-black p-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold">
                  <Wallet size={16} />
                  Returning supporters
                </span>
                <span className="text-lg font-black">38%</span>
              </div>
              <div className="flex items-center justify-between border-2 border-black p-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold">
                  <ArrowUpRight size={16} />
                  Weekly tip volume
                </span>
                <span className="text-lg font-black">+14%</span>
              </div>
            </div>
          </Card>
          <Card padding="lg">
            <QRCode url={`https://tipz.app/@${mockProfile.username}`} />
          </Card>
        </div>
      </section>
    </PageContainer>
  );
};

export default DashboardPage;
