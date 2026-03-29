import React from 'react';
import { User, Copy, ExternalLink, Trophy } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Card from '../ui/Card';
import CreditBadge from './CreditBadge';
import AmountDisplay from './AmountDisplay';

interface ProfileCardProps {
  handle: string;
  publicKey: string;
  bio?: string;
  onTip?: () => void;
  variant?: 'default' | 'compact';
  creditScore?: number;
  totalTips?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  handle,
  publicKey,
  bio,
  onTip,
  variant = 'default',
  creditScore,
  totalTips
}) => {
  const shortKey = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicKey);
    // Future: trigger toast
  };

  if (variant === 'compact') {
    return (
      <Card hover className="w-64 flex-shrink-0 flex flex-col gap-3" padding="sm">
        <div data-testid="profile-card" className="contents">
          <div className="flex items-center justify-between gap-2">
            <Avatar address={publicKey} alt={handle} size="md" />
            {creditScore !== undefined && (
              <CreditBadge score={creditScore} showScore={false} />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-black uppercase truncate">@{handle}</h3>
            {totalTips && (
              <div className="flex items-center gap-1.5 mt-1">
                <Trophy size={14} className="text-yellow-600" />
                <AmountDisplay amount={totalTips} className="text-sm font-bold" />
              </div>
            )}
          </div>

          <button
            onClick={onTip}
            className="w-full py-2 bg-black text-white text-xs font-black uppercase tracking-wider border-2 border-black hover:bg-gray-800 transition-colors"
          >
            View Profile
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600" />
      <div className="px-6 pb-6 text-center">
        <div className="relative -mt-12 mb-4">
          <div className="inline-flex items-center justify-center h-24 w-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-sm">
            <User className="h-12 w-12 text-gray-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">@{handle}</h3>
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {shortKey}
            <Copy className="h-3 w-3" />
          </button>
          <a
            href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          {bio || "This creator hasn't added a bio yet. Support their work by sending a tip!"}
        </p>
        <button
          onClick={onTip}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
        >
          Send Tip
        </button>
      </div>
    </div>
  );
};

export default ProfileCard;
