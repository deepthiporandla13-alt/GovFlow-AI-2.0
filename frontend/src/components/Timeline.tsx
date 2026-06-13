import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface TimelineProps {
  currentStage: 'Citizen' | 'Clerk' | 'Officer' | 'Manager' | 'Completed';
  status: string;
  isEscalated?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({ currentStage, status, isEscalated }) => {
  const stages = [
    { name: 'Citizen', label: 'Submitted', desc: 'Registered & Seeded' },
    { name: 'Clerk', label: 'Clerk Review', desc: 'Document Verification' },
    { name: 'Officer', label: 'Officer Review', desc: 'SLA Evaluation' },
    { name: 'Manager', label: 'Manager Review', desc: 'Final Decision' },
    { name: 'Completed', label: 'Closed', desc: 'Approved / Rejected' }
  ];

  const getStageStatus = (stageName: string, index: number) => {
    // If request is rejected
    if (status === 'Rejected' && stageName === 'Completed') {
      return 'rejected';
    }
    if (status === 'Returned_For_Correction' && stageName === 'Citizen') {
      return 'warning';
    }

    // Determine current index
    const currentIndex = stages.findIndex(s => s.name === currentStage);

    if (index < currentIndex) {
      return 'completed';
    } else if (index === currentIndex) {
      if (status === 'Approved') return 'completed';
      return 'active';
    } else {
      return 'pending';
    }
  };

  return (
    <div className="w-full py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-2">
        {stages.map((stage, idx) => {
          const stageStatus = getStageStatus(stage.name, idx);
          
          return (
            <React.Fragment key={stage.name}>
              {/* Timeline Stage Node */}
              <div className="flex items-center md:flex-col flex-row gap-3 md:gap-2 text-left md:text-center flex-1 relative w-full">
                <div className={`w-10 h-10 rounded-full flex items-center justify-between p-2 z-10 transition-all duration-300
                  ${stageStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : ''}
                  ${stageStatus === 'active' ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500 animate-pulse-ring' : ''}
                  ${stageStatus === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500' : ''}
                  ${stageStatus === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500' : ''}
                  ${stageStatus === 'pending' ? 'bg-slate-800 text-slate-500 border border-slate-700' : ''}
                `}>
                  {stageStatus === 'completed' && <CheckCircle2 className="w-6 h-6" />}
                  {stageStatus === 'active' && <Clock className="w-6 h-6" />}
                  {stageStatus === 'warning' && <AlertTriangle className="w-6 h-6" />}
                  {stageStatus === 'rejected' && <XCircle className="w-6 h-6" />}
                  {stageStatus === 'pending' && <span className="font-semibold text-sm">{idx + 1}</span>}
                </div>
                
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold tracking-wide transition-colors duration-300
                    ${stageStatus === 'completed' ? 'text-emerald-400' : ''}
                    ${stageStatus === 'active' ? 'text-blue-400 font-bold' : ''}
                    ${stageStatus === 'warning' ? 'text-amber-400' : ''}
                    ${stageStatus === 'rejected' ? 'text-rose-400' : ''}
                    ${stageStatus === 'pending' ? 'text-slate-400' : ''}
                  `}>
                    {stage.label}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 hidden md:block">
                    {stage.name === 'Manager' && isEscalated ? 'Escalated Level' : stage.desc}
                  </span>
                </div>
              </div>

              {/* Connecting Line */}
              {idx < stages.length - 1 && (
                <div className="hidden md:block flex-1 h-[2px] bg-slate-800 mx-2 relative top-[-10px]">
                  <div className={`h-full transition-all duration-500
                    ${getStageStatus(stages[idx + 1].name, idx + 1) === 'completed' || getStageStatus(stages[idx + 1].name, idx + 1) === 'active' ? 'bg-blue-500' : 'bg-slate-700'}
                  `} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
