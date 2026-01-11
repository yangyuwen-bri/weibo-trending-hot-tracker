'use client';

import { useState } from 'react';
import { Search, Loader2, TrendingUp, Users, MessageSquare, Eye, Clock, Database, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---
interface HotSearch {
  id: number;
  title: string;
  category: string;
  hot_value: string;
  last_seen_at: string;
}

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  // State
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'search' | 'list' | 'detail'>('search');

  // Data
  const [searchResults, setSearchResults] = useState<HotSearch[]>([]);
  const [detailData, setDetailData] = useState<any>(null);
  const [error, setError] = useState('');

  // Subscription State
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subKeyword, setSubKeyword] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subMessage, setSubMessage] = useState('');

  // Subscribe Handler
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail || !subKeyword) return;

    setSubLoading(true);
    setSubMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subEmail, keyword: subKeyword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');

      setSubMessage('订阅成功！相关动态将每日发送至您的邮箱。');
      setTimeout(() => {
        setShowSubscribe(false);
        setSubMessage('');
        setSubKeyword('');
        setSubEmail('');
      }, 2000);
    } catch (err: any) {
      setSubMessage(err.message || '订阅失败，请重试');
    } finally {
      setSubLoading(false);
    }
  };

  // 1. Search Database
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    setLoading(true);
    setError('');
    setSearchResults([]);
    setStage('search'); // Stay on search until we get results

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
      const json = await res.json();

      if (json.results && json.results.length > 0) {
        setSearchResults(json.results);
        setStage('list');
      } else {
        // New UX: Do NOT auto-analyze. Show "Not Found" state in List view.
        setStage('list');
        // We don't set error string here, we let the UI handle empty list
      }
    } catch (err: any) {
      setError('搜索请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 2. Deep Analyze (Scrape)
  const handleDirectAnalyze = async (topic: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analyze?keyword=${encodeURIComponent(topic)}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to fetch data');

      setDetailData(json);
      setStage('detail');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStage('search');
    setKeyword('');
    setSearchResults([]);
    setDetailData(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <TrendingUp className="w-6 h-6 text-red-600" />
            <span className="font-bold text-xl tracking-tight">微博热搜分析</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {/* Stage 1: Search */}
        {stage === 'search' && (
          <div className="max-w-2xl mx-auto text-center mt-20 animate-in fade-in zoom-in duration-500">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-6">
              热搜话题聚合
            </h1>
            <p className="text-lg text-gray-500 mb-8">
              发现关键词背后的热门话题，直观呈现传播趋势。
            </p>

            <form onSubmit={handleSearch} className="relative flex items-center shadow-lg rounded-full mb-6">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索感兴趣的话题..."
                className="w-full h-14 pl-12 pr-32 rounded-full border-0 focus:ring-2 focus:ring-red-500 text-lg"
              />
              <Search className="absolute left-4 w-6 h-6 text-gray-400" />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
              </button>
            </form>

            <div className="flex justify-center gap-4">
              <button onClick={() => setShowSubscribe(true)} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                <AlertCircle className="w-4 h-4" />
                订阅关键词日报
              </button>
            </div>

            {error && <div className="mt-4 text-orange-600">{error}</div>}
          </div>
        )}

        {/* Subscribe Modal */}
        {showSubscribe && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowSubscribe(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">✕</button>
              <h2 className="text-xl font-bold mb-1">订阅热搜日报</h2>
              <p className="text-sm text-gray-500 mb-6">每天早9点，将您关注的关键词动态发送至邮箱。</p>

              <form onSubmit={handleSubscribe} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">关注关键词</label>
                  <input
                    required
                    value={subKeyword}
                    onChange={e => setSubKeyword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="例如: 茶颜悦色"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">接收邮箱</label>
                  <input
                    type="email"
                    required
                    value={subEmail}
                    onChange={e => setSubEmail(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="name@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={subLoading}
                  className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition-colors disabled:opacity-50"
                >
                  {subLoading ? '提交中...' : '确认订阅'}
                </button>
                {subMessage && <p className="text-center text-sm text-green-600">{subMessage}</p>}
              </form>
            </div>
          </div>
        )}

        {/* Stage 2: Results List */}
        {stage === 'list' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {searchResults.length > 0 ? `搜索结果 "${keyword}"` : `未能匹配到 "${keyword}"`}
              </h2>
              {/* Always provide force analyze option */}
              {searchResults.length > 0 && (
                <button onClick={() => handleDirectAnalyze(keyword)} className="text-sm text-red-600 hover:underline flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  强制尝试分析 "{keyword}" &rarr;
                </button>
              )}
            </div>

            {searchResults.length === 0 && (
              <div className="bg-white p-10 rounded-xl border-2 border-dashed border-gray-200 text-center flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">未找到相关热搜</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  我们在历史数据库和实时热搜榜单中都没有找到包含 "{keyword}" 的话题。
                  <br /><span className="text-xs text-gray-400 mt-1 block">可能是该话题已下榜很久，或者您输入的关键词不准确。</span>
                </p>
                <button
                  onClick={() => handleDirectAnalyze(keyword)}
                  className="px-8 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  仍然尝试强制分析 "{keyword}"
                </button>
              </div>
            )}

            <div className="space-y-3">
              {searchResults.map((item) => (
                <div
                  key={item.id || item.title}
                  onClick={() => handleDirectAnalyze(item.title)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 cursor-pointer transition-all flex justify-between items-center group"
                >
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-red-600 transition-colors">{item.title}</h3>
                    <div className="text-sm text-gray-500 flex gap-4 mt-1">
                      <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {item.category || '未分类'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 最后收录: {new Date(item.last_seen_at).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">热度值</div>
                    <div className="font-mono font-bold text-red-500">{(Number(item.hot_value) / 10000).toFixed(1)}w</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button onClick={reset} className="px-6 py-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300">
                重新搜索
              </button>
            </div>
          </div>
        )}

        {/* Stage 3: Detail Dashboard */}
        {stage === 'detail' && detailData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Back Button */}
            <button onClick={() => setStage('list')} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2">
              &larr; 返回列表
            </button>

            {/* Header Card - CORRECTED LAYOUT */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {/* Main Title is the TOPIC */}
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                  {detailData.topic}
                </h2>

                {/* Host is the Badge/Subtitle */}
                {detailData.host && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    <Users className="w-4 h-4" />
                    主持人: {detailData.host}
                  </div>
                )}
                {!detailData.host && <div className="text-gray-400 text-sm">暂无主持人信息</div>}
              </div>

              <div className="flex items-center gap-3">
                <div className="px-5 py-3 bg-red-50 text-red-700 rounded-xl font-medium border border-red-100 flex flex-col items-center min-w-[100px]">
                  <span className="text-xs text-red-400 uppercase tracking-wider mb-1">热度等级</span>
                  <span className="text-3xl font-black">Lv.{detailData.meta?.heatLevel || 0}</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={<Eye className="w-5 h-5 text-blue-500" />}
                label="阅读次数"
                value={detailData.stats.read}
                subtext="24小时累计"
              />
              <StatCard
                icon={<MessageSquare className="w-5 h-5 text-green-500" />}
                label="讨论次数"
                value={detailData.stats.discuss}
                subtext="全网互动"
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-purple-500" />}
                label="主持人"
                value={detailData.host || '无'}
                subtext="话题发起人"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="24小时阅读趋势 (Reading Trend)">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detailData.trends.read}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${(value / 10000).toFixed(0)}w`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [value.toLocaleString(), '阅读量']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="24小时讨论趋势 (Discussion Trend)">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detailData.trends.discuss}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [value.toLocaleString(), '讨论量']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: any, label: string, value: string, subtext: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <div className="font-medium text-gray-500">{label}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1 truncate" title={value}>{value}</div>
      <div className="text-xs text-gray-400">{subtext}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px] flex flex-col">
      <h3 className="font-bold text-gray-800 mb-6">{title}</h3>
      <div className="flex-1 w-full min-h-0">
        {children}
      </div>
    </div>
  );
}
