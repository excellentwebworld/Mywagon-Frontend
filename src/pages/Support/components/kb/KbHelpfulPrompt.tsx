import React, { useEffect } from 'react';

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
      <span>{label}</span>
      <button
        type="button"
        className={voted === 'yes' ? 'voted' : undefined}
        onClick={() => handleVote(true)}
        disabled={voted !== null}
      >
        👍 {voted === 'yes' ? thanksYes : yesLabel}
      </button>
      <button
        type="button"
        className={voted === 'no' ? 'voted' : undefined}
        onClick={() => handleVote(false)}
        disabled={voted !== null}
      >
        👎 {voted === 'no' ? notedNo : noLabel}
      </button>
    </div>
  );
}
