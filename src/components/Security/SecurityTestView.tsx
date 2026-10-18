import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  Lock,
  Clock,
  Key,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { SecurityTestResult } from '../../types';
import { ApiService } from '../../services/api';

interface SecurityTestViewProps {
  initialResults: SecurityTestResult[];
  onRefreshTests: () => Promise<void>;
}

export const SecurityTestView: React.FC<SecurityTestViewProps> = ({
  initialResults,
  onRefreshTests,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SecurityTestResult[]>(initialResults);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const data = await ApiService.runSecuritySuite();
      setResults(data.results);
      await onRefreshTests();
    } catch (err: any) {
      alert(`Test run failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = results.length > 0 && passedCount === results.length;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className={`p-3 rounded-xl flex-shrink-0 ${allPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {allPassed ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#031630]">
              Automated Security Barriers & Access Control Suite
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Verifies server-side scrypt password hashing, token expiration, manual revocation, entry-level edit/approval authorization, mandatory validation, cross-audit session isolation, and approval auto-resets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-lg font-black text-[#031630]">
              {passedCount} / {results.length} Passing
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {allPassed ? '100% Secure' : 'Vulnerabilities Detected'}
            </span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0561D5] hover:bg-[#044db0] text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Tests...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Security Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((test, index) => (
          <div
            key={test.id}
            className={`p-5 rounded-xl border transition-all ${
              test.passed
                ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-300'
                : 'bg-red-50/50 border-red-200 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                  {index + 1}
                </span>
                <h4 className="text-xs font-bold text-[#031630]">{test.name}</h4>
              </div>

              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  test.passed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {test.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                <span>{test.passed ? 'PASSED' : 'FAILED'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2">{test.description}</p>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <div className="font-mono text-slate-600">
                Expected: <strong className="text-slate-800">HTTP {test.expectedStatus}</strong> • Actual:{' '}
                <strong className={test.actualStatus === test.expectedStatus ? 'text-emerald-700' : 'text-red-600'}>
                  HTTP {test.actualStatus}
                </strong>
              </div>
              <span className="text-slate-400 text-[10px]">
                {new Date(test.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="mt-2 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-700 font-mono">
              {test.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
