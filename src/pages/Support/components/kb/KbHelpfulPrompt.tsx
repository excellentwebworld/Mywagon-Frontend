import React, { useEffect } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

interface KbHelpfulPromptProps {
  articleId: string;
  label: string;
  yesLabel: string;
  noLabel: string;
  thanksYes: string;
  notedNo: string;
  onVote: (helpful: boolean) => Promise<void>;
}

export function KbHelpfulPrompt({
  articleId,
  label,
  yesLabel,
  noLabel,
  thanksYes,
  notedNo,
  onVote,
}: KbHelpfulPromptProps) {
  const [voted, setVoted] = React.useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    setVoted(null);
  }, [articleId]);

  const handleVote = (helpful: boolean) => {
    setVoted(helpful ? 'yes' : 'no');
    void onVote(helpful);
  };

  return (
    <div className="modal-helpful">
      <span className="modal-helpful-label">{label}</span>
      <button
        type="button"
        className={`modal-helpful-btn${voted === 'yes' ? ' voted' : ''}`}
        onClick={() => handleVote(true)}
        disabled={voted !== null}
      >
        <ThumbsUp size={14} aria-hidden />
        {voted === 'yes' ? thanksYes : yesLabel}
      </button>
      <button
        type="button"
        className={`modal-helpful-btn${voted === 'no' ? ' voted-no' : ''}`}
        onClick={() => handleVote(false)}
        disabled={voted !== null}
      >
        <ThumbsDown size={14} aria-hidden />
        {voted === 'no' ? notedNo : noLabel}
      </button>
    </div>
  );
}
