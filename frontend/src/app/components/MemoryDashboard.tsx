'use client';

import React, { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Brain, Network, Database } from 'lucide-react';

type MemoryNode = {
  name: string;
  value: number;
  detail: string;
  timestamp: string;
};

type SemanticTrend = {
  topic: string;
  weight: number;
};

interface MemoryDashboardProps {
  userId: string;
}

export default function MemoryDashboard({ userId }: MemoryDashboardProps) {
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [trends, setTrends] = useState<SemanticTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(`${backendUrl}/dashboard?userId=${userId}`);
        const data = await res.json();
        if (data.nodes) setNodes(data.nodes);
        if (data.semanticTrends) setTrends(data.semanticTrends);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Poll every 10 seconds to update dynamic graph
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-[500px] lg:h-full w-full max-w-md bg-[#0A0A0A] border border-neutral-800/50 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-neutral-800/50 flex items-center gap-3">
        <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-white tracking-wide">Memory Matrix</h2>
          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Subconscious Epistemic States</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
        
        {/* Semantic Trends Radar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
            <Network className="w-3 h-3 text-neutral-500" />
            Semantic Alignment
          </div>
          <div className="h-48 w-full bg-transparent rounded-xl border border-neutral-800/50 p-2">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600 font-mono">Initializing...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={trends}>
                  <PolarGrid stroke="#262626" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: '#737373', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Alignment" dataKey="weight" stroke="#ffffff" strokeWidth={1} fill="#ffffff" fillOpacity={0.05} />
                  <Tooltip contentStyle={{ backgroundColor: '#000000', border: '1px solid #262626', borderRadius: '4px', fontSize: '11px', color: '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Extracted Facts List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
            <Database className="w-3 h-3 text-neutral-500" />
            Extracted Context
          </div>
          <div className="space-y-2">
            {nodes.length === 0 && !loading && (
              <div className="text-xs text-neutral-600 font-mono p-4 text-center border border-dashed border-neutral-800 rounded-xl">No facts distilled yet.</div>
            )}
            {nodes.map((node, i) => (
              <div key={i} className="p-3 bg-neutral-900/50 border border-neutral-800/50 rounded-xl group hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-xs font-medium text-neutral-200">{node.name}</span>
                  <span className="text-[9px] text-neutral-500 font-mono tracking-widest uppercase">
                    CONF {(node.value).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{node.detail}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
