import { useState } from 'react';

/**
 * Open state for a section that opens by itself when it starts needing the
 * shipper (MS3-367) - and is then left alone, so it never snaps shut while the
 * shipper is still answering in it.
 */
export function useAutoOpen(needs: boolean): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(needs);
  const [seen, setSeen] = useState(needs);
  if (needs !== seen) {
    setSeen(needs);
    if (needs) setOpen(true);
  }
  return [open, setOpen];
}
