import React from 'react';

const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 text-center">
    <h1 className="text-2xl font-bold text-slate-300">{title}</h1>
    <p className="text-slate-400 mt-2">Coming Soon</p>
  </div>
);

export const ComparePolicies = () => <Placeholder title="Compare Policies" />;
export const WhatIfSimulator = () => <Placeholder title="What-if Simulator" />;
export const SavedPlans = () => <Placeholder title="Saved Plans" />;
export const Reports = () => <Placeholder title="Reports" />;
export const HelpSupport = () => <Placeholder title="Help & Support" />;
export const Settings = () => <Placeholder title="Settings" />;
