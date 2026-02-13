
'use client';
import CheckInView from '@/components/checkin/CheckInView';
import { seedDatabase } from '@/lib/db';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    seedDatabase().catch(console.error); // Ensure DB has data for demo
  }, []);

  return (
    <>
      <CheckInView />
    </>
  );
}
