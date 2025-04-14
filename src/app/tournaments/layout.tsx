import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tournaments - KnockoutVR',
  description: 'Join competitive VR boxing tournaments and win prizes',
};

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {children}
    </section>
  );
}
