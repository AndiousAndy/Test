'use client';

import React from 'react';
import type { NextPage } from 'next';

export const dynamic = 'force-dynamic';

const DisputedMatchesPage: NextPage = () => {
  return (
    <div>
      <h1>Disputed Matches</h1>
      <p>This page will display disputed matches.</p>
    </div>
  );
};

export default DisputedMatchesPage;
