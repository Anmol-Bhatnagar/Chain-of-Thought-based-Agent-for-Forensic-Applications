import React from 'react';
import { NodeResult } from '../types';
import { AlertTriangle, CheckCircle, AlertOctagon, Activity } from 'lucide-react';

interface NodeCardProps {
  node: NodeResult<any>;
  icon: React.ReactNode;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, icon }) => {
  const { name, status, riskLevel, inference, score, data } = node;

  if (status === 'idle') return null;

  const isProcessing = status === 'processing';


  let containerStyle = '';
  let textColor = '';
  let riskIcon = null;

  if (isProcessing) {
      containerStyle = 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-slate-900/80';
      textColor = 'text-cyan-400';
  } else {
      switch (riskLevel) {
          case 'CRITICAL':
          case 'HIGH':
              containerStyle = 'border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.25)] bg-rose-950/20';
              textColor = 'text-rose-400';
              riskIcon = <AlertOctagon className="w-4 h-4 text-rose-500 animate-pulse" />;
              break;
          case 'MEDIUM':
              containerStyle = 'border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.15)] bg-amber-950/10';
              textColor = 'text-amber-400';
              riskIcon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
              break;
          case 'LOW':
          default:
              containerStyle = 'border-emerald-500/30 bg-slate-900/80';
              textColor = 'text-emerald-400';
              riskIcon = <CheckCircle className="w-4 h-4 text-emerald-500" />;
              break;
      }
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border backdrop-blur-sm p-5 transition-all duration-500 ${containerStyle}`}>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${isProcessing ? 'bg-cyan-950 text-cyan-400 animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">{name}</h3>
            {isProcessing ? (
              <span className="text-xs text-cyan-400 font-mono flex items-center gap-2 mt-1">
                <Activity className="w-3 h-3 animate-spin" />
                RUNNING...
              </span>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                 {riskIcon}
                 <span className={`text-xs font-mono font-bold ${textColor}`}>
                    RISK: {riskLevel}
                 </span>
              </div>
            )}
          </div>
        </div>

        {!isProcessing && (
          <div className="text-right">
            <div className={`text-2xl font-bold font-mono ${score < 50 ? 'text-rose-500' : 'text-slate-100'}`}>
                {score.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">Auth Score</div>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="space-y-4">
        {/* Inference Text */}
        {!isProcessing && (
          <div className={`p-3 rounded border text-sm font-mono leading-relaxed ${
              riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
              ? 'bg-rose-950/30 border-rose-900/50 text-rose-100'
              : 'bg-slate-950/50 border-slate-800 text-slate-300'
          }`}>
            <span className="opacity-50 select-none mr-2">{">"}</span>
            {inference}
          </div>
        )}

        {/* Data Visualization Specifics */}
        {!isProcessing && data && (
          <div className="mt-4 animate-in fade-in duration-500">
             {/* Example: Deepfake Probabilities */}
             {name.includes('Deepfake') && (
               <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Real</span>
                    <span>Fake</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${data.probabilityReal}%` }}></div>
                    <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${data.probabilityFake}%` }}></div>
                  </div>
                  <div className="text-right text-xs text-rose-400 font-mono">
                    GenAI Confidence: {data.probabilityFake.toFixed(1)}%
                  </div>
               </div>
             )}

             {/* Example: DCT / Noise Metrics */}
             {(name.includes('DCT') || name.includes('Noise')) && (
               <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-800/50 p-2 rounded text-center border border-slate-700/50">
                    <div className="text-[10px] text-slate-500 uppercase">Consistency</div>
                    <div className="text-lg font-mono text-slate-200">
                      {data.quantizationConsistency || data.grainConsistency || 0}%
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded text-center border border-slate-700/50">
                    <div className="text-[10px] text-slate-500 uppercase">Variance</div>
                    <div className="text-lg font-mono text-slate-200">
                      {(data.histogramVariance || (data.smoothnessScore/100))?.toFixed(2)}
                    </div>
                  </div>
               </div>
             )}

             {/* Example: Clone Detection */}
             {name.includes('Clone') && (
                <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50">
                   <div className="text-xs text-slate-400">Matched Features</div>
                   <div className={`font-mono font-bold ${data.clonedRegions > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {data.featureMatchCount} pts
                   </div>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Decorative Scan Line */}
      {isProcessing && (
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-[scan_2s_linear_infinite]"></div>
      )}
    </div>
  );
};

export default NodeCard;
