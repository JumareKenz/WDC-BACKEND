export interface QueryResult<T> {
  query_id: string;
  params: Record<string, unknown>;
  rows: T[];
}

export function lgaRatesForMonth(params: { year: number; month: number }) {
  return {
    query_id: 'lgaRatesForMonth',
    params: [params.year, params.month],
    sql: `
      SELECT 
        l.id, l.name, l.name_ha,
        COUNT(r.id) FILTER (WHERE r.status = 'approved') as approved_count,
        COUNT(r.id) FILTER (WHERE r.status = 'sealed') as sealed_count,
        COUNT(r.id) FILTER (WHERE r.status = 'returned') as returned_count,
        COUNT(r.id) as total_count
      FROM lgas l
      LEFT JOIN wards w ON w.lga_id = l.id
      LEFT JOIN reports r ON r.ward_id = w.id 
        AND EXTRACT(YEAR FROM r.created_at) = $1
        AND EXTRACT(MONTH FROM r.created_at) = $2
      GROUP BY l.id, l.name, l.name_ha
      ORDER BY l.name
    `,
  };
}

export function wardOutlierCount(params: { lgaId: string; days: number }) {
  return {
    query_id: 'wardOutlierCount',
    params: [params.lgaId, params.days],
    sql: `
      SELECT 
        w.id, w.name,
        COUNT(r.id) as report_count,
        COUNT(r.id) FILTER (WHERE r.status = 'returned') as returned_count,
        ROUND(COUNT(r.id) FILTER (WHERE r.status = 'returned')::numeric / NULLIF(COUNT(r.id), 0) * 100, 1) as return_rate
      FROM wards w
      JOIN lgas l ON l.id = w.lga_id
      LEFT JOIN reports r ON r.ward_id = w.id 
        AND r.created_at >= NOW() - (($2 || ' days')::interval)
      WHERE l.id = $1
      GROUP BY w.id, w.name
      ORDER BY return_rate DESC
      LIMIT 20
    `,
  };
}

export function recentReports(params: { limit: number }) {
  return {
    query_id: 'recentReports',
    params: [params.limit],
    sql: `
      SELECT 
        r.id, r.status, r.canonical::text,
        w.name as ward_name, l.name as lga_name,
        r.created_at, r.approved_at, r.sealed_at
      FROM reports r
      JOIN wards w ON w.id = r.ward_id
      JOIN lgas l ON l.id = w.lga_id
      ORDER BY r.created_at DESC
      LIMIT $1
    `,
  };
}

export function userStats(params: { lgaId?: string }) {
  if (params.lgaId) {
    return {
      query_id: 'userStatsLga',
      params: [params.lgaId],
      sql: `
        SELECT 
          u.role, u.status,
          COUNT(u.id) as count
        FROM users u
        JOIN wards w ON w.id = u.ward_id
        WHERE w.lga_id = $1
        GROUP BY u.role, u.status
        ORDER BY u.role, u.status
      `,
    };
  }
  return {
    query_id: 'userStatsAll',
    params: [],
    sql: `
      SELECT 
        u.role, u.status,
        COUNT(u.id) as count
      FROM users u
      GROUP BY u.role, u.status
      ORDER BY u.role, u.status
    `,
  };
}

export function formDeploymentStats() {
  return {
    query_id: 'formDeploymentStats',
    params: [],
    sql: `
      SELECT 
        f.id, f.title, f.status, f.current_version_id,
        fv.version, fv.deployed_at, fv.deployed_by,
        COUNT(r.id) as report_count
      FROM forms f
      LEFT JOIN form_versions fv ON fv.id = f.current_version_id
      LEFT JOIN reports r ON r.form_version_id = fv.id
      WHERE f.status = 'deployed'
      GROUP BY f.id, f.title, f.status, f.current_version_id, fv.version, fv.deployed_at, fv.deployed_by
      ORDER BY fv.deployed_at DESC
    `,
  };
}

export function activeInvestigations() {
  return {
    query_id: 'activeInvestigations',
    params: [],
    sql: `
      SELECT 
        i.id, i.title, i.status, i.priority, i.created_at,
        COUNT(ie.id) as evidence_count
      FROM investigations i
      LEFT JOIN investigation_evidence ie ON ie.investigation_id = i.id
      WHERE i.status = 'open'
      GROUP BY i.id, i.title, i.status, i.priority, i.created_at
      ORDER BY i.priority DESC, i.created_at DESC
    `,
  };
}