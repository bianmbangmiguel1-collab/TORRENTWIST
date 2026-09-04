// app/admin/security/logs/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';
import Link from 'next/link';
import LogsFilters from '@/components/admin/security/LogsFilters';
import {
  Shield,
  AlertTriangle,
  Clock,
  Globe,
  Smartphone,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const metadata = {
  title: 'Journaux d\'activité | TorrentTwist Admin',
};

export default async function AdminSecurityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; action?: string; search?: string }> | { page?: string; limit?: string; action?: string; search?: string };
}) {
  await requireAdmin({
    cookies: cookies(),
    headers: { get: () => null },
  }).catch(() => redirect('/admin/login'));

  const params = searchParams instanceof Promise ? await searchParams : searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const actionFilter = params.action || 'all';
  const search = params.search || '';

  const db = await getDB();

  // Construire la requête avec filtres
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  if (actionFilter !== 'all') {
    whereConditions.push('a.action = ?');
    queryParams.push(actionFilter);
  }

  if (search) {
    whereConditions.push('(u.name LIKE ? OR u.email LIKE ? OR a.details LIKE ?)');
    const searchPattern = `%${search}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const offset = (page - 1) * limit;
  const logs = await db.all(
    `
    SELECT 
      a.*,
      u.name as user_name,
      u.email as user_email
    FROM admin_activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...queryParams, limit, offset]
  );

  const countResult = await db.get<{ count: number }>(
    `
    SELECT COUNT(*) as count
    FROM admin_activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    `,
    queryParams
  );
  const total = countResult?.count || 0;
  const totalPages = Math.ceil(total / limit);

  const actions = await db.all<{ action: string }[]>(
    'SELECT DISTINCT action FROM admin_activity_logs ORDER BY action'
  );

  const stats = {
    total,
    today: (await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM admin_activity_logs WHERE date(created_at) = date('now')`))?.count || 0,
    thisWeek: (await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM admin_activity_logs WHERE created_at >= datetime('now', '-7 days')`))?.count || 0,
    thisMonth: (await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM admin_activity_logs WHERE created_at >= datetime('now', '-30 days')`))?.count || 0,
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'connexion_inhabituelle': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'login': 'bg-green-100 text-green-700 border-green-200',
      'logout': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    const color = colors[action] || 'bg-gray-100 text-gray-700 border-gray-200';
    return <span className={`px-2 py-1 text-xs font-medium rounded-full border ${color}`}>{action}</span>;
  };

  const formatDetails = (details: string) => {
    try {
      const data = JSON.parse(details);
      if (typeof data === 'object') {
        return (
          <div className="text-xs text-gray-600 space-y-0.5">
            {data.new_country && <div className="flex items-center gap-1"><Globe className="w-3 h-3" /> Pays: {data.new_country}</div>}
            {data.new_ip && <div className="flex items-center gap-1"><span>🌐 IP: {data.new_ip}</span></div>}
            {data.new_device && <div className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> Appareil: {data.new_device}</div>}
          </div>
        );
      }
      return <span className="text-xs text-gray-500">{details}</span>;
    } catch {
      return <span className="text-xs text-gray-500">{details}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📋 Journaux d'activité</h1>
            <p className="text-gray-600 mt-1">{total} événement{total > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/security" className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition">← Sécurité</Link>
            <Link href="/admin" className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition">Tableau de bord</Link>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500">Total logs</p><p className="text-2xl font-bold">{stats.total}</p></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500">Aujourd'hui</p><p className="text-2xl font-bold text-blue-600">{stats.today}</p></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500">7 derniers jours</p><p className="text-2xl font-bold text-green-600">{stats.thisWeek}</p></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200"><p className="text-sm text-gray-500">30 derniers jours</p><p className="text-2xl font-bold text-purple-600">{stats.thisMonth}</p></div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <LogsFilters
            currentSearch={search}
            currentAction={actionFilter}
            currentLimit={limit}
            actions={actions.map(a => a.action)}
          />
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Détails</th>
                  <th className="px-4 py-3 text-left font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun log trouvé</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3"><p className="font-medium">{log.user_name || 'Inconnu'}</p><p className="text-xs text-gray-400">{log.user_email || 'Email inconnu'}</p></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2">{getActionBadge(log.action)}</div></td>
                      <td className="px-4 py-3">{formatDetails(log.details)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{log.ip_address || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  const p = new URLSearchParams();
                  if (search) p.set('search', search);
                  if (actionFilter !== 'all') p.set('action', actionFilter);
                  if (limit !== 20) p.set('limit', String(limit));
                  p.set('page', String(page - 1));
                  window.location.href = `/admin/security/logs?${p.toString()}`;
                }}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <span className="text-sm text-gray-600">Page {page} sur {totalPages}</span>
              <button
                onClick={() => {
                  const p = new URLSearchParams();
                  if (search) p.set('search', search);
                  if (actionFilter !== 'all') p.set('action', actionFilter);
                  if (limit !== 20) p.set('limit', String(limit));
                  p.set('page', String(page + 1));
                  window.location.href = `/admin/security/logs?${p.toString()}`;
                }}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}